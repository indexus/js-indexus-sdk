import { Monitoring, State, Mask, Offset, Network } from "../model/index.js";
import { Set } from "../entities/set.js";

import { project, refresh, consolidate, process } from "./layer.js";

class Grid {
  constructor(collection, space, options, stream, finish, monitoring, network) {
    this.collection = collection;
    this.space = space;
    this.options = options;
    this.stream = stream;
    this.finish = finish;
    this.monitoring = monitoring;
    this.network = network;

    this.current = {};
    this.cache = new Map();
    this.root = new Set(collection, "@", undefined, undefined);
  }

  async move(zoom, bounds) {
    const depth = Math.floor(
      (zoom + this.options.resolution + this.options.offset.zoom) /
        this.space.step
    );
    const hash = this.space.encode(this.space.center(bounds), depth);

    if (this.current.hash === hash) return;

    const id = crypto.randomUUID();
    this.current = { hash, id };

    this.refresh(id, [this.root], this.project(zoom, bounds), depth);
  }
}

Grid.prototype.project = project;
Grid.prototype.refresh = refresh;
Grid.prototype.process = process;
Grid.prototype.consolidate = consolidate;

export { Grid };
