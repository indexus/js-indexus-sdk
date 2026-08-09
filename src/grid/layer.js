import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";
import {
  abelianCount,
  abelianEqual,
  abelianMetrics,
  abelianSum,
  abelianTotal,
} from "../entities/abelian.js";
import { ROOT, isDirectChild, zoneKey } from "../utilities/encoding.js";
import { asyncPool } from "../utilities/network.js";
import { debugEnabled, debugLog, signed } from "../utilities/debug.js";
import { State, Monitoring } from "../model/index.js";
import { create } from "../cube/data.js";

const DEFAULT_RECONCILE_MAX_PARENTS = 48;

export function project(zoom, bounds) {
  const result = [];

  let currentZoom = zoom + this.options.resolution;
  let currentBounds = this.space.extend(bounds, this.options.offset.bounds);

  const integerZoom = Math.floor(currentZoom);
  const fractionalZoom = currentZoom - integerZoom;

  if (fractionalZoom !== 0) {
    currentBounds = this.space.extend(currentBounds, -0.25 * fractionalZoom);
    currentZoom = integerZoom;
  }

  const zoomMax = Math.floor(
    zoom + this.options.resolution + this.options.offset.zoom
  );

  const step = Math.max(1, this.space.step);
  let lastBoundsAtZoom = currentBounds;

  for (let z = 0; z <= zoomMax; z++) {
    let boundsAtZoom = currentBounds;

    // if (z < currentZoom) {
    //   const steps = currentZoom - z;
    //   for (let s = 0; s < steps; s++) {
    //     boundsAtZoom = this.space.extend(boundsAtZoom, 0.5);
    //   }
    // }

    if (z > currentZoom) {
      const steps = z - currentZoom;
      for (let s = 0; s < steps; s++) {
        boundsAtZoom = this.space.extend(boundsAtZoom, -0.25);
      }
    }

    lastBoundsAtZoom = boundsAtZoom;

    if (z % step === 0) {
      result[z / step] = boundsAtZoom;
    }
  }

  // Grid.move drills to hash depth = ceil(zoomMax / step). When zoomMax is
  // not a multiple of step the loop above never wrote that index, so
  // refresh called overlap(undefined, …) and crashed.
  const maxHashDepth = Math.ceil(zoomMax / step);
  if (result[maxHashDepth] == null) {
    result[maxHashDepth] = lastBoundsAtZoom;
  }

  return result;
}

async function prefetchBatchSets(list, viewportBounds) {
  const net = this.network;
  if (!net || typeof net.getSets !== "function") {
    return;
  }

  // `getSetsBatchSize === 0` disables prefetch; batching/chunking is handled by Network.setsPool.
  const network = this.options?.network ?? {};
  if (network.getSetsBatchSize === 0) {
    return;
  }

  const spatialPrefetch = network.spatialPrefetch !== false;
  const spatialChunkSize = Number.isFinite(network.spatialPrefetchChunkSize)
    ? Math.max(4, Math.floor(network.spatialPrefetchChunkSize))
    : 40;

  /** Native `Set` — file imports entity `Set`, which shadows `globalThis.Set`. */
  const NativeSet = globalThis.Set;

  /** @type {Map<string, InstanceType<typeof NativeSet>>} */
  const byColl = new Map();
  for (let i = 0; i < list.length; i++) {
    const element = list[i];
    if (element._items) continue;
    const collection = element._collection;
    const location = element._hash;
    if (!location) continue;
    // Prefetch ROOT `@` too — Aggregate starts drilling there.
    if (this.cache.has(zoneKey(collection, location))) continue;
    if (!byColl.has(collection)) {
      byColl.set(collection, new NativeSet());
    }
    byColl.get(collection).add(location);
  }

  const tasks = [...byColl.entries()].map(([collection, hashSet]) =>
    spatialPrefetch && viewportBounds != null
      ? prefetchCollectionSpatialChunks.call(
          this,
          net,
          collection,
          hashSet,
          viewportBounds,
          spatialChunkSize
        )
      : prefetchCollectionMerged(net, collection, hashSet)
  );

  await Promise.all(tasks);
}

/**
 * Legacy path: one merged `/sets` request per collection (maximum HTTP merging).
 */
async function prefetchCollectionMerged(net, collection, hashSet) {
  await net.getSets(collection, [...hashSet]);
}

/**
 * Viewport-first: sort parent hashes by overlap with `viewportBounds`, then center distance;
 * prefetch sequentially in chunks so nearer rings populate the Network cache before farther ones.
 */
async function prefetchCollectionSpatialChunks(
  net,
  collection,
  hashSet,
  viewportBounds,
  chunkSize
) {
  const hashes = [...hashSet];
  const ranked = new Array(hashes.length);
  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i];
    const bounds = this.getGeometry(hash).bounds;
    ranked[i] = {
      hash,
      rank: viewportPrefetchRank(this.space, viewportBounds, bounds),
    };
  }
  ranked.sort((a, b) => compareViewportPrefetchRank(a.rank, b.rank));

  for (let i = 0; i < ranked.length; i += chunkSize) {
    const slice = ranked.slice(i, i + chunkSize).map((r) => r.hash);
    await net.getSets(collection, slice);
  }
}

function viewportPrefetchRank(space, viewportBounds, cellBounds) {
  const o = space.overlap(viewportBounds, cellBounds);
  const distSq = viewportCenterDistSq(space, viewportBounds, cellBounds);
  return {
    overlaps: o.overlap,
    contained: o.contained,
    distSq,
  };
}

function compareViewportPrefetchRank(a, b) {
  if (a.overlaps !== b.overlaps) {
    return a.overlaps ? -1 : 1;
  }
  if (a.contained !== b.contained) {
    return a.contained ? -1 : 1;
  }
  return a.distSq - b.distSq;
}

/**
 * Cheap squared separation between segment centers (any dimension arity via point.value()).
 */
function viewportCenterDistSq(space, viewportBounds, cellBounds) {
  const cv = space.center(viewportBounds);
  const cc = space.center(cellBounds);
  let sum = 0;
  for (let i = 0; i < cv.length; i++) {
    const va = cv[i].value();
    const vb = cc[i].value();
    const n = Math.min(va.length, vb.length);
    for (let k = 0; k < n; k++) {
      const d = va[k] - vb[k];
      sum += d * d;
    }
  }
  return sum;
}

export async function refresh(id, list, bounds, depth, current = 0) {
  const candidates = this.arrayPool.acquire();
  const selected = this.arrayPool.acquire();
  const seen = this.seenPool.acquire();
  candidates.length = 0;
  selected.length = 0;
  const requestedConcurrency =
    typeof this.network?.getConcurrency === "function"
      ? this.network.getConcurrency()
      : list.length;
  const concurrency = Math.max(1, Math.floor(requestedConcurrency || 1));
  const targetBounds = bounds[current];

  try {
    await prefetchBatchSets.call(this, list, targetBounds);

    await asyncPool(concurrency, list, async (element) => {
      const elements = await this.process(element);
      for (let i = 0; i < elements.length; i++) {
        candidates.push(elements[i]);
      }
    });
    dedupeElementsInPlace(candidates, seen);

    await filterOverlaps.call(
      this,
      targetBounds,
      candidates,
      selected
    );

    let total = 0;
    for (let i = 0; i < list.length; i++) {
      if (!list[i]._items) total++;
    }

    this.monitoring.send(
      new Monitoring(current, State.Refresh, {
        id: id,
        depth: current,
        bounds: bounds[current],
        size: total,
      })
    );

    if (id === this.current.id) {
      if (selected.length > 0 && current < depth) {
        await this.refresh(id, selected, bounds, depth, current + 1);
      } else {
        this.stream.flushNow();
        this.finish(id);
      }
    }
  } finally {
    this.seenPool.release(seen);
    this.arrayPool.release(candidates);
    this.arrayPool.release(selected);
  }
}

function dedupeElementsInPlace(elements, seen) {
  if (!Array.isArray(elements) || elements.length === 0) return;
  let write = 0;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!element) continue;
    const key = zoneKey(element._collection, element._hash);
    if (seen.has(key)) continue;
    seen.add(key);
    elements[write] = element;
    write++;
  }
  elements.length = write;
  seen.clear();
}

async function filterOverlaps(targetBounds, candidates, selected) {
  if (!targetBounds || !Array.isArray(candidates) || candidates.length === 0) {
    return;
  }

  const usedGpu =
    this.overlapAccelerator &&
    (await this.overlapAccelerator.selectOverlapping(
      targetBounds,
      candidates,
      selected
    ));
  if (usedGpu) return;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (!candidate?._bounds) continue;
    if (!this.space.overlap(targetBounds, candidate._bounds).overlap) continue;
    selected.push(candidate);
  }
}

/**
 * Fetch children for one parent via batched `/sets` (sticky ingress).
 * @param {{ getSets: Function }} net
 * @param {string} collection
 * @param {string} location
 * @param {boolean} [refresh]
 * @returns {Promise<any[]>}
 */
async function fetchChildren(net, collection, location, refresh = false) {
  const children = await fetchChildrenOf(net, collection, [location], refresh);
  const own = children?.get?.(location);
  return Array.isArray(own) ? own : [];
}

/**
 * Warm the Network `/sets` cache for many parents in one coalesce wave.
 * Network.getSets already dedupes and chunks the locations.
 * @param {{ getSets: Function }} net
 * @param {string} collection
 * @param {string[]} locations
 * @param {boolean} [refresh] - the reconcile pass sets it: dropping our own
 *   cache re-reads the node's, which is the copy that went stale.
 */
async function fetchChildrenOf(net, collection, locations, refresh = false) {
  if (!net || typeof net.getSets !== "function") {
    return new Map();
  }
  return net.getSets(collection, locations.filter(Boolean), { refresh });
}

export async function process(element) {
  const collection = element._collection;
  const location = element._hash;
  const key = zoneKey(collection, location);

  const processed = this.getProcessed(key);
  if (processed !== undefined) return processed;

  let set = element._items;
  let cacheableSource = Array.isArray(set);

  if (!set) {
    try {
      set = await fetchChildren(this.network, collection, location);
      cacheableSource = Array.isArray(set);
    } catch (error) {
      console.error(`Error processing element ${element}:`, error);
    }
  }

  const depth = locationDepth(location);
  const elements = [];
  const streamElements = [];
  const merged = {};
  const source = Array.isArray(set) ? set : [];

  for (let i = 0; i < source.length; i++) {
    const elm = source[i];
    if (elm instanceof Item) {
      this.consolidate(merged, depth + 1, elm);
      continue;
    }

    // Nodes sometimes list a zone under itself. Drilling a self-key recurses
    // forever and blocks the heatmap.
    if (!isDirectChild(location, elm._hash)) {
      continue;
    }

    if (!elm._bounds || !elm._xyz) {
      const geometry = this.getGeometry(elm._hash);
      elm._bounds = geometry.bounds;
      elm._xyz = geometry.xyz;
    }
    elements.push(elm);
    streamElements.push(toCubeElement(elm, true));
  }

  const mergedValues = Object.values(merged);
  for (let i = 0; i < mergedValues.length; i++) {
    const mergedElement = mergedValues[i];
    elements.push(mergedElement);
    streamElements.push(toCubeElement(mergedElement, false));
  }

  if (cacheableSource) {
    this.putProcessed(key, elements);
  }
  if (streamElements.length > 0) {
    this.stream.enqueue(streamElements);
    if (this.options?.stream?.progressive === true) {
      this.stream.flushNow();
    }
  }

  return elements;
}

function toCubeElement(element, reusable) {
  if (reusable && element.__cubeElement) {
    return element.__cubeElement;
  }

  const cell = create(
    element._xyz,
    element._bounds,
    element._count,
    element._metrics,
    element._items,
    [],
    element._hash
  );

  if (reusable) {
    element.__cubeElement = cell;
  }

  return cell;
}

export function consolidate(merged, length, elm) {
  const location = elm._hash.substring(0, length);
  const set = merged[location];

  if (!set) {
    const created = new Set(
      elm._collection,
      location,
      1,
      abelianMetrics(elm).slice()
    );

    const geometry = this.getGeometry(location);
    created._bounds = geometry.bounds;
    created._xyz = geometry.xyz;
    created._items = [elm];

    merged[location] = created;
    return;
  }

  set._count++;
  set._items.push(elm);
  set._metrics = abelianSum(set._metrics, abelianMetrics(elm));
}

/** Location a Set or Item carries, whichever shape the payload arrived in. */
function elementLocation(element) {
  if (!element) return null;
  if (element._hash) return element._hash;
  return typeof element.hash === "function" ? element.hash() : null;
}

/**
 * Location of a cube cell (inverse of space.xyz).
 * Prefer the explicit location on the cell, then re-encode from `bounds`
 * (decode geometry). Do not rebuild bounds from xyz alone — fractional
 * resolutions make `space._bounds(xyz)` non-invertible with encode.
 *
 * @param {import("../entities/space.js").Space} space
 * @param {{ xyz?: { resolution: number, coordinates: number[] }, bounds?: any, hash?: string }} cell
 * @param {any} [boundsHint]
 * @returns {string}
 */
export function cellLocation(space, cell, boundsHint) {
  if (!cell) return ROOT;
  if (typeof cell === "string") return cell;
  if (cell.hash) return cell.hash;

  const xyz = cell.xyz || cell;
  if (!xyz || !xyz.resolution || !Array.isArray(xyz.coordinates)) {
    return ROOT;
  }
  const bounds = boundsHint || cell.bounds;
  if (!bounds) return null;

  const dimensions = xyz.coordinates.length || 1;
  const precision = Math.round((xyz.resolution * dimensions) / 6);
  if (precision <= 0) return ROOT;
  return space.encode(space.center(bounds), precision);
}

/** Remote Sets that are one encoding step below `location`, Items excluded. */
function remoteSetChildren(location, children) {
  /** @type {{ set: any, location: string }[]} */
  const sets = [];
  if (!Array.isArray(children)) return sets;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child || child instanceof Item) continue;
    const childLocation = elementLocation(child);
    if (!isDirectChild(location, childLocation)) continue;
    sets.push({ set: child, location: childLocation });
  }
  return sets;
}

/**
 * True when remote children membership drifted even if Abelian mass matches.
 * @returns {false | { reason: string, localChildren: number, remoteSets: number }}
 */
export function childrenMembershipDrift(local, remoteChildren, cube, space) {
  const localChildren = Array.isArray(local?.children) ? local.children : [];
  const remote = Array.isArray(remoteChildren) ? remoteChildren : [];

  let remoteSets = 0;
  /** @type {globalThis.Set<string>} */
  const remoteLocations = new globalThis.Set();
  for (let i = 0; i < remote.length; i++) {
    const child = remote[i];
    if (!child || child instanceof Item) continue;
    remoteSets += 1;
    const location = elementLocation(child);
    if (location) remoteLocations.add(location);
  }

  if (localChildren.length === 0) {
    if (remoteSets > 0) {
      return { reason: "local-empty-remote-has-sets", localChildren: 0, remoteSets };
    }
    return false;
  }
  if (localChildren.length !== remoteSets && remoteSets > 0) {
    return {
      reason: "set-count-mismatch",
      localChildren: localChildren.length,
      remoteSets,
    };
  }
  if (localChildren.length !== remote.length && remoteSets === 0) {
    return {
      reason: "remote-items-only-vs-local-links",
      localChildren: localChildren.length,
      remoteSets: 0,
      remoteRows: remote.length,
    };
  }
  if (remoteLocations.size === 0) return false;

  for (let i = 0; i < localChildren.length; i++) {
    const xyz = localChildren[i];
    const location = cellLocation(space, cube.get?.(xyz) || { xyz });
    if (!location || location === ROOT) continue;
    if (!remoteLocations.has(location)) {
      return {
        reason: "local-child-missing-remotely",
        localChildren: localChildren.length,
        remoteSets,
        missingLocation: location,
      };
    }
  }
  return false;
}

/**
 * One reconcile walk. The state is passed around explicitly rather than
 * captured: the DFS below rewrites cube branches as it unwinds, and closures
 * hid which step had touched what.
 *
 * @typedef {{
 *   grid: any,
 *   cube: import("../cube/index.js").Cube,
 *   collection: string,
 *   bounds: any,
 *   maxDepth: number,
 *   maxReplaces: number,
 *   replaced: string[],
 *   visiting: globalThis.Set<string>,
 *   dirty: number,
 *   read: number,
 * }} Reconcile
 */

function locationDepth(location) {
  return location === ROOT ? 0 : location.length;
}

/** True when `location` is `ancestor` or sits below it. */
function covers(ancestor, location) {
  return ancestor === ROOT || location.startsWith(ancestor);
}

/** A branch replaced earlier in the pass is authoritative; leave it alone. */
function alreadyReplaced(pass, location) {
  return pass.replaced.some((replaced) => covers(replaced, location));
}

function invalidate(pass, location) {
  pass.grid.invalidate(pass.collection, location);
  pass.grid.network.invalidate(pass.collection, location);
}

function overlapsViewport(pass, location) {
  const { grid, bounds } = pass;
  if (!bounds || !grid?.space?.overlap) return true;
  try {
    return grid.space.overlap(bounds, grid.getGeometry(location).bounds).overlap;
  } catch {
    return true;
  }
}

/**
 * Walk `location` down `remaining` steps of Set children, appending detached
 * cells to `cells`. Items fold into their parent's Abelian.
 */
async function walkShadow(pass, location, geometry, remaining, cells) {
  invalidate(pass, location);

  let children = [];
  try {
    children = await fetchChildren(
      pass.grid.network,
      pass.collection,
      location,
      true
    );
  } catch (error) {
    console.warn("[aggregate.reconcile] shadow getSets failed:", location, error);
  }

  const remote = abelianTotal(children);
  const links = [];
  cells.push(
    create(
      geometry.xyz,
      geometry.bounds,
      remote.count,
      remote.metrics,
      undefined,
      links,
      location
    )
  );

  if (remaining <= 0) return;

  const sets = remoteSetChildren(location, children);
  const geometries = sets.map((child) => pass.grid.getGeometry(child.location));
  for (let i = 0; i < geometries.length; i++) {
    links.push(geometries[i].xyz);
  }

  // Batch-warm `/sets` for the whole sibling ring before descending.
  await fetchChildrenOf(
    pass.grid.network,
    pass.collection,
    sets.map((child) => child.location),
    true
  );
  for (let i = 0; i < sets.length; i++) {
    await walkShadow(pass, sets[i].location, geometries[i], remaining - 1, cells);
  }
}

/** Swap the whole branch under `location` for a freshly drilled one. */
async function replaceBranchAt(pass, location) {
  if (pass.dirty >= pass.maxReplaces || alreadyReplaced(pass, location)) {
    return false;
  }

  const geometry = pass.grid.getGeometry(location);
  const cells = [];
  try {
    await walkShadow(
      pass,
      location,
      geometry,
      Math.max(1, pass.maxDepth - locationDepth(location)),
      cells
    );
  } catch (error) {
    console.warn("[aggregate.reconcile] shadow branch failed:", location, error);
    return false;
  }
  if (cells.length === 0) return false;

  pass.cube.replaceBranch(geometry.xyz, cells);
  pass.cube.current = {};
  pass.replaced.push(location);
  pass.dirty += 1;
  return true;
}

/**
 * Rewrite the parent cell from remote children plus the cube kids already
 * installed. Unlike replaceBranch on the parent, this keeps child subtrees.
 */
function recalculateParent(pass, location, children) {
  try {
    const remote = abelianTotal(children);
    const links = [];

    const sets = remoteSetChildren(location, children);
    for (let i = 0; i < sets.length; i++) {
      const child = sets[i];
      if (!overlapsViewport(pass, child.location)) continue;
      const childGeometry = pass.grid.getGeometry(child.location);
      const cell = pass.cube.get(childGeometry.xyz);
      if (cell) {
        cell.hash = cell.hash || child.location;
      } else {
        pass.cube.add(
          create(
            childGeometry.xyz,
            childGeometry.bounds,
            abelianCount(child.set),
            abelianMetrics(child.set).slice(),
            undefined,
            [],
            child.location
          )
        );
      }
      links.push(childGeometry.xyz);
    }

    const geometry = pass.grid.getGeometry(location);
    pass.cube.add(
      create(
        geometry.xyz,
        geometry.bounds,
        remote.count,
        remote.metrics,
        pass.cube.get(geometry.xyz)?.items,
        links,
        location
      )
    );
    pass.cube.current = {};
  } catch (error) {
    console.warn(
      "[aggregate.reconcile] recalculate parent failed:",
      location,
      error
    );
  }
}

/**
 * Dig the dirty children first, then recalculate this parent from remote.
 * `prefetched` skips the on-wire read when the caller already holds this
 * location's children (the root probe in {@link reconcileVisible}).
 *
 * @param {Reconcile} pass
 * @param {string} location
 * @param {any[] | null} [prefetched]
 * @returns {Promise<boolean>} true when this subtree changed
 */
async function dig(pass, location, prefetched = null) {
  if (pass.dirty >= pass.maxReplaces) return false;
  if (pass.visiting.has(location) || alreadyReplaced(pass, location)) {
    return false;
  }
  pass.visiting.add(location);

  try {
    let children = Array.isArray(prefetched) ? prefetched : null;
    if (!children) {
      try {
        children = await fetchChildren(
          pass.grid.network,
          pass.collection,
          location,
          true
        );
      } catch (error) {
        console.warn("[aggregate.reconcile] getSets failed:", location, error);
        return false;
      }
      pass.read += 1;
    }

    const geometry = pass.grid.getGeometry(location);
    const local =
      pass.cube.get(geometry.xyz) ??
      create(geometry.xyz, geometry.bounds, 0, [], undefined, [], location);

    // Clean means both: the same mass, and the same children under it. Equal
    // mass alone hides a sibling that arrived while another one left.
    if (abelianEqual(local, abelianTotal(children))) {
      const drift = childrenMembershipDrift(
        local,
        children,
        pass.cube,
        pass.grid.space
      );
      if (!drift) return false;
    }

    const sets = remoteSetChildren(location, children).filter((child) =>
      overlapsViewport(pass, child.location)
    );

    if (locationDepth(location) >= pass.maxDepth || sets.length === 0) {
      return replaceBranchAt(pass, location);
    }

    /** Children the cube never saw, and children whose mass drifted. */
    const missing = [];
    const drifted = [];
    for (let i = 0; i < sets.length; i++) {
      const child = sets[i];
      const cell = pass.cube.get(pass.grid.getGeometry(child.location).xyz);
      if (!cell) {
        missing.push(child.location);
      } else if (!abelianEqual(cell, child.set)) {
        drifted.push(child.location);
      }
    }

    // Descend one level at a time: only the dirty sibling ring is read next.
    // Their `/sets` answers carry the next Abelian delta, same as `@` did.
    const stale = [...missing, ...drifted];
    if (stale.length > 0) {
      for (let i = 0; i < stale.length; i++) {
        invalidate(pass, stale[i]);
      }
      await fetchChildrenOf(pass.grid.network, pass.collection, stale, true);

      for (let i = 0; i < missing.length; i++) {
        await replaceBranchAt(pass, missing[i]);
      }
      for (let i = 0; i < drifted.length; i++) {
        await dig(pass, drifted[i]);
      }
    }

    // Refresh this parent from remote whatever happened below. Never
    // replaceBranch here: that would re-drill the whole subtree.
    recalculateParent(pass, location, children);
    return true;
  } finally {
    pass.visiting.delete(location);
  }
}

/**
 * Distant-delta repair: one `/sets` on `@` first. That answer is the whole
 * tree's Abelian — when it matches the cube, stop. Only when `@` moved (or
 * its child membership drifted) walk down, reading each dirty sibling ring
 * before descending further.
 *
 * @param {number} zoom
 * @param {any} bounds
 * @param {import("../cube/index.js").Cube} cube
 * @param {{ maxParents?: number }} [opts]
 * @returns {Promise<{ dirty: number, rootBefore?: number, rootAfter?: number, zonesRead?: number }>}
 */
export async function reconcileVisible(zoom, bounds, cube, opts = {}) {
  if (!this.network || !cube || zoom == null || bounds == null) {
    return { dirty: 0 };
  }
  if (!this.network._hosts?.length) return { dirty: 0 };
  if (globalThis.__INDEXUS_BEARER__ === "") return { dirty: 0 };

  const targetXyz = Math.floor(
    zoom + this.options.resolution + this.options.offset.zoom
  );

  /** @type {Reconcile} */
  const pass = {
    grid: this,
    cube,
    collection: this.collection,
    bounds,
    maxDepth: Math.max(0, Math.ceil(targetXyz / Math.max(1, this.space.step))),
    maxReplaces: Number.isFinite(opts.maxParents)
      ? Math.max(1, Math.floor(opts.maxParents))
      : DEFAULT_RECONCILE_MAX_PARENTS,
    replaced: [],
    visiting: new globalThis.Set(),
    dirty: 0,
    read: 0,
  };

  const rootXyz = this.getGeometry(ROOT).xyz;
  const before = abelianCount(cube.get(rootXyz) ?? { count: 0 });
  const startedAt = Date.now();

  // Always the first (and often only) on-wire read of a quiet pass.
  invalidate(pass, ROOT);
  let rootChildren;
  try {
    rootChildren = await fetchChildren(
      this.network,
      this.collection,
      ROOT,
      true
    );
  } catch (error) {
    console.warn("[aggregate.reconcile] root getSets failed:", error);
    return {
      dirty: 0,
      rootBefore: before,
      rootAfter: before,
      zonesRead: 0,
    };
  }
  pass.read += 1;

  const rootLocal =
    cube.get(rootXyz) ??
    create(rootXyz, this.getGeometry(ROOT).bounds, 0, [], undefined, [], ROOT);
  const rootRemote = abelianTotal(rootChildren);
  if (abelianEqual(rootLocal, rootRemote)) {
    const drift = childrenMembershipDrift(
      rootLocal,
      rootChildren,
      cube,
      this.space
    );
    if (!drift) {
      if (debugEnabled("refresh")) {
        debugLog("refresh", "root quiet — skip subzones", {
          collection: this.collection,
          rootCount: before,
          zonesRead: pass.read,
          ms: Date.now() - startedAt,
        });
      }
      return {
        dirty: 0,
        rootBefore: before,
        rootAfter: before,
        zonesRead: pass.read,
      };
    }
  }

  await dig(pass, ROOT, rootChildren);

  const after = abelianCount(cube.get(rootXyz) ?? { count: 0 });

  if (debugEnabled("refresh")) {
    debugLog("refresh", "pass done", {
      collection: this.collection,
      maxDepth: pass.maxDepth,
      zonesRead: pass.read,
      branchesReplaced: pass.dirty,
      rootBefore: before,
      rootAfter: after,
      rootDelta: signed(after - before),
      ms: Date.now() - startedAt,
    });
    if (pass.read > 0 && pass.dirty === 0 && after === before) {
      debugLog("refresh", "nothing moved — the mesh and the cube agree");
    }
  }

  return {
    dirty: pass.dirty,
    rootBefore: before,
    rootAfter: after,
    zonesRead: pass.read,
  };
}
