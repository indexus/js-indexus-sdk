import test from "node:test";
import assert from "node:assert/strict";

import { decodeSetsEnvelope, isSetsEnvelope } from "./decodeSetsEnvelope.js";

function encodeLengthPrefixed(s) {
  const bytes = new TextEncoder().encode(s);
  const out = new Uint8Array(2 + bytes.length);
  out[0] = (bytes.length >> 8) & 0xff;
  out[1] = bytes.length & 0xff;
  out.set(bytes, 2);
  return out;
}

function encodeEnvelope(body, redirects) {
  const parts = [new Uint8Array([0x49, 0x58, 0x53, 0x31])];
  const count = new Uint8Array(4);
  new DataView(count.buffer).setUint32(0, redirects.length);
  parts.push(count);
  for (const r of redirects) {
    parts.push(encodeLengthPrefixed(r.location));
    parts.push(encodeLengthPrefixed(r.name));
    parts.push(encodeLengthPrefixed(r.ip));
    const port = new Uint8Array(2);
    new DataView(port.buffer).setUint16(0, r.port);
    parts.push(port);
  }
  parts.push(body);
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

test("decodeSetsEnvelope round-trips redirects and body", () => {
  const body = new Uint8Array([1, 2, 3]);
  const framed = encodeEnvelope(body, [
    { location: "qu", name: "peerA", ip: "127.0.0.1", port: 21010 },
  ]);
  assert.equal(isSetsEnvelope(framed), true);
  const { ok, redirects, body: inner } = decodeSetsEnvelope(framed);
  assert.equal(ok, true);
  assert.equal(redirects.length, 1);
  assert.equal(redirects[0].location, "qu");
  assert.equal(redirects[0].port, 21010);
  assert.deepEqual([...inner], [1, 2, 3]);
});

test("legacy raw payloads pass through unchanged", () => {
  const raw = new Uint8Array([0, 1, 2, 3, 4]);
  const { ok, body } = decodeSetsEnvelope(raw);
  assert.equal(ok, false);
  assert.equal(body, raw);
});
