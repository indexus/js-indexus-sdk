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
  constructor(south, north, west, east) {
    super();

    this.south = south;
    this.north = north;
    this.west = west;
    this.east = east;
  }

  value() {
    return [this.south, this.north, this.west, this.east];
  }

  points() {
    return [
      new Point(this.south, this.west),
      new Point(this.south, this.east),
      new Point(this.north, this.west),
      new Point(this.north, this.east),
    ];
  }

  print() {
    return `(south: ${this.south}, west: ${this.west}, north: ${this.north}, east: ${this.east})`;
  }
}

// Direction class (implements Direction)
class Direction extends BaseDirection {
  constructor(south, north, west, east) {
    super();

    this.south = south;
    this.north = north;
    this.west = west;
    this.east = east;
  }

  value() {
    return [this.south, this.north, this.west, this.east];
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
  constructor(name, args) {
    super();

    this._name = name;
    this._ratio = this.pointDistance(
      new Point(args[0], args[2]),
      new Point(args[1], args[3])
    );
    this._rootSegment = new Segment(args[0], args[1], args[2], args[3]);
  }

  name() {
    return this._name;
  }

  type() {
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
      coordinates[1],
      coordinates[2],
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

  segmentCenter(segment) {
    return new Point(
      (segment.south + segment.north) / 2,
      (segment.west + segment.east) / 2
    );
  }

  segmentExtension(segment, offset) {
    const latStep = offset * (segment.north - segment.south);
    const lngStep = offset * (segment.east - segment.west);

    if (lngStep * (2 + 1 / offset) > 360) {
      return new Segment(
        this._normalizeLat(segment.south - latStep),
        this._normalizeLat(segment.north + latStep),
        this._normalizeLng(-180),
        this._normalizeLng(180)
      );
    }
    return new Segment(
      this._normalizeLat(segment.south - latStep),
      this._normalizeLat(segment.north + latStep),
      this._normalizeLng(segment.west - lngStep),
      this._normalizeLng(segment.east + lngStep)
    );
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

  segmentsOverlap(segment1, segment2) {
    const aWest = this._normalizeLng(segment1.west);
    const aEast = this._normalizeLng(segment1.east);
    const bWest = this._normalizeLng(segment2.west);
    const bEast = this._normalizeLng(segment2.east);

    const wraps = (west, east) => west > east;

    const lngOverlap = (west1, east1, west2, east2) => {
      const wraps1 = wraps(west1, east1);
      const wraps2 = wraps(west2, east2);

      if (!wraps1 && !wraps2) {
        return west1 <= east2 && east1 >= west2;
      }

      if (wraps1) {
        return (
          lngOverlap(west1, 180, west2, east2) ||
          lngOverlap(-180, east1, west2, east2)
        );
      }

      if (wraps2) {
        return (
          lngOverlap(west1, east1, west2, 180) ||
          lngOverlap(west1, east1, -180, east2)
        );
      }

      return false;
    };

    const latOverlap = !(
      segment1.north < segment2.south || segment2.north < segment1.south
    );

    const doesOverlap = latOverlap && lngOverlap(aWest, aEast, bWest, bEast);

    if (!doesOverlap) {
      return { overlap: false, contained: false };
    }

    const latContained =
      segment1.south <= segment2.south && segment1.north >= segment2.north;

    const lngContained = (() => {
      if (!wraps(aWest, aEast) && !wraps(bWest, bEast)) {
        return aWest <= bWest && aEast >= bEast;
      }

      if (wraps(aWest, aEast)) {
        return (
          (aWest <= bWest && aEast >= bEast) ||
          (aWest <= bWest + 360 && aEast >= bEast + 360)
        );
      }

      return false;
    })();

    const isContained = latContained && lngContained;

    return {
      overlap: true,
      contained: isContained,
    };
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

  _normalizeLat(lat) {
    if (lat > 90) {
      return 90;
    }
    if (lat < -90) {
      return -90;
    }
    return lat;
  }

  _normalizeLng(lng) {
    while (lng < -180) lng += 360;
    while (lng > 180) lng -= 360;
    return lng;
  }
}

export { Spherical };
