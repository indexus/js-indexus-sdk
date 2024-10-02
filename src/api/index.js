import { API as BaseAPI } from "../model/index.js";

import { pingPeer } from "./pingPeer.js";
import { addItem } from "./addItem.js";
import { getSet } from "./getSet.js";

/**
 * Represents the API for interacting with peers to add items and retrieve sets.
 */
class API extends BaseAPI {
  constructor() {
    super();
  }
}

API.prototype.pingPeer = pingPeer;
API.prototype.addItem = addItem;
API.prototype.getSet = getSet;

export { API };
