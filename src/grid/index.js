import { Set } from "../entities/set.js";
import { createStreamCoalescer } from "./streamCoalescer.js";
import { createArrayPool, createSetPool } from "../utilities/bufferPool.js";
import { createGpuOverlapAccelerator } from "../utilities/gpuOverlap.js";
import { ROOT } from "../utilities/encoding.js";
import { putLru, touchLru } from "../utilities/lru.js";

import { project, refresh, consolidate, process, reconcileVisible } from "./layer.js";

/**
 * Aggregate drill engine.
 *
 * Two LRU caches sit on the Aggregate path and must not be confused:
 * - `network._cache` — raw `/sets` children keyed by zoneKey (wire shape).
 * - `grid.cache` — geometry-enriched processed children for the drill.
 *
 * The Network and Grid caches deliberately keep different shapes.
 */
class Grid {
  constructor(collection, space, options, stream, finish, monitoring, network) {
    this.collection = collection;
    this.space = space;
    this.options = options;
    this.streamOutput = stream;
    this.finish = finish;
    this.monitoring = monitoring;
    this.network = network;

    this.current = {};
    this.cache = new Map();
    this.arrayPool = createArrayPool(8);
    this.seenPool = createSetPool(4);
    const gpuOptions = options && typeof options.gpu === "object" ? options.gpu : {};
    this.overlapAccelerator = createGpuOverlapAccelerator({
      enabled: gpuOptions.enabled !== false,
      minElements: Number.isFinite(gpuOptions.minElements)
        ? Math.max(1, Math.floor(gpuOptions.minElements))
        : 1024,
    });
    const geometryCacheSize =
      options &&
      options.cache &&
      Number.isFinite(options.cache.geometrySize)
        ? Math.max(256, Math.floor(options.cache.geometrySize))
        : 20000;
    this.geometryCache = new Map();
    this.geometryCacheSize = geometryCacheSize;
    this.cacheSize =
      options && options.cache && Number.isFinite(options.cache.zoneSize)
        ? Math.max(256, Math.floor(options.cache.zoneSize))
        : 40000;
    this.root = new Set(collection, ROOT, undefined, undefined);

    const streamOptions =
      options && typeof options.stream === "object" ? options.stream : {};
    const streamProgressive = streamOptions.progressive === true;
    const defaultMinBatch = streamProgressive ? 8 : 128;
    const defaultFlushMs = streamProgressive ? 4 : 16;
    const minBatch = Number.isFinite(streamOptions.minBatch)
      ? Math.max(1, Math.floor(streamOptions.minBatch))
      : defaultMinBatch;
    const flushMs = Number.isFinite(streamOptions.flushMs)
      ? Math.max(0, Math.floor(streamOptions.flushMs))
      : defaultFlushMs;

    // Progressive Aggregate wants every processed zone immediately. Avoid
    // allocating a second buffer/timer only to flush it on the next line in
    // process(); the worker remains the single ingest owner.
    this.stream = streamProgressive
      ? {
          enqueue: (elements) => this.streamOutput(elements),
          flushNow() {},
        }
      : createStreamCoalescer({
          minBatch,
          flushMs,
          applyBatch: (elements) => this.streamOutput(elements),
        });
  }

  /**
   * himo.place drill: floor depth, fire-and-forget refresh so MOVE returns
   * immediately while the tree walk streams into the cube.
   *
   * @param {number} zoom
   * @param {any} bounds
   * @param {{ force?: boolean }} [opts] — force=true re-drills even if the
   *   viewport hash is unchanged (manual Refresh / reconcile replaceBranch).
   */
  async move(zoom, bounds, opts = {}) {
    const depth = Math.floor(
      (zoom + this.options.resolution + this.options.offset.zoom) /
        Math.max(1, this.space.step)
    );
    const hash = this.space.encode(this.space.center(bounds), depth);

    if (!opts.force && this.current.hash === hash) return;

    // Ensure previous trailing stream batches are visible before
    // scheduling a new traversal wave.
    this.stream.flushNow();

    const id = crypto.randomUUID();
    this.current = { hash, id };

    // Do not await — interactive pans cancel via current.id; finish() runs
    // when this wave completes (same as himo.place).
    void this.refresh(id, [this.root], this.project(zoom, bounds), depth);
  }

  getGeometry(location) {
    const cached = touchLru(this.geometryCache, location);
    if (cached !== undefined) return cached;

    const geometry = {
      bounds: this.space.decode(location),
      xyz: this.space.xyz(location),
    };

    putLru(this.geometryCache, location, geometry, this.geometryCacheSize);
    return geometry;
  }

  /**
   * Processed children for one zone, moved to the LRU tail when present.
   * @param {string} key
   */
  getProcessed(key) {
    return touchLru(this.cache, key);
  }

  /**
   * @param {string} key
   * @param {any[]} elements
   */
  putProcessed(key, elements) {
    putLru(this.cache, key, elements, this.cacheSize);
  }

}

Grid.prototype.project = project;
Grid.prototype.refresh = refresh;
Grid.prototype.process = process;
Grid.prototype.consolidate = consolidate;
Grid.prototype.reconcileVisible = reconcileVisible;

export { Grid };
