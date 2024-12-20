import { Monitoring, State, Mask, Offset, Network } from "../model/index.js";
import { Set } from "../entities/set.js";

import { prepare, refresh, consolidate, process } from "./layer.js";
import {
  create,
  equal,
  add,
  get,
  key,
  parent,
  children,
  merge,
  set,
  generate,
  retrieve,
} from "./data.js";
import { aggregate } from "./aggregation.js";

class Grid {
  constructor(collection, space, options, monitoring, network) {
    this.collection = collection;
    this.space = space;
    this.data = {};
    this.options = options;
    this.monitoring = monitoring;
    this.network = network;

    this.root = new Set(collection, "@", undefined, undefined);
    this.rootXyz = this.space.xyz("@");
  }

  async init() {
    await this.refresh([this.root], this.space.root(), 0);
  }

  move(zoom, bounds) {
    this.preload = this.prepare(zoom + this.options.resolution, bounds);

    if (this.preload.delta) {
      this.preload.delta = false;

      this.refresh([this.root], this.preload.extended, this.preload.depth);
    }
  }

  display(zoom, bounds) {
    const resolution = zoom + this.options.resolution;

    const raw = !this.options.full
      ? this.retrieve(resolution, bounds, this.rootXyz)
      : this.generate(resolution, bounds, null, this.rootXyz);

    const aggregated = this.aggregate(raw);

    return {
      raw,
      aggregated,
    };
  }
}

Grid.prototype.prepare = prepare;
Grid.prototype.refresh = refresh;
Grid.prototype.process = process;
Grid.prototype.consolidate = consolidate;

Grid.prototype.create = create;
Grid.prototype.equal = equal;
Grid.prototype.add = add;
Grid.prototype.get = get;
Grid.prototype.key = key;
Grid.prototype.parent = parent;
Grid.prototype.children = children;
Grid.prototype.set = set;
Grid.prototype.merge = merge;
Grid.prototype.retrieve = retrieve;
Grid.prototype.generate = generate;

Grid.prototype.aggregate = aggregate;

export { Grid };
