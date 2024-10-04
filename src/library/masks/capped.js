import { Mask } from "../../model/index.js";

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
}

export { Capped };
