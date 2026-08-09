/**
 * Unit tests for the Abelian mass helpers (go-indexus-core domain.Abelian).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  abelianCount,
  abelianEqual,
  abelianMetrics,
  abelianSubtract,
  abelianSum,
  abelianTotal,
} from "./abelian.js";
import { Item } from "./item.js";
import { Set } from "./set.js";

describe("abelian readers", () => {
  it("reads cube cells, Sets and Items alike", () => {
    assert.equal(abelianCount({ count: 3 }), 3);
    assert.equal(abelianCount({ _count: 4 }), 4);
    assert.equal(abelianCount(new Set("col", "AB", 5, [1])), 5);
    assert.equal(abelianCount(null), 0);

    assert.deepEqual(abelianMetrics({ metrics: [1, 2] }), [1, 2]);
    assert.deepEqual(abelianMetrics({ _metrics: [3] }), [3]);
    assert.deepEqual(abelianMetrics(new Set("col", "AB", 5, [7])), [7]);
    assert.deepEqual(abelianMetrics(null), []);
  });
});

describe("abelianEqual", () => {
  it("matches equal count and metrics", () => {
    assert.equal(
      abelianEqual({ count: 3, metrics: [1, 2] }, { count: 3, metrics: [1, 2] }),
      true
    );
  });

  it("rejects count mismatch", () => {
    assert.equal(
      abelianEqual({ count: 3, metrics: [1] }, { count: 4, metrics: [1] }),
      false
    );
  });

  it("rejects metrics shape mismatch", () => {
    assert.equal(
      abelianEqual({ count: 1, metrics: [1, 2] }, { count: 1, metrics: [1] }),
      false
    );
  });

  it("rejects metrics value mismatch beyond epsilon", () => {
    assert.equal(
      abelianEqual(
        { count: 1, metrics: [1] },
        { count: 1, metrics: [1.001] },
        1e-9
      ),
      false
    );
  });

  it("accepts Set-style _count/_metrics", () => {
    assert.equal(
      abelianEqual(
        { _count: 2, _metrics: [10, 20] },
        { count: 2, metrics: [10, 20] }
      ),
      true
    );
  });

  it("treats nullish as unequal unless both nullish", () => {
    assert.equal(abelianEqual(null, null), true);
    assert.equal(abelianEqual(null, { count: 0, metrics: [] }), false);
  });
});

describe("abelianSum", () => {
  it("folds position by position", () => {
    assert.deepEqual(abelianSum([1, 2], [10, 20]), [11, 22]);
  });

  it("only touches the positions a narrower delta carries", () => {
    assert.deepEqual(abelianSum([1, 2, 3], [10]), [11, 2, 3]);
  });

  it("widens on a wider delta rather than dropping a column", () => {
    assert.deepEqual(abelianSum([1], [10, 20, 30]), [11, 20, 30]);
  });

  it("leaves no holes when widening", () => {
    const summed = abelianSum([1], [0, 0, 5]);
    assert.ok(summed.every((v) => Number.isFinite(v)));
    assert.deepEqual(summed, [1, 0, 5]);
  });

  it("returns a fresh vector when the target is absent", () => {
    const delta = [1, 2];
    const summed = abelianSum(undefined, delta);
    assert.deepEqual(summed, [1, 2]);
    assert.notEqual(summed, delta);
  });
});

describe("abelianSubtract", () => {
  it("is the inverse of abelianSum", () => {
    assert.deepEqual(abelianSubtract([11, 22], [10, 20]), [1, 2]);
  });

  it("widens with negatives when the delta is wider", () => {
    assert.deepEqual(abelianSubtract([1], [0, 5]), [1, -5]);
  });
});

describe("abelianTotal", () => {
  it("sums Sets and Items of mixed metric width", () => {
    const total = abelianTotal([
      new Set("col", "AB", 3, [10, 1]),
      new Set("col", "AC", 2, [20]),
      new Item("col", "ABx", [5, 2, 7]),
    ]);
    assert.equal(total.count, 6);
    assert.deepEqual(total.metrics, [35, 3, 7]);
  });

  it("never aliases a child metrics vector", () => {
    const child = new Set("col", "AB", 1, [4]);
    const total = abelianTotal([child]);
    total.metrics[0] = 99;
    assert.deepEqual(child.metrics(), [4]);
  });

  it("is empty for an empty or missing list", () => {
    assert.deepEqual(abelianTotal([]), { count: 0, metrics: [] });
    assert.deepEqual(abelianTotal(undefined), { count: 0, metrics: [] });
  });
});
