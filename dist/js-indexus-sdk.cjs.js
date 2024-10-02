'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class Mask {
  /**
   * Retrieves the mask value at the specified indices.
   * @param {number} i
   * @param {number} j
   * @returns {number}
   */
  at(i, j) {
    return 0;
  }

  /**
   * Returns a unique signature for the mask.
   * @returns {string}
   */
  signature() {
    return "";
  }
}

class Offset {
  /**
   * Retrieves the offset value at the specified index.
   * @param {number} i
   * @returns {number}
   */
  at(i) {
    return 0;
  }
}

class Collection$1 {
  /**
   * Returns the name of the collection.
   * @returns {string}
   */
  name() {
    return "";
  }

  /**
   * Returns an array of dimension names associated with the collection.
   * @returns {Dimension[]}
   */
  dimensions() {
    return [];
  }

  /**
   * Returns a mask.
   * @returns {Mask}
   */
  mask() {
    return null;
  }

  /**
   * Returns a offset.
   * @returns {Offset}
   */
  offset() {
    return null;
  }
}

class Dimension {
  /**
   * Returns the name of the dimension.
   * @returns {string}
   */
  name() {
    return "";
  }

  /**
   * Returns the ratio used in calculations.
   * @returns {number}
   */
  ratio() {
    return 1.0;
  }

  // PointDimension methods

  /**
   * Creates a new point in this dimension with the given coordinates.
   * @param {number[]} coordinates
   * @returns {Point}
   */
  newPoint(coordinates) {
    return null;
  }

  /**
   * Returns the length of the point representation in this dimension.
   * @returns {number}
   */
  pointLength() {
    return 0;
  }

  /**
   * Calculates the distance between two points in this dimension.
   * @param {Point} point1
   * @param {Point} point2
   * @returns {number}
   */
  pointDistance(point1, point2) {
    return 0;
  }

  /**
   * Calculates the direction from one point to another in this dimension.
   * @param {Point} point1
   * @param {Point} point2
   * @returns {number}
   */
  pointDirection(point1, point2) {
    return 0;
  }

  // SegmentDimension methods

  /**
   * Creates a new segment in this dimension with the given coordinates.
   * @param {number[]} coordinates
   * @returns {Segment}
   */
  newSegment(coordinates) {
    return null;
  }

  /**
   * Returns the root segment of this dimension.
   * @returns {Segment}
   */
  rootSegment() {
    return null;
  }

  /**
   * Returns the length of the segment representation in this dimension.
   * @returns {number}
   */
  segmentLength() {
    return 0;
  }

  /**
   * Calculates the distance from a point to a segment in this dimension.
   * @param {Point} point
   * @param {Segment} segment
   * @returns {number}
   */
  segmentDistance(point, segment) {
    return 0;
  }

  /**
   * Calculates the direction from a point to a segment in this dimension.
   * @param {Point} point
   * @param {Segment} segment
   * @returns {Direction}
   */
  segmentDirection(point, segment) {
    return null;
  }

  // FilterDimension methods

  /**
   * Creates a new filter for this dimension.
   * @param {number[]} distance
   * @param {number[]} direction
   * @returns {Filter}
   */
  newFilter(distance, direction) {
    return null;
  }

  /**
   * Determines if a given distance passes the filter criteria.
   * @param {Filter} filter
   * @param {number} distance
   * @returns {boolean}
   */
  filterDistance(filter, distance) {
    return true;
  }

  /**
   * Determines if a given direction passes the filter criteria.
   * @param {Filter} filter
   * @param {Direction} direction
   * @returns {boolean}
   */
  filterDirection(filter, direction) {
    return true;
  }
}

class Segment$2 {
  /**
   * Returns the value(s) representing the segment.
   * @returns {number[]}
   */
  value() {
    return [];
  }

  /**
   * Returns a string representation of the segment.
   * @returns {string}
   */
  print() {
    return "";
  }
}

class Filter$2 {
  // Base filter class; specific implementations may add properties
}

class Direction$2 {
  /**
   * Returns the directional values.
   * @returns {number[]}
   */
  value() {
    return [];
  }
}

class Location {
  /**
   * Sets the location data using the provided segments, distances, directions, and overall distance.
   * @param {Segment[]} segments
   * @param {number[]} distances
   * @param {Direction[]} directions
   * @param {number} overall
   */
  locate(segments, distances, directions, overall) {
    this._segments = segments;
    this._distances = distances;
    this._directions = directions;
    this._distance = overall;
  }

  /**
   * Returns the segments associated with this location.
   * @returns {Segment[]}
   */
  segments() {
    return this._segments || [];
  }

  /**
   * Returns the distances associated with this location.
   * @returns {number[]}
   */
  distances() {
    return this._distances || [];
  }

  /**
   * Returns the directions associated with this location.
   * @returns {Direction[]}
   */
  directions() {
    return this._directions || [];
  }

  /**
   * Returns the overall distance associated with this location.
   * @returns {number}
   */
  distance() {
    return this._distance || 0;
  }
}

class Element extends Location {
  /**
   * Returns the name of the collection this element belongs to.
   * @returns {string}
   */
  collection() {
    return "";
  }

  /**
   * Returns the unique hash identifier of this element.
   * @returns {string}
   */
  hash() {
    return "";
  }

  /**
   * Returns the count of items associated with this element.
   * @returns {number}
   */
  count() {
    return 0;
  }
}

class Item$2 extends Element {
  /**
   * Returns the unique identifier of this item.
   * @returns {string}
   */
  id() {
    return "";
  }
}

// Monitoring states
const State = {
  Added: "added",
  Filtered: "filtered",
  Indexed: "indexed",
  Selected: "selected",
  Loaded: "loaded",
  Streamed: "streamed",
};

class Monitoring {
  /**
   * Constructs a new Monitoring instance.
   * @param {number} level
   * @param {string} state
   * @param {Element} element
   */
  constructor(level, state, element) {
    this._level = level;
    this._state = state;
    this._element = element;
  }

  /**
   * Returns the level of monitoring.
   * @returns {number}
   */
  level() {
    return this._level;
  }

  /**
   * Returns the current state.
   * @returns {string}
   */
  state() {
    return this._state;
  }

  /**
   * Returns the associated element.
   * @returns {Element}
   */
  element() {
    return this._element;
  }
}

class Point$2 {
  /**
   * Returns the value(s) representing the point.
   * @returns {number[]}
   */
  value() {
    return [];
  }

  /**
   * Returns a string representation of the point.
   * @returns {string}
   */
  print() {
    return "";
  }
}

class Set$1 extends Element {
  // Inherits from Element; no additional methods needed unless extending functionality
}

/**
 * Represents a binary search tree (BST) data structure.
 * Each node can have a left and right child, and optionally store a value.
 */
class BinarySearchTree {
  /**
   * Constructs a new BinarySearchTree instance.
   * @param {any} node - The value or data to store at this node (optional).
   */
  constructor(node = null) {
    this.left = null;
    this.right = null;
    this.node = node;
  }

  /**
   * Inserts a node into the binary search tree based on the provided index and identifier.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} id - The identifier used to determine the placement of the node.
   * @param {any} node - The data to store at the inserted node.
   */
  insert(idx, id, node) {
    if (Math.floor(idx / 8) === id.length) {
      this.node = node;
      return;
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = (id[byteIndex] >> bitIndex) & 1;

    if (bit === 0) {
      if (this.left === null) {
        this.left = new BinarySearchTree();
      }
      this.left.insert(idx + 1, id, node);
    } else {
      if (this.right === null) {
        this.right = new BinarySearchTree();
      }
      this.right.insert(idx + 1, id, node);
    }
  }

  /**
   * Traverses the binary search tree and processes each node using the provided callback function.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The current value of the path taken.
   * @param {function} process - A callback function to process each leaf node.
   */
  traverse(idx, value, process) {
    if (this.left !== null) {
      const tmp = Uint8Array.from(value);
      this.left.traverse(idx + 1, tmp, process);
    }

    if (this.right !== null) {
      const tmp = Uint8Array.from(value);
      tmp[Math.floor(idx / 8)] |= 1 << (7 - (idx % 8));
      this.right.traverse(idx + 1, tmp, process);
    }

    if (idx > 0 && this.left === null && this.right === null) {
      process(idx, value, this.node);
    }
  }

  /**
   * Traverses the tree to find nodes within a certain range between owner and candidate identifiers.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} owner - The owner's identifier.
   * @param {Uint8Array} candidate - The candidate's identifier.
   * @param {Uint8Array} value - The current value of the path taken.
   * @param {function} process - A callback function to process nodes within the range.
   */
  range(idx, owner, candidate, value, process) {
    const tmp = Uint8Array.from(value);

    if (Math.floor(idx / 8) === owner.length) {
      return;
    }

    const oByteIndex = Math.floor(idx / 8);
    const oBitIndex = 7 - (idx % 8);
    const oBit = (owner[oByteIndex] >> oBitIndex) & 1;

    const cByteIndex = Math.floor(idx / 8);
    const cBitIndex = 7 - (idx % 8);
    const cBit = (candidate[cByteIndex] >> cBitIndex) & 1;

    if (oBit !== cBit) {
      if (!cBit && this.left !== null) {
        this.left.traverse(idx + 1, tmp, process);
      } else if (cBit && this.right !== null) {
        tmp[Math.floor(idx / 8)] |= 1 << (7 - (idx % 8));
        this.right.traverse(idx + 1, tmp, process);
      }
      return;
    }

    if (this.left !== null && (!oBit || this.right === null)) {
      this.left.range(idx + 1, owner, candidate, tmp, process);
    }
    if (this.right !== null && (oBit || this.left === null)) {
      tmp[Math.floor(idx / 8)] |= 1 << (7 - (idx % 8));
      this.right.range(idx + 1, owner, candidate, tmp, process);
    }
  }

  /**
   * Truncates the tree branches that do not match the owner's identifier.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} owner - The owner's identifier.
   * @param {Uint8Array} branch - The branch identifier to compare.
   */
  truncate(idx, owner, branch) {
    if (Math.floor(idx / 8) === owner.length) {
      return;
    }

    const oByteIndex = Math.floor(idx / 8);
    const oBitIndex = 7 - (idx % 8);
    const oBit = (owner[oByteIndex] >> oBitIndex) & 1;

    const bByteIndex = Math.floor(idx / 8);
    const bBitIndex = 7 - (idx % 8);
    const bBit = (branch[bByteIndex] >> bBitIndex) & 1;

    if (oBit !== bBit) {
      if (bBit && this.right !== null) {
        this.right = null;
      } else if (!bBit && this.left !== null) {
        this.left = null;
      }
      return;
    }

    if (this.left !== null && (!oBit || this.right === null)) {
      this.left.truncate(idx + 1, owner, branch);
    }
    if (this.right !== null && (oBit || this.left === null)) {
      this.right.truncate(idx + 1, owner, branch);
    }
  }

  /**
   * Retrieves a node from the tree based on the provided value.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The value used to traverse the tree.
   * @returns {[any, boolean]} - A tuple containing the node data and a boolean indicating if it was found.
   */
  get(idx, value) {
    if (Math.floor(idx / 8) === value.length) {
      return [this.node, true];
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = (value[byteIndex] >> bitIndex) & 1;

    if (this.left !== null && bit === 0) {
      return this.left.get(idx + 1, value);
    } else if (this.right !== null && bit === 1) {
      return this.right.get(idx + 1, value);
    }

    return [null, false];
  }

  /**
   * Finds the nearest node to the given value in the tree.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The value used to traverse the tree.
   * @returns {any} - The data stored at the nearest node.
   */
  nearest(idx, value) {
    if (Math.floor(idx / 8) === value.length) {
      return this.node;
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = (value[byteIndex] >> bitIndex) & 1;

    if (this.left !== null && (!bit || this.right === null)) {
      return this.left.nearest(idx + 1, value);
    } else if (this.right !== null) {
      return this.right.nearest(idx + 1, value);
    }

    return this.node;
  }

  /**
   * Removes a node from the tree based on the provided value.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The value used to traverse the tree for removal.
   * @returns {boolean} - Returns true if the node should be removed, otherwise false.
   */
  remove(idx, value) {
    // Base case: If we've reached the end of the value, indicate that this node should be removed.
    if (Math.floor(idx / 8) === value.length) {
      return true;
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = ((value[byteIndex] >> bitIndex) & 1) === 1;

    if (!bit && this.left !== null) {
      // Attempt to remove from the left subtree.
      if (this.left.remove(idx + 1, value)) {
        // If the left child should be removed, set it to null.
        this.left = null;
        // Return true if there are no right children, indicating this node can also be removed.
        return this.right === null;
      }
    } else if (bit && this.right !== null) {
      // Attempt to remove from the right subtree.
      if (this.right.remove(idx + 1, value)) {
        // If the right child should be removed, set it to null.
        this.right = null;
        // Return true if there are no left children, indicating this node can also be removed.
        return this.left === null;
      }
    }

    // If the node was not removed, return false.
    return false;
  }

  /**
   * Extracts routing information from the tree based on the given value.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The value used to traverse the tree.
   * @param {Object} routing - An object to store routing information.
   */
  extract(idx, value, routing) {
    if (Math.floor(idx / 8) === value.length) {
      return;
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = (value[byteIndex] >> bitIndex) & 1;

    if (this.left !== null && bit === 0) {
      this.left.extract(idx + 1, value, routing);
    } else if (this.right !== null && bit === 1) {
      this.right.extract(idx + 1, value, routing);
    }

    if (this.left !== null && bit === 1) {
      routing[idx] = this.left.nearest(idx + 1, value);
    } else if (this.right !== null && bit === 0) {
      routing[idx] = this.right.nearest(idx + 1, value);
    }
  }

  /**
   * Reduces the tree by applying provided functions to junctions and leaf nodes.
   * @param {number} idx - The current bit index being evaluated.
   * @param {number} side - Indicates the side of the parent node (0 for left, 1 for right).
   * @param {function} startJunction - A callback function called when a junction is started.
   * @param {function} endJunction - A callback function called when a junction is ended.
   * @param {function} leaf - A callback function called when a leaf node is encountered.
   */
  reduce(idx, side, startJunction, endJunction, leaf) {
    const isJunction = this.left !== null && this.right !== null;
    let currentSide = side;

    if (isJunction) {
      idx++;
      startJunction(currentSide);
    }

    if (this.left !== null) {
      if (isJunction) {
        side = 0;
      }
      this.left.reduce(idx, side, startJunction, endJunction, leaf);
    }

    if (this.right !== null) {
      if (isJunction) {
        side = 1;
      }
      this.right.reduce(idx, side, startJunction, endJunction, leaf);
    }

    if (idx > 0 && this.left === null && this.right === null) {
      leaf(idx, side, this.node);
    }

    if (isJunction) {
      endJunction(currentSide);
    }
  }
}

/**
 * Represents a peer in the network with its associated data.
 */
class Peer$1 {
  /**
   * Retrieves the id of the peer.
   * @returns {Buffer} - The id of the peer.
   */
  id() {}

  /**
   * Retrieves the hash of the peer.
   * @returns {string} - The hash of the peer.
   */
  hash() {}

  /**
   * Retrieves the IP addresses of the peer.
   * @returns {Object.<string, null>} - An object containing the IP addresses.
   */
  ips() {}

  /**
   * Retrieves the port number the peer is listening on.
   * @returns {number} - The port number.
   */
  port() {}

  /**
   * Retrieves the primary IP address of the peer.
   * @returns {string} - The primary IP address.
   */
  ip() {}
}

/**
 * Represents the API for interacting with peers to add items and retrieve sets.
 */
class API$1 {
  /**
   * Ping
   * @param {string} host - The host of the peer.
   * @returns {Promise<Peer>} - A promise that resolves when the item is added.
   */
  async pingPeer(host) {}

  /**
   * Adds an item to a collection at a specific location on a peer.
   * @param {Peer} peer - The peer to which the item will be added.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @param {string} reference - The unique identifier of the item to add.
   * @returns {Promise<any>} - A promise that resolves when the item is added.
   */
  async addItem(peer, collection, location, reference) {}

  /**
   * Retrieves a set of items from a collection at a specific location on a peer.
   * @param {Peer} peer - The peer from which to retrieve the set.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @returns {Promise<Element[]>} - A promise that resolves with the retrieved set of items.
   */
  async getSet(peer, collection, location) {}
}

/**
 * Represents the API for interacting with peers to add items and retrieve sets.
 */
class Network$1 {
  /**
   * Adds an item to a collection at a specific location in the network.
   * The method selects the appropriate peer(s) to handle the request.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @param {string} reference - The unique identifier of the item to add.
   * @returns {Promise<void>} - A promise that resolves when the item is added.
   */
  static async addItem(collection, location, reference) {}

  /**
   * Retrieves a set of items from a collection at a specific location in the network.
   * The method selects the appropriate peer(s) to handle the request.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @returns {Promise<Element[]>} - A promise that resolves with the retrieved set of items.
   */
  static async getSet(collection, location) {}
}

class Item$1 extends Item$2 {
  constructor(collection, hash, id) {
    super();

    this._collection = collection;
    this._hash = hash;
    this._id = id;
  }

  /**
   * Returns the name of the collection this element belongs to.
   * @returns {string}
   */
  collection() {
    return this._collection;
  }

  /**
   * Returns the unique hash identifier of this element.
   * @returns {string}
   */
  hash() {
    return this._hash;
  }

  /**
   * Returns the count of items associated with this element.
   * @returns {number}
   */
  count() {
    return 1;
  }

  /**
   * Returns the unique identifier of this item.
   * @returns {string}
   */
  id() {
    return this._id;
  }
}

// Point class (implements Point)
class Point$1 extends Point$2 {
  constructor(latitude, longitude) {
    super();

    this.latitude = latitude;
    this.longitude = longitude;
  }

  value() {
    return [this.latitude, this.longitude];
  }

  print() {
    return `(latitude: ${this.latitude}, longitude: ${this.longitude})`;
  }
}

// Segment class (implements Segment)
class Segment$1 extends Segment$2 {
  constructor(south, west, north, east) {
    super();

    this.south = south;
    this.west = west;
    this.north = north;
    this.east = east;
  }

  value() {
    return [this.south, this.north, this.west, this.east];
  }

  print() {
    return `(south: ${this.south}, west: ${this.west}, north: ${this.north}, east: ${this.east})`;
  }
}

// Direction class (implements Direction)
class Direction$1 extends Direction$2 {
  constructor(south, west, north, east) {
    super();

    this.south = south;
    this.west = west;
    this.north = north;
    this.east = east;
  }

  value() {
    return [this.south, this.west, this.north, this.east];
  }
}

// Filter class (implements Filter)
class Filter$1 extends Filter$2 {
  constructor(minDistance, maxDistance, minAngle, maxAngle) {
    super();

    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.minAngle = minAngle;
    this.maxAngle = maxAngle;
  }
}

// Spherical class (implements Dimension)
class Spherical extends Dimension {
  constructor(args) {
    super();

    this._ratio = this.pointDistance(
      new Point$1(0, args[0]),
      new Point$1(0, args[2])
    );
    this._rootSegment = new Segment$1(args[0], args[1], args[2], args[3]);
  }

  name() {
    return "spherical";
  }

  ratio() {
    return this._ratio;
  }

  newPoint(coordinates) {
    return new Point$1(coordinates[0], coordinates[1]);
  }

  pointLength() {
    return 2;
  }

  pointDistance(origin, distant) {
    const lat1 = (Math.PI * origin.latitude) / 180;
    const lat2 = (Math.PI * distant.latitude) / 180;
    const theta = (Math.PI * (distant.longitude - origin.longitude)) / 180;
    let dist =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(theta);
    dist = Math.min(dist, 1);
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist *= 60 * 1.1515 * 1.609344; // Convert to kilometers
    return dist;
  }

  pointDirection(origin, distant) {
    const lat1 = (origin.latitude * Math.PI) / 180;
    const lat2 = (distant.latitude * Math.PI) / 180;
    const deltaLong = ((distant.longitude - origin.longitude) * Math.PI) / 180;
    const y = Math.sin(deltaLong) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLong);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360 degrees
  }

  newSegment(coordinates) {
    return new Segment$1(
      coordinates[0],
      coordinates[2],
      coordinates[1],
      coordinates[3]
    );
  }

  rootSegment() {
    return this._rootSegment;
  }

  segmentLength() {
    return 4;
  }

  segmentDistance(point, segment) {
    const loc = this.segmentLocation(point, segment);
    if (loc === -1) {
      return this.pointDistance(
        point,
        new Point$1(-point.latitude, ((point.longitude + 360) % 360) - 180)
      );
    } else if (loc === 0) {
      return Math.min(
        this.pointDistance(point, new Point$1(segment.south, segment.west)),
        this.pointDistance(point, new Point$1(segment.north, segment.west)),
        this.pointDistance(point, new Point$1(segment.north, segment.east)),
        this.pointDistance(point, new Point$1(segment.south, segment.east))
      );
    } else if (loc === 1) {
      return Math.min(
        this.pointDistance(point, new Point$1(point.latitude, segment.west)),
        this.pointDistance(point, new Point$1(point.latitude, segment.east))
      );
    } else if (loc === 2) {
      return Math.min(
        this.pointDistance(point, new Point$1(segment.south, point.longitude)),
        this.pointDistance(point, new Point$1(segment.north, point.longitude))
      );
    } else {
      return 0;
    }
  }

  segmentDirection(point, segment) {
    const loc = this.segmentLocation(point, segment);
    if (loc !== 3) {
      return new Direction$1(
        this.pointDirection(point, new Point$1(segment.south, segment.west)),
        this.pointDirection(point, new Point$1(segment.north, segment.west)),
        this.pointDirection(point, new Point$1(segment.north, segment.east)),
        this.pointDirection(point, new Point$1(segment.south, segment.east))
      );
    }
    return new Direction$1(0, 0, 0, 0);
  }

  segmentLocation(point, segment) {
    if (
      segment.south === this._rootSegment.south &&
      segment.west === this._rootSegment.west &&
      segment.north === this._rootSegment.north &&
      segment.east === this._rootSegment.east
    ) {
      return -1;
    }
    let location = 0;
    if (point.latitude > segment.south && point.latitude < segment.north) {
      location += 1;
    }
    if (point.longitude > segment.west && point.longitude < segment.east) {
      location += 2;
    }
    return location;
  }

  newFilter(distance, direction) {
    return new Filter$1(distance[0], distance[1], direction[0], direction[1]);
  }

  filterDistance(filter, distance) {
    return (
      (filter.minDistance === 0 || distance >= filter.minDistance) &&
      (filter.maxDistance === 0 || distance <= filter.maxDistance)
    );
  }

  filterDirection(filter, direction) {
    const dirValues = direction.value();
    const dirSum = dirValues.reduce((acc, val) => acc + val, 0);

    if (filter.minAngle !== filter.maxAngle && dirSum !== 0) {
      const normal = filter.minAngle < filter.maxAngle;

      const checks = dirValues.map((dir) => [
        dir >= filter.minAngle,
        dir <= filter.maxAngle,
      ]);

      for (const [d1, d2] of checks) {
        if (normal ? d1 && d2 : d1 || d2) {
          return true;
        }
      }

      const minDir = Math.min(...dirValues);
      const maxDir = Math.max(...dirValues);

      return (
        (maxDir - minDir > 180 && filter.minAngle >= maxDir) ||
        (normal && minDir <= filter.minAngle && maxDir >= filter.maxAngle)
      );
    }
    return true;
  }
}

// Point class (implements Point)
class Point extends Point$2 {
  constructor(value) {
    super();

    this._value = value;
  }

  value() {
    return [this._value];
  }

  print() {
    return `(value: ${this._value})`;
  }
}

// Segment class (implements Segment)
class Segment extends Segment$2 {
  constructor(start, end) {
    super();

    this.start = start;
    this.end = end;
  }

  value() {
    return [this.start, this.end];
  }

  print() {
    const startDate = new Date(this.start * 1000);
    const endDate = new Date(this.end * 1000);
    return `(start: ${startDate.toISOString()}, end: ${endDate.toISOString()})`;
  }
}

// Direction class (implements Direction)
class Direction extends Direction$2 {
  constructor(value) {
    super();

    this._value = value;
  }

  value() {
    return [this._value];
  }
}

// Filter class (implements Filter)
class Filter extends Filter$2 {
  constructor(minDistance, maxDistance, direction) {
    super();

    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.direction = direction;
  }
}

// Linear class (implements Dimension)
class Linear extends Dimension {
  constructor(args) {
    super();

    this._rootSegment = new Segment(args[0], args[1]);
    this._ratio = (this._rootSegment.end - this._rootSegment.start) / 2;
  }

  name() {
    return "linear";
  }

  ratio() {
    return this._ratio;
  }

  newPoint(coordinates) {
    return new Point(coordinates[0]);
  }

  pointLength() {
    return 1;
  }

  pointDistance(origin, distant) {
    return Math.abs(distant._value - origin._value);
  }

  pointDirection(origin, distant) {
    if (origin._value < distant._value) {
      return 1;
    } else if (origin._value > distant._value) {
      return -1;
    }
    return 0;
  }

  newSegment(coordinates) {
    return new Segment(coordinates[0], coordinates[1]);
  }

  rootSegment() {
    return this._rootSegment;
  }

  segmentLength() {
    return 2;
  }

  segmentDistance(point, segment) {
    if (
      segment.start === this._rootSegment.start &&
      segment.end === this._rootSegment.end
    ) {
      return segment.end - segment.start;
    } else if (point._value < segment.start) {
      return segment.start - point._value;
    } else if (point._value > segment.end) {
      return point._value - segment.end;
    }
    return 0;
  }

  segmentDirection(point, segment) {
    const direction = new Direction(0);
    if (point._value < segment.start) {
      direction._value = 1;
    } else if (point._value > segment.end) {
      direction._value = -1;
    }
    return direction;
  }

  newFilter(distance, direction) {
    return new Filter(distance[0], distance[1], direction[0]);
  }

  filterDistance(filter, distance) {
    return (
      (filter.minDistance === 0 || distance >= filter.minDistance) &&
      (filter.maxDistance === 0 || distance <= filter.maxDistance)
    );
  }

  filterDirection(filter, direction) {
    // TODO
    return true;
  }
}

class Capped extends Mask {
  /**
   * Constructs a new CappedMask instance.
   * @param {number[][]} value - An array of arrays, each containing exactly 6 integers.
   */
  constructor(value) {
    super();

    this.value = value;
  }

  /**
   * Retrieves the mask value at the specified indices.
   * @param {number} i
   * @param {number} j
   * @returns {number}
   */
  at(i, j) {
    const length = this.value.length;
    if (i < length) {
      return this.value[i][j];
    }
    return this.value[length - 1][j];
  }

  /**
   * Returns a unique signature for the mask.
   * @returns {string}
   */
  signature() {
    let signature = "cm";
    for (const subArray of this.value) {
      for (const num of subArray) {
        signature += String(num);
      }
    }
    return signature;
  }
}

class Static extends Mask {
  /**
   * Constructs a new StaticMask instance.
   * @param {number[]} value - An array of exactly 6 integers.
   */
  constructor(value) {
    super();

    if (Array.isArray(value[0])) {
      throw new Error(
        "StaticMask expects a single array of 6 integers, not an array of arrays."
      );
    }
    this.value = value;
  }

  /**
   * Retrieves the mask value at the specified indices.
   * @param {number} i - (Unused in current implementation)
   * @param {number} j - The index to retrieve.
   * @returns {number}
   */
  at(i, j) {
    return this.value[j];
  }

  /**
   * Returns a unique signature for the mask.
   * @returns {string}
   */
  signature() {
    let signature = "sm";
    for (const num of this.value) {
      signature += String(num);
    }
    return signature;
  }
}

class Basic extends Offset {
  /**
   * Constructs a new Offset instance.
   * @param {number[]} details - An array of integers.
   */
  constructor(args) {
    super();

    if (!Array.isArray(args[0])) {
      throw new Error("Details must be an array of integers.");
    }
    this.details = args[0];
  }

  /**
   * Retrieves the offset value at the specified index.
   * @param {number} l - The index to retrieve.
   * @returns {number}
   */
  at(l) {
    return this.details[l];
  }
}

const DIMENSIONS = {
  spherical: Spherical,
  linear: Linear,
};

function mapDimension(name, args) {
  return new DIMENSIONS[name](args);
}

const MASKS = {
  capped: Capped,
  static: Static,
};

function mapMask(name, args) {
  return new MASKS[name](args);
}

const OFFSETS = {
  basic: Basic,
};

function mapOffset(name, args) {
  return new OFFSETS[name](args);
}

class Collection extends Collection$1 {
  constructor(name, dimensions, mask, offset) {
    super();

    this._name = name;
    this._dimensions = [];
    dimensions.forEach((dimension) => {
      this._dimensions.push(mapDimension(dimension.name, dimension.args));
    });
    this._mask = mapMask(mask.name, mask.args);
    this._offset = mapOffset(offset.name, offset.args);
  }

  /**
   * Returns the name of the collection.
   * @returns {string}
   */
  name() {
    return this._name;
  }

  /**
   * Returns an array of dimension names associated with the collection.
   * @returns {Dimension[]}
   */
  dimensions() {
    return this._dimensions;
  }

  /**
   * Returns a mask.
   * @returns {Mask}
   */
  mask() {
    return this._mask;
  }

  /**
   * Returns a offset.
   * @returns {Offset}
   */
  offset() {
    return this._offset;
  }
}

const ROOT = "@";
const BASEURL64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

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

class Space {
  constructor(dimensions, mask, offset) {
    this.dimensions = dimensions;
    this.mask = mask;
    this.offset = offset;
  }

  signature() {
    return this._signature();
  }

  dimension(i) {
    return this.dimensions[i];
  }

  size() {
    return this.dimensions.length;
  }

  newPoint(coordinates) {
    return this._coordinatesToPoints(coordinates);
  }

  newFilter(distance, direction) {
    return this._coordinatesToFilters(distance, direction);
  }

  encode(points, precision) {
    return this._encode(this._pointsToCoordinates(points), precision);
  }

  decode(hash) {
    return this._coordinatesToSegments(this._decode(hash));
  }

  // Private methods
  _signature() {
    const length = this.dimensions.length;
    const trace = [];

    for (let i = 0; i < length; i++) {
      const dimension = this.dimensions[i];
      trace[i] = dimension.name();
      if (i === length - 1) {
        trace[i + 1] = this.mask.signature();
      }
    }
    return trace.join("|");
  }

  _root() {
    const root = [];
    for (const dimension of this.dimensions) {
      root.push(...dimension.rootSegment().value());
    }
    return root;
  }

  _encode(coordinates, precision) {
    if (precision === 0) {
      return ROOT;
    }

    let src = this._root();
    let hash = "";

    for (let l = 0; l < precision; l++) {
      let idx = 0;
      for (let n = 0; n <= 5; n++) {
        const maskIndex = this.mask.at(l, n);
        const mid = (src[maskIndex * 2] + src[maskIndex * 2 + 1]) / 2;
        if (coordinates[maskIndex] > mid) {
          idx = idx * 2 + 1;
          src[maskIndex * 2] = mid;
        } else {
          idx = idx * 2;
          src[maskIndex * 2 + 1] = mid;
        }
      }
      const baseIndex = (this.offset.at(l) + idx) % 64;
      hash += BASEURL64.charAt(baseIndex);
    }

    return hash;
  }

  _decode(hash) {
    let src = this._root();

    if (hash === ROOT) {
      return src;
    }

    for (let l = 0; l < hash.length; l++) {
      const idx = (64 + BASEURL64.indexOf(hash[l]) - this.offset.at(l)) % 64;
      for (let n = 0; n <= 5; n++) {
        const maskIndex = this.mask.at(l, n);
        const mid = (src[maskIndex * 2] + src[maskIndex * 2 + 1]) / 2;
        if (((idx >> (5 - n)) & 1) === 1) {
          src[maskIndex * 2] = mid;
        } else {
          src[maskIndex * 2 + 1] = mid;
        }
      }
    }

    return src;
  }

  _coordinatesToPoints(coordinates) {
    const origin = [];
    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      origin.push(dimension.newPoint(coordinates[i]));
    }
    return origin;
  }

  _coordinatesToFilters(distance, direction) {
    const filters = [];
    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      filters.push(dimension.newFilter(distance[i], direction[i]));
    }
    return filters;
  }

  _pointsToCoordinates(points) {
    const coordinates = [];
    for (const point of points) {
      coordinates.push(...point.value());
    }
    return coordinates;
  }

  _coordinatesToSegments(coordinates) {
    let min = 0,
      max = 0;
    const indexes = [];

    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      min = max;
      max += dimension.segmentLength();
      indexes[i] = dimension.newSegment(coordinates.slice(min, max));
    }

    return indexes;
  }
}

class Store {
  constructor() {
    this.list = [];
    this.count = 0;
  }

  clear() {
    this.list = [];
    this.count = 0;
  }

  add(element) {
    this.list.push(element);
    this.count += element.count();
  }

  concat(list) {
    list.forEach((element) => this.add(element));
  }

  remove(selected, count) {
    this.list = this.list.slice(selected);
    this.count -= count;
  }

  sort() {
    this.list.sort((a, b) => a.distance() - b.distance());
  }
}

class Layer {
  constructor() {
    this.radius = 0;
    this.indexed = new Store();
    this.selected = new Store();
    this.loaded = new Store();
    this.final = true;
    this.waiting = 0;
    this.target = 0;
  }
}

class Set extends Set$1 {
  constructor(collection, hash, count) {
    super();

    this._collection = collection;
    this._hash = hash;
    this._count = count;
  }

  /**
   * Returns the name of the collection this element belongs to.
   * @returns {string}
   */
  collection() {
    return this._collection;
  }

  /**
   * Returns the unique hash identifier of this element.
   * @returns {string}
   */
  hash() {
    return this._hash;
  }

  /**
   * Returns the count of items associated with this element.
   * @returns {number}
   */
  count() {
    return this._count;
  }
}

async function asyncPool(poolLimit, array, iteratorFn) {
  const ret = []; // Array to hold all the promises
  const executing = []; // Array to hold the currently executing promises

  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(ret);
}

async function run() {
  if (this.prepare()) {
    if (this.current().final) {
      this.stream();
      return;
    } else {
      await this.query();
      this.level++;
    }
  } else {
    this.level--;
    if (this.level === 0) {
      this.level = this.sets.length;
    }
  }
  await this.run();
}

function prepare() {
  this.current().indexed.sort();

  let selected = 0;
  let count = 0;
  let items = 0;

  for (const element of this.current().indexed.list) {
    if (
      this.level > 0 &&
      (element.distance() > this.previous().radius ||
        count >= this.cap * this.limit)
    ) {
      break;
    }

    if (element instanceof Item$2) {
      items++;
    }

    this.current().selected.add(element);
    selected++;
    count += element.count();
    this.monitoring.send(new Monitoring(this.level, State.Selected, element));
  }

  this.current().indexed.remove(selected, count);

  if (this.level === 0) {
    this.current().final = false;
    return true;
  }

  if (
    this.current().indexed.count === 0 ||
    this.current().indexed.list[0].distance() > this.previous().radius
  ) {
    this.current().radius = this.previous().radius;
  } else {
    this.current().radius = this.current().indexed.list[0].distance();
  }

  this.previous().waiting =
    this.current().indexed.count + this.current().waiting;
  this.previous().loaded.count =
    this.current().indexed.count +
    this.current().selected.count +
    this.current().loaded.count;

  const predicted =
    this.current().loaded.count +
    this.current().selected.count -
    this.current().waiting;
  this.current().final =
    this.current().final &&
    items === selected &&
    this.level + 1 === this.sets.length;

  return (
    predicted >= this.limit || this.current().radius === this.first().radius
  );
}

async function query() {
  const concurrencyLimit = 50; // Define your concurrency limit here
  const selectedList = this.current().selected.list;

  // Define the iterator function for each element
  const processElement = async (element) => {
    const s = element;
    try {
      const id = transform(s.collection(), s.hash());
      await this.getSet(s, (set) => {
        this.next().indexed.add(set);
      });

      this.monitoring.send(new Monitoring(this.level, State.Loaded, s));
    } catch (error) {
      console.error(`Failed to retrieve set for ${s.collection()}:`, error);
    }
  };

  // Use the asyncPool to process elements with limited concurrency
  await asyncPool(concurrencyLimit, selectedList, processElement);

  // After all promises are resolved
  this.current().loaded.concat(this.current().selected.list);
  this.current().selected.clear();
}

function stream() {
  let length = this.step;
  if (this.current().selected.count < this.step) {
    length = this.current().selected.count;
  }

  const result = [];

  for (let idx = 0; idx < length; idx++) {
    const element = this.current().selected.list[idx];
    result.push(element); // Assuming element is an Item
    this.current().loaded.add(element);
    this.monitoring.send(new Monitoring(this.level, State.Streamed, element));
  }

  this.current().selected.remove(length, length);
  this.output.send(result);
}

async function addItem$1(item) {
  if (item instanceof Item$2) {
    await this.network.addItem(item.collection(), ROOT, item.hash(), item.id());

    this.monitoring.send(new Monitoring(this.level + 1, State.Added, item));
  }
}

async function getSet$1(set, addSet) {
  if (set instanceof Item$2) {
    addSet(set);
    this.monitoring.send(new Monitoring(this.level + 1, State.Indexed, set));
    return;
  }

  const space = this.spaces[set.collection()];
  const elements = await this.network.getSet(set.collection(), set.hash());

  for (const element of elements) {
    if (!this.addLocation(space, element)) {
      this.monitoring.send(
        new Monitoring(this.level + 1, State.Filtered, element)
      );
      continue;
    }

    addSet(element);
    this.monitoring.send(
      new Monitoring(this.level + 1, State.Indexed, element)
    );
  }
}

function addLocation(space, element) {
  const location = [];
  const distances = [];
  const directions = [];
  let overall = 0;
  let active = true;

  const segments = space.decode(element.hash());

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    location.push(segment);

    const dimension = space.dimension(i);
    const option = this.options[dimension.name()];

    const distance = dimension.segmentDistance(option.origin, segment);
    distances.push(distance);

    const direction = dimension.segmentDirection(option.origin, segment);
    directions.push(direction);

    overall += distance / dimension.ratio() / segments.length;

    active =
      active &&
      dimension.filterDirection(option.filters, direction) &&
      dimension.filterDistance(option.filters, distance);
  }

  element.locate(location, distances, directions, overall);
  return active;
}

class Option {
  constructor(origin, filters) {
    this.origin = origin;
    this.filters = filters;
  }
}

function newOption(key, coordinates, distances, directions) {
  const dimension = this.dimensions()[key];
  return new Option(
    dimension.newPoint(coordinates),
    dimension.newFilter(distances, directions)
  );
}

function checkOptions() {
  const missing = [];
  for (const dimension in this.dimensions()) {
    if (!this.options.hasOwnProperty(dimension)) {
      missing.push(dimension);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing option for dimensions: ${missing.join(", ")}`);
  }
}

class Locality {
  constructor(spaces, options, cap, step, output, monitoring, network) {
    this.spaces = spaces;
    this.options = options;
    this.cap = cap;
    this.limit = 0;
    this.level = 0;
    this.sets = [new Layer()];
    this.step = step;
    this.output = output;
    this.monitoring = monitoring;
    this.network = network;

    for (const [key, space] of Object.entries(this.spaces)) {
      const element = new Set(key, ROOT, 0);

      if (!this.addLocation(space, element)) {
        this.monitoring.send(
          new Monitoring(this.level, State.Filtered, element)
        );
        return;
      }

      this.current().indexed.add(element);
      this.current().radius = element.distance();

      this.monitoring.send(new Monitoring(this.level, State.Indexed, element));
    }
  }

  dimensions() {
    const dimensions = {};
    for (const key in this.spaces) {
      const space = this.spaces[key];
      for (let i = 0; i < space.size(); i++) {
        const dimension = space.dimension(i);
        dimensions[dimension.name()] = dimension;
      }
    }
    return dimensions;
  }

  async search() {
    this.limit += this.step;
    await this.run();
  }

  // Layer navigation methods
  first() {
    return this.sets[0];
  }

  current() {
    return this.sets[this.level];
  }

  previous() {
    return this.sets[this.level - 1];
  }

  next() {
    if (this.level + 1 === this.sets.length) {
      const last = new Layer();
      this.sets.push(last);
      return last;
    }
    return this.sets[this.level + 1];
  }
}

Locality.prototype.run = run;
Locality.prototype.prepare = prepare;
Locality.prototype.query = query;
Locality.prototype.stream = stream;
Locality.prototype.addItem = addItem$1;
Locality.prototype.getSet = getSet$1;
Locality.prototype.addLocation = addLocation;
Locality.prototype.newOption = newOption;
Locality.prototype.checkOptions = checkOptions;

class Peer extends Peer$1 {
  /**
   * Constructs a new Peer instance.
   * @param {string} hash - The unique hash or identifier of the peer.
   * @param {Object.<string, null>} ips - An object containing the peer's IP addresses.
   * @param {number} port - The port number the peer is listening on.
   * @param {string} ip - The primary IP address of the peer.
   */
  constructor(hash, ips, port, ip) {
    super();

    this._id = decodeUrl64(hash);
    this._hash = hash;
    this._ips = ips;
    this._port = port;
    this._ip = ip;
  }

  /**
   * Retrieves the hash of the peer.
   * @returns {Buffer} - The hash of the peer.
   */
  id() {
    return this._id;
  }

  /**
   * Retrieves the hash of the peer.
   * @returns {string} - The hash of the peer.
   */
  hash() {
    return this._hash;
  }

  /**
   * Retrieves the IP addresses of the peer.
   * @returns {Object.<string, null>} - An object containing the IP addresses.
   */
  ips() {
    return this._ips;
  }

  /**
   * Retrieves the port number the peer is listening on.
   * @returns {number} - The port number.
   */
  port() {
    return this._port;
  }

  /**
   * Retrieves the primary IP address of the peer.
   * @returns {string} - The primary IP address.
   */
  ip() {
    return this._ip;
  }
}

/**
 * Represents a routing table that stores peers using a binary search tree.
 */
class Table {
  /**
   * Constructs a new Table instance.
   */
  constructor() {
    this._bst = new BinarySearchTree();
  }

  /**
   * Inserts a peer into the routing table.
   * @param {Peer} peer - The peer to insert.
   */
  insert(id, peer) {
    if (!(id instanceof Uint8Array)) {
      throw new Error("Peer ID must be a Uint8Array");
    }
    this._bst.insert(0, id, peer);
  }

  /**
   * Finds the nearest peer to the given id.
   * @param {Uint8Array} id - The id to find the nearest peer for.
   * @returns {Peer|null} - The nearest peer to the given id, or null if none found.
   */
  nearest(id) {
    if (!(id instanceof Uint8Array)) {
      throw new Error("id must be a Uint8Array");
    }
    const peer = this._bst.nearest(0, id);
    return peer instanceof Peer ? peer : null;
  }

  /**
   * Removes a peer from the routing table based on its id.
   * @param {Uint8Array} id - The id of the peer to remove.
   * @returns {boolean} - Returns true if the peer was successfully removed.
   */
  remove(id) {
    if (!(id instanceof Uint8Array)) {
      throw new Error("id must be a Uint8Array");
    }
    return this._bst.remove(0, id);
  }
}

/**
 * Represents the network abstraction that manages peer-to-peer interactions.
 * This class extends the base Network class and handles peer selection, retries,
 * and maintaining the routing table.
 */
class Network extends Network$1 {
  /**
   * Constructs a new Network instance.
   * @param {API} api - The API instance used for network requests.
   * @param {string[]} hosts - An array of bootstrap hosts to initialize the network.
   */
  constructor(api, hosts) {
    super();

    this._api = api;
    this._hosts = hosts;
    this._table = new Table();
    this._attempts = 3;

    // Initialize the network by searching for peers
    this.discoverPeers();
  }

  /**
   * Initializes the network by searching for peers and populating the routing table.
   */
  async discoverPeers() {
    try {
      const bootstraps = [];

      // Use Promise.all to wait for all asynchronous operations
      await Promise.all(
        this._hosts.map(async (host) => {
          try {
            const [ip, port] = host.split("|");
            const peer = await this._api.pingPeer(ip, port);
            bootstraps.push(peer);
          } catch (error) {
            console.warn(`Failed to add bootstrap peer with host ${host}.`);
          }
        })
      );

      if (bootstraps.length === 0) {
        // If all attempts fail, throw an error
        throw new Error("Failed to find peers with bootstrap hosts.");
      }
      bootstraps.forEach((peer) => this._table.insert(peer.id(), peer));
    } catch (error) {
      console.error("Error initializing peers:", error);
    }
  }

  /**
   * Adds an item to a collection at a specific location in the network.
   * If the operation fails, it retries with a different peer.
   * @param {string} collection - The name of the collection.
   * @param {string} root - The targeted root set.
   * @param {string} location - The location identifier within the collection.
   * @param {string} reference - The unique identifier of the item to add.
   * @returns {Promise<void>}
   */
  async addItem(collection, root, location, reference) {
    let attempts = this._attempts;

    const id = transform(collection, location);

    while (true) {
      // Find the nearest peer to the id
      let peer = this._table.nearest(id);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(id);
      }

      try {
        await this._api.addItem(peer, collection, root, location, reference);
        return;
      } catch (error) {
        // If the request fails, remove the peer from the table and retry
        this._table.remove(peer.id());
        console.warn(
          `Failed to add item via peer ${peer.hash()}. Retrying with a different peer...`
        );

        attempts--;
        if (attempts == 0) {
          // If all attempts fail, throw an error
          throw new Error("Failed to retrieve set after multiple attempts.");
        }
      }
    }
  }

  /**
   * Retrieves a set of items from a collection at a specific location in the network.
   * If the operation fails, it retries with a different peer.
   * @param {string} collection - The name of the collection.
   * @param {string} location - The location identifier within the collection.
   * @returns {Promise<any>} - A promise that resolves with the retrieved set of items.
   */
  async getSet(collection, location) {
    let attempts = this._attempts;
    let next = location;

    while (true) {
      const id = transform(collection, next);

      // Find the nearest peer to the id
      let peer = this._table.nearest(id);

      if (!peer) {
        await this.discoverPeers();
        peer = this._table.nearest(id);
      }

      try {
        const response = await this._api.getSet(peer, collection, location);

        if (
          response.contact instanceof Peer &&
          response.contact.hash() !== peer.hash()
        ) {
          this._table.insert(response.contact.id(), response.contact);
          if (response.set === null) continue;
        }

        if (response.set !== null) return response.set;

        if (location !== ROOT && next === ROOT) {
          console.log("ISSUE:", peer.hash(), collection, location);
          return [];
        }
        next = parent(next);
      } catch (error) {
        // If the request fails, remove the peer from the table and retry
        this._table.remove(peer.id());
        console.warn(
          `Failed to get set via peer ${peer.hash()}. Retrying with a different peer...$`
        );

        attempts--;
        if (attempts == 0) {
          // If all attempts fail, throw an error
          throw new Error("Failed to retrieve set after multiple attempts.");
        }
      }
    }
  }
}

var bind = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (toString.call(val) !== '[object Object]') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

var utils = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM
};

function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
var buildURL = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

var InterceptorManager_1 = InterceptorManager;

var global$1 = (typeof global !== "undefined" ? global :
  typeof self !== "undefined" ? self :
  typeof window !== "undefined" ? window : {});

// shim for using process in browser
// based off https://github.com/defunctzombie/node-process/blob/master/browser.js

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
var cachedSetTimeout = defaultSetTimout;
var cachedClearTimeout = defaultClearTimeout;
if (typeof global$1.setTimeout === 'function') {
    cachedSetTimeout = setTimeout;
}
if (typeof global$1.clearTimeout === 'function') {
    cachedClearTimeout = clearTimeout;
}

function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}
function nextTick(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
}
// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
var title = 'browser';
var platform = 'browser';
var browser$1 = true;
var env = {};
var argv = [];
var version$1 = ''; // empty string to avoid regexp issues
var versions = {};
var release = {};
var config = {};

function noop() {}

var on = noop;
var addListener = noop;
var once = noop;
var off = noop;
var removeListener = noop;
var removeAllListeners = noop;
var emit = noop;

function binding(name) {
    throw new Error('process.binding is not supported');
}

function cwd () { return '/' }
function chdir (dir) {
    throw new Error('process.chdir is not supported');
}function umask() { return 0; }

// from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
var performance = global$1.performance || {};
var performanceNow =
  performance.now        ||
  performance.mozNow     ||
  performance.msNow      ||
  performance.oNow       ||
  performance.webkitNow  ||
  function(){ return (new Date()).getTime() };

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp){
  var clocktime = performanceNow.call(performance)*1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor((clocktime%1)*1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds<0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds,nanoseconds]
}

var startTime = new Date();
function uptime() {
  var currentTime = new Date();
  var dif = currentTime - startTime;
  return dif / 1000;
}

var browser$1$1 = {
  nextTick: nextTick,
  title: title,
  browser: browser$1,
  env: env,
  argv: argv,
  version: version$1,
  versions: versions,
  on: on,
  addListener: addListener,
  once: once,
  off: off,
  removeListener: removeListener,
  removeAllListeners: removeAllListeners,
  emit: emit,
  binding: binding,
  cwd: cwd,
  chdir: chdir,
  umask: umask,
  hrtime: hrtime,
  platform: platform,
  release: release,
  config: config,
  uptime: uptime
};

var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
var enhanceError = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code
    };
  };
  return error;
};

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
var createError = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
var settle = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

var cookies = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
var isAbsoluteURL = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
var combineURLs = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */
var buildFullPath = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
var parseHeaders = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

var isURLSameOrigin = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);

var xhr = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
        request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(createError(
        timeoutErrorMessage,
        config,
        config.transitional && config.transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (!requestData) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = xhr;
  } else if (typeof browser$1$1 !== 'undefined' && Object.prototype.toString.call(browser$1$1) === '[object process]') {
    // For node use HTTP adapter
    adapter = xhr;
  }
  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults = {

  transitional: {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false
  },

  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw enhanceError(e, this, 'E_JSON_PARSE');
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

var defaults_1 = defaults;

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
var transformData = function transformData(data, headers, fns) {
  var context = this || defaults_1;
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};

var isCancel = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
var dispatchRequest = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults_1.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
var mergeConfig = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  var valueFromConfig2Keys = ['url', 'method', 'data'];
  var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
  var defaultToConfig2Keys = [
    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
    'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
    'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
    'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
  ];
  var directMergeKeys = ['validateStatus'];

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  }

  utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(undefined, config2[prop]);
    }
  });

  utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

  utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  });

  utils.forEach(directMergeKeys, function merge(prop) {
    if (prop in config2) {
      config[prop] = getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  });

  var axiosKeys = valueFromConfig2Keys
    .concat(mergeDeepPropertiesKeys)
    .concat(defaultToConfig2Keys)
    .concat(directMergeKeys);

  var otherKeys = Object
    .keys(config1)
    .concat(Object.keys(config2))
    .filter(function filterAxiosKeys(key) {
      return axiosKeys.indexOf(key) === -1;
    });

  utils.forEach(otherKeys, mergeDeepProperties);

  return config;
};

var name = "axios";
var version = "0.21.4";
var description = "Promise based HTTP client for the browser and node.js";
var main = "index.js";
var scripts = {
	test: "grunt test",
	start: "node ./sandbox/server.js",
	build: "NODE_ENV=production grunt build",
	preversion: "npm test",
	version: "npm run build && grunt version && git add -A dist && git add CHANGELOG.md bower.json package.json",
	postversion: "git push && git push --tags",
	examples: "node ./examples/server.js",
	coveralls: "cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js",
	fix: "eslint --fix lib/**/*.js"
};
var repository = {
	type: "git",
	url: "https://github.com/axios/axios.git"
};
var keywords = [
	"xhr",
	"http",
	"ajax",
	"promise",
	"node"
];
var author = "Matt Zabriskie";
var license = "MIT";
var bugs = {
	url: "https://github.com/axios/axios/issues"
};
var homepage = "https://axios-http.com";
var devDependencies = {
	coveralls: "^3.0.0",
	"es6-promise": "^4.2.4",
	grunt: "^1.3.0",
	"grunt-banner": "^0.6.0",
	"grunt-cli": "^1.2.0",
	"grunt-contrib-clean": "^1.1.0",
	"grunt-contrib-watch": "^1.0.0",
	"grunt-eslint": "^23.0.0",
	"grunt-karma": "^4.0.0",
	"grunt-mocha-test": "^0.13.3",
	"grunt-ts": "^6.0.0-beta.19",
	"grunt-webpack": "^4.0.2",
	"istanbul-instrumenter-loader": "^1.0.0",
	"jasmine-core": "^2.4.1",
	karma: "^6.3.2",
	"karma-chrome-launcher": "^3.1.0",
	"karma-firefox-launcher": "^2.1.0",
	"karma-jasmine": "^1.1.1",
	"karma-jasmine-ajax": "^0.1.13",
	"karma-safari-launcher": "^1.0.0",
	"karma-sauce-launcher": "^4.3.6",
	"karma-sinon": "^1.0.5",
	"karma-sourcemap-loader": "^0.3.8",
	"karma-webpack": "^4.0.2",
	"load-grunt-tasks": "^3.5.2",
	minimist: "^1.2.0",
	mocha: "^8.2.1",
	sinon: "^4.5.0",
	"terser-webpack-plugin": "^4.2.3",
	typescript: "^4.0.5",
	"url-search-params": "^0.10.0",
	webpack: "^4.44.2",
	"webpack-dev-server": "^3.11.0"
};
var browser = {
	"./lib/adapters/http.js": "./lib/adapters/xhr.js"
};
var jsdelivr = "dist/axios.min.js";
var unpkg = "dist/axios.min.js";
var typings = "./index.d.ts";
var dependencies = {
	"follow-redirects": "^1.14.0"
};
var bundlesize = [
	{
		path: "./dist/axios.min.js",
		threshold: "5kB"
	}
];
var pkg = {
	name: name,
	version: version,
	description: description,
	main: main,
	scripts: scripts,
	repository: repository,
	keywords: keywords,
	author: author,
	license: license,
	bugs: bugs,
	homepage: homepage,
	devDependencies: devDependencies,
	browser: browser,
	jsdelivr: jsdelivr,
	unpkg: unpkg,
	typings: typings,
	dependencies: dependencies,
	bundlesize: bundlesize
};

var validators$1 = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators$1[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};
var currentVerArr = pkg.version.split('.');

/**
 * Compare package versions
 * @param {string} version
 * @param {string?} thanVersion
 * @returns {boolean}
 */
function isOlderVersion(version, thanVersion) {
  var pkgVersionArr = thanVersion ? thanVersion.split('.') : currentVerArr;
  var destVer = version.split('.');
  for (var i = 0; i < 3; i++) {
    if (pkgVersionArr[i] > destVer[i]) {
      return true;
    } else if (pkgVersionArr[i] < destVer[i]) {
      return false;
    }
  }
  return false;
}

/**
 * Transitional option validator
 * @param {function|boolean?} validator
 * @param {string?} version
 * @param {string} message
 * @returns {function}
 */
validators$1.transitional = function transitional(validator, version, message) {
  var isDeprecated = version && isOlderVersion(version);

  function formatMessage(opt, desc) {
    return '[Axios v' + pkg.version + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new Error(formatMessage(opt, ' has been removed in ' + version));
    }

    if (isDeprecated && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new TypeError('option ' + opt + ' must be ' + result);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw Error('Unknown option ' + opt);
    }
  }
}

var validator = {
  isOlderVersion: isOlderVersion,
  assertOptions: assertOptions,
  validators: validators$1
};

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager_1(),
    response: new InterceptorManager_1()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
      forcedJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
      clarifyTimeoutError: validators.transitional(validators.boolean, '1.0.0')
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

var Axios_1 = Axios;

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

var Cancel_1 = Cancel;

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel_1(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

var CancelToken_1 = CancelToken;

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
var spread = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
var isAxiosError = function isAxiosError(payload) {
  return (typeof payload === 'object') && (payload.isAxiosError === true);
};

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios_1(defaultConfig);
  var instance = bind(Axios_1.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios_1.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios$1 = createInstance(defaults_1);

// Expose Axios class to allow class inheritance
axios$1.Axios = Axios_1;

// Factory for creating new instances
axios$1.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios$1.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios$1.Cancel = Cancel_1;
axios$1.CancelToken = CancelToken_1;
axios$1.isCancel = isCancel;

// Expose all/spread
axios$1.all = function all(promises) {
  return Promise.all(promises);
};
axios$1.spread = spread;

// Expose isAxiosError
axios$1.isAxiosError = isAxiosError;

var axios_1 = axios$1;

// Allow use of default import syntax in TypeScript
var _default = axios$1;
axios_1.default = _default;

var axios = axios_1;

/**
 * Ping
 * @param {string} host - The host of the peer.
 * @returns {Promise<Peer>} - A promise that resolves when the item is added.
 */
async function pingPeer(ip, port) {
  // Construct the POST request body
  const requestBody = {};

  try {
    // Make the POST request to ping the peer
    const response = await axios.post(
      `http://[${ip}]:${port}/ping`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Return the peer
    const data = response.data;

    // Create a Peer instance from the contact data
    const contactData = data.contact;
    const contactPeer = new Peer(
      contactData.name,
      contactData.ips,
      contactData.port,
      ip
    );
    return contactPeer;
  } catch (error) {
    // Handle and log errors
    console.error("Error pinging the host:", error);
    throw error;
  }
}

/**
 * Adds an item to a collection.
 *
 * @param {Peer} peer - The peer to contact
 * @param {string} collection - The ID of the collection.
 * @param {string} root - The targeted root set.
 * @param {string} location - The location of the item.
 * @param {string} id - The ID of the item.
 * @returns {Promise<Object>} - The response from the server.
 */
async function addItem(peer, collection, root, location, reference) {
  // Construct the POST request body
  const requestBody = {
    item: {
      collection: collection,
      location: location,
      id: reference,
    },
    root: root,
    current: location,
  };

  try {
    // Make the POST request to add the item to the collection
    await axios.post(`http://[${peer.ip()}]:${peer.port()}/item`, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle and log errors
    console.error("Error adding item to the collection:", error);
    throw error;
  }
}

/**
 * Retrieves a set from a collection at a specified location.
 *
 * @param {Peer} peer - The peer to contact.
 * @param {string} collection - The ID of the collection.
 * @param {string} location - The location within the collection.
 * @returns {Promise<Object>} - The response from the server, including the set data.
 */
async function getSet(peer, collection, location) {
  // Construct the GET request URL
  const url = `http://[${peer.ip()}]:${peer.port()}/set?collection=${encodeURIComponent(
    collection
  )}&location=${encodeURIComponent(location)}`;

  try {
    // Make the GET request to retrieve the set from the collection
    const response = await axios.get(url, {
      headers: {},
    });

    // Parse the JSON response
    const data = response.data;

    /**
     * Parses the set data and constructs Element instances.
     * @param {Object.<string, number>} setData - The set data from the response.
     * @param {string} collection - The name of the collection.
     * @returns {Element[]} - An array of Element instances (Item or Set).
     */
    const parseSet = (setData, collection) => {
      const elements = [];

      for (const [key, value] of Object.entries(setData)) {
        if (value === 1) {
          // It's an Item
          // Assuming the key is in the format 'hash:reference'
          const [hash, reference] = key.split(":");
          if (hash && reference) {
            elements.push(new Item$1(collection, hash, reference));
          } else {
            console.warn(`Invalid item key format: ${key}`);
          }
        } else if (typeof value === "number") {
          // It's a Set
          // Assuming the key is the hash, and value is the count
          const hash = key;
          const count = value;
          elements.push(new Set(collection, hash, count));
        } else {
          console.warn(`Unknown set entry format: ${key}: ${value}`);
        }
      }

      return elements;
    };

    // Create a Peer instance from the contact data
    const contactData = data.contact;
    const contactPeer = new Peer(
      contactData.name,
      contactData.ips,
      contactData.port,
      contactData.ip
    );

    // Parse the set data into Element instances
    const elements = parseSet(data.set, collection);

    // Return the structured object
    return {
      contact: contactPeer,
      set: elements,
    };
  } catch (error) {
    // Handle and log errors
    console.error(`Error retrieving set from peer ${peer.hash()}:`, error);
    throw error;
  }
}

/**
 * Represents the API for interacting with peers to add items and retrieve sets.
 */
class API extends API$1 {
  constructor() {
    super();
  }
}

API.prototype.pingPeer = pingPeer;
API.prototype.addItem = addItem;
API.prototype.getSet = getSet;

exports.API = API;
exports.Collection = Collection;
exports.Item = Item$1;
exports.Linear = Linear;
exports.Locality = Locality;
exports.Network = Network;
exports.Peer = Peer;
exports.Space = Space;
exports.Spherical = Spherical;
exports.charsToNumbers = charsToNumbers;
