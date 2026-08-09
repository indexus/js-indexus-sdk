/**
 * The `/sets` binary is a lossy projection: the server strips `:reference` and
 * truncates every key to its precision, so a payload can name the same cell
 * several times. Decoding has to add those rows up — the counts it produces are
 * the Aggregate view's numbers.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { binaryBlocksToRawMap, binaryBlocksToElements } from "./decodeSetsBinary.js";

/**
 * One decoded depth bucket. `counts` is property column 0; the three metric
 * columns follow in the order http/p2p declares them.
 */
function block(depthIndex, keys, counts, metrics = null) {
  const size = keys.length;
  const zeros = new Array(size).fill(0);
  return {
    depthIndex,
    size,
    keys,
    columns: [counts, metrics?.[0] ?? zeros, metrics?.[1] ?? zeros, metrics?.[2] ?? zeros],
    bitCounts: [8, 8, 8, 8],
  };
}

test("rows sharing a truncated key are summed, not overwritten", () => {
  const stats = { folded: 0 };
  const raw = binaryBlocksToRawMap(
    [block(5, ["7xSEvI", "7xSEvg", "7xSEvI"], [1, 1, 1])],
    undefined,
    stats
  );

  assert.equal(Object.keys(raw).length, 2);
  assert.equal(raw["7xSEvI"].count, 2, "both items in the cell are counted");
  assert.equal(raw["7xSEvg"].count, 1);
  assert.equal(stats.folded, 1, "the fold is reported so it can be logged");
});

test("no key repeats, nothing folds", () => {
  const stats = { folded: 0 };
  const raw = binaryBlocksToRawMap([block(0, ["1", "7", "e"], [10, 20, 30])], undefined, stats);

  assert.deepEqual(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.count])),
    { 1: 10, 7: 20, e: 30 }
  );
  assert.equal(stats.folded, 0);
});

test("a folded cell keeps the whole mass of its metrics", () => {
  // Columns are [count, €/m² (÷1), lat (÷1e6), lng (÷1e6)].
  const raw = binaryBlocksToRawMap([
    block(5, ["7xSEvI", "7xSEvI"], [1, 1], [[3000, 5000], [0, 0], [0, 0]]),
  ]);

  assert.equal(raw["7xSEvI"].count, 2);
  assert.equal(raw["7xSEvI"].metrics[2], 8000, "the metric column is summed too");
});

test("the payload total survives decoding", () => {
  const keys = ["aaaaaa", "aaaaab", "aaaaaa", "aaaaac", "aaaaab", "aaaaaa"];
  const counts = [1, 4, 2, 1, 3, 5];
  const raw = binaryBlocksToRawMap([block(5, keys, counts)]);

  const decoded = Object.values(raw).reduce((a, v) => a + v.count, 0);
  assert.equal(decoded, counts.reduce((a, b) => a + b, 0));
});

test("a cell holding several items reads as a zone, not as one of them", () => {
  // parseSetMap keys off count: 1 is a single item, more than 1 is a set. Two
  // items folded into one cell must therefore stop presenting as a lone item.
  const elements = binaryBlocksToElements("demo", [
    block(5, ["7xSEvI", "7xSEvI", "7xSEvg"], [1, 1, 1]),
  ]);

  const byHash = Object.fromEntries(elements.map((e) => [e.hash(), e]));
  assert.equal(byHash["7xSEvI"].count(), 2);
  assert.equal(byHash["7xSEvg"].count(), 1);
});
