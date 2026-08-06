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
 * @param {Peer} peer - The peer to contact (ingress seed).
 * @param {string} collection - The ID of the collection.
 * @param {string} location - The location within the collection.
 * @param {boolean} deep - Path-fill: true lets the peer recurse to the owner
 *   and fill its LRU; false asks for a contact redirect only.
 * @returns {Promise<Object>} - The response from the server, including the set data.
 */
export async function getSet(protocol, peer, collection, location, deep = true) {
  const url = `${protocol}://${getHostFromIP(
    peer.ip()
  )}:${peer.port()}/set?collection=${encodeURIComponent(
    collection
  )}&location=${encodeURIComponent(location)}&deep=${deep ? "true" : "false"}`;

  try {
    const response = await axios.get(url, {
      headers: authHeaders(),
    });

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
          const [hash, reference] = key.split(":");
          if (hash && reference) {
            elements.push(new Item(collection, hash, value.metrics, reference));
          } else {
            console.warn(`Invalid item key format: ${key}`);
          }
        } else {
          const hash = key;
          const count = value.count;
          elements.push(new Set(collection, hash, count, value.metrics));
        }
      }

      return elements;
    };

    const contactData = data.contact;
    const contactPeer = new Peer(
      contactData.name,
      contactData.ips,
      contactData.port,
      contactData.ip
    );

    const elements = data.set !== null ? parseSet(data.set, collection) : null;

    return {
      contact: contactPeer,
      set: elements,
    };
  } catch (error) {
    console.error(`Error retrieving set from peer ${peer.hash()}:`, error);
    throw error;
  }
}
