class Dimension {
  /**
   * Returns the name of the dimension.
   * @returns {string}
   */
  name() {
    return "";
  }

  /**
   * Returns the ratio used in calculations.
   * @returns {number}
   */
  ratio() {
    return 1.0;
  }

  // PointDimension methods

  /**
   * Creates a new point in this dimension with the given coordinates.
   * @param {number[]} coordinates
   * @returns {Point}
   */
  newPoint(coordinates) {
    return null;
  }

  /**
   * Returns the length of the point representation in this dimension.
   * @returns {number}
   */
  pointLength() {
    return 0;
  }

  /**
   * Calculates the distance between two points in this dimension.
   * @param {Point} point1
   * @param {Point} point2
   * @returns {number}
   */
  pointDistance(point1, point2) {
    return 0;
  }

  /**
   * Calculates the direction from one point to another in this dimension.
   * @param {Point} point1
   * @param {Point} point2
   * @returns {number}
   */
  pointDirection(point1, point2) {
    return 0;
  }

  // SegmentDimension methods

  /**
   * Creates a new segment in this dimension with the given coordinates.
   * @param {number[]} coordinates
   * @returns {Segment}
   */
  newSegment(coordinates) {
    return null;
  }

  /**
   * Returns the root segment of this dimension.
   * @returns {Segment}
   */
  rootSegment() {
    return null;
  }

  /**
   * Returns the length of the segment representation in this dimension.
   * @returns {number}
   */
  segmentLength() {
    return 0;
  }

  /**
   * Calculates the distance from a point to a segment in this dimension.
   * @param {Point} point
   * @param {Segment} segment
   * @returns {number}
   */
  segmentDistance(point, segment) {
    return 0;
  }

  /**
   * Calculates the direction from a point to a segment in this dimension.
   * @param {Point} point
   * @param {Segment} segment
   * @returns {Direction}
   */
  segmentDirection(point, segment) {
    return null;
  }

  // FilterDimension methods

  /**
   * Creates a new filter for this dimension.
   * @param {number[]} distance
   * @param {number[]} direction
   * @returns {Filter}
   */
  newFilter(distance, direction) {
    return null;
  }

  /**
   * Determines if a given distance passes the filter criteria.
   * @param {Filter} filter
   * @param {number} distance
   * @returns {boolean}
   */
  filterDistance(filter, distance) {
    return true;
  }

  /**
   * Determines if a given direction passes the filter criteria.
   * @param {Filter} filter
   * @param {Direction} direction
   * @returns {boolean}
   */
  filterDirection(filter, direction) {
    return true;
  }
}

export { Dimension };
