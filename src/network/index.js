// Network.js

import { Network as BaseNetwork, API } from "../model/index.js";
import { Table } from "./table.js";
import { Peer } from "./peer.js";
import { Throttler } from "./throttler.js";
import { encodeUrl64, parent, ROOT, transform } from "../utilities/encoding.js";

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

    // Client identity in the XOR space — used as /neighbors origin and as
    // first-hop for reads (path-fill / cache). Writes target the item key.
    this._routingKey = randomRoutingKey(16);

    // Initialize the network by searching for peers (await via whenReady / getSet).
    this._ready = this.discoverPeers();
  }

  /**
   * Resolves once the initial bootstrap peer discovery attempt finishes.
   * @returns {Promise<void>}
   */
  whenReady() {
    return this._ready ?? Promise.resolve();
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
   * Bootstraps are pinged, then each is asked for neighbors of this client's key
   * so the table is not stuck on a single entry point.
   */
  async discoverPeers() {
    try {
      const bootstraps = [];

      const tasks = this._hosts.map((host) =>
        this._throttler.enqueue(`pingPeer:${host}`, async () => {
          try {
            const [ip, port] = host.split("|");
            const peer = await this._api.pingPeer(this._protocol, ip, port);
            // Bootstrap seeds stay in the table even while joining so discovery
            // has an entry point; writes still skip clientReady=false hops.
            bootstraps.push(peer);
          } catch (error) {
            console.warn(`Failed to add bootstrap peer with host ${host}.`);
          }
        })
      );

      await Promise.all(tasks);

      if (bootstraps.length === 0) {
        throw new Error("Failed to find peers with bootstrap hosts.");
      }
      bootstraps.forEach((peer) => {
        if (peer.clientReady && peer.clientReady() === false) {
          // Keep seed reachable for rediscovery, but not as a write hop.
          this._joining = this._joining || new Map();
          this._joining.set(peer.hash(), peer);
          return;
        }
        this._table.insert(peer.id(), peer);
      });

      const origin = encodeUrl64(this._routingKey);
      const expand = bootstraps.map((peer) =>
        this._throttler.enqueue(`neighbors:${peer.hash()}`, async () => {
          try {
            if (typeof this._api.getNeighbors !== "function") return;
            const neighbors = await this._api.getNeighbors(
              this._protocol,
              peer,
              origin
            );
            for (const n of neighbors) {
              // Neighbors do not carry client_ready — ping before advertising
              // as a write hop so joining spawned nodes stay invisible.
              try {
                const live = await this._api.pingPeer(
                  this._protocol,
                  n.ip(),
                  n.port()
                );
                if (live.clientReady && live.clientReady() === false) {
                  this._joining = this._joining || new Map();
                  this._joining.set(live.hash(), live);
                  continue;
                }
                this._table.insert(live.id(), live);
              } catch {
                // Unreachable neighbour — skip.
              }
            }
          } catch (error) {
            // Neighbor expansion is best-effort; bootstrap alone still works.
          }
        })
      );
      await Promise.all(expand);

      // Promote peers that finished mirroring since last discover.
      if (this._joining && this._joining.size) {
        for (const [hash, peer] of [...this._joining]) {
          try {
            const live = await this._api.pingPeer(
              this._protocol,
              peer.ip(),
              peer.port()
            );
            if (!live.clientReady || live.clientReady() !== false) {
              this._table.insert(live.id(), live);
              this._joining.delete(hash);
            }
          } catch {
            // Still booting or gone.
          }
        }
      }
    } catch (error) {
      console.error("Error initializing peers:", error);
    }
  }

  /**
   * First hop for a write: peer whose id is closest to transform(collection, location).
   * Keys are effectively random in XOR space, so load spreads across the mesh.
   * Peers still joining (client_ready=false) are never selected.
   */
  _writePeer(collection, location, tried) {
    const key = transform(collection, location);
    let peer = this._table.nearest(key);
    if (peer && (tried.has(peer.hash()) || (peer.clientReady && peer.clientReady() === false))) {
      peer = null;
    }
    // Fallback: any other known peer near the session key (still not sticky
    // to bootstrap unless it is the only contact).
    if (!peer) {
      peer = this._table.nearest(this._routingKey);
      if (peer && (tried.has(peer.hash()) || (peer.clientReady && peer.clientReady() === false))) {
        peer = null;
      }
    }
    return peer;
  }

  /**
   * Adds an item to a collection at a specific location in the network.
   * Ingress targets the peer nearest the item key, not a fixed bootstrap.
   */
  async addItem(collection, root, location, metrics, reference) {
    let attempts = this._attempts;
    const tried = new Set();

    while (true) {
      let peer = this._writePeer(collection, location, tried);

      if (!peer) {
        await this.discoverPeers();
        peer = this._writePeer(collection, location, tried);
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
        const msg = String(error?.message || error || "");
        // Joining nodes refuse with ErrJoining — park them for rediscovery
        // instead of dropping the contact (they become routable after publish).
        if (/joining ownership|still joining/i.test(msg)) {
          if (typeof peer.setClientReady === "function") {
            peer.setClientReady(false);
          }
          this._joining = this._joining || new Map();
          this._joining.set(peer.hash(), peer);
          this._table.remove(peer.id());
        } else {
          this._table.remove(peer.id());
        }
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
   * Same ingress as addItem: peer nearest the item key.
   */
  async deleteItem(collection, root, location, reference) {
    let attempts = this._attempts;
    const tried = new Set();

    while (true) {
      let peer = this._writePeer(collection, location, tried);

      if (!peer) {
        await this.discoverPeers();
        peer = this._writePeer(collection, location, tried);
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
   * neighbor is the ingress seed (traffic spread). deep=true asks that peer
   * to path-fill recursively into its LRU; deep=false asks for a contact
   * redirect only.
   */
  async getSet(collection, location, deep = true) {
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
      await this.whenReady();
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

        if (!peer) {
          throw new Error("Failed to find peers with bootstrap hosts.");
        }

        try {
          const response = await this._api.getSet(
            this._protocol,
            peer,
            collection,
            location,
            deep
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

  /**
   * Batch getSets via the session routing-key ingress seed (same distribution
   * as getSet). deep defaults true so the seed path-fills misses into its LRU.
   */
  async getSets(collection, locations, options = {}) {
    await this.whenReady();
    let peer = this._table.nearest(this._routingKey);
    if (!peer) {
      await this.discoverPeers();
      peer = this._table.nearest(this._routingKey);
    }
    if (!peer) {
      throw new Error("Failed to find peers with bootstrap hosts.");
    }
    const deep = options.deep !== false;
    return this._api.getSets(this._protocol, peer, collection, locations, {
      ...options,
      deep,
    });
  }
}

export { Network };
