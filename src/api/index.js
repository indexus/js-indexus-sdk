import { API as BaseAPI } from "../model/index.js";

import { pingPeer } from "./pingPeer.js";
import { getNeighbors } from "./getNeighbors.js";
import { addItem } from "./addItem.js";
import { deleteItem } from "./deleteItem.js";
import { getSet } from "./getSet.js";
import { getSets } from "./getSets.js";
import { getSetsBinary } from "./getSetsBinary.js";

/**
 * Represents the API for interacting with peers to add items and retrieve sets.
 */
class API extends BaseAPI {
  constructor() {
    super();
  }
}

API.prototype.pingPeer = pingPeer;
API.prototype.getNeighbors = getNeighbors;
API.prototype.addItem = addItem;
API.prototype.deleteItem = deleteItem;
API.prototype.getSet = getSet;
API.prototype.getSets = getSets;
/** Alias used by some call sites / docs for batch `/sets`. */
API.prototype.getMultipleSets = getSets;
API.prototype.getSetsBinary = getSetsBinary;

export { API };
