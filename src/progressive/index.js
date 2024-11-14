import { Monitoring, State, Mask, Offset, Network } from "../model/index.js";

import { aggregate } from "./aggregation.js";
import { run } from "./layer.js";

class Option {
  constructor(dimension, resolution, concurrency) {
    this.dimension = dimension;
    this.resolution = resolution;
    this.concurrency = concurrency;
  }
}

class Progressive {
  constructor(collection, space, option, output, monitoring, network) {
    this.collection = collection;
    this.space = space;
    this.option = option;
    this.output = output;
    this.monitoring = monitoring;
    this.network = network;
  }

  async search(bounds) {
    this.bounds = bounds;
    return await this.run();
  }
}

Progressive.prototype.run = run;
Progressive.prototype.aggregate = aggregate;

export { Option, Progressive };
