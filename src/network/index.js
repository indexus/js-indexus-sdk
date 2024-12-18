// Network.js

import { Network as BaseNetwork, API } from "../model/index.js";
import { Table } from "./table.js";
import { Peer } from "./peer.js";
import { Throttler } from "./throttler.js";
import { decodeUrl64, parent, ROOT, transform } from "../utilities/encoding.js";

/**
 * Represents the network abstraction that manages peer-to-peer interactions.
 * This class extends the base Network class and handles peer selection, retries,
 * and maintaining the routing table with throttled network calls.
 */
class Network extends BaseNetwork {
  /**
   * Constructs a new Network instance.
   * @param {string} protocol - The protocol identifier.
   * @param {API} api - The API instance used for network requests.
   * @param {string[]} hosts - An array of bootstrap hosts to initialize the network.
   * @param {number} concurrency - The maximum number of concurrent network calls.
   * @param {number} cacheSize - The maximum number of sets to keep in the cache.
   */
  constructor(protocol, api, hosts, concurrency = 50, cacheSize = 1000) {
    super();

    this._protocol = protocol;
    this._api = api;
    this._hosts = hosts;
    this._table = new Table();
    this._attempts = 3;

    this._concurrency = concurrency;

    // Initialize the throttler with the specified concurrency limit
    this._throttler = new Throttler(this._concurrency);

    // Initialize the cache with a maximum size
    this._cache = new Map();
    this._cacheSize = cacheSize;

    // Initialize the network by searching for peers
    this.discoverPeers();
  }

  getConcurrency() {
    return this._concurrency;
  }

  /**
   * Initializes the network by searching for peers and populating the routing table.
   */
  async discoverPeers() {
    try {
      const bootstraps = [];

      // Wrap each pingPeer call with the throttler's enqueue method
      const tasks = this._hosts.map((host) =>
        this._throttler.enqueue(async () => {
          try {
            const [ip, port] = host.split("|");
            const peer = await this._api.pingPeer(this._protocol, ip, port);
            bootstraps.push(peer);
          } catch (error) {
            console.warn(`Failed to add bootstrap peer with host ${host}.`);
          }
        })
      );

      // Wait for all throttled pingPeer tasks to complete
      await Promise.all(tasks);

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
   * @param {number[]} metrics - The metrics of the item to add.
   * @param {string} reference - The unique identifier of the item to add.
   * @returns {Promise<void>}
   */
  async addItem(collection, root, location, metrics, reference) {
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
        // Wrap the addItem API call with the throttler's enqueue method
        await this._throttler.enqueue(() =>
          this._api.addItem(
            this._protocol,
            peer,
            collection,
            root,
            location,
            metrics,
            reference
          )
        );
        return;
      } catch (error) {
        // If the request fails, remove the peer from the table and retry
        this._table.remove(peer.id());
        console.warn(
          `Failed to add item via peer ${peer.hash()}. Retrying with a different peer...`
        );

        attempts--;
        if (attempts === 0) {
          // If all attempts fail, throw an error
          throw new Error("Failed to add item after multiple attempts.");
        }
      }
    }
  }

  /**
   * Retrieves a set of items from a collection at a specific location in the network.
   * If the operation fails, it retries with a different peer.
   * Implements caching to store and retrieve sets efficiently.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @returns {Promise<any>} - A promise that resolves with the retrieved set of items.
   */
  async getSet(collection, location) {
    let attempts = this._attempts;
    let next = location;

    const cacheKey = `${collection}:${location}`;

    // Check the cache before making a network request
    if (this._cache.has(cacheKey)) {
      // Move the key to the end to mark it as recently used
      const cachedSet = this._cache.get(cacheKey);
      this._cache.delete(cacheKey);
      this._cache.set(cacheKey, cachedSet);
      return cachedSet;
    }

    while (true) {
      const id = transform(collection, next);

      // Find the nearest peer to the id
      let peer = this._table.nearest(id);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(id);
      }

      try {
        // Wrap the getSet API call with the throttler's enqueue method
        const response = await this._throttler.enqueue(() =>
          this._api.getSet(this._protocol, peer, collection, location)
        );

        if (
          response.contact instanceof Peer &&
          response.contact.hash() !== peer.hash()
        ) {
          this._table.insert(response.contact.id(), response.contact);
          if (response.set === null) continue;
        }

        if (response.set !== null) {
          // Before adding to cache, check if cache is at capacity
          if (this._cache.size >= this._cacheSize) {
            // Remove the least recently used (first inserted) item
            const firstKey = this._cache.keys().next().value;
            this._cache.delete(firstKey);
          }
          // Add the new set to the cache and mark it as recently used
          this._cache.set(cacheKey, response.set);
          return response.set;
        }

        if (next === ROOT) {
          return [];
        }
        next = parent(next);
      } catch (error) {
        // If the request fails, remove the peer from the table and retry
        this._table.remove(peer.id());
        console.warn(
          `Failed to get set via peer ${peer.hash()}. Retrying with a different peer...`
        );

        attempts--;
        if (attempts === 0) {
          // If all attempts fail, throw an error
          throw new Error("Failed to retrieve set after multiple attempts.");
        }
      }
    }
  }
}

export { Network };
