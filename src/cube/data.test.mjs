/**
 * Unit tests for cube.set Abelian patching and branch surgery.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  create,
  add,
  get,
  key,
  parent,
  merge,
  set,
  replaceBranch,
  pruneDeeperThan,
} from "./data.js";

function makeCubeHarness() {
  const harness = {
    data: {},
    current: {},
    space: {
      bounds(xyz) {
        return { xyz };
      },
    },
    create,
    add,
    get,
    key,
    parent,
    merge,
    set,
  };
  harness.set = set.bind(harness);
  return harness;
}

describe("cube.set Abelian patch", () => {
  const rootXyz = { resolution: 0, coordinates: [0, 0] };
  const childXyz = { resolution: 1, coordinates: [0, 0] };
  const siblingXyz = { resolution: 1, coordinates: [1, 0] };

  it("keeps existing subtree when Abelian is unchanged", () => {
    const cube = makeCubeHarness();
    const childLink = [childXyz, siblingXyz];
    cube.add(
      create(rootXyz, { id: "root" }, 5, [100], undefined, childLink)
    );

    cube.set([
      create(rootXyz, { id: "root-new" }, 5, [100], undefined, []),
    ]);

    const cell = cube.get(rootXyz);
    assert.equal(cell.count, 5);
    assert.deepEqual(cell.metrics, [100]);
    assert.equal(cell.children.length, 2);
    assert.equal(cell.children[0], childXyz);
  });

  it("patches count/metrics but keeps children when Abelian differs", () => {
    const cube = makeCubeHarness();
    cube.add(
      create(rootXyz, { id: "root" }, 5, [100], undefined, [childXyz])
    );

    cube.set([
      create(rootXyz, { id: "root" }, 8, [250], undefined, []),
    ]);

    const cell = cube.get(rootXyz);
    assert.equal(cell.count, 8);
    assert.deepEqual(cell.metrics, [250]);
    assert.deepEqual(cell.children, [childXyz]);
  });

  it("adopts remote children links when patch payload carries them", () => {
    const cube = makeCubeHarness();
    cube.add(
      create(rootXyz, { id: "root" }, 5, [100], undefined, [childXyz])
    );

    cube.set([
      create(rootXyz, { id: "root" }, 9, [200], undefined, [
        childXyz,
        siblingXyz,
      ]),
    ]);

    const cell = cube.get(rootXyz);
    assert.equal(cell.count, 9);
    assert.equal(cell.children.length, 2);
  });

  it("writes when cell has no children yet", () => {
    const cube = makeCubeHarness();
    cube.add(create(rootXyz, { id: "root" }, 1, [1], undefined, []));

    cube.set([create(rootXyz, { id: "root" }, 2, [3], undefined, [])]);

    const cell = cube.get(rootXyz);
    assert.equal(cell.count, 2);
    assert.deepEqual(cell.metrics, [3]);
  });
});

describe("replaceBranch", () => {
  const rootXyz = { resolution: 0, coordinates: [0, 0] };
  const childXyz = { resolution: 1, coordinates: [0, 0] };
  const siblingXyz = { resolution: 1, coordinates: [1, 0] };
  const grandXyz = { resolution: 2, coordinates: [0, 0] };

  it("swaps a complete branch atomically", () => {
    const cube = makeCubeHarness();
    cube.replaceBranch = replaceBranch.bind(cube);
    cube.add(
      create(rootXyz, { id: "root" }, 5, [100], undefined, [childXyz])
    );
    cube.add(
      create(childXyz, { id: "old" }, 5, [100], undefined, [grandXyz])
    );
    cube.add(create(grandXyz, { id: "g" }, 5, [100], undefined, []));

    cube.replaceBranch(rootXyz, [
      create(rootXyz, { id: "root" }, 9, [200], undefined, [
        childXyz,
        siblingXyz,
      ]),
      create(childXyz, { id: "c" }, 4, [80], undefined, []),
      create(siblingXyz, { id: "s" }, 5, [120], undefined, []),
    ]);

    assert.equal(cube.get(rootXyz).count, 9);
    assert.equal(cube.get(rootXyz).children.length, 2);
    assert.equal(cube.get(childXyz).count, 4);
    assert.equal(cube.get(siblingXyz).count, 5);
    assert.equal(cube.get(grandXyz), undefined);
  });
});

describe("pruneDeeperThan", () => {
  const rootXyz = { resolution: 0, coordinates: [0, 0] };
  const childXyz = { resolution: 1, coordinates: [0, 0] };
  const grandXyz = { resolution: 2, coordinates: [0, 0] };
  const deepXyz = { resolution: 3, coordinates: [0, 0] };

  it("removes cells past max resolution and clears dangling children", () => {
    const cube = makeCubeHarness();
    cube.pruneDeeperThan = pruneDeeperThan.bind(cube);
    cube.add(
      create(rootXyz, { id: "root" }, 5, [100], undefined, [childXyz])
    );
    cube.add(
      create(childXyz, { id: "c" }, 5, [100], undefined, [grandXyz])
    );
    cube.add(
      create(grandXyz, { id: "g" }, 5, [100], undefined, [deepXyz])
    );
    cube.add(create(deepXyz, { id: "d" }, 5, [100], undefined, []));

    const removed = cube.pruneDeeperThan(1);
    assert.equal(removed, 2);
    assert.ok(cube.get(rootXyz));
    assert.ok(cube.get(childXyz));
    assert.equal(cube.get(grandXyz), undefined);
    assert.equal(cube.get(deepXyz), undefined);
    assert.deepEqual(cube.get(childXyz).children, []);
  });
});
