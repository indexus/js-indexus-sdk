import {
  Point as BasePoint,
  Segment as BaseSegment,
  Direction as BaseDirection,
  Filter as BaseFilter,
  Dimension as BaseDimension,
} from "../../model/index.js";

// Point class (implements Point)
class Point extends BasePoint {
  constructor(latitude, longitude) {
    super();

    this.latitude = latitude;
    this.longitude = longitude;
  }

  value() {
    return [this.latitude, this.longitude];
  }

  print() {
    return `(latitude: ${this.latitude}, longitude: ${this.longitude})`;
  }
}

// Segment class (implements Segment)
class Segment extends BaseSegment {
  constructor(south, west, north, east) {
    super();

    this.south = south;
    this.west = west;
    this.north = north;
    this.east = east;
  }

  value() {
    return [this.south, this.north, this.west, this.east];
  }

  print() {
    return `(south: ${this.south}, west: ${this.west}, north: ${this.north}, east: ${this.east})`;
  }
}

// Direction class (implements Direction)
class Direction extends BaseDirection {
  constructor(south, west, north, east) {
    super();

    this.south = south;
    this.west = west;
    this.north = north;
    this.east = east;
  }

  value() {
    return [this.south, this.west, this.north, this.east];
  }
}

// Filter class (implements Filter)
class Filter extends BaseFilter {
  constructor(minDistance, maxDistance, minAngle, maxAngle) {
    super();

    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.minAngle = minAngle;
    this.maxAngle = maxAngle;
  }
}

// Spherical class (implements Dimension)
class Spherical extends BaseDimension {
  constructor(args) {
    super();

    this._ratio = this.pointDistance(
      new Point(0, args[0]),
      new Point(0, args[2])
    );
    this._rootSegment = new Segment(args[0], args[1], args[2], args[3]);
  }

  name() {
    return "spherical";
  }

  ratio() {
    return this._ratio;
  }

  newPoint(coordinates) {
    return new Point(coordinates[0], coordinates[1]);
  }

  pointLength() {
    return 2;
  }

  pointDistance(origin, distant) {
    const lat1 = (Math.PI * origin.latitude) / 180;
    const lat2 = (Math.PI * distant.latitude) / 180;
    const theta = (Math.PI * (distant.longitude - origin.longitude)) / 180;
    let dist =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(theta);
    dist = Math.min(dist, 1);
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist *= 60 * 1.1515 * 1.609344; // Convert to kilometers
    return dist;
  }

  pointDirection(origin, distant) {
    const lat1 = (origin.latitude * Math.PI) / 180;
    const lat2 = (distant.latitude * Math.PI) / 180;
    const deltaLong = ((distant.longitude - origin.longitude) * Math.PI) / 180;
    const y = Math.sin(deltaLong) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLong);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360 degrees
  }

  newSegment(coordinates) {
    return new Segment(
      coordinates[0],
      coordinates[2],
      coordinates[1],
      coordinates[3]
    );
  }

  rootSegment() {
    return this._rootSegment;
  }

  segmentLength() {
    return 4;
  }

  segmentDistance(point, segment) {
    const loc = this.segmentLocation(point, segment);
    if (loc === -1) {
      return this.pointDistance(
        point,
        new Point(-point.latitude, ((point.longitude + 360) % 360) - 180)
      );
    } else if (loc === 0) {
      return Math.min(
        this.pointDistance(point, new Point(segment.south, segment.west)),
        this.pointDistance(point, new Point(segment.north, segment.west)),
        this.pointDistance(point, new Point(segment.north, segment.east)),
        this.pointDistance(point, new Point(segment.south, segment.east))
      );
    } else if (loc === 1) {
      return Math.min(
        this.pointDistance(point, new Point(point.latitude, segment.west)),
        this.pointDistance(point, new Point(point.latitude, segment.east))
      );
    } else if (loc === 2) {
      return Math.min(
        this.pointDistance(point, new Point(segment.south, point.longitude)),
        this.pointDistance(point, new Point(segment.north, point.longitude))
      );
    } else {
      return 0;
    }
  }

  segmentDirection(point, segment) {
    const loc = this.segmentLocation(point, segment);
    if (loc !== 3) {
      return new Direction(
        this.pointDirection(point, new Point(segment.south, segment.west)),
        this.pointDirection(point, new Point(segment.north, segment.west)),
        this.pointDirection(point, new Point(segment.north, segment.east)),
        this.pointDirection(point, new Point(segment.south, segment.east))
      );
    }
    return new Direction(0, 0, 0, 0);
  }

  segmentLocation(point, segment) {
    if (
      segment.south === this._rootSegment.south &&
      segment.west === this._rootSegment.west &&
      segment.north === this._rootSegment.north &&
      segment.east === this._rootSegment.east
    ) {
      return -1;
    }
    let location = 0;
    if (point.latitude > segment.south && point.latitude < segment.north) {
      location += 1;
    }
    if (point.longitude > segment.west && point.longitude < segment.east) {
      location += 2;
    }
    return location;
  }

  newFilter(distance, direction) {
    return new Filter(distance[0], distance[1], direction[0], direction[1]);
  }

  filterDistance(filter, distance) {
    return (
      (filter.minDistance === 0 || distance >= filter.minDistance) &&
      (filter.maxDistance === 0 || distance <= filter.maxDistance)
    );
  }

  filterDirection(filter, direction) {
    const dirValues = direction.value();
    const dirSum = dirValues.reduce((acc, val) => acc + val, 0);

    if (filter.minAngle !== filter.maxAngle && dirSum !== 0) {
      const normal = filter.minAngle < filter.maxAngle;

      const checks = dirValues.map((dir) => [
        dir >= filter.minAngle,
        dir <= filter.maxAngle,
      ]);

      for (const [d1, d2] of checks) {
        if (normal ? d1 && d2 : d1 || d2) {
          return true;
        }
      }

      const minDir = Math.min(...dirValues);
      const maxDir = Math.max(...dirValues);

      return (
        (maxDir - minDir > 180 && filter.minAngle >= maxDir) ||
        (normal && minDir <= filter.minAngle && maxDir >= filter.maxAngle)
      );
    }
    return true;
  }
}

export { Spherical };
