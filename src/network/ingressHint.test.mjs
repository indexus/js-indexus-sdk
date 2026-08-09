import test from "node:test";
import assert from "node:assert/strict";

import { Network } from "./index.js";
import { Peer } from "./peer.js";
import { decodeUrl64 } from "../utilities/encoding.js";

const FAR = "________________"; // 0xFF… — shares no bit with the zero seed
const NEAR = "AAAAAAAAAAAAAAAA"; // 0x00… — exactly the zero seed
const MID = "PAAAAAAAAAAAAAAA"; // 0b001111… — two shared bits

function peerFor(name, port) {
  return new Peer(name, { "127.0.0.1": null }, port, "127.0.0.1");
}

/**
 * @param {{ byHost: Record<string, string>, respond: (peer: Peer) => object }} cfg
 */
function stubApi(cfg) {
  const calls = [];
  return {
    calls,
    async pingPeer(_protocol, ip, port) {
      return peerFor(cfg.byHost[`${ip}|${port}`], Number(port));
    },
    async getSets(_protocol, peer) {
      calls.push(peer.hash());
      return cfg.respond(peer);
    },
  };
}

/**
 * Zero seed so `NEAR` is the XOR-nearest peer and `FAR` the farthest.
 * @param {object} api
 * @param {string[]} hosts
 */
async function networkWithZeroSeed(api, hosts) {
  const net = new Network("http", api, hosts, 4, 100);
  await net.whenReady();
  net._routingKey = decodeUrl64(NEAR);
  return net;
}

test("getSets keeps hitting the ingress peer, never fans out", async () => {
  const api = stubApi({
    byHost: { "127.0.0.1|21000": FAR, "127.0.0.1|21001": NEAR },
    respond: () => ({ elements: [], ingress: null }),
  });
  const net = await networkWithZeroSeed(api, ["127.0.0.1|21000", "127.0.0.1|21001"]);

  await net.getSets("demo", ["aa"]);
  await net.getSets("demo", ["bb"]);
  await net.getSets("demo", ["cc", "dd"]);

  assert.equal(api.calls.length, 3);
  assert.deepEqual(new Set(api.calls), new Set([NEAR]));
});

test("a closer ingress hint is adopted and becomes the next ingress", async () => {
  const api = stubApi({
    byHost: { "127.0.0.1|21000": FAR },
    respond: (peer) =>
      peer.hash() === FAR
        ? { elements: [], ingress: { name: NEAR, ip: "127.0.0.1", port: 21001 } }
        : { elements: [], ingress: null },
  });
  const net = await networkWithZeroSeed(api, ["127.0.0.1|21000"]);
  assert.equal(net.ingressPeer().hash(), FAR);

  await net.getSets("demo", ["aa"]);
  assert.equal(net.ingressPeer().hash(), NEAR);

  await net.getSets("demo", ["bb"]);
  assert.deepEqual(api.calls, [FAR, NEAR]);
});

test("a hint that is not closer than the current ingress is ignored", async () => {
  const api = stubApi({
    byHost: { "127.0.0.1|21000": NEAR },
    respond: () => ({
      elements: [],
      ingress: { name: MID, ip: "127.0.0.1", port: 21002 },
    }),
  });
  const net = await networkWithZeroSeed(api, ["127.0.0.1|21000"]);

  await net.getSets("demo", ["aa"]);
  assert.equal(net.ingressPeer().hash(), NEAR);
  assert.equal(net.listPeers().length, 1);
});

test("an unreachable hinted peer is not adopted again", async () => {
  let hintedAttempts = 0;
  const api = stubApi({
    byHost: { "127.0.0.1|21000": FAR },
    respond: (peer) => {
      if (peer.hash() === NEAR) {
        hintedAttempts++;
        throw new Error("connection refused");
      }
      return { elements: [], ingress: { name: NEAR, ip: "127.0.0.1", port: 21001 } };
    },
  });
  const net = await networkWithZeroSeed(api, ["127.0.0.1|21000"]);

  await net.getSets("demo", ["aa"]);
  assert.equal(net.ingressPeer().hash(), NEAR);

  // The hinted peer is dead: the chunk retries and falls back to the reachable
  // bootstrap, and the repeated hint must not pull us back.
  await net.getSets("demo", ["bb"]);
  assert.equal(hintedAttempts, 1);
  assert.equal(net.ingressPeer().hash(), FAR);

  await net.getSets("demo", ["cc"]);
  assert.equal(hintedAttempts, 1);
  assert.equal(net.ingressPeer().hash(), FAR);
});
