import { Offset } from "../../model/index.js";

class Basic extends Offset {
  /**
   * Constructs a new Offset instance.
   * @param {number[]} details - An array of integers.
   */
  constructor(args) {
    super();

    if (!Array.isArray(args[0])) {
      throw new Error("Details must be an array of integers.");
    }
    this.details = args[0];
  }

  /**
   * Retrieves the offset value at the specified index.
   * @param {number} l - The index to retrieve.
   * @returns {number}
   */
  at(l) {
    return this.details[l];
  }
}

export { Basic };
