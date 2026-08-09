/**
 * Local.query uses a multi-parent getSets wave when method=getSets.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Set } from "../entities/set.js";
import { Item } from "../entities/item.js";
import { query } from "./exploration.js";
import { ingestChildren, addLocation } from "./observer.js";

function makeHarness({ method = "getSets", getSetsImpl, getSetImpl } = {}) {
  const nextIndexed = [];
  const loaded = [];
  const selected = [
    new Set("demo", "aa", 2),
    new Set("demo", "ab", 2),
  ];
  const harness = {
    level: 1,
    spaces: {
      demo: {
        decode: () => [{}, {}],
        dimension: () => ({
          name: () => "gps",
          segmentDistance: () => 0,
          segmentDirection: () => 0,
          ratio: () => 1,
          filterDirection: () => true,
          filterDistance: () => true,
        }),
      },
    },
    options: {
      origins: { gps: {} },
      filters: { gps: {} },
    },
    monitoring: { send() {} },
    network: {
      readOptions: () => ({ method }),
      getConcurrency: () => 4,
      async getSets(collection, hashes) {
        assert.equal(collection, "demo");
        return getSetsImpl(hashes);
      },
      async getSet(collection, hash) {
        return getSetImpl?.(collection, hash) ?? [];
      },
    },
    current() {
      return {
        selected: {
          list: selected,
          clear() {
            selected.length = 0;
          },
        },
        loaded: {
          concat(list) {
            loaded.push(...list);
          },
        },
      };
    },
    next() {
      return {
        indexed: {
          add(el) {
            nextIndexed.push(el);
          },
        },
      };
    },
    getSet: null,
    addLocation,
  };
  harness.getSet = async function (set, addSet) {
    if (set instanceof Item) {
      addSet(set);
      return;
    }
    const elements = await this.network.getSet(set.collection(), set.hash());
    ingestChildren.call(this, set, elements, addSet);
  };
  harness.query = query.bind(harness);
  return { harness, nextIndexed, loaded };
}

describe("Local.query getSets batch", () => {
  it("fetches all selected parents in one getSets call", async () => {
    let calls = 0;
    const childA = new Set("demo", "aaa", 1);
    const childB = new Set("demo", "abb", 1);
    childA.locate = () => {};
    childB.locate = () => {};

    const { harness, nextIndexed } = makeHarness({
      getSetsImpl(hashes) {
        calls += 1;
        assert.deepEqual([...hashes].sort(), ["aa", "ab"]);
        return new Map([
          ["aa", [childA]],
          ["ab", [childB]],
        ]);
      },
    });

    await harness.query();
    assert.equal(calls, 1);
    assert.equal(nextIndexed.length, 2);
  });

  it("falls back to per-parent getSet when method=getSet", async () => {
    let getSetCalls = 0;
    let getSetsCalls = 0;
    const child = new Set("demo", "aaa", 1);
    child.locate = () => {};

    const { harness, nextIndexed } = makeHarness({
      method: "getSet",
      getSetsImpl() {
        getSetsCalls += 1;
        return new Map();
      },
      getSetImpl() {
        getSetCalls += 1;
        return [child];
      },
    });

    await harness.query();
    assert.equal(getSetsCalls, 0);
    assert.equal(getSetCalls, 2);
    assert.equal(nextIndexed.length, 2);
  });
});
