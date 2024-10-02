class Option {
  constructor(origin, filters) {
    this.origin = origin;
    this.filters = filters;
  }
}

export function newOption(key, coordinates, distances, directions) {
  const dimension = this.dimensions()[key];
  return new Option(
    dimension.newPoint(coordinates),
    dimension.newFilter(distances, directions)
  );
}

export function checkOptions() {
  const missing = [];
  for (const dimension in this.dimensions()) {
    if (!this.options.hasOwnProperty(dimension)) {
      missing.push(dimension);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing option for dimensions: ${missing.join(", ")}`);
  }
}

export { Option };
