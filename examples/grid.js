import { spaces, bounds } from "./spaces.js";
import { behaviors, deserializeBounds } from "./behaviors.js";
import { Cube, Grid, Network, API } from "../src/index.js";

let last = {};
const track = { max: 0 };
const t0 = performance.now();

const collection = "DENjYsMTAyLDE2MEwxMjYsPjQ5L";

const space = spaces[collection];
const bound = bounds[collection];
const resolution = 5;

const cubeOpt = {
  limit: 10,
  resolution,
};

const cube = new Cube(collection, space, cubeOpt);

const gridOpt = {
  offset: { zoom: 1, bounds: 1 / 8 },
  resolution,
};

const stream = (elements) => {
  const data = elements.map((elm) =>
    cube.create(elm._xyz, elm._bounds, elm._count, elm._metrics, elm._items, [])
  );
  cube.set(data);
};

const finish = (id) => {
  const t1 = performance.now();
  console.log("END", id, t1 - t0);
};

const monitoring = {
  send: (message) => {
    if (message._element.size > track.max) {
      track.id = message._element.id;
      track.max = message._element.size;
      track.depth = message._element.depth;
      track.bounds = message._element.bounds;
    }
  },
};

const network = new Network("http", new API(), ["127.0.0.1|21001"], 100, 50000);
const grid = new Grid(
  collection,
  space,
  gridOpt,
  stream,
  finish,
  monitoring,
  network
);

for (let i = 0; i < behaviors.length; i++) {
  last = behaviors[i];
  grid.move(last.zoom, deserializeBounds(last.bounds, space));

  await new Promise((r) => setTimeout(r, 50));
}

await new Promise((r) => setTimeout(r, 5000));

const result = cube.display(last.zoom, deserializeBounds(last.bounds, space));
const adjustedZoom = cube.adjust(last.zoom);

console.log(track);
console.log(result[adjustedZoom].raw.length);
