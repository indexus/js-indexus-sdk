export function create(xyz, bounds, count, metrics, items, children) {
  return {
    xyz,
    bounds,
    count,
    metrics,
    items,
    children,
  };
}

export function equal(element1, element2) {
  return JSON.stringify(element1) === JSON.stringify(element2);
}

export function add(element) {
  this.data[this.key(element.xyz)] = element;
}

export function get(xyz) {
  return this.data[this.key(xyz)];
}

export function key(xyz) {
  const values = [xyz.resolution, ...xyz.coordinates];
  return values.join("-");
}

export function parent(xyz) {
  if (!xyz.resolution) {
    return null;
  }
  return {
    resolution: xyz.resolution - 1,
    coordinates: xyz.coordinates.map((v) => Math.floor(v / 2)),
  };
}

export function set(elements) {
  const parents = {};

  if (elements.length === 1) {
    const element = elements[0];
    const existing = this.get(element.xyz);

    if (existing) {
      this.add(element);
      return;
    }
    // TODO FIX Parent
  }

  elements.forEach((element) => {
    this.add(element);
    this.merge(parents, element);
  });

  const sets = Object.values(parents);
  if (sets.length) {
    this.set(sets);
  }
}

export function merge(parents, element) {
  const xyz = this.parent(element.xyz);

  if (!xyz) return;

  const key = this.key(xyz);
  const parent = parents[key];

  if (!parent) {
    parents[key] = this.create(
      xyz,
      this.space.bounds(xyz),
      element.count,
      element.metrics,
      undefined,
      [element.xyz]
    );
    return;
  }

  parent.count += element.count;
  parent.metrics = parent.metrics.map(
    (metric, index) => metric + element.metrics[index]
  );
  parent.children.push(element.xyz);
}

export function retrieve(resolution, bounds, xyz) {
  const element = this.get(xyz);

  if (!this.space.overlap(bounds, element.bounds)) {
    return [];
  }

  if (!element.children.length || element.xyz.resolution === resolution) {
    return [element];
  }

  return element.children.reduce((accumulator, child) => {
    return accumulator.concat(this.retrieve(resolution, bounds, child));
  }, []);
}
