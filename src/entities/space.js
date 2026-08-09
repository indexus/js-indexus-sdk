import { ROOT, BASEURL64 } from "../utilities/encoding.js";

class Space {
  constructor(dimensions, mask, offset) {
    const size = dimensions.reduce((total, dimension) => {
      return total + dimension.pointLength();
    }, 0);

    this.dimensions = dimensions;
    this.mask = mask;
    this.offset = offset;
    this.size = size;
    this.step = 6 / size; // BASE64 = 2^6
  }

  signature() {
    return this._signature();
  }

  dimension(i) {
    return this.dimensions[i];
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

  xyz(hash) {
    return this._xyz(hash);
  }

  bounds(zoom, xyz) {
    return this._coordinatesToSegments(this._bounds(zoom, xyz));
  }

  center(segments) {
    return this.dimensions.map((dimension, i) =>
      dimension.segmentCenter(segments[i])
    );
  }

  extend(segments, offset) {
    return this.dimensions.map((dimension, i) =>
      dimension.segmentExtension(segments[i], offset)
    );
  }

  points(bounds) {
    return this._boundsToPoints(bounds);
  }

  root() {
    return this._coordinatesToSegments(this._root());
  }

  overlap(bounds, segments) {
    let overlap = true;
    let contained = true;

    for (let idx = 0; idx < this.dimensions.length; idx++) {
      const result = this.dimensions[idx].segmentsOverlap(
        bounds[idx],
        segments[idx]
      );

      if (!result.overlap) {
        overlap = false;
        contained = false;
        break;
      }

      if (!result.contained) {
        contained = false;
      }
    }

    return {
      overlap,
      contained,
    };
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

  _xyz(hash) {
    let coordinates = [];
    let resolution = 0;

    for (let i = 0; i < this._root().length / 2; i++) {
      coordinates[i] = 0;
    }

    if (hash === ROOT) {
      return { coordinates, resolution };
    }

    for (let l = 0; l < hash.length; l++) {
      const idx = (64 + BASEURL64.indexOf(hash[l]) - this.offset.at(l)) % 64;
      for (let n = 0; n <= 5; n++) {
        const maskIndex = this.mask.at(l, n);
        coordinates[maskIndex] *= 2;
        resolution++;
        if (((idx >> (5 - n)) & 1) === 1) {
          coordinates[maskIndex] += 1;
        }
      }
    }

    resolution /= coordinates.length;

    return { resolution, coordinates };
  }

  _bounds(xyz) {
    const bounds = [];
    const size = Math.pow(2, xyz.resolution);

    let idx = 0;
    for (let i = 0; i < this.dimensions.length; i++) {
      for (let j = 0; j < this.dimensions[i].segmentLength() / 2; j++) {
        const min = this._root()[idx * 2];
        const max = this._root()[idx * 2 + 1];

        const step = (max - min) / size;

        bounds[idx * 2] = xyz.coordinates[idx] * step + min;
        bounds[idx * 2 + 1] = (xyz.coordinates[idx] + 1) * step + min;

        idx++;
      }
    }

    return bounds;
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
      const points = bounds[i].points();

      points.forEach((point) => {
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
