/**
 * Unit tests for reconcile helpers and always-replaceBranch apply path.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Set } from "../entities/set.js";
import { ROOT } from "../utilities/encoding.js";
import { childrenMembershipDrift, reconcileVisible } from "./layer.js";

describe("childrenMembershipDrift", () => {
  it("detects a new remote sibling with same Abelian mass shape", () => {
    const childXyz = { resolution: 2, coordinates: [0, 0] };
    const local = {
      count: 5,
      metrics: [50],
      children: [childXyz],
    };
    const cube = {
      get(xyz) {
        if (xyz === childXyz || xyz?.coordinates?.[0] === 0) {
          return { xyz: childXyz, hash: "AB", count: 5, metrics: [50] };
        }
        return undefined;
      },
    };
    const remote = [
      new Set("col", "AB", 3, [30]),
      new Set("col", "AC", 2, [20]),
    ];
    assert.ok(
      childrenMembershipDrift(local, remote, cube, {}),
      "expected membership drift for new remote sibling"
    );
  });

  it("is false when membership matches", () => {
    const childXyz = { resolution: 2, coordinates: [0, 0] };
    const local = {
      count: 5,
      metrics: [50],
      children: [childXyz],
    };
    const cube = {
      get() {
        return { xyz: childXyz, hash: "AB", count: 5, metrics: [50] };
      },
    };
    const remote = [new Set("col", "AB", 5, [50])];
    assert.equal(
      childrenMembershipDrift(local, remote, cube, {}),
      false
    );
  });
});

describe("reconcileVisible", () => {
  it("digs from @ and replaceBranch on the dirty child branch", async () => {
    const rootXyz = { resolution: 0, coordinates: [0, 0] };
    const parentXyz = { resolution: 1, coordinates: [0, 0] };
    const childXyz = { resolution: 2, coordinates: [0, 0] };
    const siblingXyz = { resolution: 2, coordinates: [1, 0] };
    const parentBounds = { min: [0, 0], max: [1, 1] };
    const childBounds = { min: [0, 0], max: [0.5, 0.5] };

    const rootCell = {
      xyz: rootXyz,
      bounds: parentBounds,
      hash: ROOT,
      count: 5,
      metrics: [50],
      children: [parentXyz],
    };
    const parentCell = {
      xyz: parentXyz,
      bounds: parentBounds,
      hash: "A",
      count: 5,
      metrics: [50],
      children: [childXyz],
    };
    const childCell = {
      xyz: childXyz,
      bounds: childBounds,
      hash: "AB",
      count: 5,
      metrics: [50],
      children: [],
    };

    let replaceCalls = 0;
    /** @type {any[]|null} */
    let lastBranch = null;
    /** @type {string|null} */
    let lastReplaceHash = null;

    const cube = {
      options: { resolution: 0 },
      current: {},
      root: rootCell,
      data: {
        "0:0,0": rootCell,
        "1:0,0": parentCell,
        "2:0,0": childCell,
      },
      key(xyz) {
        return `${xyz.resolution}:${xyz.coordinates.join(",")}`;
      },
      get(xyz) {
        return this.data[this.key(xyz)];
      },
      add(cell) {
        this.data[this.key(cell.xyz)] = cell;
      },
      replaceBranch(xyz, branchCells) {
        replaceCalls += 1;
        lastBranch = branchCells;
        lastReplaceHash = branchCells[0]?.hash || null;
        // Simulate atomic swap under A: parent now has two children.
        if (lastReplaceHash === "A" || this.key(xyz) === this.key(parentXyz)) {
          parentCell.count = 9;
          parentCell.metrics = [90];
          parentCell.children = [childXyz, siblingXyz];
          this.data[this.key(siblingXyz)] = {
            xyz: siblingXyz,
            bounds: childBounds,
            hash: "AC",
            count: 5,
            metrics: [50],
            children: [],
          };
        }
      },
      set() {
        assert.fail("cube.set must not be used on reconcile apply path");
      },
    };

    const remoteParentChildren = [
      new Set("col", "AB", 4, [40]),
      new Set("col", "AC", 5, [50]),
    ];
    // getSet(AB) children must sum to the parent-listed Abelian (4).
    const remoteByHash = {
      [ROOT]: [new Set("col", "A", 9, [90])],
      A: remoteParentChildren,
      AB: [new Set("col", "ABx", 4, [40])],
      AC: [],
      ABx: [],
    };

    const grid = {
      collection: "col",
      space: {
        step: 1,
        overlap() {
          return { overlap: true, contained: false };
        },
      },
      options: {
        resolution: 0,
        offset: { zoom: 0, bounds: 0 },
      },
      network: {
        _hosts: ["http://localhost"],
        invalidate() {},
        async getSets(_collection, locs) {
          const map = new Map();
          for (const loc of locs) {
            map.set(loc, remoteByHash[loc] || []);
          }
          return map;
        },
        async getSet(_collection, hash) {
          return remoteByHash[hash] || [];
        },
      },
      invalidate() {},
      getGeometry(hash) {
        if (hash === "A") {
          return { xyz: parentXyz, bounds: parentBounds };
        }
        if (hash === "AB") {
          return { xyz: childXyz, bounds: childBounds };
        }
        if (hash === "AC") {
          return { xyz: siblingXyz, bounds: childBounds };
        }
        if (hash === "ABx") {
          return {
            xyz: { resolution: 3, coordinates: [0, 0] },
            bounds: childBounds,
          };
        }
        if (hash === ROOT) {
          return { xyz: rootXyz, bounds: parentBounds };
        }
        throw new Error(`geometry ${hash}`);
      },
    };

    const result = await reconcileVisible.call(grid, 2, parentBounds, cube, {
      maxParents: 8,
    });

    // Dig from @: add AC + replace AB, then recalculate parents A and @.
    assert.ok(result.dirty >= 1);
    assert.ok(replaceCalls >= 1);
    const updatedA = cube.get(parentXyz);
    assert.ok(updatedA);
    assert.ok(updatedA.children.length >= 2);
    assert.equal(updatedA.count, 9);
    const updatedRoot = cube.get(rootXyz);
    assert.ok(updatedRoot);
    assert.equal(updatedRoot.count, 9);
    assert.deepEqual(updatedRoot.metrics, [90]);
  });

  it("probes @ first and skips subzones when the root Abelian is quiet", async () => {
    const rootXyz = { resolution: 0, coordinates: [0, 0] };
    const parentXyz = { resolution: 1, coordinates: [0, 0] };
    const parentBounds = { min: [0, 0], max: [1, 1] };

    const rootCell = {
      xyz: rootXyz,
      bounds: parentBounds,
      hash: ROOT,
      count: 9,
      metrics: [90],
      children: [parentXyz],
    };
    const parentCell = {
      xyz: parentXyz,
      bounds: parentBounds,
      hash: "A",
      count: 9,
      metrics: [90],
      children: [],
    };

    /** @type {string[][]} */
    const requested = [];
    const cube = {
      options: { resolution: 0 },
      current: {},
      data: {
        "0:0,0": rootCell,
        "1:0,0": parentCell,
      },
      key(xyz) {
        return `${xyz.resolution}:${xyz.coordinates.join(",")}`;
      },
      get(xyz) {
        return this.data[this.key(xyz)];
      },
      add(cell) {
        this.data[this.key(cell.xyz)] = cell;
      },
      replaceBranch() {
        assert.fail("quiet root must not replaceBranch");
      },
      set() {
        assert.fail("cube.set must not be used on reconcile apply path");
      },
    };

    const grid = {
      collection: "col",
      space: {
        step: 1,
        overlap() {
          return { overlap: true, contained: false };
        },
      },
      options: {
        resolution: 0,
        offset: { zoom: 0, bounds: 0 },
      },
      network: {
        _hosts: ["http://localhost"],
        invalidate() {},
        async getSets(_collection, locs) {
          requested.push([...locs]);
          const map = new Map();
          for (const loc of locs) {
            map.set(
              loc,
              loc === ROOT ? [new Set("col", "A", 9, [90])] : []
            );
          }
          return map;
        },
      },
      invalidate() {},
      getGeometry(hash) {
        if (hash === "A") {
          return { xyz: parentXyz, bounds: parentBounds };
        }
        if (hash === ROOT) {
          return { xyz: rootXyz, bounds: parentBounds };
        }
        throw new Error(`geometry ${hash}`);
      },
    };

    const result = await reconcileVisible.call(grid, 2, parentBounds, cube, {
      maxParents: 8,
    });

    assert.equal(result.dirty, 0);
    assert.equal(result.zonesRead, 1);
    assert.deepEqual(requested, [[ROOT]]);
  });
});
