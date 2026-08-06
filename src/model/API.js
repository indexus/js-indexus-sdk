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
   * Deletes an item from a collection at a specific location on a peer.
   * @param {string} protocol - Protocol to use to contact the peer http/https.
   * @param {Peer} peer - The peer holding the ingress for the deletion.
   * @param {string} collection - The name of the collection.
   * @param {string} root - The targeted root set.
   * @param {string} location - The location identifier within the collection.
   * @param {string} reference - The unique identifier of the item to delete.
   * @returns {Promise<any>} - A promise that resolves when the deletion is accepted.
   */
  async deleteItem(protocol, peer, collection, root, location, reference) {}

  /**
   * Retrieves a set of items from a collection at a specific location on a peer.
   * @param {string} protocol - Protocol to use to contact the peer http/https.
   * @param {Peer} peer - The peer from which to retrieve the set.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @param {boolean} deep - Path-fill on/off (recurse to owner + fill LRU).
   * @returns {Promise<Element[]>} - A promise that resolves with the retrieved set of items.
   */
  async getSet(protocol, peer, collection, location, deep) {}
}

export { API };
