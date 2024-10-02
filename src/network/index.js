import { Network as BaseNetwork, API } from "../model/index.js";
import { Table } from "./table.js";
import { Peer } from "./peer.js";
import { decodeUrl64, parent, ROOT, transform } from "../utilities/encoding.js";

/**
 * Represents the network abstraction that manages peer-to-peer interactions.
 * This class extends the base Network class and handles peer selection, retries,
 * and maintaining the routing table.
 */
class Network extends BaseNetwork {
  /**
   * Constructs a new Network instance.
   * @param {API} api - The API instance used for network requests.
   * @param {string[]} hosts - An array of bootstrap hosts to initialize the network.
   */
  constructor(api, hosts) {
    super();

    this._api = api;
    this._hosts = hosts;
    this._table = new Table();
    this._attempts = 3;

    // Initialize the network by searching for peers
    this.discoverPeers();
  }

  /**
   * Initializes the network by searching for peers and populating the routing table.
   */
  async discoverPeers() {
    try {
      const bootstraps = [];

      // Use Promise.all to wait for all asynchronous operations
      await Promise.all(
        this._hosts.map(async (host) => {
          try {
            const [ip, port] = host.split("|");
            const peer = await this._api.pingPeer(ip, port);
            bootstraps.push(peer);
          } catch (error) {
            console.warn(`Failed to add bootstrap peer with host ${host}.`);
          }
        })
      );

      if (bootstraps.length === 0) {
        // If all attempts fail, throw an error
        throw new Error("Failed to find peers with bootstrap hosts.");
      }
      bootstraps.forEach((peer) => this._table.insert(peer.id(), peer));
    } catch (error) {
      console.error("Error initializing peers:", error);
    }
  }

  /**
   * Adds an item to a collection at a specific location in the network.
   * If the operation fails, it retries with a different peer.
   * @param {string} collection - The name of the collection.
   * @param {string} root - The targeted root set.
   * @param {string} location - The location identifier within the collection.
   * @param {string} reference - The unique identifier of the item to add.
   * @returns {Promise<void>}
   */
  async addItem(collection, root, location, reference) {
    let attempts = this._attempts;

    const id = transform(collection, location);

    while (true) {
      // Find the nearest peer to the id
      let peer = this._table.nearest(id);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(id);
      }

      try {
        await this._api.addItem(peer, collection, root, location, reference);
        return;
      } catch (error) {
        // If the request fails, remove the peer from the table and retry
        this._table.remove(peer.id());
        console.warn(
          `Failed to add item via peer ${peer.hash()}. Retrying with a different peer...`
        );

        attempts--;
        if (attempts == 0) {
          // If all attempts fail, throw an error
          throw new Error("Failed to retrieve set after multiple attempts.");
        }
      }
    }
  }

  /**
   * Retrieves a set of items from a collection at a specific location in the network.
   * If the operation fails, it retries with a different peer.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @returns {Promise<any>} - A promise that resolves with the retrieved set of items.
   */
  async getSet(collection, location) {
    let attempts = this._attempts;
    let next = location;

    while (true) {
      const id = transform(collection, next);

      // Find the nearest peer to the id
      let peer = this._table.nearest(id);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(id);
      }

      try {
        const response = await this._api.getSet(peer, collection, location);

        if (
          response.contact instanceof Peer &&
          response.contact.hash() !== peer.hash()
        ) {
          this._table.insert(response.contact.id(), response.contact);
          if (response.set === null) continue;
        }

        if (response.set !== null) return response.set;

        if (location !== ROOT && next === ROOT) {
          console.log("ISSUE:", peer.hash(), collection, location);
          return [];
        }
        next = parent(next);
      } catch (error) {
        // If the request fails, remove the peer from the table and retry
        this._table.remove(peer.id());
        console.warn(
          `Failed to get set via peer ${peer.hash()}. Retrying with a different peer...$`
        );

        attempts--;
        if (attempts == 0) {
          // If all attempts fail, throw an error
          throw new Error("Failed to retrieve set after multiple attempts.");
        }
      }
    }
  }
}

export { Network };
