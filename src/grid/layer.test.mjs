/**
 * Unit tests for reconcile helpers and always-replaceBranch apply path.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Set } from "../entities/set.js";
import { ROOT } from "../utilities/encoding.js";
import {
  childrenMembershipDrift,
  reconcileVisible,
  refresh,
} from "./layer.js";

describe("prefetchBatchSets", () => {
  it("prefetches spatial chunks one after another (himo.place)", async () => {
    // Near rings warm the cache before farther ones — serial by design.
    let inFlight = 0;
    let peakInFlight = 0;
    let waves = 0;
    const parents = Array.from({ length: 12 }, (_, i) => ({
      _collection: "col",
      _hash: `P${i}`,
    }));
    const point = { value: () => [0, 0] };
    const bounds = { min: [0, 0], max: [1, 1] };

    const grid = {
      current: { id: "t1" },
      options: { network: { spatialPrefetchChunkSize: 4 } },
      cache: new Map(),
      network: {
        getConcurrency: () => 8,
        async getSets(_collection, locations) {
          waves += 1;
          inFlight += 1;
          peakInFlight = Math.max(peakInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 15));
          inFlight -= 1;
          return new Map((locations || []).map((loc) => [loc, []]));
        },
      },
      space: {
        overlap: () => ({ overlap: true, contained: false }),
        center: () => [point, point],
      },
      getGeometry() {
        return { bounds, xyz: { resolution: 1, coordinates: [0, 0] } };
      },
      arrayPool: {
        acquire: () => [],
        release() {},
      },
      seenPool: {
        acquire: () => new globalThis.Set(),
        release() {},
      },
      monitoring: { send() {} },
      stream: { flushNow() {}, enqueue() {} },
      finish() {},
      async process() {
        return [];
      },
    };

    await refresh.call(grid, "t1", parents, [bounds], 0, 0);

    assert.equal(peakInFlight, 1, `serial prefetch peak=${peakInFlight}`);
    assert.equal(waves, 3, `12 parents / chunk 4 → 3 waves, got ${waves}`);
  });
});

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
  it("digs from @; shallow-inserts missing siblings and replaceBranch drifted leaves", async () => {
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

    // Dig from @: shallow-add AC, dig/replace drifted AB, recalculate A and @.
    assert.ok(result.mutated);
    assert.ok(replaceCalls >= 1);
    const updatedA = cube.get(parentXyz);
    assert.ok(updatedA);
    assert.ok(updatedA.children.length >= 2);
    assert.equal(updatedA.count, 9);
    const updatedRoot = cube.get(rootXyz);
    assert.ok(updatedRoot);
    assert.equal(updatedRoot.count, 9);
    assert.deepEqual(updatedRoot.metrics, [90]);
    // Missing AC must not itself trigger replaceBranch (shallow leaf only).
    assert.notEqual(lastReplaceHash, "AC");
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

  it("leaves the refresh floor to decide, unless the user asked for a refresh", async () => {
    // Deriving `force` from `refresh` made every periodic pass skip the
    // Network refresh floor, so a quiet viewport still re-read `@` on the wire
    // once per pass instead of riding the cache within the TTL.
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

    /** @type {{refresh?: boolean, force?: boolean}[]} */
    const asked = [];
    const cube = {
      options: { resolution: 0 },
      current: {},
      data: { "0:0,0": rootCell, "1:0,0": parentCell },
      key(xyz) {
        return `${xyz.resolution}:${xyz.coordinates.join(",")}`;
      },
      get(xyz) {
        return this.data[this.key(xyz)];
      },
      add(cell) {
        this.data[this.key(cell.xyz)] = cell;
      },
      replaceBranch() {},
      set() {},
    };

    const grid = {
      collection: "col",
      space: {
        step: 1,
        overlap() {
          return { overlap: true, contained: false };
        },
      },
      options: { resolution: 0, offset: { zoom: 0, bounds: 0 } },
      network: {
        _hosts: ["http://localhost"],
        invalidate() {},
        async getSets(_collection, locs, options = {}) {
          asked.push(options);
          const map = new Map();
          for (const loc of locs) {
            map.set(loc, loc === ROOT ? [new Set("col", "A", 9, [90])] : []);
          }
          return map;
        },
      },
      invalidate() {},
      getGeometry(hash) {
        if (hash === "A") return { xyz: parentXyz, bounds: parentBounds };
        if (hash === ROOT) return { xyz: rootXyz, bounds: parentBounds };
        throw new Error(`geometry ${hash}`);
      },
    };

    await reconcileVisible.call(grid, 2, parentBounds, cube, { maxParents: 8 });
    assert.ok(asked.length > 0, "expected the pass to read at least once");
    for (const options of asked) {
      assert.equal(options.refresh, true, "a reconcile read revalidates");
      assert.equal(options.force, false, "the periodic pass respects the floor");
    }

    asked.length = 0;
    await reconcileVisible.call(grid, 2, parentBounds, cube, {
      maxParents: 8,
      force: true,
    });
    assert.ok(asked.length > 0);
    for (const options of asked) {
      assert.equal(options.force, true, "an explicit refresh reaches the node");
    }
  });

  it("reads drifted siblings side by side instead of one subtree at a time", async () => {
    // A depth-first walk that awaits each sibling's whole subtree turns the
    // repair into read-count × round-trip: 256 reads at ~35ms was a 9s pass
    // fighting the interactive drill for the same connections.
    const NAMES = ["A", "B", "C", "D", "E", "F"];
    const rootXyz = { resolution: 0, coordinates: [0, 0] };
    const bounds = { min: [0, 0], max: [1, 1] };

    const xyzOf = new Map([[ROOT, rootXyz]]);
    NAMES.forEach((name, i) => {
      xyzOf.set(name, { resolution: 1, coordinates: [i, 0] });
      xyzOf.set(`${name}1`, { resolution: 2, coordinates: [i, 0] });
    });

    const cells = new Map();
    const put = (hash, count, children) =>
      cells.set(`${xyzOf.get(hash).resolution}:${xyzOf.get(hash).coordinates}`, {
        xyz: xyzOf.get(hash),
        bounds,
        hash,
        count,
        metrics: [count * 10],
        children,
      });
    put(ROOT, NAMES.length * 10, NAMES.map((n) => xyzOf.get(n)));
    for (const name of NAMES) put(name, 10, [xyzOf.get(`${name}1`)]);

    const cube = {
      options: { resolution: 0 },
      current: {},
      key: (xyz) => `${xyz.resolution}:${xyz.coordinates}`,
      get(xyz) {
        return cells.get(this.key(xyz));
      },
      add(cell) {
        cells.set(this.key(cell.xyz), cell);
      },
      replaceBranch() {},
      set() {},
    };

    // Every sibling drifted by +1, so the walk must descend into all of them.
    const remote = { [ROOT]: NAMES.map((n) => new Set("col", n, 11, [110])) };
    for (const name of NAMES) {
      remote[name] = [new Set("col", `${name}1`, 11, [110])];
      remote[`${name}1`] = [];
    }

    let inFlight = 0;
    let peakInFlight = 0;
    const grid = {
      collection: "col",
      space: { step: 1, overlap: () => ({ overlap: true, contained: false }) },
      options: { resolution: 0, offset: { zoom: 0, bounds: 0 } },
      network: {
        _hosts: ["http://localhost"],
        invalidate() {},
        async getSets(_collection, locations) {
          inFlight += 1;
          peakInFlight = Math.max(peakInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 5));
          inFlight -= 1;
          const map = new Map();
          for (const location of locations) {
            map.set(location, remote[location] || []);
          }
          return map;
        },
      },
      invalidate() {},
      getGeometry(hash) {
        const xyz = xyzOf.get(hash);
        if (!xyz) throw new Error(`geometry ${hash}`);
        return { xyz, bounds };
      },
    };

    await reconcileVisible.call(grid, 2, bounds, cube, { keepResolution: 3 });

    assert.ok(
      peakInFlight > 1,
      `sibling subtrees must overlap on the wire (peak in-flight ${peakInFlight})`
    );
  });

  it("digConcurrencyCap keeps the delta tick to a sliver of the /sets pool", async () => {
    // Same drifted-siblings shape as above, but a delta tick passes a cap so
    // a pan that starts mid-pass finds the pool free instead of queued.
    const NAMES = ["A", "B", "C", "D", "E", "F"];
    const rootXyz = { resolution: 0, coordinates: [0, 0] };
    const bounds = { min: [0, 0], max: [1, 1] };

    const xyzOf = new Map([[ROOT, rootXyz]]);
    NAMES.forEach((name, i) => {
      xyzOf.set(name, { resolution: 1, coordinates: [i, 0] });
      xyzOf.set(`${name}1`, { resolution: 2, coordinates: [i, 0] });
    });

    const cells = new Map();
    const put = (hash, count, children) =>
      cells.set(`${xyzOf.get(hash).resolution}:${xyzOf.get(hash).coordinates}`, {
        xyz: xyzOf.get(hash),
        bounds,
        hash,
        count,
        metrics: [count * 10],
        children,
      });
    put(ROOT, NAMES.length * 10, NAMES.map((n) => xyzOf.get(n)));
    for (const name of NAMES) put(name, 10, [xyzOf.get(`${name}1`)]);

    const cube = {
      options: { resolution: 0 },
      current: {},
      key: (xyz) => `${xyz.resolution}:${xyz.coordinates}`,
      get(xyz) {
        return cells.get(this.key(xyz));
      },
      add(cell) {
        cells.set(this.key(cell.xyz), cell);
      },
      replaceBranch() {},
      set() {},
    };

    const remote = { [ROOT]: NAMES.map((n) => new Set("col", n, 11, [110])) };
    for (const name of NAMES) {
      remote[name] = [new Set("col", `${name}1`, 11, [110])];
      remote[`${name}1`] = [];
    }

    let inFlight = 0;
    let peakInFlight = 0;
    const grid = {
      collection: "col",
      space: { step: 1, overlap: () => ({ overlap: true, contained: false }) },
      options: { resolution: 0, offset: { zoom: 0, bounds: 0 } },
      network: {
        _hosts: ["http://localhost"],
        getConcurrency: () => 8,
        invalidate() {},
        async getSets(_collection, locations) {
          inFlight += 1;
          peakInFlight = Math.max(peakInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 5));
          inFlight -= 1;
          const map = new Map();
          for (const location of locations) {
            map.set(location, remote[location] || []);
          }
          return map;
        },
      },
      invalidate() {},
      getGeometry(hash) {
        const xyz = xyzOf.get(hash);
        if (!xyz) throw new Error(`geometry ${hash}`);
        return { xyz, bounds };
      },
    };

    await reconcileVisible.call(grid, 2, bounds, cube, {
      keepResolution: 3,
      digConcurrencyCap: 2,
    });

    assert.ok(peakInFlight >= 1, "the pass must read on the wire");
    assert.ok(
      peakInFlight <= 2,
      `capped tick must hold at most 2 /sets slots (peak ${peakInFlight})`
    );
  });
});
