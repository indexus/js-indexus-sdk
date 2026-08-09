import { getHostFromIP } from "../utilities/network.js";

/**
 * Build an absolute URL to a peer path.
 *
 * When `gateway` is set (dashboard `/api/p2p`), every peer shares one browser
 * origin so HTTP/1.1's ~6 sockets-per-host cap does not serialize getSets.
 * The gateway path is `/{port}{path}` and the server fans out to the node.
 *
 * @param {string} protocol - `http` | `https` (ignored when gateway is set)
 * @param {string} ip
 * @param {number} port
 * @param {string} path - must start with `/`
 * @param {string | null | undefined} gateway
 */
export function peerUrl(protocol, ip, port, path, gateway) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (typeof gateway === "string" && gateway) {
    return `${gateway.replace(/\/$/, "")}/${port}${suffix}`;
  }
  return `${protocol}://${getHostFromIP(ip)}:${port}${suffix}`;
}
