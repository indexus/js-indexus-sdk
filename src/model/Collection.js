import { Mask } from "./Mask.js";
import { Offset } from "./Offset.js";

class Collection {
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

export { Collection };
