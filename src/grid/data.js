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

export function children(xyz) {
  const resolution = xyz.resolution + 1;
  const coordinates = xyz.coordinates;
  const children = [];

  const fill = (idx, current) => {
    if (idx === coordinates.length) {
      children.push({
        resolution,
        coordinates: current,
      });
      return;
    }

    fill(idx + 1, current.concat(coordinates[idx] * 2));
    fill(idx + 1, current.concat(coordinates[idx] * 2 + 1));
  };

  fill(0, []);

  return children;
}

export function set(elements) {
  const parents = {};
  let keep = elements.length;

  elements.forEach((element) => {
    const existing = this.get(element.xyz);

    if (existing) {
      keep--;
    }

    if (!existing || existing.children.length === 0) {
      this.add(element);
    }

    this.merge(parents, element);
  });

  if (keep) {
    this.set(Object.values(parents));
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

export function generate(resolution, bounds, parent, xyz) {
  let element = this.get(xyz);

  if (!element) {
    element = { ...parent };
    element.xyz = xyz;
    element.bounds = this.space.bounds(xyz);
    element.fake = true;
  }

  if (!this.space.overlap(bounds, element.bounds)) {
    return [];
  }

  if (
    element.fake ||
    !element.children.length ||
    element.xyz.resolution === resolution
  ) {
    return [element];
  }

  return this.children(element.xyz).reduce((accumulator, child) => {
    return accumulator.concat(
      this.generate(resolution, bounds, element, child)
    );
  }, []);
}
