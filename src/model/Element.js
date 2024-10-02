import { Location } from "./Location.js";

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

export { Element };
