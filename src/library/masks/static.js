import { Mask } from "../../model/index.js";

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
}

export { Static };
