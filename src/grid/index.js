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
  merge,
  set,
  retrieve,
} from "./data.js";
import { aggregate } from "./aggregation.js";

class Grid {
  constructor(collection, space, options, monitoring, network) {
    this.collection = collection;
    this.space = space;
    this.n = 2;
    this.data = {};
    this.options = options;
    this.monitoring = monitoring;
    this.network = network;
    this.root = new Set(collection, "@", undefined, undefined);
  }

  async init() {
    await this.refresh([this.root], this.space.root(), 0);
  }

  move(zoom, bounds) {
    this.preload = this.prepare(zoom, bounds);

    if (this.preload.delta) {
      this.preload.delta = false;

      this.refresh([this.root], this.preload.extended, this.preload.depth);
    }
  }

  display(zoom, bounds) {
    const result = [];
    const xyz = this.space.xyz(this.root._hash);

    this.retrieve(result, zoom, bounds, xyz);

    return result;
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
Grid.prototype.set = set;
Grid.prototype.merge = merge;
Grid.prototype.retrieve = retrieve;

Grid.prototype.aggregate = aggregate;

export { Grid };
