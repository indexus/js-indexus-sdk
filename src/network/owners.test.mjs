/**
 * `direct` navigation guesses an owner by XOR distance, and the node answers a
 * wrong guess with an IXS1 redirect. The guess does not improve on its own, so
 * without a memory of who actually served a zone the client pays that extra
 * round trip again on every single read of the same zone.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { Network } from "./index.js";
import { Peer } from "./peer.js";
import { Set as SetEntity } from "../entities/set.js";

const BOOT = "AAAAAAAAAAAAAAAA";
const OWNER = "BBBBBBBBBBBBBBBB";
const HOST = "127.0.0.1|21000";
const COLLECTION = "demoCollection00";
const ZONE = "abcd";

/**
 * A two-node mesh where the bootstrap never owns `ZONE`: it always answers a
 * redirect to OWNER, and only OWNER returns the sets.
 */
function stubApi() {
  const calls = { sets: [], redirects: 0 };
  return {
    calls,
    async pingPeer(_protocol, ip, port) {
      return new Peer(BOOT, { [ip]: null }, Number(port), ip);
    },
    async getNeighbors() {
      return [new Peer(OWNER, { "127.0.0.1": null }, 21001, "127.0.0.1")];
    },
    async getSets(_protocol, peer, _collection, locations) {
      calls.sets.push({ peer: peer.hash(), locations: [...locations] });
      if (peer.hash() === OWNER) {
        return {
          elements: locations.map(
            (location) => new SetEntity(COLLECTION, `${location}0`, 1, [1])
          ),
          redirects: [],
          ingress: null,
        };
      }
      calls.redirects += 1;
      return {
        elements: [],
        redirects: locations.map((location) => ({
          location,
          name: OWNER,
          ip: "127.0.0.1",
          port: 21001,
        })),
        ingress: null,
      };
    },
  };
}

async function connected(api) {
  const net = new Network("http", api, [HOST], 4, 100, {
    navigation: "direct",
    method: "getSets",
    meshDiscovery: false,
    refreshTtlMs: 0,
  });
  await net.whenReady();
  return net;
}

test("a zone is re-read straight from the peer that served it", async () => {
  const api = stubApi();
  const net = await connected(api);

  await net.getSets(COLLECTION, [ZONE], { refresh: true, force: true });
  const firstRedirects = api.calls.redirects;
  assert.equal(firstRedirects, 1, "the cold read has to discover the owner");

  await net.getSets(COLLECTION, [ZONE], { refresh: true, force: true });
  assert.equal(
    api.calls.redirects,
    firstRedirects,
    "the second read must go straight to the owner, not rediscover it"
  );

  const last = api.calls.sets[api.calls.sets.length - 1];
  assert.equal(last.peer, OWNER);
});

test("a forgotten owner is dropped once it leaves the table", async () => {
  const api = stubApi();
  const net = await connected(api);
  await net.getSets(COLLECTION, [ZONE], { refresh: true, force: true });
  const settledRedirects = api.calls.redirects;

  // The owner goes away: the memory must not pin reads to a peer the table no
  // longer holds. Falling back to the XOR guess costs one redirect again,
  // which is exactly the signal that the stale entry was dropped.
  for (const peer of net._table.peers()) {
    if (peer.hash() === OWNER) net._table.remove(peer.id());
  }

  await net.getSets(COLLECTION, [ZONE], { refresh: true, force: true });
  assert.equal(
    api.calls.redirects,
    settledRedirects + 1,
    "a dropped owner sends the read back through the XOR guess"
  );
  const last = api.calls.sets[api.calls.sets.length - 1];
  assert.equal(last.peer, OWNER, "and the redirect still lands on the owner");
});
