import { Set as BaseSet } from "../model/index.js";

class Set extends BaseSet {
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

export { Set };
