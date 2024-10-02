import { Peer } from "./Peer.js";

/**
 * Represents the API for interacting with peers to add items and retrieve sets.
 */
class API {
  /**
   * Ping
   * @param {string} host - The host of the peer.
   * @returns {Promise<Peer>} - A promise that resolves when the item is added.
   */
  async pingPeer(host) {}

  /**
   * Adds an item to a collection at a specific location on a peer.
   * @param {Peer} peer - The peer to which the item will be added.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @param {string} reference - The unique identifier of the item to add.
   * @returns {Promise<any>} - A promise that resolves when the item is added.
   */
  async addItem(peer, collection, location, reference) {}

  /**
   * Retrieves a set of items from a collection at a specific location on a peer.
   * @param {Peer} peer - The peer from which to retrieve the set.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @returns {Promise<Element[]>} - A promise that resolves with the retrieved set of items.
   */
  async getSet(peer, collection, location) {}
}

export { API };
