import { Peer } from "./Peer.js";

/**
 * Represents the API for interacting with peers to add items and retrieve sets.
 */
class API {
  /**
   * Ping
   * @param {string} protocol - Protocol to use to contact the peer http/https.
   * @param {string} ip - The ip of the peer
   * @param {number} port - The port of the peer
   * @returns {Promise<Peer>} - A promise that resolves when the item is added.
   */
  async pingPeer(protocol, ip, port) {}

  /**
   * Adds an item to a collection at a specific location on a peer.
   * @param {string} protocol - Protocol to use to contact the peer http/https.
   * @param {Peer} peer - The peer to which the item will be added.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @param {number[]} metrics - The metrics of the item to add.
   * @param {string} reference - The unique identifier of the item to add.
   * @returns {Promise<any>} - A promise that resolves when the item is added.
   */
  async addItem(protocol, peer, collection, location, metrics, reference) {}

  /**
   * Compatibility alias over getSets([location]).
   * @param {string} protocol
   * @param {Peer} peer
   * @param {string} collection
   * @param {string} location
   * @param {boolean} [deep]
   * @returns {Promise<{ contact: Peer, set: Element[] | null }>}
   */
  async getSet(protocol, peer, collection, location, deep) {}

  /**
   * Batch GET `/sets` (binary). Opt-in `envelope` carries IXS1 owner redirects.
   * When `options.routingKey` is set the peer may answer with a closer read
   * ingress, returned as `ingress`.
   * @param {string} protocol
   * @param {Peer} peer
   * @param {string} collection
   * @param {string[]} locations
   * @param {{ propertyCount?: number, deep?: boolean, refresh?: boolean, envelope?: boolean, via?: string|string[], routingKey?: Uint8Array }} [options]
   * @returns {Promise<{ elements: Array, redirects: Array, ingress?: { name: string, ip: string, port: number } | null }>}
   */
  async getSets(protocol, peer, collection, locations, options) {}
}

export { API };
