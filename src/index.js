// Entities — the vocabulary of go-indexus-core: a Collection holds Sets of
// Items, each addressed by a location in the Space the collection declares.
export { Item } from "./entities/item.js";
export { Set } from "./entities/set.js";
export { Collection } from "./entities/collection.js";
export { Space } from "./entities/space.js";

// Read modes. Both go through Network, so they share one ingress and one
// cache: a zone either of them pulled is free for the other.
export { Local } from "./local/index.js"; // Nearby — nearest items, ring by ring
export { Grid } from "./grid/index.js"; // Aggregate — drills the zone tree
export { Cube } from "./cube/index.js"; // Aggregate — holds the drilled cells

// Networking
export { Peer } from "./network/peer.js";
export { Network } from "./network/index.js";

// API
export { API } from "./api/index.js";

// Dimensions
export { Spherical } from "./library/dimensions/spherical.js";
export { Linear } from "./library/dimensions/linear.js";

// Read-path diagnostics — off unless switched on (see utilities/debug.js).
export { setDebug, debugEnabled, debugLog } from "./utilities/debug.js";

// Location algebra
export {
  ROOT,
  encodeUrl64,
  decodeUrl64,
  parent,
  isDirectChild,
  zoneKey,
  zoneKeyID,
} from "./utilities/encoding.js";
