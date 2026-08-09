import axios from "axios";

import { Peer } from "../network/peer.js";
import { authHeaders } from "./authHeaders.js";
import { peerUrl } from "./peerUrl.js";

/**
 * Ping
 * @param {string} protocol - Protocol to use to contact the peer http/https.
 * @param {string} ip - The ip of the peer
 * @param {number} port - The port of the peer
 * @param {{ gateway?: string }} [options]
 * @returns {Promise<Peer>}
 */
export async function pingPeer(protocol, ip, port, options = {}) {
  const requestBody = {};

  try {
    const response = await axios.post(
      peerUrl(protocol, ip, port, "/ping", options.gateway),
      requestBody,
      {
        headers: authHeaders({
          "Content-Type": "application/json",
        }),
      }
    );

    const data = response.data;
    const contactData = data.contact;
    return new Peer(
      contactData.name,
      contactData.ips,
      contactData.port,
      ip
    );
  } catch (error) {
    console.error("Error pinging the host:", error);
    throw error;
  }
}
