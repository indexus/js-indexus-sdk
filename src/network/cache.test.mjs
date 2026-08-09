/**
 * Read cache: single-flight per zone and the `refresh` floor that keeps a
 * repeating repair walk off the wire.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { Network } from "./index.js";
import { Peer } from "./peer.js";
import { Set as SetEntity } from "../entities/set.js";

const NODE_A = "AAAAAAAAAAAAAAAA";
const HOST = "127.0.0.1|21000";
const COLLECTION = "demoCollection00";

/**
 * @param {{ gate?: () => Promise<void> }} [options] — `gate` blocks every
 *   `/sets` answer, so a second caller arrives while the first is on the wire.
 */
function stubApi({ gate } = {}) {
  const requests = [];
  return {
    requests,
    async pingPeer(_protocol, ip, port) {
      return new Peer(NODE_A, { [ip]: null }, Number(port), ip);
    },
    async getSets(_protocol, _peer, collection, locations) {
      requests.push([...locations]);
      if (gate) await gate();
      const elements = locations.map(
        (location) => new SetEntity(collection, `${location}X`, 1, [1])
      );
      return { elements, redirects: [], ingress: null };
    },
  };
}

async function connected(api, readOptions = {}) {
  const net = new Network("http", api, [HOST], 4, 100, readOptions);
  await net.whenReady();
  return net;
}

/** Yield the macrotask queue so two reads cannot land in one coalesce wave. */
function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test("a zone already on the wire is joined, not requested twice", async () => {
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const api = stubApi({ gate: () => held });
  const net = await connected(api);
  const setsRequests = () => api.requests.filter((r) => r.includes("aa"));

  const first = net.getSets(COLLECTION, ["aa"]);
  await nextTick();
  const second = net.getSets(COLLECTION, ["aa"]);
  release();

  const [a, b] = await Promise.all([first, second]);
  assert.equal(setsRequests().length, 1);
  assert.deepEqual(
    a.get("aa").map((c) => c.hash()),
    ["aaX"]
  );
  assert.deepEqual(
    b.get("aa").map((c) => c.hash()),
    ["aaX"]
  );
});

test("refresh reuses an answer that is younger than the refresh floor", async () => {
  const api = stubApi();
  const net = await connected(api);
  await net.getSets(COLLECTION, ["aa"]);
  const before = api.requests.length;

  await net.getSets(COLLECTION, ["aa"], { refresh: true });
  assert.equal(api.requests.length, before);
});

test("refreshTtlMs=0 keeps refresh unconditional", async () => {
  const api = stubApi();
  const net = await connected(api, { refreshTtlMs: 0 });
  await net.getSets(COLLECTION, ["aa"]);
  const before = api.requests.length;

  await net.getSets(COLLECTION, ["aa"], { refresh: true });
  assert.equal(api.requests.length, before + 1);
});

test("invalidate drops the entry and its freshness stamp", async () => {
  const api = stubApi();
  const net = await connected(api);
  await net.getSets(COLLECTION, ["aa"]);
  const before = api.requests.length;

  net.invalidate(COLLECTION, "aa");
  await net.getSets(COLLECTION, ["aa"], { refresh: true });
  assert.equal(api.requests.length, before + 1);
});
