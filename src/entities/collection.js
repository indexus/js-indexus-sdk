import { Collection as BaseCollection } from "../model/index.js";

import { Spherical } from "../library/dimensions/spherical.js";
import { Linear } from "../library/dimensions/linear.js";
import { Capped } from "../library/masks/capped.js";
import { Static } from "../library/masks/static.js";
import { Basic } from "../library/offsets/basic.js";

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

class Collection extends BaseCollection {
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

export { Collection };
