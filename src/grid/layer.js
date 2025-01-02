import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";
import { ROOT } from "../utilities/encoding.js";
import { asyncPool } from "../utilities/network.js";
import { State, Monitoring } from "../model/index.js";

export function project(zoom, bounds) {
  const result = [];

  let currentZoom = zoom + this.options.resolution;
  let currentBounds = this.space.extend(bounds, this.options.offset.bounds);

  const integerZoom = Math.floor(currentZoom);
  const fractionalZoom = currentZoom - integerZoom;

  if (fractionalZoom !== 0) {
    currentBounds = this.space.extend(currentBounds, -0.25 * fractionalZoom);
    currentZoom = integerZoom;
  }

  const zoomMax = Math.floor(
    zoom + this.options.resolution + this.options.offset.zoom
  );

  for (let z = 0; z <= zoomMax; z++) {
    let boundsAtZoom = currentBounds;

    // if (z < currentZoom) {
    //   const steps = currentZoom - z;
    //   for (let s = 0; s < steps; s++) {
    //     boundsAtZoom = this.space.extend(boundsAtZoom, 0.5);
    //   }
    // }

    if (z > currentZoom) {
      const steps = z - currentZoom;
      for (let s = 0; s < steps; s++) {
        boundsAtZoom = this.space.extend(boundsAtZoom, -0.25);
      }
    }

    if (z % this.space.step === 0) {
      result[z / this.space.step] = boundsAtZoom;
    }
  }

  return result;
}

export async function refresh(id, list, bounds, depth, current = 0) {
  const selected = [];

  await Promise.all(
    list.map(async (elm) => {
      const elements = await this.process(elm);

      elements.forEach((elm) => {
        if (!this.space.overlap(bounds[current], elm._bounds).overlap) return;
        selected.push(elm);
      });
    })
  );

  let total = 0;
  list.forEach((elm) => {
    if (!elm._items) total++;
  });

  this.monitoring.send(
    new Monitoring(current, State.Refresh, {
      id: id,
      depth: current,
      bounds: bounds[current],
      size: total,
    })
  );

  if (id === this.current.id) {
    if (current < depth) {
      await this.refresh(id, selected, bounds, depth, current + 1);
    } else {
      this.finish(id);
    }
  }
}

export async function process(element) {
  const collection = element._collection;
  const hash = element._hash;
  const key = `${collection}-${hash}`;

  if (this.cache.has(key)) return this.cache.get(key);

  let set = element._items;

  if (!set) {
    try {
      set = await this.network.getSet(collection, hash);
    } catch (error) {
      console.error(`Error processing element ${element}:`, error);
    }
  }

  const length = hash === ROOT ? 0 : hash.length;
  const elements = [];
  const data = [];
  const merged = {};

  set.forEach((elm) => {
    if (elm instanceof Item) {
      this.consolidate(merged, length + 1, elm);
      return;
    }

    elm._bounds = this.space.decode(elm._hash);
    elm._xyz = this.space.xyz(elm._hash);

    elements.push(elm);
  });

  Object.values(merged).forEach((elm) => {
    elements.push(elm);
  });

  this.cache.set(key, elements);
  this.stream(elements);

  return elements;
}

export function consolidate(merged, length, elm) {
  const hash = elm._hash.substring(0, length);
  const set = merged[hash];

  if (!set) {
    const n = new Set(elm._collection, hash, 1, elm._metrics);

    n._bounds = this.space.decode(n._hash);
    n._xyz = this.space.xyz(n._hash);
    n._items = [elm];

    merged[hash] = n;
    return;
  }

  set._count++;
  set._items.push(elm);
  set._metrics = set._metrics.map(
    (metric, index) => metric + elm._metrics[index]
  );
}
