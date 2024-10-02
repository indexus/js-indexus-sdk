import axios from "axios";

import { Space } from "../entities/space.js";
import { Peer } from "../network/peer.js";

/**
 * Adds an item to a collection.
 *
 * @param {Peer} peer - The peer to contact
 * @param {string} collection - The ID of the collection.
 * @param {string} root - The targeted root set.
 * @param {string} location - The location of the item.
 * @param {string} id - The ID of the item.
 * @returns {Promise<Object>} - The response from the server.
 */
export async function addItem(peer, collection, root, location, reference) {
  // Construct the POST request body
  const requestBody = {
    item: {
      collection: collection,
      location: location,
      id: reference,
    },
    root: root,
    current: location,
  };

  try {
    // Make the POST request to add the item to the collection
    await axios.post(`http://[${peer.ip()}]:${peer.port()}/item`, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle and log errors
    console.error("Error adding item to the collection:", error);
    throw error;
  }
}
