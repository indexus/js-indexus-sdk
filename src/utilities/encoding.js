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
  } else if (input instanceof Uint8Array || Buffer.isBuffer(input)) {
    bytes = input;
  } else {
    throw new Error("Input must be a string or Uint8Array");
  }

  // Convert bytes to standard Base64
  let base64String = bytes.toString("base64");

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

function charsToNumbers(str) {
  const details = new Array(str.length);

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    details[i] = BASEURL64.indexOf(char);
  }

  return details;
}

function parent(hash) {
  if (hash === ROOT) {
    return "";
  }
  const l = hash.length - 1;
  if (l === 0) {
    return ROOT;
  } else {
    return hash.substring(0, l);
  }
}

function transform(universe, location) {
  let key = universe;
  if (location !== ROOT) {
    key = location + key.substring(location.length);
  }

  let id;
  try {
    id = decodeUrl64(key);
  } catch (err) {
    throw new Error(err);
  }
  return id;
}

export {
  ROOT,
  BASEURL64,
  encodeUrl64,
  decodeUrl64,
  charsToNumbers,
  parent,
  transform,
};
