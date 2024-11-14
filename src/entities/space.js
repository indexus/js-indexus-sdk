import { ROOT, BASEURL64, decodeUrl64 } from "../utilities/encoding.js";

class Space {
  constructor(dimensions, mask, offset) {
    this.dimensions = dimensions;
    this.mask = mask;
    this.offset = offset;
  }

  signature() {
    return this._signature();
  }

  dimension(i) {
    return this.dimensions[i];
  }

  size() {
    return this.dimensions.length;
  }

  newPoint(coordinates) {
    return this._coordinatesToPoints(coordinates);
  }

  newSegment(coordinates) {
    const segments = [];
    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      segments[i] = dimension.newSegment(coordinates[i]);
    }
    return segments;
  }

  newFilter(distance, direction) {
    return this._coordinatesToFilters(distance, direction);
  }

  encode(points, precision) {
    return this._encode(this._pointsToCoordinates(points), precision);
  }

  decode(hash) {
    return this._coordinatesToSegments(this._decode(hash));
  }

  points(bounds) {
    return this._boundsToPoints(bounds);
  }

  overlap(bounds, segments) {
    return this.dimensions.every((dimension, idx) =>
      dimension.segmentsOverlap(bounds[idx], segments[idx])
    );
  }

  // Private methods
  _signature() {
    const length = this.dimensions.length;
    const trace = [];

    for (let i = 0; i < length; i++) {
      const dimension = this.dimensions[i];
      trace[i] = dimension.name();
      if (i === length - 1) {
        trace[i + 1] = this.mask.signature();
      }
    }
    return trace.join("|");
  }

  _root() {
    const root = [];
    for (const dimension of this.dimensions) {
      root.push(...dimension.rootSegment().value());
    }
    return root;
  }

  _encode(coordinates, precision) {
    if (precision === 0) {
      return ROOT;
    }

    let src = this._root();
    let hash = "";

    for (let l = 0; l < precision; l++) {
      let idx = 0;
      for (let n = 0; n <= 5; n++) {
        const maskIndex = this.mask.at(l, n);
        const mid = (src[maskIndex * 2] + src[maskIndex * 2 + 1]) / 2;
        if (coordinates[maskIndex] > mid) {
          idx = idx * 2 + 1;
          src[maskIndex * 2] = mid;
        } else {
          idx = idx * 2;
          src[maskIndex * 2 + 1] = mid;
        }
      }
      const baseIndex = (this.offset.at(l) + idx) % 64;
      hash += BASEURL64.charAt(baseIndex);
    }

    return hash;
  }

  _decode(hash) {
    let src = this._root();

    if (hash === ROOT) {
      return src;
    }

    for (let l = 0; l < hash.length; l++) {
      const idx = (64 + BASEURL64.indexOf(hash[l]) - this.offset.at(l)) % 64;
      for (let n = 0; n <= 5; n++) {
        const maskIndex = this.mask.at(l, n);
        const mid = (src[maskIndex * 2] + src[maskIndex * 2 + 1]) / 2;
        if (((idx >> (5 - n)) & 1) === 1) {
          src[maskIndex * 2] = mid;
        } else {
          src[maskIndex * 2 + 1] = mid;
        }
      }
    }

    return src;
  }

  _coordinatesToPoints(coordinates) {
    const origin = [];
    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      origin.push(dimension.newPoint(coordinates[i]));
    }
    return origin;
  }

  _coordinatesToFilters(distance, direction) {
    const filters = [];
    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      filters.push(dimension.newFilter(distance[i], direction[i]));
    }
    return filters;
  }

  _pointsToCoordinates(points) {
    const coordinates = [];
    for (const point of points) {
      coordinates.push(...point.value());
    }
    return coordinates;
  }

  _coordinatesToSegments(coordinates) {
    let min = 0,
      max = 0;
    const indexes = [];

    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      min = max;
      max += dimension.segmentLength();
      indexes[i] = dimension.newSegment(coordinates.slice(min, max));
    }

    return indexes;
  }

  _boundsToPoints(bounds) {
    let coordinates = [];

    this.dimensions.forEach((dimension, i) => {
      const tmp = [];

      dimension
        .newSegment(bounds[i])
        .points()
        .forEach((point) => {
          if (i === 0) {
            tmp.push(point.value());
            return;
          }

          coordinates.forEach((coordinate) => {
            tmp.push([coordinate, point.value()]);
          });
        });

      coordinates = tmp;
    });

    return coordinates.map((coordinate) =>
      this._coordinatesToPoints(coordinate)
    );
  }
}

export { Space };
