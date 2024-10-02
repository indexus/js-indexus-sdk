import axios from "axios";

import { API } from "./index.js";
import { Space } from "../entities/space.js";
import { Peer } from "../network/peer.js";

/**
 * Ping
 * @param {string} host - The host of the peer.
 * @returns {Promise<Peer>} - A promise that resolves when the item is added.
 */
export async function pingPeer(ip, port) {
  // Construct the POST request body
  const requestBody = {};

  try {
    // Make the POST request to ping the peer
    const response = await axios.post(
      `http://127.0.0.1:2100/ping`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          Destination: ip,
        },
      }
    );

    // Return the peer
    const data = response.data;

    // Create a Peer instance from the contact data
    const contactData = data.contact;
    const contactPeer = new Peer(
      contactData.name,
      contactData.ips,
      contactData.port,
      ip
    );
    return contactPeer;
  } catch (error) {
    // Handle and log errors
    console.error("Error pinging the host:", error);
    throw error;
  }
}
