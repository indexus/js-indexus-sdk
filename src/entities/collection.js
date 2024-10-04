import { Collection as BaseCollection } from "../model/index.js";

import { Spherical } from "../library/dimensions/spherical.js";
import { Linear } from "../library/dimensions/linear.js";
import { Capped } from "../library/masks/capped.js";
import { Static } from "../library/masks/static.js";
import { Basic as Offset } from "../library/offsets/basic.js";
import { Basic as Mask } from "../library/masks/basic.js";
import { charsToNumbers } from "../utilities/encoding.js";

const DIMENSIONS = {
  spherical: Spherical,
  linear: Linear,
};

function mapDimension(type, args) {
  return new DIMENSIONS[type](args);
}

const MASKS = {
  basic: Mask,
  capped: Capped,
  static: Static,
};

function mapMask(type, args) {
  return new MASKS[type](args);
}

const OFFSETS = {
  basic: Offset,
};

function mapOffset(type, args) {
  return new OFFSETS[type](args);
}

class Collection extends BaseCollection {
  constructor(name, dimensions) {
    super();

    this._name = name;
    this._dimensions = [];

    const m = dimensions.reduce((total, dimension) => {
      const d = mapDimension(dimension.type, dimension.args);
      this._dimensions.push(d);
      return total + d.pointLength();
    }, 0);

    const mask = Array.from({ length: m + 1 }, (_, i) => i);

    this._mask = mapMask("basic", mask);
    this._offset = mapOffset("basic", [charsToNumbers(name)]);
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

export { Collection };
