/**
 * Unit tests for decodeSetsBinary / decodePackedInts (no live HTTP).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodePackedInts,
  decodeSetsBinary,
  binaryBlocksToRawMap,
  SETS_BINARY_PROPERTY_COUNT,
} from "./decodeSetsBinary.js";

/** Mirrors go-indexus-core/domain/collection.go encodeBits (MSB-first stream). */
function encodeBitsJs(values, bitsPerValue) {
  if (bitsPerValue <= 0) return new Uint8Array(0);
  let buffer = 0n;
  let bufferBits = 0n;
  const result = [];

  function flushFullBytes() {
    while (bufferBits >= 8n) {
      const shift = bufferBits - 8n;
      const byteValue = Number((buffer >> shift) & 0xffn);
      result.push(byteValue);
      bufferBits -= 8n;
      buffer &= (1n << bufferBits) - 1n;
    }
  }

  for (let vi = 0; vi < values.length; vi++) {
    buffer = (buffer << BigInt(bitsPerValue)) | BigInt(values[vi]);
    bufferBits += BigInt(bitsPerValue);
    flushFullBytes();
  }

  while (bufferBits > 0n) {
    if (bufferBits >= 8n) {
      const shift = bufferBits - 8n;
      const byteValue = Number((buffer >> shift) & 0xffn);
      result.push(byteValue);
      bufferBits -= 8n;
      buffer &= (1n << bufferBits) - 1n;
    } else {
      const byteValue = Number((buffer << (8n - bufferBits)) & 0xffn);
      result.push(byteValue);
      bufferBits = 0n;
    }
  }

  return Uint8Array.from(result);
}

describe("decodePackedInts", () => {
  it("returns zeros when bitsPerValue is 0", () => {
    const u8 = new Uint8Array([0xff, 0xff]);
    const { values, bytesConsumed } = decodePackedInts(u8, 0, 5, 0);
    assert.deepEqual(values, [0, 0, 0, 0, 0]);
    assert.equal(bytesConsumed, 0);
  });

  it("round-trips Go-style encodeBits for varied widths", () => {
    const cases = [
      { values: [7, 7, 7], bits: 3 },
      { values: [10, 20, 30], bits: 8 },
      { values: [1000, 2000], bits: 12 },
      { values: [59694211, 2452286115007], bits: 42 },
    ];
    for (const c of cases) {
      const encoded = encodeBitsJs(c.values, c.bits);
      const { values, bytesConsumed } = decodePackedInts(
        encoded,
        0,
        c.values.length,
        c.bits
      );
      assert.equal(bytesConsumed, encoded.length);
      for (let i = 0; i < c.values.length; i++) {
        assert.equal(
          values[i],
          c.values[i],
          `idx ${i} bits=${c.bits} encodedLen=${encoded.length}`
        );
      }
    }
  });
});

describe("decodeSetsBinary", () => {
  it("decodes a minimal synthetic block", () => {
    const depthIndex = 1;
    const size = 2;
    const keyLen = depthIndex + 1;
    const keysAscii = ["ab", "cd"];
    const propertyCount = SETS_BINARY_PROPERTY_COUNT;
    const bitCounts = [8, 8, 10, 12];
    const col0 = encodeBitsJs([5, 9], bitCounts[0]);
    const col1 = encodeBitsJs([42, 99], bitCounts[1]);
    const col2 = encodeBitsJs([1000, 2000], bitCounts[2]);
    const col3 = encodeBitsJs([3000, 4000], bitCounts[3]);

    const header = [];
    header.push(depthIndex);
    header.push(0, 0, 0, size);
    for (let j = 0; j < propertyCount; j++) {
      header.push(bitCounts[j]);
    }

    const keyBytes = new Uint8Array(size * keyLen);
    for (let i = 0; i < size; i++) {
      const enc = new TextEncoder().encode(keysAscii[i]);
      keyBytes.set(enc, i * keyLen);
    }

    const totalLen =
      header.length + keyBytes.length + col0.length + col1.length + col2.length + col3.length;
    const buf = new Uint8Array(totalLen);
    let o = 0;
    buf.set(header, o);
    o += header.length;
    buf.set(keyBytes, o);
    o += keyBytes.length;
    buf.set(col0, o);
    o += col0.length;
    buf.set(col1, o);
    o += col1.length;
    buf.set(col2, o);
    o += col2.length;
    buf.set(col3, o);

    const { blocks } = decodeSetsBinary(buf.buffer);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].depthIndex, depthIndex);
    assert.equal(blocks[0].size, size);
    assert.deepEqual(blocks[0].keys, keysAscii);

    const raw = binaryBlocksToRawMap(blocks);
    assert.equal(raw.ab.count, 5);
    assert.equal(raw.cd.count, 9);
    assert.ok(Array.isArray(raw.ab.metrics));
    assert.ok(Array.isArray(raw.cd.metrics));
  });
});
