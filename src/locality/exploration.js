import { State, Monitoring, Item, Set } from "../model/index.js";
import { transform } from "../utilities/encoding.js";
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
  this.current().indexed.sort();

  let selected = 0;
  let count = 0;
  let items = 0;

  for (const element of this.current().indexed.list) {
    if (
      this.level > 0 &&
      (element.distance() > this.previous().radius ||
        count >= this.cap * this.limit)
    ) {
      break;
    }

    if (element instanceof Item) {
      items++;
    }

    this.current().selected.add(element);
    selected++;
    count += element.count();
    this.monitoring.send(new Monitoring(this.level, State.Selected, element));
  }

  this.current().indexed.remove(selected, count);

  if (this.level === 0) {
    this.current().final = false;
    return true;
  }

  if (
    this.current().indexed.count === 0 ||
    this.current().indexed.list[0].distance() > this.previous().radius
  ) {
    this.current().radius = this.previous().radius;
  } else {
    this.current().radius = this.current().indexed.list[0].distance();
  }

  this.previous().waiting =
    this.current().indexed.count + this.current().waiting;
  this.previous().loaded.count =
    this.current().indexed.count +
    this.current().selected.count +
    this.current().loaded.count;

  const predicted =
    this.current().loaded.count +
    this.current().selected.count -
    this.current().waiting;
  this.current().final =
    this.current().final &&
    items === selected &&
    this.level + 1 === this.sets.length;

  return (
    predicted >= this.limit || this.current().radius === this.first().radius
  );
}

export async function query() {
  const concurrencyLimit = 50; // Define your concurrency limit here
  const selectedList = this.current().selected.list;

  // Define the iterator function for each element
  const processElement = async (element) => {
    const s = element;
    try {
      const id = transform(s.collection(), s.hash());
      await this.getSet(s, (set) => {
        this.next().indexed.add(set);
      });

      this.monitoring.send(new Monitoring(this.level, State.Loaded, s));
    } catch (error) {
      console.error(`Failed to retrieve set for ${s.collection()}:`, error);
    }
  };

  // Use the asyncPool to process elements with limited concurrency
  await asyncPool(concurrencyLimit, selectedList, processElement);

  // After all promises are resolved
  this.current().loaded.concat(this.current().selected.list);
  this.current().selected.clear();
}

export function stream() {
  let length = this.step;
  if (this.current().selected.count < this.step) {
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
