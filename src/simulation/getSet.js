import axios from "axios";

import { Element } from "../model/index.js";
import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";
import { Peer } from "../network/peer.js";

/**
 * Simulation getSet — mirrors production deep path-fill.
 *
 * @param {Peer} peer - The peer to contact.
 * @param {string} collection - The ID of the collection.
 * @param {string} location - The location within the collection.
 * @param {boolean} deep - Path-fill on/off.
 * @returns {Promise<Object>} - The response from the server, including the set data.
 */
export async function getSet(peer, collection, location, deep = true) {
  const url = `http://127.0.0.1:2100/set?collection=${encodeURIComponent(
    collection
  )}&location=${encodeURIComponent(location)}&deep=${deep ? "true" : "false"}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Destination: peer.hash(),
      },
    });

    const data = response.data;

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
    throw error;
  }
}
