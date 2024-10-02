import { Item as BaseItem } from "../model/index.js";

class Item extends BaseItem {
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

export { Item };
