import { State, Monitoring, Item } from "../model/index.js";
import { asyncPool } from "../utilities/network.js";

export async function run() {
  if (this.prepare()) {
    if (this.current().final) {
      this.stream();
      return;
    } else {
      await this.query();
      this.level++;
    }
  } else {
    this.level--;
    if (this.level === 0) {
      this.level = this.sets.length;
    }
  }
  await this.run();
}

export function prepare() {
  const layer = this.current();
  if (!layer?.indexed) {
    // Defensive: level walked past allocated layers (empty collection edge).
    return false;
  }
  layer.indexed.sort();

  let selected = 0;
  let count = 0;
  let items = 0;

  for (const element of layer.indexed.list) {
    if (
      this.level > 0 &&
      (element.distance() > this.previous().radius ||
        count >= this.options.cap * this.limit)
    ) {
      break;
    }

    if (element instanceof Item) {
      items++;
    }

    layer.selected.add(element);
    selected++;
    count += element.count();
    this.monitoring.send(new Monitoring(this.level, State.Selected, element));
  }

  layer.indexed.remove(selected, count);

  if (this.level === 0) {
    layer.final = false;
    return true;
  }

  if (
    layer.indexed.count === 0 ||
    layer.indexed.list[0].distance() > this.previous().radius
  ) {
    layer.radius = this.previous().radius;
  } else {
    layer.radius = layer.indexed.list[0].distance();
  }

  this.previous().waiting = layer.indexed.count + layer.waiting;
  this.previous().loaded.count =
    layer.indexed.count + layer.selected.count + layer.loaded.count;

  const predicted =
    layer.loaded.count + layer.selected.count - layer.waiting;
  layer.final =
    layer.final && items === selected && this.level + 1 === this.sets.length;

  return predicted >= this.limit || layer.radius === this.first().radius;
}

export async function query() {
  const selectedList = this.current().selected.list;
  // Always allocate the next layer up-front. Empty getSet responses (missing
  // collection / no children) never call next().indexed.add, and run() would
  // then level++ into an undefined layer.
  this.next();

  // Define the iterator function for each element
  const process = async (element) => {
    try {
      await this.getSet(element, (set) => {
        this.next().indexed.add(set);
      });

      this.monitoring.send(new Monitoring(this.level, State.Loaded, element));
    } catch (error) {
      console.error(
        `Failed to retrieve set for ${element.collection()}:`,
        error
      );
    }
  };

  await asyncPool(this.network.getConcurrency(), selectedList, process);

  // After all promises are resolved
  this.current().loaded.concat(this.current().selected.list);
  this.current().selected.clear();
}

export function stream() {
  let length = this.options.step;
  if (this.current().selected.count < this.options.step) {
    length = this.current().selected.count;
  }

  const result = [];

  for (let idx = 0; idx < length; idx++) {
    const element = this.current().selected.list[idx];
    result.push(element); // Assuming element is an Item
    this.current().loaded.add(element);
    this.monitoring.send(new Monitoring(this.level, State.Streamed, element));
  }

  this.current().selected.remove(length, length);
  this.output.send(result);
}
