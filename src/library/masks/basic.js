import { Mask } from "../../model/index.js";

class Basic extends Mask {
  /**
   * Constructs a new BasicMask instance.
   * @param {number[]} value - An array of integers.
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
    const idx = (i * 6 + j) % this.value.length;
    return this.value[idx];
  }
}

export { Basic };
