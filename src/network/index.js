// Network.js

import { Network as BaseNetwork, API } from "../model/index.js";
import { Table } from "./table.js";
import { Peer } from "./peer.js";
import { Throttler } from "./throttler.js";
import { zoneKey, zoneKeyID, encodeUrl64, parent, ROOT } from "../utilities/encoding.js";
import { distributeElementsByParent } from "../api/decodeSetsBinary.js";
import { SetsCoalescePool } from "./setsCoalescePool.js";
import { abelianTotal } from "../entities/abelian.js";
import { debugEnabled, debugLog, signed } from "../utilities/debug.js";

/** @typedef {"ingress" | "direct"} ReadNavigation */
/** @typedef {"getSet" | "getSets"} ReadMethod */

function normalizeNavigation(value) {
  return value === "direct" ? "direct" : "ingress";
}

function normalizeMethod(value) {
  return value === "getSet" ? "getSet" : "getSets";
}

function randomRoutingKey(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function now() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

// Shared bit prefix length — the ordering Table#nearest walks, so it tells
// whether a hinted peer is really closer in our own view of the mesh.
function commonPrefixBits(a, b) {
  const len = Math.min(a.length, b.length);
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const diff = a[i] ^ b[i];
    if (diff === 0) {
      bits += 8;
      continue;
    }
    for (let bit = 7; bit >= 0; bit--) {
      if ((diff >> bit) & 1) return bits;
      bits++;
    }
  }
  return bits;
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
   * @param {{
   *   setsMaxChunkSize?: number,
   *   setsMaxParallelChunks?: number,
   *   navigation?: ReadNavigation,
   *   method?: ReadMethod,
   *   refreshTtlMs?: number,
   * }} [setsPoolOptions] - tuning for merged `/sets` batching and shared read modes.
   */
  constructor(
    protocol,
    api,
    hosts,
    concurrency = 50,
    cacheSize = 1000,
    setsPoolOptions = {}
  ) {
    super();

    this._protocol = protocol;
    this._api = api;
    this._hosts = hosts;
    this._table = new Table();
    this._attempts = 3;

    this._concurrency = concurrency;

    // Initialize the throttler with the specified concurrency limit
    this._throttler = new Throttler(this._concurrency);

    // Session seed: the XOR-nearest peer is the read ingress, and every read
    // goes through getSets → ingressPeer(), so a session stays on one node.
    this._routingKey = randomRoutingKey(16);

    // Hinted peers unreachable from this client. Without it the server keeps
    // re-advertising them and the ingress flaps across the whole mesh.
    this._hintRejected = new Set();

    // Initialize the cache with a maximum size
    this._cache = new Map();
    this._cacheSize = cacheSize;
    /** zone key → wall clock of the answer that filled `_cache`. */
    this._cacheFetchedAt = new Map();
    /** zone key → the read wave currently on the wire for that zone. */
    this._inflight = new Map();

    const poolCfg =
      setsPoolOptions && typeof setsPoolOptions === "object" ? setsPoolOptions : {};

    // A zone re-read within this window is served from cache even when the
    // caller asks for `refresh`. The Aggregate repair pass walks the whole
    // visible tree every time it runs, and without a floor those passes chain
    // into a permanent `/sets` storm.
    this._refreshTtlMs =
      Number.isFinite(poolCfg.refreshTtlMs) && poolCfg.refreshTtlMs >= 0
        ? Math.floor(poolCfg.refreshTtlMs)
        : 5000;

    this._readNavigation = normalizeNavigation(poolCfg.navigation);
    this._readMethod = normalizeMethod(poolCfg.method);
    this._setsPoolCfg = {
      setsMaxChunkSize:
        Number(poolCfg.setsMaxChunkSize) > 0
          ? Math.floor(poolCfg.setsMaxChunkSize)
          : 96,
      setsMaxParallelChunks:
        Number(poolCfg.setsMaxParallelChunks) > 0
          ? Math.floor(poolCfg.setsMaxParallelChunks)
          : Math.min(this._concurrency, 16),
    };
    this._setsPool = this._makeSetsPool();

    /** @type {null | ((ev: object) => void)} */
    this._onActivity = null;
    /** @type {null | ((peers: object[]) => void)} */
    this._onPeers = null;

    // Initialize the network by searching for peers (await via whenReady / getSets).
    this._ready = this.discoverPeers();
  }

  _makeSetsPool() {
    const chunkSize =
      this._readMethod === "getSet" ? 1 : this._setsPoolCfg.setsMaxChunkSize;
    return new SetsCoalescePool({
      maxChunkSize: chunkSize,
      maxParallelChunks: this._setsPoolCfg.setsMaxParallelChunks,
      fetchChunk: (coll, locs, refresh) =>
        this._fetchSetsChunk(coll, locs, refresh),
      finalizeWaiter: (coll, waiter) => this._finalizeSetsWaiter(coll, waiter),
    });
  }

  /**
   * Shared Nearby/Aggregate read configuration.
   * @returns {{ navigation: ReadNavigation, method: ReadMethod }}
   */
  readOptions() {
    return {
      navigation: this._readNavigation,
      method: this._readMethod,
    };
  }

  /**
   * Update shared read modes. Clears the `/sets` cache so ingress and direct
   * answers never mix in one session.
   * @param {{ navigation?: ReadNavigation, method?: ReadMethod }} options
   */
  setReadOptions(options = {}) {
    const nextNav = normalizeNavigation(
      options.navigation !== undefined ? options.navigation : this._readNavigation
    );
    const nextMethod = normalizeMethod(
      options.method !== undefined ? options.method : this._readMethod
    );
    if (nextNav === this._readNavigation && nextMethod === this._readMethod) {
      return;
    }
    this._readNavigation = nextNav;
    this._readMethod = nextMethod;
    this._cache.clear();
    this._cacheFetchedAt.clear();
    this._inflight.clear();
    this._setsPool = this._makeSetsPool();
  }

  setActivityHandler(handler) {
    this._onActivity = typeof handler === "function" ? handler : null;
  }

  setPeersHandler(handler) {
    this._onPeers = typeof handler === "function" ? handler : null;
  }

  // Session seed in the same base64url alphabet as peer hashes, so the UI can
  // compare it with the ingress node name.
  routingKeyHash() {
    return encodeUrl64(this._routingKey);
  }

  ingressPeer() {
    return this._table.nearest(this._routingKey);
  }

  /**
   * @returns {{ hash: string, ip: string, port: number, host: string, ingress: boolean }[]}
   */
  listPeers() {
    const peers = this._table.peers();
    const ingress = this.ingressPeer();
    const ingressHash = ingress ? ingress.hash() : null;
    const out = [];
    for (let i = 0; i < peers.length; i++) {
      const p = peers[i];
      const hash = p.hash();
      out.push({
        hash,
        ip: p.ip(),
        port: p.port(),
        host: `${p.ip()}|${p.port()}`,
        ingress: ingressHash != null && hash === ingressHash,
      });
    }
    return out;
  }

  _notifyPeers() {
    if (typeof this._onPeers !== "function") return;
    try {
      this._onPeers(this.listPeers());
    } catch {
      /* ignore UI bridge errors */
    }
  }

  // Opportunistic ingress from `/sets` response headers, so a client follows
  // mesh growth without discovery pings. Only strictly closer peers are
  // adopted: the server ranks against its own table, and trusting it blindly
  // would bounce the ingress back and forth.
  _adoptIngressHint(hint) {
    if (!hint || !hint.name || !hint.ip || !(hint.port > 0)) return;
    if (this._hintRejected.has(hint.name)) return;

    const current = this.ingressPeer();
    if (current && current.hash() === hint.name) return;

    try {
      const next = new Peer(hint.name, { [hint.ip]: null }, hint.port, hint.ip);
      if (current) {
        const currentBits = commonPrefixBits(current.id(), this._routingKey);
        const nextBits = commonPrefixBits(next.id(), this._routingKey);
        if (nextBits <= currentBits) return;
      }
      this._table.insert(next.id(), next);
      this._notifyPeers();
    } catch {
      /* ignore malformed hint */
    }
  }

  /**
   * @param {"start"|"end"} phase
   * @param {import("./peer.js").Peer | null} peer
   * @param {{ method: string, ok?: boolean, ms?: number, collection?: string, location?: string }} meta
   */
  _emitActivity(phase, peer, meta) {
    if (typeof this._onActivity !== "function") return;
    try {
      const ip = meta.ip ?? (peer ? peer.ip() : null);
      const port = meta.port ?? (peer ? peer.port() : null);
      const hash = meta.hash ?? (peer ? peer.hash() : null);
      this._onActivity({
        phase,
        method: meta.method,
        hash,
        ip,
        port,
        host: meta.host ?? (ip != null ? `${ip}|${port}` : null),
        ok: meta.ok,
        ms: meta.ms,
        collection: meta.collection,
        location: meta.location,
      });
    } catch {
      /* ignore */
    }
  }

  /**
   * @template T
   * @param {import("./peer.js").Peer} peer
   * @param {string} method
   * @param {() => Promise<T>} fn
   * @param {{ collection?: string, location?: string }} [meta]
   * @returns {Promise<T>}
   */
  async _withActivity(peer, method, fn, meta = {}) {
    const started = now();
    this._emitActivity("start", peer, { method, ...meta });
    try {
      const result = await fn();
      const ms = now() - started;
      this._emitActivity("end", peer, { method, ok: true, ms, ...meta });
      return result;
    } catch (error) {
      this._emitActivity("end", peer, {
        method,
        ok: false,
        ms: now() - started,
        ...meta,
      });
      throw error;
    }
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

  /**
   * Ping one bootstrap host. The contact is only known once the ping answers,
   * so the activity pair is emitted here rather than through _withActivity.
   * @param {string} host - `ip|port`
   * @returns {Promise<import("./peer.js").Peer | null>} null when unreachable
   */
  async _pingHost(host) {
    const [ip, port] = host.split("|");
    const meta = { method: "pingPeer", host, ip, port: Number(port) };
    const started = now();

    this._emitActivity("start", null, meta);
    try {
      const peer = await this._api.pingPeer(this._protocol, ip, port);
      this._emitActivity("end", peer, { ...meta, ok: true, ms: now() - started });
      return peer;
    } catch {
      this._emitActivity("end", null, { ...meta, ok: false, ms: now() - started });
      console.warn(`Failed to add bootstrap peer with host ${host}.`);
      return null;
    }
  }

  /**
   * Initializes the network by searching for peers and populating the routing table.
   */
  async discoverPeers() {
    const pings = this._hosts.map((host) =>
      this._throttler.enqueue(`pingPeer:${host}`, () => this._pingHost(host))
    );
    const peers = (await Promise.all(pings)).filter(Boolean);

    if (peers.length === 0) {
      console.error("Error initializing peers: no bootstrap host answered.");
      return;
    }

    peers.forEach((peer) => this._table.insert(peer.id(), peer));
    this._notifyPeers();
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

    const id = zoneKeyID(collection, location);

    while (true) {
      await this.whenReady();

      // A write goes to the peer nearest the zone, not to the read ingress.
      let peer = this._table.nearest(id);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(id);
      }

      if (!peer) {
        throw new Error("Failed to find peers with bootstrap hosts.");
      }

      try {
        // Generate a unique key for addItem
        const addItemKey = `addItem:${collection}:${root}:${location}:${reference}`;

        // Wrap the addItem API call with the throttler's enqueue method
        await this._throttler.enqueue(addItemKey, () =>
          this._withActivity(peer, "addItem", () =>
            this._api.addItem(
              this._protocol,
              peer,
              collection,
              root,
              location,
              metrics,
              reference
            ),
            { collection, location }
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
   * Deletes an item from a collection at a specific location in the network.
   * Same write ingress as {@link addItem}: peer nearest the zone key.
   * @param {string} collection
   * @param {string} root
   * @param {string} location
   * @param {string} reference
   * @returns {Promise<void>}
   */
  async deleteItem(collection, root, location, reference) {
    let attempts = this._attempts;
    const id = zoneKeyID(collection, location);

    while (true) {
      await this.whenReady();
      let peer = this._table.nearest(id);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(id);
      }

      if (!peer) {
        throw new Error("Failed to find peers with bootstrap hosts.");
      }

      try {
        const deleteItemKey = `deleteItem:${collection}:${root}:${location}:${reference}`;
        await this._throttler.enqueue(deleteItemKey, () =>
          this._withActivity(peer, "deleteItem", () =>
            this._api.deleteItem(
              this._protocol,
              peer,
              collection,
              root,
              location,
              reference
            ),
            { collection, location }
          )
        );
        this.invalidate(collection, location);
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
   * Children of one zone — permanent convenience alias over
   * {@link getSets}([location]). Shares wire protocol, cache, and navigation.
   * @param {string} collection
   * @param {string} location
   * @param {{ navigation?: ReadNavigation, method?: ReadMethod, refresh?: boolean }} [options]
   * @returns {Promise<any[]>}
   */
  async getSet(collection, location, options = {}) {
    const map = await this.getSets(collection, [location], options);
    const bucket = map.get(location);
    return Array.isArray(bucket) ? bucket : [];
  }

  /**
   * XOR-nearest peer for `id`, skipping peers already on the redirect path.
   * Must not await while peers are temporarily removed from the table.
   * @param {Uint8Array} id
   * @param {Set<string>} viaSet
   * @returns {import("./peer.js").Peer | null}
   */
  _nearestExcluding(id, viaSet) {
    if (!viaSet || viaSet.size === 0) {
      return this._table.nearest(id);
    }
    const removed = [];
    for (const peer of this._table.peers()) {
      if (viaSet.has(peer.hash())) {
        this._table.remove(peer.id());
        removed.push(peer);
      }
    }
    try {
      return this._table.nearest(id);
    } finally {
      for (const peer of removed) {
        this._table.insert(peer.id(), peer);
      }
    }
  }

  /**
   * LRU bump for an existing cache entry; undefined if absent.
   * @param {string} cacheKey
   * @returns {any[] | undefined}
   */
  _touchCacheEntry(cacheKey) {
    if (!this._cache.has(cacheKey)) {
      return undefined;
    }
    const cached = this._cache.get(cacheKey);
    this._cache.delete(cacheKey);
    this._cache.set(cacheKey, cached);
    return cached;
  }

  /**
   * @param {string} cacheKey
   * @param {any[]} bucket
   */
  _putCacheChildren(cacheKey, bucket) {
    if (!this._cache.has(cacheKey) && this._cache.size >= this._cacheSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
      this._cacheFetchedAt.delete(firstKey);
    }
    this._cache.set(cacheKey, bucket);
    this._cacheFetchedAt.set(cacheKey, Date.now());
  }

  /**
   * True while the cached answer for `cacheKey` is young enough that a
   * `refresh` read may reuse it instead of going back on the wire.
   * @param {string} cacheKey
   * @param {number} now
   */
  _refreshWithinTtl(cacheKey, now) {
    if (this._refreshTtlMs <= 0) return false;
    const fetchedAt = this._cacheFetchedAt.get(cacheKey);
    return fetchedAt !== undefined && now - fetchedAt < this._refreshTtlMs;
  }

  /**
   * Publish one read wave as the in-flight owner of every zone it covers, so
   * a parallel drill for the same zone joins it instead of duplicating it.
   * @param {string} collection
   * @param {string[]} locations
   * @param {Promise<any>} promise
   * @param {boolean} refresh
   */
  _trackInflight(collection, locations, promise, refresh) {
    const entry = { promise, refresh };
    const keys = locations.map((location) => zoneKey(collection, location));
    for (const key of keys) {
      this._inflight.set(key, entry);
    }
    const release = () => {
      for (const key of keys) {
        if (this._inflight.get(key) === entry) this._inflight.delete(key);
      }
    };
    promise.then(release, release);
  }

  /**
   * Single `/sets` wave for one chunk of parent locations (after cache filtering).
   * @param {string} collection
   * @param {string[]} locations
   * @param {boolean} [refresh] - ask the node past its own cache too. Dropping
   *   our cache alone only re-reads the same stale answer.
   * @param {{ navigation?: ReadNavigation }} [options]
   */
  async _fetchSetsChunk(collection, locations, refresh = false, options = {}) {
    const stillMissing = refresh
      ? locations.slice()
      : locations.filter(
          (location) => !this._cache.has(zoneKey(collection, location))
        );
    if (stillMissing.length === 0) {
      return;
    }

    const navigation = normalizeNavigation(
      options.navigation ?? this._readNavigation
    );
    if (navigation === "direct") {
      await this._fetchSetsDirect(collection, stillMissing, refresh);
      return;
    }
    await this._fetchSetsIngress(collection, stillMissing, refresh);
  }

  /**
   * Sticky client-key ingress, deep=true, routing-key header + hint adoption.
   */
  async _fetchSetsIngress(collection, stillMissing, refresh = false) {
    let attempts = this._attempts;

    while (true) {
      await this.whenReady();

      let peer = this.ingressPeer();

      if (!peer) {
        await this.discoverPeers();
        peer = this.ingressPeer();
      }

      if (!peer) {
        throw new Error("Failed to find peers with bootstrap hosts.");
      }

      try {
        const { elements, ingress } = await this._withActivity(
          peer,
          "getSets",
          () =>
            this._api.getSets(this._protocol, peer, collection, stillMissing, {
              deep: true,
              refresh,
              envelope: false,
              routingKey: this._routingKey,
            }),
          { collection, location: stillMissing[0] }
        );

        this._adoptIngressHint(ingress);
        this._storeFetchedBuckets(collection, stillMissing, elements, refresh);
        return;
      } catch (error) {
        const status = error?.response?.status ?? null;
        this._table.remove(peer.id());
        if (status === null) {
          this._hintRejected.add(peer.hash());
        }
        this._notifyPeers();
        console.warn(
          `Failed to get sets via peer ${peer.hash()}${
            status === null ? " (unreachable)" : ` (HTTP ${status})`
          }. Retrying with a different peer...`
        );
        debugLog("sets", "peer dropped for this read", {
          peer: peer.hash(),
          status,
          blacklisted: status === null,
          locations: stillMissing.length,
          first: stillMissing[0],
          attemptsLeft: attempts - 1,
          navigation: "ingress",
        });

        attempts--;
        if (attempts === 0) {
          throw new Error("Failed to retrieve sets after multiple attempts.");
        }
      }
    }
  }

  /**
   * Client-managed ownership following: deep=false, IXS1 redirects, regroup by
   * owner, parent-key peer fallback, bounded via. Never relies on server-side
   * inter-node deep reads.
   */
  async _fetchSetsDirect(collection, stillMissing, refresh = false) {
    await this.whenReady();
    if (!this.ingressPeer()) {
      await this.discoverPeers();
    }

    /** @type {Map<string, { via: Set<string>, probe: string, peer: import("./peer.js").Peer | null }>} */
    const pending = new Map();
    for (const location of stillMissing) {
      pending.set(location, {
        via: new Set(),
        probe: location,
        peer: null,
      });
    }

    const maxRounds = Math.max(8, this._attempts * stillMissing.length);
    for (let round = 0; round < maxRounds && pending.size > 0; round++) {
      /** @type {Map<string, { peer: import("./peer.js").Peer, locations: string[], via: string[] }>} */
      const groups = new Map();

      for (const [location, state] of pending) {
        let peer = state.peer;
        if (!peer) {
          const id = zoneKeyID(collection, state.probe);
          peer = this._nearestExcluding(id, state.via);
        }
        if (!peer) {
          this._putCacheChildren(zoneKey(collection, location), []);
          pending.delete(location);
          continue;
        }
        const key = peer.hash();
        let group = groups.get(key);
        if (!group) {
          group = {
            peer,
            locations: [],
            via: [...state.via],
          };
          groups.set(key, group);
        }
        group.locations.push(location);
        for (const name of state.via) {
          if (!group.via.includes(name)) group.via.push(name);
        }
      }

      if (groups.size === 0) break;

      await Promise.all(
        [...groups.values()].map((group) =>
          this._directRound(collection, group, pending, refresh)
        )
      );
    }

    for (const location of pending.keys()) {
      this._putCacheChildren(zoneKey(collection, location), []);
    }
  }

  /**
   * @param {string} collection
   * @param {{ peer: import("./peer.js").Peer, locations: string[], via: string[] }} group
   * @param {Map<string, { via: Set<string>, probe: string, peer: import("./peer.js").Peer | null }>} pending
   * @param {boolean} refresh
   */
  async _directRound(collection, group, pending, refresh) {
    const { peer, locations, via } = group;
    try {
      const { elements, redirects } = await this._withActivity(
        peer,
        "getSets",
        () =>
          this._api.getSets(this._protocol, peer, collection, locations, {
            deep: false,
            envelope: true,
            refresh,
            via,
          }),
        { collection, location: locations[0] }
      );

      const byParent = distributeElementsByParent(locations, elements);
      /** @type {Map<string, { name: string, ip: string, port: number }>} */
      const redirectByLoc = new Map();
      for (const redirect of redirects || []) {
        if (redirect?.location) redirectByLoc.set(redirect.location, redirect);
      }

      for (const location of locations) {
        const state = pending.get(location);
        if (!state) continue;
        state.via.add(peer.hash());

        const bucket = byParent.get(location) ?? [];
        if (bucket.length > 0) {
          if (refresh && debugEnabled("refresh")) {
            const before = this._cache.get(zoneKey(collection, location));
            const delta =
              abelianTotal(bucket).count - abelianTotal(before ?? []).count;
            if (delta !== 0) {
              debugLog("refresh", "zone moved", {
                location,
                was: abelianTotal(before ?? []).count,
                now: abelianTotal(bucket).count,
                delta: signed(delta),
              });
            }
          }
          this._putCacheChildren(zoneKey(collection, location), bucket);
          pending.delete(location);
          continue;
        }

        const redirect = redirectByLoc.get(location);
        if (redirect && redirect.name && redirect.port > 0) {
          if (state.via.has(redirect.name)) {
            this._putCacheChildren(zoneKey(collection, location), []);
            pending.delete(location);
            continue;
          }
          try {
            const next = new Peer(
              redirect.name,
              { [redirect.ip]: null },
              redirect.port,
              redirect.ip
            );
            this._table.insert(next.id(), next);
            state.peer = next;
            this._notifyPeers();
            continue;
          } catch {
            /* fall through to parent probe */
          }
        }

        // Parent-key peer fallback while still requesting the original location.
        if (state.probe === ROOT) {
          this._putCacheChildren(zoneKey(collection, location), []);
          pending.delete(location);
          continue;
        }
        const nextProbe = parent(state.probe);
        if (!nextProbe) {
          this._putCacheChildren(zoneKey(collection, location), []);
          pending.delete(location);
          continue;
        }
        state.probe = nextProbe;
        state.peer = null;
      }
    } catch (error) {
      const status = error?.response?.status ?? null;
      this._table.remove(peer.id());
      if (status === null) {
        this._hintRejected.add(peer.hash());
      }
      this._notifyPeers();
      for (const location of locations) {
        const state = pending.get(location);
        if (!state) continue;
        state.via.add(peer.hash());
        state.peer = null;
      }
      debugLog("sets", "direct peer dropped", {
        peer: peer.hash(),
        status,
        locations: locations.length,
        first: locations[0],
      });
    }
  }

  /**
   * @param {string} collection
   * @param {string[]} locations
   * @param {any[]} elements flat `/sets` element list spanning the parents
   * @param {boolean} refresh
   */
  _storeFetchedBuckets(collection, locations, elements, refresh) {
    const byParent = distributeElementsByParent(locations, elements || []);
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      const bucket = byParent.get(location) ?? [];
      if (refresh && debugEnabled("refresh")) {
        const before = this._cache.get(zoneKey(collection, location));
        const delta =
          abelianTotal(bucket).count - abelianTotal(before ?? []).count;
        if (delta !== 0) {
          debugLog("refresh", "zone moved", {
            location,
            was: abelianTotal(before ?? []).count,
            now: abelianTotal(bucket).count,
            delta: signed(delta),
          });
        }
      }
      this._putCacheChildren(zoneKey(collection, location), bucket);
    }
  }

  /**
   * @param {string} collection
   * @param {{ partialPrefix: Map<string, any[]>, uniqInput: string[] }} waiter
   */
  _finalizeSetsWaiter(collection, waiter) {
    const out = new Map(waiter.partialPrefix);
    for (const location of waiter.uniqInput) {
      if (out.has(location)) continue;
      const cached = location
        ? this._touchCacheEntry(zoneKey(collection, location))
        : null;
      out.set(location, Array.isArray(cached) ? cached : []);
    }
    return out;
  }

  /**
   * Batch retrieval via GET `/sets` (binary). Populates the same LRU cache as {@link getSet}
   * per parent location. Concurrent callers for the same collection are merged into shared
   * HTTP batches when method=getSets (see SetsCoalescePool). Returns a map parent → children.
   *
   * @param {string} collection
   * @param {string[]} locations
   * @param {{
   *   refresh?: boolean,
   *   navigation?: ReadNavigation,
   *   method?: ReadMethod,
   * }} [options]
   * @returns {Promise<Map<string, import("../entities/item.js").Item[] | import("../entities/set.js").Set[]>>}
   */
  async getSets(collection, locations, options = {}) {
    if (!Array.isArray(locations) || locations.length === 0) {
      return new Map();
    }

    const refresh = options.refresh === true;
    const navigation = normalizeNavigation(
      options.navigation ?? this._readNavigation
    );
    const method = normalizeMethod(options.method ?? this._readMethod);
    const uniqInput = [...new Set(locations.map((s) => String(s)))];
    /** @type {Map<string, any[]>} */
    const result = new Map();

    const missingForFetch = [];
    const now = Date.now();

    for (const location of uniqInput) {
      if (!location) {
        result.set(location, []);
        continue;
      }
      // Include ROOT `@` — Aggregate drills from `@` and child locations do
      // not start with `@` (handled in distributeElementsByParent).
      const cacheKey = zoneKey(collection, location);
      const cached = this._touchCacheEntry(cacheKey);
      if (
        cached === undefined ||
        (refresh && !this._refreshWithinTtl(cacheKey, now))
      ) {
        missingForFetch.push(location);
      } else {
        result.set(location, Array.isArray(cached) ? cached : []);
      }
    }

    if (missingForFetch.length === 0) {
      return result;
    }

    // Zones another caller already has on the wire: wait for that answer
    // rather than opening a second request for the same parent.
    const joined = [];
    const toFetch = [];
    for (const location of missingForFetch) {
      const inflight = this._inflight.get(zoneKey(collection, location));
      if (inflight && (inflight.refresh || !refresh)) {
        joined.push(inflight.promise);
      } else {
        toFetch.push(location);
      }
    }

    if (toFetch.length > 0) {
      // Per-call overrides that differ from the shared session config bypass
      // the coalesce pool so they cannot merge with a different
      // navigation/method.
      const overridesSession =
        navigation !== this._readNavigation || method !== this._readMethod;

      const wave = this._runSetsWave(collection, toFetch, refresh, {
        navigation,
        method,
        overridesSession,
      });
      this._trackInflight(collection, toFetch, wave, refresh);
      joined.push(wave);
    }

    // A wave that joined someone else's failure must not mask the zones the
    // other waves did resolve; only a read that produced nothing at all fails.
    const settled = await Promise.allSettled(joined);
    const failure = settled.find((outcome) => outcome.status === "rejected");
    if (failure && !this._anyCached(collection, missingForFetch)) {
      throw failure.reason;
    }

    return this._finalizeSetsWaiter(collection, {
      partialPrefix: result,
      uniqInput,
    });
  }

  /**
   * @param {string} collection
   * @param {string[]} locations
   */
  _anyCached(collection, locations) {
    for (const location of locations) {
      if (location && this._cache.has(zoneKey(collection, location))) return true;
    }
    return false;
  }

  /**
   * Run one read wave for zones that are neither cached nor in flight.
   * @param {string} collection
   * @param {string[]} locations
   * @param {boolean} refresh
   * @param {{ navigation: ReadNavigation, method: ReadMethod, overridesSession: boolean }} config
   */
  async _runSetsWave(collection, locations, refresh, config) {
    const { navigation, method, overridesSession } = config;

    if (!overridesSession && method !== "getSet") {
      await this._setsPool.submit(
        collection,
        new Map(),
        locations,
        locations,
        refresh
      );
      return;
    }

    if (method !== "getSet") {
      await this._fetchSetsChunk(collection, locations, refresh, { navigation });
      return;
    }

    const parallel = Math.min(
      this._setsPoolCfg.setsMaxParallelChunks,
      locations.length
    );
    for (let i = 0; i < locations.length; i += parallel) {
      const wave = locations.slice(i, i + parallel);
      await Promise.all(
        wave.map((location) =>
          this._fetchSetsChunk(collection, [location], refresh, { navigation })
        )
      );
    }
  }

  /**
   * Drop a single cached `/sets` entry so the next getSets refetches.
   * @param {string} collection
   * @param {string} location
   */
  invalidate(collection, location) {
    if (collection == null || location == null) return;
    const key = zoneKey(collection, location);
    this._cache.delete(key);
    this._cacheFetchedAt.delete(key);
  }
}

export { Network };
