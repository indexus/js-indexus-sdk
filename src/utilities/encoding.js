const ROOT = "@";
const BASEURL64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Encoding function
function encodeUrl64(input) {
  // Input can be a string or Uint8Array
  let bytes;
  if (typeof input === "string") {
    // Convert string to Uint8Array
    bytes = Buffer.from(input, "utf-8");
  } else if (Buffer.isBuffer(input)) {
    bytes = input;
  } else if (input instanceof Uint8Array) {
    // Uint8Array.toString() ignores the encoding argument — wrap the same
    // memory in a Buffer instead of copying.
    bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  } else {
    throw new Error("Input must be a string or Uint8Array");
  }

  return toUrl64(bytes.toString("base64"));
}

// Decoding function
function decodeUrl64(encoded) {
  const custom = "-_";
  const standard = "+/";

  // Add padding if necessary
  const paddingNeeded = (4 - (encoded.length % 4)) % 4;
  const paddedEncoded = encoded + "=".repeat(paddingNeeded);

  // Replace custom characters with standard Base64 characters
  const base64String = paddedEncoded
    .split("")
    .map((char) => {
      const index = custom.indexOf(char);
      if (index >= 0) {
        return standard.charAt(index);
      }
      return char;
    })
    .join("");

  // Convert Base64 string back to Buffer
  const bytes = Buffer.from(base64String, "base64");

  return bytes; // Return Buffer (which is a Uint8Array)
}

function toUrl64(base64String) {
  // Replace '+' with '-', '/' with '_', and remove '=' padding
  const standard = "+/";
  const custom = "-_";

  let customBase64 = base64String
    .split("")
    .map((char) => {
      const index = standard.indexOf(char);
      if (index >= 0) {
        return custom.charAt(index);
      }
      return char;
    })
    .join("")
    .replace(/=+$/, ""); // Remove trailing '='

  return customBase64;
}

function charsToNumbers(str) {
  const details = new Array(str.length);

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    details[i] = BASEURL64.indexOf(char);
  }

  return details;
}

function parent(location) {
  if (location === ROOT) {
    return "";
  }
  const l = location.length - 1;
  if (l === 0) {
    return ROOT;
  } else {
    return location.substring(0, l);
  }
}

// domain.IsDirectChild: one encoding step below `location`. Rejects self-keys
// and anything deeper, which is what keeps a traversal from looping. Every
// character of the alphabet is an ordinary location — `-` and `_` included —
// so nothing here may treat one of them as a marker (guarantee P4).
function isDirectChild(location, child) {
  if (!child || child === location) {
    return false;
  }
  return parent(child) === location;
}

// domain.Key: a zone is a (collection, location) pair. Used wherever a zone
// indexes a local map — the Network read cache, the Grid children cache.
function zoneKey(collection, location) {
  return `${collection}/${location}`;
}

// zoneKeyID: maps (collection, location) into the routing space. Note the
// inversion — the location leads, so sibling zones of one collection stay
// adjacent under XOR and a node owns a contiguous slice of the tree.
function zoneKeyID(collection, location) {
  if (location === ROOT) {
    return decodeUrl64(collection);
  }
  return decodeUrl64(location + collection.substring(location.length));
}

export {
  ROOT,
  BASEURL64,
  encodeUrl64,
  decodeUrl64,
  charsToNumbers,
  parent,
  isDirectChild,
  zoneKey,
  zoneKeyID,
};
