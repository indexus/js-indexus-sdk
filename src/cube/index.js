import {
  create,
  add,
  get,
  key,
  parent,
  children,
  merge,
  set,
  retrieve,
  replaceBranch,
  pruneDeeperThan,
} from "./data.js";
import { aggregate } from "./aggregation.js";

class Cube {
  constructor(collection, space, options, isCovered = (elm) => true) {
    this.collection = collection;
    this.space = space;
    this.options = options;
    this.isCovered = isCovered;

    this.current = {};
    this.data = {};
    this.root = space.xyz("@");
  }

  adjust(zoom) {
    return Math.floor(zoom + this.options.resolution);
  }

  display(zoom, bounds) {
    const z = Math.floor(zoom + this.options.resolution);
    const depth = Math.floor(z / this.space.step);
    const hash = this.space.encode(this.space.center(bounds), depth);

    if (this.current.hash === hash) return this.current.result;

    const result = {};
    for (let i = z - 1; i <= z + 1; i++) {
      const raw = this.retrieve(i, bounds, this.root, false);
      const aggregated = this.aggregate(raw);

      result[i] = { raw, aggregated };
    }

    this.current = { hash, result };

    return result;
  }
}

Cube.prototype.create = create;
Cube.prototype.add = add;
Cube.prototype.get = get;
Cube.prototype.key = key;
Cube.prototype.parent = parent;
Cube.prototype.children = children;
Cube.prototype.set = set;
Cube.prototype.merge = merge;
Cube.prototype.retrieve = retrieve;
Cube.prototype.replaceBranch = replaceBranch;
Cube.prototype.pruneDeeperThan = pruneDeeperThan;

Cube.prototype.aggregate = aggregate;

export { Cube };
