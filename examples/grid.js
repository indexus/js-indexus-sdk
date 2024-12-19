import { spaces, bounds } from "./spaces.js";
import { Grid, Network, API } from "../src/index.js";

const collection = "DENjYsMTAyLDE2MEwxMjYsPjQ5L";

const space = spaces[collection];
const bound = bounds[collection];

const options = {
  offset: 1,
};

const monitoring = {
  send: (message) => {}, // console.log("Monitoring:", message),
};

const network = new Network("http", new API(), ["127.0.0.1|21001"]);

const grid = new Grid(collection, space, options, monitoring, network);

await grid.init();

for (let i = 0; i < 11; i++) {
  grid.move(i, bound);

  const data = grid.display(i, bound);

  console.log(i, data.raw.length, data.aggregated[0].length);

  await new Promise((r) => setTimeout(r, 200));
}
