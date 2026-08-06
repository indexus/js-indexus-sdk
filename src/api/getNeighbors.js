import axios from "axios";

import { Peer } from "../network/peer.js";
import { getHostFromIP } from "../utilities/network.js";
import { authHeaders } from "./authHeaders.js";

/**
 * Fetch XOR-nearest neighbors of `origin` (url64 peer name) from a peer.
 * @param {string} protocol
 * @param {Peer} peer
 * @param {string} origin - url64-encoded origin id used as the query key
 * @returns {Promise<Peer[]>}
 */
export async function getNeighbors(protocol, peer, origin) {
  const response = await axios.get(
    `${protocol}://${getHostFromIP(peer.ip())}:${peer.port()}/neighbors`,
    {
      params: { origin },
      headers: authHeaders({
        "Content-Type": "application/json",
      }),
    }
  );

  const list = response.data?.neighbors || [];
  return list.map((contactData) => {
    const ips = contactData.ips || {};
    const ip =
      contactData.ip ||
      Object.keys(ips)[0] ||
      peer.ip();
    return new Peer(contactData.name, ips, contactData.port, ip);
  });
}
