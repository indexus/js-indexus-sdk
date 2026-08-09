import { Set } from "../entities/set.js";
import { createStreamCoalescer } from "./streamCoalescer.js";
import { createArrayPool, createSetPool } from "../utilities/bufferPool.js";
import { createGpuOverlapAccelerator } from "../utilities/gpuOverlap.js";
import { ROOT, zoneKey } from "../utilities/encoding.js";

import { project, refresh, consolidate, process, reconcileVisible } from "./layer.js";

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

    this.stream = createStreamCoalescer({
      minBatch,
      flushMs,
      applyBatch: (elements) => this.streamOutput(elements),
    });
  }

  /**
   * @param {number} zoom
   * @param {any} bounds
   * @param {{ force?: boolean }} [opts] — force=true re-drills even if the
   *   viewport hash is unchanged (needed after reconcile replaceBranch).
   */
  async move(zoom, bounds, opts = {}) {
    // Hash precision must cover cube.display's xyz LOD (zoom+resolution).
    // ceil avoids short-drilling (e.g. xyz target 11 → need 4 chars, not 3).
    const targetXyz = Math.floor(
      zoom + this.options.resolution + this.options.offset.zoom
    );
    const depth = Math.max(
      0,
      Math.ceil(targetXyz / Math.max(1, this.space.step))
    );
    const hash = this.space.encode(this.space.center(bounds), depth);

    if (!opts.force && this.current.hash === hash) return;

    // Ensure previous trailing stream batches are visible before
    // scheduling a new traversal wave.
    this.stream.flushNow();

    const id = crypto.randomUUID();
    this.current = { hash, id };

    await this.refresh(id, [this.root], this.project(zoom, bounds), depth);
  }

  getGeometry(location) {
    if (this.geometryCache.has(location)) {
      const cached = this.geometryCache.get(location);
      this.geometryCache.delete(location);
      this.geometryCache.set(location, cached);
      return cached;
    }

    const geometry = {
      bounds: this.space.decode(location),
      xyz: this.space.xyz(location),
    };

    if (this.geometryCache.size >= this.geometryCacheSize) {
      const firstKey = this.geometryCache.keys().next().value;
      this.geometryCache.delete(firstKey);
    }
    this.geometryCache.set(location, geometry);
    return geometry;
  }

  /**
   * Processed children for one zone, moved to the LRU tail when present.
   * @param {string} key
   */
  getProcessed(key) {
    if (!this.cache.has(key)) return undefined;
    const cached = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, cached);
    return cached;
  }

  /**
   * @param {string} key
   * @param {any[]} elements
   */
  putProcessed(key, elements) {
    if (!this.cache.has(key) && this.cache.size >= this.cacheSize) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, elements);
  }

  /**
   * Drop the processed-children cache entry for one zone.
   * @param {string} collection
   * @param {string} location
   */
  invalidate(collection, location) {
    if (collection == null || location == null) return;
    this.cache.delete(zoneKey(collection, location));
  }
}

Grid.prototype.project = project;
Grid.prototype.refresh = refresh;
Grid.prototype.process = process;
Grid.prototype.consolidate = consolidate;
Grid.prototype.reconcileVisible = reconcileVisible;

export { Grid };
