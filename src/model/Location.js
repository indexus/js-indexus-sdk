import { Segment } from "./Segment.js";
import { Direction } from "./Filter.js";

class Location {
  /**
   * Sets the location data using the provided segments, distances, directions, and overall distance.
   * @param {Segment[]} segments
   * @param {number[]} distances
   * @param {Direction[]} directions
   * @param {number} overall
   */
  locate(segments, distances, directions, overall) {
    this._segments = segments;
    this._distances = distances;
    this._directions = directions;
    this._distance = overall;
  }

  /**
   * Returns the segments associated with this location.
   * @returns {Segment[]}
   */
  segments() {
    return this._segments || [];
  }

  /**
   * Returns the distances associated with this location.
   * @returns {number[]}
   */
  distances() {
    return this._distances || [];
  }

  /**
   * Returns the directions associated with this location.
   * @returns {Direction[]}
   */
  directions() {
    return this._directions || [];
  }

  /**
   * Returns the overall distance associated with this location.
   * @returns {number}
   */
  distance() {
    return this._distance || 0;
  }
}

export { Location };
