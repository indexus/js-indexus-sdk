import axios from "axios";

import { Peer } from "../network/peer.js";
import { getHostFromIP } from "../utilities/network.js";
import { authHeaders } from "./authHeaders.js";

/**
 * Deletes an item from a collection.
 *
 * @param {string} protocol - Protocol to use to contact the peer http/https.
 * @param {Peer} peer - The peer to contact
 * @param {string} collection - The ID of the collection.
 * @param {string} root - The targeted root set.
 * @param {string} location - The location of the item.
 * @param {string} reference - The ID of the item.
 * @returns {Promise<void>} - Resolves once the peer accepted the deletion.
 */
export async function deleteItem(
  protocol,
  peer,
  collection,
  root,
  location,
  reference
) {
  const url = `${protocol}://${getHostFromIP(peer.ip())}:${peer.port()}/item/delete`;
  const requestBody = {
    item: {
      collection: collection,
      location: location,
      id: reference,
    },
    root: root,
  };
  const headers = authHeaders({
    "Content-Type": "application/json",
  });

  try {
    await axios.post(url, requestBody, { headers });
  } catch (error) {
    const status = error?.response?.status;
    const retryAfter = error?.response?.headers?.["retry-after"];
    if (status === 503 && retryAfter) {
      const ms = Math.max(1, Number(retryAfter)) * 1000;
      await new Promise((r) => setTimeout(r, ms));
      // One soft retry after backpressure.
      await axios.post(url, requestBody, { headers });
      return;
    }
    console.error("Error deleting item from the collection:", error);
    throw error;
  }
}
