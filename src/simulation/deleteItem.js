import axios from "axios";

import { Peer } from "../network/peer.js";

/**
 * Deletes an item from a collection.
 *
 * @param {Peer} peer - The peer to contact
 * @param {string} collection - The ID of the collection.
 * @param {string} root - The targeted root set.
 * @param {string} location - The location of the item.
 * @param {string} reference - The ID of the item.
 * @returns {Promise<void>} - Resolves once the peer accepted the deletion.
 */
export async function deleteItem(
  peer,
  collection,
  root,
  location,
  reference
) {
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
    await axios.post(`http://127.0.0.1:2100/item/delete`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        Destination: peer.hash(),
      },
    });
  } catch (error) {
    // Handle and log errors
    console.error("Error deleting item from the collection:", error);
    throw error;
  }
}
