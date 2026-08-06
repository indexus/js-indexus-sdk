import axios from "axios";

import { Peer } from "../network/peer.js";
import { getHostFromIP } from "../utilities/network.js";
import { authHeaders } from "./authHeaders.js";

/**
 * GET /sets — binary stream (application/octet-stream). Multiple locations comma-separated.
 *
 * @param {string} protocol
 * @param {Peer} peer
 * @param {string} collection
 * @param {string[]} locations
 * @returns {Promise<Uint8Array>}
 */
export async function getSetsBinary(protocol, peer, collection, locations) {
  const cleaned = Array.isArray(locations)
    ? locations.map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (cleaned.length === 0) {
    return new Uint8Array(0);
  }
  const locParam = cleaned.join(",");
  const url = `${protocol}://${getHostFromIP(
    peer.ip()
  )}:${peer.port()}/sets?collection=${encodeURIComponent(
    collection
  )}&location=${encodeURIComponent(locParam)}`;

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: authHeaders(),
  });

  const raw = response.data;
  return raw instanceof Uint8Array ? raw : new Uint8Array(raw);
}
