import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";
import { ROOT } from "../utilities/encoding.js";
import { asyncPool } from "../utilities/network.js";

export function prepare(zoom, bounds) {
  const offset = this.options.offset;
  const center = this.space.center(bounds);

  const depthMax = Math.floor((zoom + offset) / this.space.step);
  const depthMin = Math.floor((zoom - offset) / this.space.step);

  const hashMax = this.space.encode(center, depthMax);
  const hashMin = this.space.encode(center, depthMin);

  if (
    this.preload &&
    this.preload.max === hashMax &&
    this.preload.min === hashMin
  ) {
    return this.preload;
  }

  const step = offset / Math.pow(2, zoom);
  const extended = this.space.extend(bounds, step);

  return {
    max: hashMax,
    min: hashMin,
    depth: depthMax,
    extended: extended,
    delta: true,
  };
}

export async function refresh(list, bounds, depth) {
  const selected = [];

  await Promise.all(list.map((elm) => this.process(selected, bounds, elm)));

  if (depth) {
    await this.refresh(selected, bounds, depth - 1);
  }
}

export async function process(selected, bounds, element) {
  const collection = element._collection;
  const hash = element._hash;
  const length = hash === ROOT ? 0 : hash.length;

  let set = element._items;

  if (!set) {
    try {
      set = await this.network.getSet(collection, hash);
    } catch (error) {
      console.error(`Error processing element ${element}:`, error);
    }
  }

  const elements = [];
  const merged = {};

  set.forEach((elm) => {
    if (elm instanceof Item) {
      this.consolidate(merged, length + 1, elm);
      return;
    }

    elm._bounds = this.space.decode(elm._hash);
    elm._xyz = this.space.xyz(elm._hash);

    elements.push(
      this.create(
        elm._xyz,
        elm._bounds,
        elm._count,
        elm._metrics,
        undefined,
        []
      )
    );

    if (this.space.overlap(bounds, elm._bounds)) {
      selected.push(elm);
    }
  });

  Object.values(merged).forEach((elm) => {
    elements.push(
      this.create(
        elm._xyz,
        elm._bounds,
        elm._count,
        elm._metrics,
        elm._items,
        []
      )
    );

    if (this.space.overlap(bounds, elm._bounds)) {
      selected.push(elm);
    }
  });

  await this.lock.acquireWrite();

  try {
    this.set(elements);
  } finally {
    this.lock.releaseWrite();
  }
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
