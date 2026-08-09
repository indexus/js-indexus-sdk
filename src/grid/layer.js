import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";
import {
  abelianCount,
  abelianCountEqual,
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
const DEFAULT_RECONCILE_MAX_READS = 256;

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

  // himo.place: viewport-ranked serial chunks (near rings warm the cache first).
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
    // himo: skip ROOT — process() fetches `@` on the drill path.
    if (!location || location === ROOT) continue;
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
 * Viewport-first (himo.place): sort by overlap then center distance; prefetch
 * chunks sequentially so nearer rings populate the Network cache before
 * farther ones.
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

    if (this.monitoring?.enabled !== false) {
      this.monitoring.send(
        new Monitoring(current, State.Refresh, {
          id: id,
          depth: current,
          bounds: bounds[current],
          size: total,
        })
      );
    }

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
 * @param {boolean} [force]
 * @returns {Promise<any[]>}
 */
async function fetchChildren(net, collection, location, refresh = false, force = false) {
  const children = await fetchChildrenOf(
    net,
    collection,
    [location],
    refresh,
    force
  );
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
 * @param {boolean} [force] - also skip the Network refresh floor. Reserved for
 *   an explicit user refresh: deriving it from `refresh` put every automatic
 *   pass back on the wire and made the floor unreachable.
 */
async function fetchChildrenOf(
  net,
  collection,
  locations,
  refresh = false,
  force = false
) {
  if (!net || typeof net.getSets !== "function") {
    return new Map();
  }
  // Neither flag deletes the cache entry, so a re-read still has the previous
  // answer to diff against — no fake was:0 deltas.
  return net.getSets(collection, locations.filter(Boolean), { refresh, force });
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
 * `keepResolution` matches Aggregate `pruneDeeperThan(z+1)`: never materialize
 * cells the next prune would delete (that fight is the 10s `/sets` storm).
 *
 * @typedef {{
 *   grid: any,
 *   cube: import("../cube/index.js").Cube,
 *   collection: string,
 *   bounds: any,
 *   maxDepth: number,
 *   keepResolution: number,
 *   maxReplaces: number,
 *   maxReads: number,
 *   shouldStop: (() => boolean) | null,
 *   digConcurrencyCap: number | null,
 *   force: boolean,
 *   replaced: string[],
 *   visiting: globalThis.Set<string>,
 *   dirty: number,
 *   mutated: boolean,
 *   read: number,
 * }} Reconcile
 */

/**
 * Whether the walk must stop descending: either it spent its read budget, or
 * the caller signals the camera moved. A repair walk is a background task; it
 * must never turn into a full-tree crawl that starves the interactive `move`
 * drill of its share of the peer connections. Cells already written stay —
 * stopping early only forfeits the rest of the tree until the next pass.
 */
/**
 * Same pool the interactive drill uses, so both share one budget. Without a
 * pool the ring goes out whole, which is what `refresh` does too.
 *
 * `digConcurrencyCap` (delta tick) keeps the repair to a sliver of the pool:
 * a pan that starts mid-pass finds the `/sets` slots free instead of queued
 * behind background reads. The manual Refresh passes no cap.
 */
function digConcurrency(pass, count) {
  const net = pass.grid?.network;
  const requested =
    typeof net?.getConcurrency === "function" ? net.getConcurrency() : count;
  const base = Math.max(1, Math.floor(requested) || count);
  return pass.digConcurrencyCap ? Math.min(base, pass.digConcurrencyCap) : base;
}

function walkStopped(pass) {
  if (pass.read >= pass.maxReads) return true;
  return pass.shouldStop ? pass.shouldStop() === true : false;
}

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

function overlapsViewport(pass, location) {
  const { grid, bounds } = pass;
  if (!bounds || !grid?.space?.overlap) return true;
  try {
    return grid.space.overlap(bounds, grid.getGeometry(location).bounds).overlap;
  } catch {
    return true;
  }
}

function xyzResolution(xyz) {
  return Number(xyz?.resolution) || 0;
}

/** Cells finer than the Aggregate display band are intentionally absent. */
function withinKeepBand(pass, xyz) {
  return xyzResolution(xyz) <= pass.keepResolution;
}

/**
 * Remote set children we are willing to materialize: in viewport and not past
 * the prune keep band.
 */
function materialChildSets(pass, location, children) {
  return remoteSetChildren(location, children).filter((child) => {
    if (!overlapsViewport(pass, child.location)) return false;
    try {
      return withinKeepBand(pass, pass.grid.getGeometry(child.location).xyz);
    } catch {
      return false;
    }
  });
}

/**
 * Walk `location` down `remaining` steps of Set children, appending detached
 * cells to `cells`. Items fold into their parent's Abelian.
 * Stops at {@link Reconcile.keepResolution} so shadow fill cannot outrun prune.
 */
async function walkShadow(pass, location, geometry, remaining, cells) {
  let children = [];
  try {
    children = await fetchChildren(
      pass.grid.network,
      pass.collection,
      location,
      true,
      pass.force
    );
  } catch (error) {
    console.warn("[aggregate.reconcile] shadow getSets failed:", location, error);
  }
  pass.read += 1;

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

  const atKeepFloor = xyzResolution(geometry.xyz) >= pass.keepResolution;
  if (remaining <= 0 || atKeepFloor || walkStopped(pass)) return;

  const sets = materialChildSets(pass, location, children);
  if (sets.length === 0) return;

  const geometries = sets.map((child) => pass.grid.getGeometry(child.location));
  for (let i = 0; i < geometries.length; i++) {
    links.push(geometries[i].xyz);
  }

  // Batch-warm `/sets` for the whole sibling ring before descending.
  await fetchChildrenOf(
    pass.grid.network,
    pass.collection,
    sets.map((child) => child.location),
    true,
    pass.force
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
  // At most one step past the current hash depth, and never past keep LOD.
  const depthBudget = Math.max(0, pass.maxDepth - locationDepth(location));
  const cells = [];
  try {
    await walkShadow(pass, location, geometry, depthBudget, cells);
  } catch (error) {
    console.warn("[aggregate.reconcile] shadow branch failed:", location, error);
    return false;
  }
  if (cells.length === 0) return false;

  pass.cube.replaceBranch(geometry.xyz, cells);
  pass.cube.current = {};
  pass.replaced.push(location);
  pass.dirty += 1;
  pass.mutated = true;
  return true;
}

/**
 * Rewrite the parent cell from remote children plus the cube kids already
 * installed. Unlike replaceBranch on the parent, this keeps child subtrees.
 * Missing viewport children become shallow leaves (no deep shadow drill).
 */
function recalculateParent(pass, location, children) {
  try {
    const remote = abelianTotal(children);
    const links = [];

    const sets = materialChildSets(pass, location, children);
    for (let i = 0; i < sets.length; i++) {
      const child = sets[i];
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
    pass.mutated = true;
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
 * Missing siblings are shallow-inserted by {@link recalculateParent}; only
 * mass-drifted children are dug. Deep {@link replaceBranchAt} on every miss
 * was refilling tiers that Aggregate prune deletes each pass.
 *
 * @param {Reconcile} pass
 * @param {string} location
 * @param {any[] | null} [prefetched]
 * @returns {Promise<boolean>} true when this subtree changed
 */
async function dig(pass, location, prefetched = null) {
  if (pass.dirty >= pass.maxReplaces) return false;
  if (!Array.isArray(prefetched) && walkStopped(pass)) return false;
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
          true,
          pass.force
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
    const remoteTotal = abelianTotal(children);

    // Display-band floor: count only. Finer set membership is prune's job.
    if (xyzResolution(geometry.xyz) >= pass.keepResolution) {
      if (abelianCountEqual(local, remoteTotal)) return false;
      pass.cube.add(
        create(
          geometry.xyz,
          geometry.bounds,
          remoteTotal.count,
          remoteTotal.metrics,
          local.items,
          [],
          location
        )
      );
      pass.cube.current = {};
      pass.mutated = true;
      return true;
    }

    // Membership only among children we keep — finer remote sets are noise.
    const materialRemote = materialChildSets(pass, location, children).map(
      (child) => child.set
    );
    if (abelianCountEqual(local, remoteTotal)) {
      const localKeep = {
        ...local,
        children: (Array.isArray(local.children) ? local.children : []).filter(
          (xyz) => withinKeepBand(pass, xyz)
        ),
      };
      const drift = childrenMembershipDrift(
        localKeep,
        materialRemote,
        pass.cube,
        pass.grid.space
      );
      if (!drift) return false;
    }

    const sets = materialChildSets(pass, location, children);

    if (locationDepth(location) >= pass.maxDepth || sets.length === 0) {
      // Prefer a shallow parent rewrite over a deep shadow: at the dig floor
      // the Abelian on `children` is enough for the display band.
      if (sets.length === 0) {
        if (abelianCountEqual(local, remoteTotal)) return false;
        recalculateParent(pass, location, children);
        return true;
      }
      return replaceBranchAt(pass, location);
    }

    /** Children whose count drifted — descend. Missing ones stay shallow. */
    const drifted = [];
    for (let i = 0; i < sets.length; i++) {
      const child = sets[i];
      const cell = pass.cube.get(pass.grid.getGeometry(child.location).xyz);
      if (cell && !abelianCountEqual(cell, child.set)) {
        drifted.push(child.location);
      }
    }

    // Descend one level at a time: only the dirty sibling ring is read next.
    // No invalidate — a refresh re-reads while keeping prior cache for deltas.
    if (drifted.length > 0) {
      await fetchChildrenOf(
        pass.grid.network,
        pass.collection,
        drifted,
        true,
        pass.force
      );

      // Sibling subtrees are disjoint, so they go on the wire together. Awaiting
      // them one at a time cost read-count × round-trip and made the repair long
      // enough to overlap the interactive drill it is supposed to stay behind.
      await asyncPool(digConcurrency(pass, drifted.length), drifted, async (child) => {
        if (walkStopped(pass)) return;
        await dig(pass, child);
      });
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
 * Distant-delta repair: one `/sets` on `@` first. That answer carries the whole
 * tree's count — when it matches the cube, stop. Only when `@` moved (or its
 * child membership drifted) walk down, reading each dirty sibling ring before
 * descending further.
 *
 * Drift is decided on counts alone; see {@link abelianCountEqual}.
 *
 * @param {number} zoom
 * @param {any} bounds
 * @param {import("../cube/index.js").Cube} cube
 * @param {{
 *   maxParents?: number,
 *   maxReads?: number,
 *   keepResolution?: number,
 *   shouldStop?: () => boolean,
 *   digConcurrencyCap?: number,
 *   force?: boolean,
 * }} [opts]
 * @returns {Promise<{ dirty: number, mutated?: boolean, rootBefore?: number, rootAfter?: number, zonesRead?: number }>}
 */
export async function reconcileVisible(zoom, bounds, cube, opts = {}) {
  if (!this.network || !cube || zoom == null || bounds == null) {
    return { dirty: 0, mutated: false };
  }
  if (!this.network._hosts?.length) return { dirty: 0, mutated: false };
  if (globalThis.__INDEXUS_BEARER__ === "") return { dirty: 0, mutated: false };

  const targetXyz = Math.floor(
    zoom + this.options.resolution + this.options.offset.zoom
  );
  // Same upper bound as worker `pruneDeeperThan(z + 1)`.
  const keepResolution = Number.isFinite(opts.keepResolution)
    ? Math.max(0, Math.floor(opts.keepResolution))
    : targetXyz + 1;

  /** @type {Reconcile} */
  const pass = {
    grid: this,
    cube,
    collection: this.collection,
    bounds,
    maxDepth: Math.max(0, Math.ceil(targetXyz / Math.max(1, this.space.step))),
    keepResolution,
    maxReplaces: Number.isFinite(opts.maxParents)
      ? Math.max(1, Math.floor(opts.maxParents))
      : DEFAULT_RECONCILE_MAX_PARENTS,
    maxReads: Number.isFinite(opts.maxReads)
      ? Math.max(1, Math.floor(opts.maxReads))
      : DEFAULT_RECONCILE_MAX_READS,
    shouldStop: typeof opts.shouldStop === "function" ? opts.shouldStop : null,
    digConcurrencyCap:
      Number.isFinite(opts.digConcurrencyCap) && opts.digConcurrencyCap > 0
        ? Math.floor(opts.digConcurrencyCap)
        : null,
    // Only an explicit user refresh skips the Network refresh floor; the
    // periodic pass rides the cache when it fires inside the TTL.
    force: opts.force === true,
    replaced: [],
    visiting: new globalThis.Set(),
    dirty: 0,
    mutated: false,
    read: 0,
  };

  const rootXyz = this.getGeometry(ROOT).xyz;
  const before = abelianCount(cube.get(rootXyz) ?? { count: 0 });
  const startedAt = Date.now();

  debugLog("reconcile", "root probe begin", {
    collection: this.collection,
    localRootCount: before,
    keepResolution: pass.keepResolution,
    navigation: this.network?.readOptions?.()?.navigation,
    method: this.network?.readOptions?.()?.method,
  });

  // Always the first (and often only) on-wire read of a quiet pass — and the
  // one the Network refresh floor collapses when passes run back to back.
  let rootChildren;
  try {
    rootChildren = await fetchChildren(
      this.network,
      this.collection,
      ROOT,
      true,
      pass.force
    );
  } catch (error) {
    console.warn("[aggregate.reconcile] root getSets failed:", error);
    debugLog("reconcile", "root probe failed", {
      error: String(error?.message || error),
    });
    return {
      dirty: 0,
      mutated: false,
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
  const countMatch = abelianCountEqual(rootLocal, rootRemote);
  const rootMaterial = materialChildSets(pass, ROOT, rootChildren).map(
    (child) => child.set
  );
  const rootLocalKeep = {
    ...rootLocal,
    children: (Array.isArray(rootLocal.children) ? rootLocal.children : []).filter(
      (xyz) => withinKeepBand(pass, xyz)
    ),
  };
  const drift = countMatch
    ? childrenMembershipDrift(rootLocalKeep, rootMaterial, cube, this.space)
    : { reason: "count-mismatch" };

  debugLog("reconcile", "root probe result", {
    localCount: abelianCount(rootLocal),
    remoteCount: rootRemote.count,
    countMatch,
    drift: drift ? drift.reason : false,
    childSets: rootMaterial.length,
    ms: Date.now() - startedAt,
  });

  if (countMatch && !drift) {
    debugLog("reconcile", "root quiet — skip subzones", {
      collection: this.collection,
      rootCount: before,
      zonesRead: pass.read,
      ms: Date.now() - startedAt,
    });
    debugLog("refresh", "root quiet — skip subzones", {
      collection: this.collection,
      rootCount: before,
      zonesRead: pass.read,
      ms: Date.now() - startedAt,
    });
    return {
      dirty: 0,
      mutated: false,
      rootBefore: before,
      rootAfter: before,
      zonesRead: pass.read,
    };
  }

  debugLog("reconcile", "root dirty — descend", {
    reason: drift?.reason || "count-mismatch",
    maxDepth: pass.maxDepth,
    keepResolution: pass.keepResolution,
  });

  await dig(pass, ROOT, rootChildren);

  const after = abelianCount(cube.get(rootXyz) ?? { count: 0 });

  debugLog("reconcile", "pass done", {
    collection: this.collection,
    maxDepth: pass.maxDepth,
    keepResolution: pass.keepResolution,
    zonesRead: pass.read,
    readBudget: pass.maxReads,
    stopped: walkStopped(pass),
    branchesReplaced: pass.dirty,
    mutated: pass.mutated,
    rootBefore: before,
    rootAfter: after,
    rootDelta: signed(after - before),
    ms: Date.now() - startedAt,
  });
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
    if (pass.read > 0 && !pass.mutated && after === before) {
      debugLog("refresh", "nothing moved — the mesh and the cube agree");
    }
  }

  return {
    dirty: pass.dirty,
    mutated: pass.mutated,
    rootBefore: before,
    rootAfter: after,
    zonesRead: pass.read,
  };
}
