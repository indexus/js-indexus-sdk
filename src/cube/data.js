import {
  abelianCount,
  abelianEqual,
  abelianMetrics,
  abelianSubtract,
  abelianSum,
} from "../entities/abelian.js";
import { parent as parentLocation } from "../utilities/encoding.js";
import { debugEnabled, debugLog, signed } from "../utilities/debug.js";

export function create(xyz, bounds, count, metrics, items, children, hash) {
  return {
    xyz,
    bounds,
    count,
    metrics,
    items,
    children,
    hash,
  };
}

/** Copy of `cell`, with the listed fields overridden. */
function derive(cell, changes) {
  return create(
    changes.xyz ?? cell.xyz,
    changes.bounds ?? cell.bounds,
    changes.count ?? cell.count,
    changes.metrics ?? cell.metrics,
    changes.items !== undefined ? changes.items : cell.items,
    changes.children ?? cell.children,
    changes.hash ?? cell.hash
  );
}

export function add(element) {
  this.data[this.key(element.xyz)] = element;
}

export function get(xyz) {
  return this.data[this.key(xyz)];
}

export function key(xyz) {
  let output = `${xyz.resolution}`;
  for (let i = 0; i < xyz.coordinates.length; i++) {
    output += `-${xyz.coordinates[i]}`;
  }
  return output;
}

export function parent(xyz) {
  if (!xyz.resolution) {
    return null;
  }
  const coordinates = new Array(xyz.coordinates.length);
  for (let i = 0; i < xyz.coordinates.length; i++) {
    coordinates[i] = Math.floor(xyz.coordinates[i] / 2);
  }
  return {
    resolution: xyz.resolution - 1,
    coordinates,
  };
}

export function children(xyz) {
  const resolution = xyz.resolution + 1;
  const coordinates = xyz.coordinates;
  const dimensions = coordinates.length;
  const length = 2 ** dimensions;
  const children = new Array(length);

  for (let mask = 0; mask < length; mask++) {
    const childCoordinates = new Array(dimensions);
    for (let i = 0; i < dimensions; i++) {
      const bit = (mask >> (dimensions - 1 - i)) & 1;
      childCoordinates[i] = coordinates[i] * 2 + bit;
    }
    children[mask] = {
      resolution,
      coordinates: childCoordinates,
    };
  }
  return children;
}

/** Carry an Abelian delta up the ancestor chain, as far as cells are loaded. */
function rollupDelta(xyz, dCount, dMetrics) {
  let current = xyz;
  while (current) {
    const cell = this.get(current);
    if (!cell) break;
    this.add(
      derive(cell, {
        count: abelianCount(cell) + dCount,
        metrics: abelianSum(abelianMetrics(cell).slice(), dMetrics),
      })
    );
    current = this.parent(current);
  }
}

export function set(elements) {
  const parents = {};
  let keep = elements.length;
  const trace = debugEnabled("cube")
    ? { fresh: 0, unchanged: 0, patched: 0, countDelta: 0 }
    : null;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const existing = this.get(element.xyz);

    if (existing) {
      keep--;
    }

    const existingChildren = existing?.children;
    const hasSubtree =
      Array.isArray(existingChildren) && existingChildren.length > 0;

    if (!existing || !hasSubtree) {
      if (trace) trace.fresh++;
      this.add(element);
    } else if (!abelianEqual(existing, element)) {
      // Remote Abelian drifted during inserts: patch mass + adopt remote
      // children links when the payload carries them (reconcile drill).
      // Otherwise keep the live drilled children[]. Ancestor rollup via delta.
      const previousCount = abelianCount(existing);
      const previousMetrics = abelianMetrics(existing);
      const count = abelianCount(element);
      const metrics = abelianMetrics(element).slice();

      if (trace) {
        trace.patched++;
        trace.countDelta += count - previousCount;
      }

      this.add(
        derive(existing, {
          xyz: element.xyz,
          bounds: element.bounds,
          count,
          metrics,
          items: element.items,
          children: element.children?.length
            ? element.children.slice()
            : existingChildren,
          hash: element.hash,
        })
      );

      rollupDelta.call(
        this,
        this.parent(element.xyz),
        count - previousCount,
        abelianSubtract(metrics.slice(), previousMetrics)
      );
    } else if (trace) {
      // Abelian equal + existing subtree → keep local tree (no churn)
      trace.unchanged++;
    }

    this.merge(parents, element);
  }

  // Only the levels that actually corrected something are worth a line; the
  // steady state is a wall of "unchanged".
  if (trace && trace.patched > 0) {
    debugLog("cube", "cells patched", {
      resolution: elements[0]?.xyz?.resolution,
      applied: elements.length,
      fresh: trace.fresh,
      patched: trace.patched,
      unchanged: trace.unchanged,
      countDelta: signed(trace.countDelta),
    });
  }

  if (keep) {
    this.set(Object.values(parents));
  }
  this.current = {};
}

export function merge(parents, element) {
  const xyz = this.parent(element.xyz);

  if (!xyz) return;

  const key = this.key(xyz);
  const parent = parents[key];

  if (!parent) {
    parents[key] = this.create(
      xyz,
      this.space.bounds(xyz),
      abelianCount(element),
      abelianMetrics(element).slice(),
      undefined,
      [element.xyz],
      element.hash ? parentLocation(element.hash) : undefined
    );
    return;
  }

  parent.count += abelianCount(element);
  parent.metrics = abelianSum(parent.metrics, abelianMetrics(element));
  parent.children.push(element.xyz);
}

/**
 * @param {"visual" | "items"} purpose
 *   - visual: respect `options.limit` (seuil de zone ; 0 = ne coupe pas la descente sur ce seuil seul) and `options.children` (enfants complets).
 *   - items: descend through every loaded branch; ignore `options.limit` so item counts / overlay
 *     do not change when the user tweaks the zone subdivision threshold (only visual LOD changes).
 */
export function retrieve(resolution, bounds, xyz, bypass, purpose = "visual") {
  const result = [];
  const stack = [{ xyz, bypass }];
  const needChildren =
    purpose === "items" ? 1 : (this.options.children ?? 1);

  while (stack.length > 0) {
    const current = stack.pop();
    const element = this.get(current.xyz);
    if (!element) continue;

    let nextBypass = current.bypass;
    if (!nextBypass) {
      const { overlap, contained } = this.space.overlap(bounds, element.bounds);
      if (!overlap) continue;
      nextBypass = contained;
    }

    if (element.xyz.resolution === resolution) {
      result.push(element);
      continue;
    }

    if (purpose === "items") {
      if (this.isCovered(element) && element.children.length < needChildren) {
        result.push(element);
        continue;
      }
    } else if (
      this.isCovered(element) &&
      (element.count <= this.options.limit ||
        element.children.length < needChildren)
    ) {
      result.push(element);
      continue;
    }

    if (!element.children.length) {
      result.push(element);
      continue;
    }

    for (let i = element.children.length - 1; i >= 0; i--) {
      stack.push({ xyz: element.children[i], bypass: nextBypass });
    }
  }

  return result;
}

/**
 * Atomically swap a parent subtree: prune parent + descendants, then force-write
 * `branchCells` (detached rebuild from reconcile). Does not run merge/rollup.
 *
 * @param {any} parentXyz
 * @param {any[]} branchCells
 */
export function replaceBranch(parentXyz, branchCells) {
  if (!parentXyz || !Array.isArray(branchCells)) return;

  const stack = [parentXyz];
  const seen = new globalThis.Set();
  while (stack.length) {
    const xyz = stack.pop();
    const k = this.key(xyz);
    if (seen.has(k)) continue;
    seen.add(k);
    const cell = this.get(xyz);
    if (!cell) continue;
    if (Array.isArray(cell.children)) {
      for (let i = 0; i < cell.children.length; i++) {
        stack.push(cell.children[i]);
      }
    }
    delete this.data[k];
  }

  for (let i = 0; i < branchCells.length; i++) {
    const element = branchCells[i];
    if (!element?.xyz) continue;
    this.add(
      create(
        element.xyz,
        element.bounds,
        abelianCount(element),
        abelianMetrics(element).slice(),
        element.items,
        Array.isArray(element.children) ? element.children.slice() : [],
        element.hash
      )
    );
  }

  this.current = {};
}

/**
 * Remove cells deeper than `maxResolution` (exclusive upper bound on
 * xyz.resolution) and drop dangling children links. Used after Aggregate
 * refresh / zoom-out so over-fine disks from a previous LOD don't linger.
 * @returns {number} count of removed cells
 */
export function pruneDeeperThan(maxResolution) {
  if (!Number.isFinite(maxResolution)) return 0;
  const max = Math.floor(maxResolution);
  let removed = 0;
  for (const k of Object.keys(this.data)) {
    const cell = this.data[k];
    if (!cell?.xyz) continue;
    if (cell.xyz.resolution > max) {
      delete this.data[k];
      removed += 1;
    }
  }
  if (removed === 0) return 0;
  for (const cell of Object.values(this.data)) {
    if (!Array.isArray(cell.children) || cell.children.length === 0) continue;
    const kept = [];
    for (let i = 0; i < cell.children.length; i++) {
      if (this.get(cell.children[i])) kept.push(cell.children[i]);
    }
    cell.children = kept;
  }
  this.current = {};
  return removed;
}
