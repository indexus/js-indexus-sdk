import axios from "axios";

import { Element } from "../model/index.js";
import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";
import { Peer } from "../network/peer.js";

/**
 * Retrieves a set from a collection at a specified location.
 *
 * @param {Peer} peer - The peer to contact.
 * @param {string} collection - The ID of the collection.
 * @param {string} location - The location within the collection.
 * @returns {Promise<Object>} - The response from the server, including the set data.
 */
export async function getSet(peer, collection, location) {
  // Construct the GET request URL
  const url = `http://[${peer.ip()}]:${peer.port()}/set?collection=${encodeURIComponent(
    collection
  )}&location=${encodeURIComponent(location)}`;

  try {
    // Make the GET request to retrieve the set from the collection
    const response = await axios.get(url, {
      headers: {},
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
        if (value === 1) {
          // It's an Item
          // Assuming the key is in the format 'hash:reference'
          const [hash, reference] = key.split(":");
          if (hash && reference) {
            elements.push(new Item(collection, hash, reference));
          } else {
            console.warn(`Invalid item key format: ${key}`);
          }
        } else if (typeof value === "number") {
          // It's a Set
          // Assuming the key is the hash, and value is the count
          const hash = key;
          const count = value;
          elements.push(new Set(collection, hash, count));
        } else {
          console.warn(`Unknown set entry format: ${key}: ${value}`);
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
    const elements = parseSet(data.set, collection);

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
