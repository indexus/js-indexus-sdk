/**
 * Nearby (Local → getSet) and Aggregate (Grid → getSets) read through the same
 * Network: one ingress, one cache, one `/sets` wire format.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { Network } from "./index.js";
import { Peer } from "./peer.js";
import { Set as SetEntity } from "../entities/set.js";
import { ROOT } from "../utilities/encoding.js";

const NODE = "AAAAAAAAAAAAAAAA";
const HOST = "127.0.0.1|21000";

/** One reachable node serving a fixed children map. */
function stubApi(childrenByLocation) {
  const requests = [];
  const refreshes = [];
  return {
    requests,
    refreshes,
    async pingPeer(_protocol, ip, port) {
      return new Peer(NODE, { [ip]: null }, Number(port), ip);
    },
    async getSets(_protocol, _peer, collection, locations, options = {}) {
      requests.push([...locations]);
      refreshes.push(options.refresh === true);
      const elements = [];
      for (const location of locations) {
        for (const child of childrenByLocation[location] ?? []) {
          elements.push(new SetEntity(collection, child, 1, [1]));
        }
      }
      return { elements, ingress: null };
    },
  };
}

async function connected(api, readOptions = {}) {
  const net = new Network("http", api, [HOST], 4, 100, readOptions);
  await net.whenReady();
  return net;
}

const locationsOf = (children) => children.map((child) => child.hash());

test("a Nearby read is served by the zone an Aggregate drill already pulled", async () => {
  const api = stubApi({ aa: ["aaX", "aaY"], ab: ["abX"] });
  const net = await connected(api);

  await net.getSets("demo", ["aa", "ab"]);
  assert.equal(api.requests.length, 1);

  assert.deepEqual(locationsOf(await net.getSet("demo", "aa")), ["aaX", "aaY"]);
  assert.deepEqual(locationsOf(await net.getSet("demo", "ab")), ["abX"]);
  assert.equal(api.requests.length, 1, "the shared cache answered both");
});

test("an Aggregate drill is served by the zone a Nearby read already pulled", async () => {
  const api = stubApi({ [ROOT]: ["a", "b"] });
  const net = await connected(api);

  assert.deepEqual(locationsOf(await net.getSet("demo", ROOT)), ["a", "b"]);
  assert.equal(api.requests.length, 1);

  const drilled = await net.getSets("demo", [ROOT]);
  assert.deepEqual(locationsOf(drilled.get(ROOT)), ["a", "b"]);
  assert.equal(api.requests.length, 1);
});

test("concurrent reads of both modes merge into one round-trip", async () => {
  const api = stubApi({ aa: ["aaX"], ab: ["abX"], ac: ["acX"] });
  const net = await connected(api);

  const [nearby, aggregate] = await Promise.all([
    net.getSet("demo", "aa"),
    net.getSets("demo", ["ab", "ac"]),
  ]);

  assert.deepEqual(locationsOf(nearby), ["aaX"]);
  assert.deepEqual(locationsOf(aggregate.get("ab")), ["abX"]);
  assert.equal(api.requests.length, 1);
  assert.deepEqual(api.requests[0], ["aa", "ab", "ac"]);
});

test("invalidate puts one zone back on the wire, and only that one", async () => {
  const api = stubApi({ aa: ["aaX"], ab: ["abX"] });
  const net = await connected(api);

  await net.getSets("demo", ["aa", "ab"]);
  net.invalidate("demo", "aa");

  await net.getSets("demo", ["aa", "ab"]);
  assert.equal(api.requests.length, 2);
  assert.deepEqual(api.requests[1], ["aa"]);
});

// Dropping our own cache is not enough to see a value change: the node answers
// batch reads from its cache too, so a refresh that does not say so on the wire
// re-reads the same stale number for as long as the entry lives.
// `refreshTtlMs: 0` lifts the floor that otherwise serves a young zone locally
// (see cache.test.mjs).
test("a refreshing read goes back on the wire and says so", async () => {
  const api = stubApi({ aa: ["aaX"] });
  const net = await connected(api, { refreshTtlMs: 0 });

  await net.getSets("demo", ["aa"]);
  assert.deepEqual(api.refreshes, [false]);

  await net.getSets("demo", ["aa"]);
  assert.equal(api.requests.length, 1, "a plain read is still served locally");

  await net.getSets("demo", ["aa"], { refresh: true });
  assert.equal(api.requests.length, 2, "refresh ignores the local cache");
  assert.deepEqual(api.refreshes, [false, true], "and asks the node to do the same");
});

test("one refreshing caller upgrades the wave it is coalesced into", async () => {
  const api = stubApi({ aa: ["aaX"], ab: ["abX"] });
  const net = await connected(api);

  await Promise.all([
    net.getSets("demo", ["aa"]),
    net.getSets("demo", ["ab"], { refresh: true }),
  ]);

  assert.equal(api.requests.length, 1, "both callers shared one round-trip");
  assert.deepEqual(api.refreshes, [true], "the fresher requirement won");
});

test("a zone nobody serves reads as empty, not as a missing key", async () => {
  const api = stubApi({});
  const net = await connected(api);

  assert.deepEqual(await net.getSet("demo", "zz"), []);
});

test("a mesh where no host answers leaves the table empty rather than throwing", async () => {
  const api = {
    async pingPeer() {
      throw new Error("connection refused");
    },
    async getSets() {
      assert.fail("no peer should have been dialled");
    },
  };

  const net = new Network("http", api, [HOST], 4, 100);
  await net.whenReady();
  assert.deepEqual(net.listPeers(), []);

  await assert.rejects(net.getSets("demo", ["aa"]), /bootstrap hosts/);
});
