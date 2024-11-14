import { Item, Set } from "../model/index.js";
import { asyncPool } from "../utilities/network.js";

export async function run(selected = { "@": true }, items = []) {
  const sets = [];
  const selectedList = Object.keys(selected);

  selected = {};

  const processElement = async (element) => {
    try {
      const set = await this.network.getSet(this.collection.name(), element);

      if (set.length > 0) {
        set.forEach((elm) => {
          elm._parent = element;
          elm._bounds = this.space.decode(elm._hash);

          if (
            this.space.overlap(this.space.newSegment(this.bounds), elm._bounds)
          ) {
            if (elm instanceof Item) {
              items.push(elm);
            } else if (elm instanceof Set) {
              sets.push(elm);
              selected[elm._hash] = true;
            }
          }
        });
      }
    } catch (error) {
      console.error(`Error processing element ${element}:`, error);
    }
  };

  await asyncPool(this.option.concurrencyLimit, selectedList, processElement);

  const grouped = this.aggregate(sets);

  if (
    sets.length > 0 &&
    grouped[this.option.dimension].length < this.option.resolution
  ) {
    return await this.run(selected, items);
  }

  items.forEach((item) => {
    sets.forEach((set) => {
      if (item._hash.startsWith(set._hash)) {
        set._count--;
        set._metrics = set._metrics.map(
          (metric, index) => metric - item._metrics[index]
        );
      }
    });
  });

  return { items, sets, grouped };
}
