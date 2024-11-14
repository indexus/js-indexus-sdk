import { Layer } from "./layer.js";
import { Monitoring, State, Mask, Offset, Network } from "../model/index.js";

import { Space } from "../entities/space.js";
import { Set } from "../entities/set.js";

import { run, prepare, query, stream } from "./exploration.js";
import { addItem, getSet, addLocation } from "./observer.js";
import { ROOT } from "../utilities/encoding.js";

class Option {
  constructor(origin, filters, concurrency, cap, step) {
    this.origin = origin;
    this.filters = filters;
    this.concurrency = concurrency;
    this.cap = cap;
    this.step = step;
  }
}
class Local {
  constructor(spaces, option, output, monitoring, network) {
    this.spaces = spaces;
    this.option = option;
    this.limit = 0;
    this.level = 0;
    this.sets = [new Layer()];
    this.output = output;
    this.monitoring = monitoring;
    this.network = network;

    for (const [key, space] of Object.entries(this.spaces)) {
      const element = new Set(key, ROOT, 0);

      if (!this.addLocation(space, element)) {
        this.monitoring.send(
          new Monitoring(this.level, State.Filtered, element)
        );
        return;
      }

      this.current().indexed.add(element);
      this.current().radius = element.distance();

      this.monitoring.send(new Monitoring(this.level, State.Indexed, element));
    }
  }

  dimensions() {
    const dimensions = {};
    for (const key in this.spaces) {
      const space = this.spaces[key];
      for (let i = 0; i < space.size(); i++) {
        const dimension = space.dimension(i);
        dimensions[dimension.name()] = dimension;
      }
    }
    return dimensions;
  }

  async search() {
    this.limit += this.option.step;
    await this.run();
  }

  // Layer navigation methods
  first() {
    return this.sets[0];
  }

  current() {
    return this.sets[this.level];
  }

  previous() {
    return this.sets[this.level - 1];
  }

  next() {
    if (this.level + 1 === this.sets.length) {
      const last = new Layer();
      this.sets.push(last);
      return last;
    }
    return this.sets[this.level + 1];
  }
}

Local.prototype.run = run;
Local.prototype.prepare = prepare;
Local.prototype.query = query;
Local.prototype.stream = stream;
Local.prototype.addItem = addItem;
Local.prototype.getSet = getSet;
Local.prototype.addLocation = addLocation;

export { Option, Local };
