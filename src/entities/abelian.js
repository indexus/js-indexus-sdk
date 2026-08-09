/**
 * The (count, metrics) mass a Set carries — go-indexus-core domain.Abelian.
 *
 * Expressed as functions over raw values rather than a class: the Cube keeps
 * millions of cells as plain objects so they can be packed straight into GPU
 * buffers, and Sets/Items expose the same mass behind accessors. Every reader
 * below therefore takes either shape.
 */

/**
 * @param {{ count?: number | (() => number), _count?: number } | null} value
 * @returns {number}
 */
export function abelianCount(value) {
  if (!value) return 0;
  if (typeof value.count === "function") return value.count();
  if (typeof value.count === "number") return value.count;
  if (typeof value._count === "number") return value._count;
  return 0;
}

/**
 * @param {{ metrics?: number[] | (() => number[]), _metrics?: number[] } | null} value
 * @returns {number[]}
 */
export function abelianMetrics(value) {
  if (!value) return [];
  if (typeof value.metrics === "function") {
    const own = value.metrics();
    return Array.isArray(own) ? own : [];
  }
  if (Array.isArray(value.metrics)) return value.metrics;
  if (Array.isArray(value._metrics)) return value._metrics;
  return [];
}

/** domain.Abelian.IsEqual, with the float tolerance a decoded payload needs. */
export function abelianEqual(a, b, eps = 1e-9) {
  if (a == null || b == null) return a === b;

  if (abelianCount(a) !== abelianCount(b)) return false;

  const ma = abelianMetrics(a);
  const mb = abelianMetrics(b);
  if (ma.length !== mb.length) return false;
  for (let i = 0; i < ma.length; i++) {
    if (Math.abs(ma[i] - mb[i]) > eps) return false;
  }
  return true;
}

/**
 * Count-only comparison, for deciding whether a zone drifted.
 *
 * A metric cannot move without an item entering or leaving a set, so the count
 * already reports every real change — and it is an exact integer. The metrics
 * are floats the local tree folded in a different child order than the node
 * did, so they differ in the low bits on essentially every zone: comparing them
 * declared the whole tree dirty on each pass.
 */
export function abelianCountEqual(a, b) {
  if (a == null || b == null) return a === b;
  return abelianCount(a) === abelianCount(b);
}

/**
 * Fold `delta` into `target` position by position, in place.
 *
 * Nothing forces a collection to hold items of one metric width, so a narrower
 * delta only touches the positions it carries. Unlike Go a wider delta widens
 * the target instead of being truncated: here the width is discovered from the
 * children as the tree is drilled, and dropping a column would lose a
 * heatmap dimension for good.
 *
 * @param {number[] | undefined} target
 * @param {number[] | undefined} delta
 * @param {1 | -1} sign
 * @returns {number[]} `target`, widened, or a fresh array when it was absent
 */
function fold(target, delta, sign) {
  const from = Array.isArray(delta) ? delta : [];
  if (!Array.isArray(target)) {
    const fresh = new Array(from.length);
    for (let i = 0; i < from.length; i++) fresh[i] = sign * from[i];
    return fresh;
  }
  if (from.length > target.length) {
    const previous = target.length;
    target.length = from.length;
    for (let i = previous; i < from.length; i++) target[i] = 0;
  }
  for (let i = 0; i < from.length; i++) {
    target[i] += sign * from[i];
  }
  return target;
}

/** domain.Abelian.Sum on the metrics vector. */
export function abelianSum(target, delta) {
  return fold(target, delta, 1);
}

/** domain.Abelian.Substract on the metrics vector. */
export function abelianSubtract(target, delta) {
  return fold(target, delta, -1);
}

/**
 * Total mass of a list of children (cube cells, Sets and/or Items).
 * @param {any[]} values
 * @returns {{ count: number, metrics: number[] }}
 */
export function abelianTotal(values) {
  let count = 0;
  let metrics = [];
  if (!Array.isArray(values)) {
    return { count, metrics };
  }
  for (let i = 0; i < values.length; i++) {
    count += abelianCount(values[i]);
    metrics = abelianSum(metrics, abelianMetrics(values[i]));
  }
  return { count, metrics };
}
