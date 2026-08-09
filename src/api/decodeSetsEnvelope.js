/**
 * IXS1 opt-in wrapper around EncodeSets: redirects + legacy binary body.
 * Matches core/domain/sets_envelope.go.
 */

const MAGIC = new Uint8Array([0x49, 0x58, 0x53, 0x31]); // IXS1

/**
 * @param {Uint8Array} u8
 * @returns {boolean}
 */
export function isSetsEnvelope(u8) {
  return (
    u8 instanceof Uint8Array &&
    u8.byteLength >= 4 &&
    u8[0] === MAGIC[0] &&
    u8[1] === MAGIC[1] &&
    u8[2] === MAGIC[2] &&
    u8[3] === MAGIC[3]
  );
}

function readU16BE(u8, offset) {
  return ((u8[offset] << 8) | u8[offset + 1]) >>> 0;
}

function readU32BE(u8, offset) {
  return (
    ((u8[offset] << 24) |
      (u8[offset + 1] << 16) |
      (u8[offset + 2] << 8) |
      u8[offset + 3]) >>>
    0
  );
}

function readLengthPrefixed(u8, offset) {
  if (offset + 2 > u8.byteLength) {
    throw new Error("sets envelope: truncated length");
  }
  const n = readU16BE(u8, offset);
  offset += 2;
  if (offset + n > u8.byteLength) {
    throw new Error("sets envelope: truncated string");
  }
  const s = new TextDecoder().decode(u8.subarray(offset, offset + n));
  return { value: s, offset: offset + n };
}

/**
 * @param {Uint8Array | ArrayBuffer} buffer
 * @returns {{
 *   ok: boolean,
 *   redirects: Array<{ location: string, name: string, ip: string, port: number }>,
 *   body: Uint8Array,
 * }}
 */
export function decodeSetsEnvelope(buffer) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!isSetsEnvelope(u8)) {
    return { ok: false, redirects: [], body: u8 };
  }
  if (u8.byteLength < 8) {
    throw new Error("sets envelope: truncated header");
  }
  const count = readU32BE(u8, 4);
  let offset = 8;
  /** @type {Array<{ location: string, name: string, ip: string, port: number }>} */
  const redirects = [];
  for (let i = 0; i < count; i++) {
    let location;
    let name;
    let ip;
    ({ value: location, offset } = readLengthPrefixed(u8, offset));
    ({ value: name, offset } = readLengthPrefixed(u8, offset));
    ({ value: ip, offset } = readLengthPrefixed(u8, offset));
    if (offset + 2 > u8.byteLength) {
      throw new Error("sets envelope: truncated port");
    }
    const port = readU16BE(u8, offset);
    offset += 2;
    redirects.push({ location, name, ip, port });
  }
  return { ok: true, redirects, body: u8.subarray(offset) };
}
