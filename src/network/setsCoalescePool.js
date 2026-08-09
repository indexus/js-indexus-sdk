/**
 * Coalesces concurrent {@code getSets} calls per collection inside one microtask,
 * merges location keys into minimal HTTP payloads, splits oversized unions into chunks,
 * and runs chunks in bounded parallel waves.
 */

const NativeSet = globalThis.Set;

function chunkArray(arr, chunkSize) {
  const out = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    out.push(arr.slice(i, i + chunkSize));
  }
  return out;
}

export class SetsCoalescePool {
  /**
   * @param {{
   *   maxChunkSize?: number,
   *   maxParallelChunks?: number,
   *   fetchChunk: (collection: string, locations: string[], refresh: boolean) => Promise<void>,
   *   finalizeWaiter: (
   *     collection: string,
   *     waiter: { partialPrefix: Map<string, unknown>, uniqInput: string[] }
   *   ) => Map<string, unknown>,
   * }} options
   */
  constructor(options = {}) {
    const maxChunk =
      Number(options.maxChunkSize) > 0 ? Math.floor(options.maxChunkSize) : 128;
    const maxParallel =
      Number(options.maxParallelChunks) > 0
        ? Math.floor(options.maxParallelChunks)
        : 64;

    // Chunk size 1 is intentional for method=getSet (one-location batches).
    this.maxChunkSize = Math.max(1, maxChunk);
    this.maxParallelChunks = Math.max(1, maxParallel);
    this.fetchChunk = options.fetchChunk;
    this.finalizeWaiter = options.finalizeWaiter;

    if (typeof this.fetchChunk !== "function") {
      throw new Error("SetsCoalescePool requires fetchChunk");
    }
    if (typeof this.finalizeWaiter !== "function") {
      throw new Error("SetsCoalescePool requires finalizeWaiter");
    }

    /** @type {Map<string, { union: InstanceType<typeof NativeSet>, waiters: WaiterEntry[] }>} */
    this._pending = new Map();
    this._flushScheduled = false;
  }

  /**
   * @param {string} collection
   * @param {Map<string, unknown>} partialPrefix locations already resolved (cache hits)
   * @param {string[]} uniqInput caller key order / membership
   * @param {string[]} missingArray locations still needing network (subset of uniqInput)
   * @param {boolean} [refresh] one refreshing caller upgrades the whole wave:
   *   the union is fetched once, and a fresher answer is never wrong for the
   *   callers that did not ask for it.
   * @returns {Promise<Map<string, unknown>>}
   */
  submit(collection, partialPrefix, uniqInput, missingArray, refresh = false) {
    return new Promise((resolve, reject) => {
      let slot = this._pending.get(collection);
      if (!slot) {
        slot = { union: new NativeSet(), waiters: [], refresh: false };
        this._pending.set(collection, slot);
      }
      if (refresh) slot.refresh = true;
      const missingList = Array.isArray(missingArray) ? missingArray : [];
      for (let i = 0; i < missingList.length; i++) {
        slot.union.add(missingList[i]);
      }

      slot.waiters.push({
        partialPrefix,
        uniqInput,
        resolve,
        reject,
      });

      this._scheduleFlush();
    });
  }

  _scheduleFlush() {
    if (this._flushScheduled) return;
    this._flushScheduled = true;
    queueMicrotask(() => {
      void this._flushAll();
    });
  }

  async _flushAll() {
    const snapshot = new Map(this._pending);
    this._pending.clear();
    this._flushScheduled = false;

    if (snapshot.size === 0) {
      if (this._pending.size > 0) {
        this._scheduleFlush();
      }
      return;
    }

    try {
      await Promise.all(
        [...snapshot.entries()].map(([collection, bucket]) =>
          this._flushCollection(collection, bucket)
        )
      );
    } finally {
      if (this._pending.size > 0) {
        this._scheduleFlush();
      }
    }
  }

  /**
   * @param {string} collection
   * @param {{ union: InstanceType<typeof NativeSet>, waiters: WaiterEntry[], refresh?: boolean }} bucket
   */
  async _flushCollection(collection, bucket) {
    try {
      const unionList = [...bucket.union];
      unionList.sort();

      const chunks = chunkArray(unionList, this.maxChunkSize);

      for (let i = 0; i < chunks.length; i += this.maxParallelChunks) {
        const wave = chunks.slice(i, i + this.maxParallelChunks);
        await Promise.all(
          wave.map((locations) =>
            this.fetchChunk(collection, locations, bucket.refresh === true)
          )
        );
      }

      for (let w = 0; w < bucket.waiters.length; w++) {
        const waiter = bucket.waiters[w];
        try {
          waiter.resolve(this.finalizeWaiter(collection, waiter));
        } catch (err) {
          waiter.reject(err);
        }
      }
    } catch (err) {
      for (let w = 0; w < bucket.waiters.length; w++) {
        bucket.waiters[w].reject(err);
      }
    }
  }
}

/** @typedef {{ partialPrefix: Map<string, unknown>, uniqInput: string[], resolve: Function, reject: Function }} WaiterEntry */
