import { Element } from "./Element.js";

// Monitoring states
const State = {
  Added: "added",
  Filtered: "filtered",
  Indexed: "indexed",
  Selected: "selected",
  Loaded: "loaded",
  Streamed: "streamed",
};

class Monitoring {
  /**
   * Constructs a new Monitoring instance.
   * @param {number} level
   * @param {string} state
   * @param {Element} element
   */
  constructor(level, state, element) {
    this._level = level;
    this._state = state;
    this._element = element;
  }

  /**
   * Returns the level of monitoring.
   * @returns {number}
   */
  level() {
    return this._level;
  }

  /**
   * Returns the current state.
   * @returns {string}
   */
  state() {
    return this._state;
  }

  /**
   * Returns the associated element.
   * @returns {Element}
   */
  element() {
    return this._element;
  }
}

export { Monitoring, State };
