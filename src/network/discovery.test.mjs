/**
 * The node table is shared by both navigations: `direct` refills it from IXS1
 * redirects, `ingress` never sees one, so both lean on `/neighbors`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { Network } from "./index.js";
import { Peer } from "./peer.js";
import { decodeUrl64, encodeUrl64 } from "../utilities/encoding.js";

const BOOT = "AAAAAAAAAAAAAAAA";
const NODE_B = "BBBBBBBBBBBBBBBB";
const NODE_C = "CCCCCCCCCCCCCCCC";
const HOST = "127.0.0.1|21000";
const COLLECTION = "demoCollection00";

function contact(name, port) {
  return { name, ips: { "127.0.0.1": null }, port, ip: "127.0.0.1" };
}

/**
 * @param {{ neighbors?: object[], withNeighbors?: boolean, onGetSets?: (peer: Peer) => void }} cfg
 */
function stubApi(cfg = {}) {
  const calls = { neighbors: [], sets: [] };
  const api = {
    calls,
    async pingPeer(_protocol, ip, port) {
      return new Peer(BOOT, { [ip]: null }, Number(port), ip);
    },
    async getSets(_protocol, peer) {
      calls.sets.push(peer.hash());
      cfg.onGetSets?.(peer);
      return { elements: [], redirects: [], ingress: null };
    },
  };
  if (cfg.withNeighbors !== false) {
    api.getNeighbors = async (_protocol, peer, origin) => {
      calls.neighbors.push({ peer: peer.hash(), origin });
      return (cfg.neighbors ?? [contact(NODE_B, 21001), contact(NODE_C, 21002)]).map(
        (c) => new Peer(c.name, c.ips, c.port, c.ip)
      );
    };
  }
  return api;
}

async function connected(api, options = {}) {
  const net = new Network("http", api, [HOST], 4, 100, options);
  await net.whenReady();
  return net;
}

/** Let a fire-and-forget discovery settle before asserting on the table. */
async function settled(net) {
  await (net._meshDiscoveryInflight ?? Promise.resolve());
}

test("ingress navigation still learns the mesh through /neighbors", async () => {
  const api = stubApi();
  const net = await connected(api, { navigation: "ingress" });

  assert.equal(net.readOptions().navigation, "ingress");
  assert.deepEqual(
    net.listPeers().map((p) => p.hash).sort(),
    [BOOT, NODE_B, NODE_C].sort()
  );
  assert.equal(api.calls.neighbors.length, 1);
});

test("the discovery origin is cut to peer-id width", async () => {
  // A node buckets /neighbors against its own peer ids and answers an origin
  // of any other width with an empty list, so the session key cannot be sent
  // whole: 16 bytes of routing key, 12 bytes of peer id.
  const api = stubApi();
  const net = await connected(api);

  const { origin } = api.calls.neighbors[0];
  const idWidth = decodeUrl64(BOOT).length;
  assert.equal(decodeUrl64(origin).length, idWidth);
  assert.equal(origin, encodeUrl64(net._routingKey.subarray(0, idWidth)));
});

test("discovered nodes are addressable for reads and writes", async () => {
  const api = stubApi();
  const net = await connected(api, { navigation: "ingress" });
  // Zero seed: the bootstrap peer is the nearest, so a discovered node is only
  // reachable if the table really holds it.
  net._routingKey = decodeUrl64(NODE_C);

  assert.equal(net.ingressPeer().hash(), NODE_C);
  await net.getSets(COLLECTION, ["aa"]);
  assert.deepEqual(api.calls.sets, [NODE_C]);
});

test("a node this client cannot reach is not rediscovered", async () => {
  const api = stubApi({
    neighbors: [contact(NODE_B, 21001)],
    onGetSets: (peer) => {
      if (peer.hash() === NODE_B) throw new Error("connection refused");
    },
  });
  const net = await connected(api, {
    navigation: "ingress",
    meshDiscoveryIntervalMs: 0,
  });
  net._routingKey = decodeUrl64(NODE_B);
  assert.equal(net.ingressPeer().hash(), NODE_B);

  await net.getSets(COLLECTION, ["aa"]);
  await settled(net);

  assert.equal(net.ingressPeer().hash(), BOOT);
  assert.ok(!net.listPeers().some((p) => p.hash === NODE_B));
});

test("discovery is throttled off the read path", async () => {
  const api = stubApi();
  const net = await connected(api, { meshDiscoveryIntervalMs: 100000 });
  assert.equal(api.calls.neighbors.length, 1);

  await net.getSets(COLLECTION, ["aa"]);
  await net.getSets(COLLECTION, ["bb"]);
  await settled(net);

  assert.equal(api.calls.neighbors.length, 1);
});

test("meshDiscovery=false keeps the bootstrap-only table", async () => {
  const api = stubApi();
  const net = await connected(api, { meshDiscovery: false });

  await net.getSets(COLLECTION, ["aa"]);
  await settled(net);

  assert.equal(api.calls.neighbors.length, 0);
  assert.deepEqual(
    net.listPeers().map((p) => p.hash),
    [BOOT]
  );
});

test("an API without getNeighbors reads exactly as before", async () => {
  const api = stubApi({ withNeighbors: false });
  const net = await connected(api);

  await net.getSets(COLLECTION, ["aa"]);
  await settled(net);

  assert.deepEqual(
    net.listPeers().map((p) => p.hash),
    [BOOT]
  );
  assert.deepEqual(api.calls.sets, [BOOT]);
});
