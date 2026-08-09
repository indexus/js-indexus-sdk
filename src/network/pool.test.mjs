/**
 * getSets must take a Throttler slot — otherwise Promise.all across peers
 * ignores Network.concurrency and the browser opens unbounded sockets.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { Network } from "./index.js";
import { Peer } from "./peer.js";
import { Set as SetEntity } from "../entities/set.js";

const NODE = "AAAAAAAAAAAAAAAA";
const HOST = "127.0.0.1|21000";

test("getSets respects the concurrency pool", async () => {
  let inFlight = 0;
  let peak = 0;
  const api = {
    async pingPeer(_protocol, ip, port) {
      return new Peer(NODE, { [ip]: null }, Number(port), ip);
    },
    async getSets(_protocol, _peer, collection, locations) {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 30));
      inFlight -= 1;
      return {
        elements: (locations || []).map(
          (loc) => new SetEntity(collection, `${loc}0`, 1, [1])
        ),
        redirects: [],
        ingress: null,
      };
    },
  };

  const poolLimit = 3;
  const net = new Network("http", api, [HOST], poolLimit, 100, {
    navigation: "direct",
    method: "getSets",
    meshDiscovery: false,
    refreshTtlMs: 0,
  });
  await net.whenReady();

  // Collection id must be peer-id width (16 chars → 12-byte XOR keys) or
  // `_nearestExcluding` returns null and the round never hits the wire.
  const collection = "demoCollection00";
  // Force distinct wire rounds: different location sets, no cache reuse.
  // Bypass the coalesce pool's single merged chunk so each call needs a slot.
  const jobs = [];
  for (let i = 0; i < 12; i++) {
    jobs.push(
      net.getSets(collection, [`z${i}`], {
        refresh: true,
        force: true,
        // Different method override forces _fetchSetsChunk per call.
        method: "getSet",
      })
    );
  }
  await Promise.all(jobs);

  assert.ok(peak > 1, `expected parallel getSets (peak ${peak})`);
  assert.ok(
    peak <= poolLimit,
    `getSets peak ${peak} exceeded concurrency ${poolLimit}`
  );
});

test("peerUrl gateway keeps one browser origin", async () => {
  const { peerUrl } = await import("../api/peerUrl.js");
  assert.equal(
    peerUrl("http", "10.0.0.1", 21014, "/sets", "http://127.0.0.1:5173/api/p2p"),
    "http://127.0.0.1:5173/api/p2p/21014/sets"
  );
  assert.equal(
    peerUrl("https", "10.0.0.1", 21014, "/sets", null),
    "https://10.0.0.1:21014/sets"
  );
});
