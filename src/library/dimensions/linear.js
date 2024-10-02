import {
  Point as BasePoint,
  Segment as BaseSegment,
  Direction as BaseDirection,
  Filter as BaseFilter,
  Dimension as BaseDimension,
} from "../../model/index.js";

// Point class (implements Point)
class Point extends BasePoint {
  constructor(value) {
    super();

    this._value = value;
  }

  value() {
    return [this._value];
  }

  print() {
    return `(value: ${this._value})`;
  }
}

// Segment class (implements Segment)
class Segment extends BaseSegment {
  constructor(start, end) {
    super();

    this.start = start;
    this.end = end;
  }

  value() {
    return [this.start, this.end];
  }

  print() {
    const startDate = new Date(this.start * 1000);
    const endDate = new Date(this.end * 1000);
    return `(start: ${startDate.toISOString()}, end: ${endDate.toISOString()})`;
  }
}

// Direction class (implements Direction)
class Direction extends BaseDirection {
  constructor(value) {
    super();

    this._value = value;
  }

  value() {
    return [this._value];
  }
}

// Filter class (implements Filter)
class Filter extends BaseFilter {
  constructor(minDistance, maxDistance, direction) {
    super();

    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.direction = direction;
  }
}

// Linear class (implements Dimension)
class Linear extends BaseDimension {
  constructor(args) {
    super();

    this._rootSegment = new Segment(args[0], args[1]);
    this._ratio = (this._rootSegment.end - this._rootSegment.start) / 2;
  }

  name() {
    return "linear";
  }

  ratio() {
    return this._ratio;
  }

  newPoint(coordinates) {
    return new Point(coordinates[0]);
  }

  pointLength() {
    return 1;
  }

  pointDistance(origin, distant) {
    return Math.abs(distant._value - origin._value);
  }

  pointDirection(origin, distant) {
    if (origin._value < distant._value) {
      return 1;
    } else if (origin._value > distant._value) {
      return -1;
    }
    return 0;
  }

  newSegment(coordinates) {
    return new Segment(coordinates[0], coordinates[1]);
  }

  rootSegment() {
    return this._rootSegment;
  }

  segmentLength() {
    return 2;
  }

  segmentDistance(point, segment) {
    if (
      segment.start === this._rootSegment.start &&
      segment.end === this._rootSegment.end
    ) {
      return segment.end - segment.start;
    } else if (point._value < segment.start) {
      return segment.start - point._value;
    } else if (point._value > segment.end) {
      return point._value - segment.end;
    }
    return 0;
  }

  segmentDirection(point, segment) {
    const direction = new Direction(0);
    if (point._value < segment.start) {
      direction._value = 1;
    } else if (point._value > segment.end) {
      direction._value = -1;
    }
    return direction;
  }

  newFilter(distance, direction) {
    return new Filter(distance[0], distance[1], direction[0]);
  }

  filterDistance(filter, distance) {
    return (
      (filter.minDistance === 0 || distance >= filter.minDistance) &&
      (filter.maxDistance === 0 || distance <= filter.maxDistance)
    );
  }

  filterDirection(filter, direction) {
    // TODO
    return true;
  }
}

export { Linear };
