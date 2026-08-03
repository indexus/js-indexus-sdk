// Network.js

import { Network as BaseNetwork, API } from "../model/index.js";
import { Table } from "./table.js";
import { Peer } from "./peer.js";
import { Throttler } from "./throttler.js";
import { parent, ROOT, transform } from "../utilities/encoding.js";

function randomRoutingKey(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

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

    // Stable per-session XOR routing key: first hop targets the nearest
    // peer to this key (read + write ingress), not the data owner.
    this._routingKey = randomRoutingKey(16);

    // Initialize the network by searching for peers
    this.discoverPeers();
  }

  getConcurrency() {
    return this._concurrency;
  }

  /** @returns {Uint8Array} session routing key used for ingress peer selection */
  routingKey() {
    return this._routingKey;
  }

  /**
   * Initializes the network by searching for peers and populating the routing table.
   */
  async discoverPeers() {
    try {
      const bootstraps = [];

      // Wrap each pingPeer call with the throttler's enqueue method
      const tasks = this._hosts.map((host) =>
        this._throttler.enqueue(`pingPeer:${host}`, async () => {
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
   * Ingress uses the session routing key (neighbor), not the data owner.
   * If the operation fails, it retries with a different peer.
   */
  async addItem(collection, root, location, metrics, reference) {
    let attempts = this._attempts;
    const tried = new Set();

    while (true) {
      let peer = this._table.nearest(this._routingKey);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(this._routingKey);
      }

      // Fallback: try owner-direction peer if ingress peer already failed.
      if (!peer || tried.has(peer.hash())) {
        peer = this._table.nearest(transform(collection, location));
      }

      if (!peer) {
        throw new Error("No peers available for write ingress.");
      }
      tried.add(peer.hash());

      try {
        const addItemKey = `addItem:${collection}:${root}:${location}:${reference}`;

        await this._throttler.enqueue(addItemKey, () =>
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
        this._table.remove(peer.id());
        console.warn(
          `Failed to add item via peer ${peer.hash()}. Retrying with a different peer...`
        );

        attempts--;
        if (attempts === 0) {
          throw new Error("Failed to add item after multiple attempts.");
        }
      }
    }
  }

  /**
   * Deletes an item from a collection at a specific location in the network.
   * Same ingress as addItem: the session routing key, not the data owner.
   * If the operation fails, it retries with a different peer.
   */
  async deleteItem(collection, root, location, reference) {
    let attempts = this._attempts;
    const tried = new Set();

    while (true) {
      let peer = this._table.nearest(this._routingKey);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(this._routingKey);
      }

      // Fallback: try owner-direction peer if ingress peer already failed.
      if (!peer || tried.has(peer.hash())) {
        peer = this._table.nearest(transform(collection, location));
      }

      if (!peer) {
        throw new Error("No peers available for write ingress.");
      }
      tried.add(peer.hash());

      try {
        const deleteItemKey = `deleteItem:${collection}:${root}:${location}:${reference}`;

        await this._throttler.enqueue(deleteItemKey, () =>
          this._api.deleteItem(
            this._protocol,
            peer,
            collection,
            root,
            location,
            reference
          )
        );
        // Drop our own copy for this location; ancestors expire on TTL.
        this._cache.delete(`${collection}:${location}`);
        return;
      } catch (error) {
        this._table.remove(peer.id());
        console.warn(
          `Failed to delete item via peer ${peer.hash()}. Retrying with a different peer...`
        );

        attempts--;
        if (attempts === 0) {
          throw new Error("Failed to delete item after multiple attempts.");
        }
      }
    }
  }

  /**
   * Retrieves a set. First hop uses the session routing key so the nearest
   * neighbor can serve from cache / path-fill. Follows contact redirects and
   * parent locations as before.
   *
   * `depth` is the path-fill budget handed to the first peer: 2 (default) lets
   * it fetch and cache on our behalf, 0 asks for a contact redirect instead —
   * useful for dense leaves whose payload is not worth caching at every hop.
   */
  async getSet(collection, location, depth = 2) {
    let attempts = this._attempts;
    let next = location;

    const cacheKey = `${collection}:${location}`;

    if (this._cache.has(cacheKey)) {
      const cachedSet = this._cache.get(cacheKey);
      this._cache.delete(cacheKey);
      this._cache.set(cacheKey, cachedSet);
      return cachedSet;
    }

    const getSetKey = `getSet:${collection}:${location}`;

    return this._throttler.enqueue(getSetKey, async () => {
      let useRoutingKey = true;
      while (true) {
        const id = useRoutingKey
          ? this._routingKey
          : transform(collection, next);

        let peer = this._table.nearest(id);

        if (!peer) {
          await this.discoverPeers();
          peer = this._table.nearest(id);
        }

        try {
          const response = await this._api.getSet(
            this._protocol,
            peer,
            collection,
            location,
            depth
          );

          if (
            response.contact instanceof Peer &&
            response.contact.hash() !== peer.hash()
          ) {
            this._table.insert(response.contact.id(), response.contact);
            if (response.set === null) {
              // Follow toward owner / path-fill contact.
              useRoutingKey = false;
              continue;
            }
          }

          if (response.set !== null) {
            if (this._cache.size >= this._cacheSize) {
              const firstKey = this._cache.keys().next().value;
              this._cache.delete(firstKey);
            }
            this._cache.set(cacheKey, response.set);
            return response.set;
          }

          if (next === ROOT) {
            return [];
          }
          next = parent(next);
          useRoutingKey = true;
        } catch (error) {
          this._table.remove(peer.id());
          console.warn(
            `Failed to get set via peer ${peer.hash()}. Retrying with a different peer...`
          );

          attempts--;
          if (attempts === 0) {
            throw new Error("Failed to retrieve set after multiple attempts.");
          }
        }
      }
    });
  }
}

export { Network };
