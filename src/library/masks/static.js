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

export { Static };
