import { Peer } from "./peer.js";
import { BinarySearchTree } from "../model/BinarySearchTree.js";

/**
 * Represents a routing table that stores peers using a binary search tree.
 */
class Table {
  /**
   * Constructs a new Table instance.
   */
  constructor() {
    this._bst = new BinarySearchTree();
  }

  /**
   * Inserts a peer into the routing table.
   * @param {Peer} peer - The peer to insert.
   */
  insert(id, peer) {
    if (!(id instanceof Uint8Array)) {
      throw new Error("Peer ID must be a Uint8Array");
    }
    this._bst.insert(0, id, peer);
  }

  /**
   * Finds the nearest peer to the given id.
   * @param {Uint8Array} id - The id to find the nearest peer for.
   * @returns {Peer|null} - The nearest peer to the given id, or null if none found.
   */
  nearest(id) {
    if (!(id instanceof Uint8Array)) {
      throw new Error("id must be a Uint8Array");
    }
    const peer = this._bst.nearest(0, id);
    return peer instanceof Peer ? peer : null;
  }

  /**
   * Removes a peer from the routing table based on its id.
   * @param {Uint8Array} id - The id of the peer to remove.
   * @returns {boolean} - Returns true if the peer was successfully removed.
   */
  remove(id) {
    if (!(id instanceof Uint8Array)) {
      throw new Error("id must be a Uint8Array");
    }
    return this._bst.remove(0, id);
  }
}

export { Table };
