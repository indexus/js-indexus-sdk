/**
 * Binary encoder for GET /sets (go-indexus-core domain.Collection.GetMultiple).
 *
 * Stream = concatenated blocks (multi-owner responses are concatenated too).
 * Each non-empty depth bucket:
 *   - u8 depthIndex           // keys have byte length depthIndex + 1
 *   - u32 BE entry count `size`
 *   - `propertyCount` × u8    // bits.Len(max) per packed column (may be 0)
 *   - `size * (depthIndex+1)` key bytes (UTF-8; typically ASCII hashes)
 *   - For each property j: ceil(size * bitCounts[j] / 8) bytes — packed ints MSB-first
 *
 * Server strips `:reference` from keys using the colon (not a fixed prefix length).
 * Packed ints match Go encodeBits / sequential MSB bitstream (same order as metrics columns).
 */

import { parseSetMap } from "./parseSetMap.js";

/** Matches http/p2p/p2p.go GetMultiple defaults. */
export const SETS_BINARY_PROPERTY_COUNT = 4;

/** Inverse of metricInt scaling in go-indexus-core/http/p2p/p2p.go */
export const DEFAULT_SETS_METRIC_DECODE = [
  { propIndex: 1, metricIndex: 2, divisor: 1 },
  { propIndex: 2, metricIndex: 3, divisor: 1_000_000 },
  { propIndex: 3, metricIndex: 4, divisor: 1_000_000 },
];

function readU32BE(u8, offset) {
  return (
    (u8[offset] << 24) |
    (u8[offset + 1] << 16) |
    (u8[offset + 2] << 8) |
    u8[offset + 3]
  ) >>> 0;
}

/**
 * Decode `count` unsigned integers packed `bitsPerValue` wide (MSB-first), Go encodeBits order.
 */
export function decodePackedInts(u8, offset, count, bitsPerValue) {
  if (bitsPerValue <= 0) {
    return { values: new Array(count).fill(0), bytesConsumed: 0 };
  }
  const values = new Array(count);
  let bitPos = 0;
  const totalBits = count * bitsPerValue;
  const bytesConsumed = Math.ceil(totalBits / 8);

  if (offset + bytesConsumed > u8.length) {
    throw new Error(
      `decodePackedInts: need ${bytesConsumed} bytes at offset ${offset}, len=${u8.length}`
    );
  }

  for (let i = 0; i < count; i++) {
    let v = 0n;
    for (let b = 0; b < bitsPerValue; b++) {
      const globalBit = bitPos;
      bitPos++;
      const byteIdx = offset + (globalBit >> 3);
      const bitInByte = globalBit & 7;
      const bit = (u8[byteIdx] >> (7 - bitInByte)) & 1;
      v = (v << 1n) | BigInt(bit);
    }
    values[i] = Number(v);
  }

  return { values, bytesConsumed };
}

/**
 * @param {ArrayBuffer | Uint8Array} buffer
 * @param {{ propertyCount?: number }} options
 */
export function decodeSetsBinary(buffer, options = {}) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const propertyCount =
    Number(options.propertyCount) > 0
      ? Math.floor(Number(options.propertyCount))
      : SETS_BINARY_PROPERTY_COUNT;

  const blocks = [];
  let offset = 0;
  const decoder = new TextDecoder("utf-8");

  while (offset < u8.length) {
    const depthIndex = u8[offset++];
    if (offset + 4 > u8.length) {
      throw new Error("decodeSetsBinary: truncated header (size)");
    }
    const size = readU32BE(u8, offset);
    offset += 4;

    if (offset + propertyCount > u8.length) {
      throw new Error("decodeSetsBinary: truncated header (bitCounts)");
    }
    const bitCounts = [];
    for (let j = 0; j < propertyCount; j++) {
      bitCounts.push(u8[offset++]);
    }

    const keyLen = depthIndex + 1;
    const keysTotalBytes = size * keyLen;
    if (offset + keysTotalBytes > u8.length) {
      throw new Error("decodeSetsBinary: truncated keys segment");
    }

    const keys = [];
    for (let i = 0; i < size; i++) {
      const start = offset + i * keyLen;
      keys.push(decoder.decode(u8.subarray(start, start + keyLen)));
    }
    offset += keysTotalBytes;

    const columns = [];
    for (let j = 0; j < propertyCount; j++) {
      const { values, bytesConsumed } = decodePackedInts(
        u8,
        offset,
        size,
        bitCounts[j]
      );
      columns.push(values);
      offset += bytesConsumed;
    }

    blocks.push({
      depthIndex,
      size,
      keys,
      columns,
      bitCounts,
    });
  }

  return { blocks, propertyCount };
}

export function buildMetricsRow(columns, rowIndex, decodeRules = DEFAULT_SETS_METRIC_DECODE) {
  const metrics = [];
  for (let r = 0; r < decodeRules.length; r++) {
    const rule = decodeRules[r];
    const raw = columns[rule.propIndex]?.[rowIndex];
    const num = Number.isFinite(raw) ? raw : 0;
    metrics[rule.metricIndex] = rule.divisor === 1 ? num : num / rule.divisor;
  }
  return metrics;
}

/**
 * Same Abelian-shaped map as JSON `/set` payloads (`{ count, metrics }`), keyed like GetMultiple output.
 */
export function binaryBlocksToRawMap(blocks, decodeRules = DEFAULT_SETS_METRIC_DECODE) {
  const shaped = {};
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    const { size, keys, columns } = block;
    const counts = columns[0];
    if (!counts || counts.length !== size) continue;

    for (let i = 0; i < size; i++) {
      const key = keys[i];
      shaped[key] = {
        count: counts[i],
        metrics: buildMetricsRow(columns, i, decodeRules),
      };
    }
  }
  return shaped;
}

/**
 * Turns decoded blocks into the same `{ hash: { count, metrics } }` shape as JSON /set,
 * then reuses parseSetMap for Item vs Set constructor parity.
 */
export function binaryBlocksToElements(collection, blocks, decodeRules = DEFAULT_SETS_METRIC_DECODE) {
  return parseSetMap(binaryBlocksToRawMap(blocks, decodeRules), collection);
}

/**
 * Splits a merged /sets payload into per-parent buckets using longest-prefix match.
 * Skip falsy parents (e.g. avoid assigning everything under "").
 */
export function distributeElementsByParent(parentLocations, elements) {
  const uniq = [...new Set(parentLocations)].filter(Boolean);
  const sorted = uniq.sort((a, b) => b.length - a.length);
  /** @type {Map<string, Array<Item|Set>>} */
  const map = new Map();
  for (let i = 0; i < sorted.length; i++) {
    map.set(sorted[i], []);
  }

  for (let e = 0; e < elements.length; e++) {
    const el = elements[e];
    const h = el.hash();
    for (let p = 0; p < sorted.length; p++) {
      const parent = sorted[p];
      if (h.length > parent.length && h.startsWith(parent)) {
        map.get(parent).push(el);
        break;
      }
    }
  }

  return map;
}
