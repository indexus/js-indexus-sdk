import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";
import { asyncPool } from "../utilities/network.js";

export async function run(selected = { "@": true }, depth = 0, items = []) {
  const sets = [];
  const selectedList = Object.keys(selected);
  const merged = {};

  selected = {};

  const consolidate = (elm) => {
    const hash = elm._hash.substring(0, depth);
    const set = merged[hash];

    if (!set) {
      const n = new Set(elm._collection, hash, 1, elm._metrics);
      n._parent = elm._parent;
      n._bounds = this.space.decode(n._hash);
      merged[hash] = n;
      return;
    }

    set._count++;
    set._metrics = set._metrics.map(
      (metric, index) => metric + elm._metrics[index]
    );
  };

  const processElement = async (element) => {
    try {
      const set = await this.network.getSet(this.collection.name(), element);

      if (set.length > 0) {
        set.forEach((elm) => {
          elm._parent = element;
          elm._bounds = this.space.decode(elm._hash);

          const overlap = this.space.overlap(
            this.space.newSegment(this.bounds),
            elm._bounds
          );

          if (overlap) {
            if (elm instanceof Item) {
              items.push(elm);
              consolidate(elm);
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

  await asyncPool(this.option.concurrency, selectedList, processElement);

  const grouped = this.aggregate([...sets, ...Object.values(merged)]);

  if (
    sets.length > 0 &&
    grouped[this.option.dimension].length < this.option.resolution
  ) {
    return await this.run(selected, depth + 1, items);
  }

  return { items, sets, grouped };
}
