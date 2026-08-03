import axios from "axios";

import { Element } from "../model/index.js";
import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";
import { Peer } from "../network/peer.js";
import { getHostFromIP } from "../utilities/network.js";
import { authHeaders } from "./authHeaders.js";

/**
 * Retrieves a set from a collection at a specified location.
 *
 * @param {string} protocol - Protocol to use to contact the peer http/https.
 * @param {Peer} peer - The peer to contact.
 * @param {string} collection - The ID of the collection.
 * @param {string} location - The location within the collection.
 * @param {number} depth - Path-fill budget: 2 lets the peer fetch from its own
 *   neighbors and cache the result, 0 asks for a contact redirect instead.
 * @returns {Promise<Object>} - The response from the server, including the set data.
 */
export async function getSet(protocol, peer, collection, location, depth = 2) {
  // Construct the GET request URL
  const url = `${protocol}://${getHostFromIP(
    peer.ip()
  )}:${peer.port()}/set?collection=${encodeURIComponent(
    collection
  )}&location=${encodeURIComponent(location)}&depth=${depth}`;

  try {
    // Make the GET request to retrieve the set from the collection
    const response = await axios.get(url, {
      headers: authHeaders(),
    });

    // Parse the JSON response
    const data = response.data;

    /**
     * Parses the set data and constructs Element instances.
     * @param {Object.<string, number>} setData - The set data from the response.
     * @param {string} collection - The name of the collection.
     * @returns {Element[]} - An array of Element instances (Item or Set).
     */
    const parseSet = (setData, collection) => {
      const elements = [];

      for (const [key, value] of Object.entries(setData)) {
        if (value.count === 1) {
          // It's an Item
          // Assuming the key is in the format 'hash:reference'
          const [hash, reference] = key.split(":");
          if (hash && reference) {
            elements.push(new Item(collection, hash, value.metrics, reference));
          } else {
            console.warn(`Invalid item key format: ${key}`);
          }
        } else {
          // It's a Set
          // Assuming the key is the hash, and value is the count
          const hash = key;
          const count = value.count;
          elements.push(new Set(collection, hash, count, value.metrics));
        }
      }

      return elements;
    };

    // Create a Peer instance from the contact data
    const contactData = data.contact;
    const contactPeer = new Peer(
      contactData.name,
      contactData.ips,
      contactData.port,
      contactData.ip
    );

    // Parse the set data into Element instances
    const elements = data.set !== null ? parseSet(data.set, collection) : null;

    // Return the structured object
    return {
      contact: contactPeer,
      set: elements,
    };
  } catch (error) {
    // Handle and log errors
    console.error(`Error retrieving set from peer ${peer.hash()}:`, error);
    throw error;
  }
}
