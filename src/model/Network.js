import { Element } from "./Element.js";
/**
 * Represents the API for interacting with peers to add items and retrieve sets.
 */
class Network {
  /**
   * Adds an item to a collection at a specific location in the network.
   * If the operation fails, it retries with a different peer.
   * @param {string} collection - The name of the collection.
   * @param {string} root - The targeted root set.
   * @param {string} location - The location identifier within the collection.
   * @param {number[]} metrics - The metrics of the item to add.
   * @param {string} reference - The unique identifier of the item to add.
   * @returns {Promise<void>}
   */
  static async addItem(collection, root, location, metrics, reference) {}

  /**
   * Deletes an item from a collection at a specific location in the network.
   * If the operation fails, it retries with a different peer.
   * @param {string} collection - The name of the collection.
   * @param {string} root - The targeted root set.
   * @param {string} location - The location identifier within the collection.
   * @param {string} reference - The unique identifier of the item to delete.
   * @returns {Promise<void>}
   */
  static async deleteItem(collection, root, location, reference) {}

  /**
   * Retrieves a set of items from a collection at a specific location in the network.
   * The method selects the appropriate peer(s) to handle the request.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @param {boolean} deep - Path-fill on/off (recurse to owner + fill LRU).
   * @returns {Promise<Element[]>} - A promise that resolves with the retrieved set of items.
   */
  static async getSet(collection, location, deep) {}
}

export { Network };
