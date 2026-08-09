import axios from "axios";

import { Peer } from "../network/peer.js";
import { getHostFromIP } from "../utilities/network.js";
import { authHeaders } from "./authHeaders.js";

/**
 * Ping
 * @param {string} protocol - Protocol to use to contact the peer http/https.
 * @param {string} ip - The ip of the peer
 * @param {number} port - The port of the peer
 * @returns {Promise<Peer>} - A promise that resolves when the item is added.
 */
export async function pingPeer(protocol, ip, port) {
  // Construct the POST request body
  const requestBody = {};

  try {
    // Make the POST request to ping the peer
    const response = await axios.post(
      `${protocol}://${getHostFromIP(ip)}:${port}/ping`,
      requestBody,
      {
        headers: authHeaders({
          "Content-Type": "application/json",
        }),
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
