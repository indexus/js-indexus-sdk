import { spaces } from "./spaces.js";
import { Grid, Network, API } from "../src/index.js";

const collection = "DENjYsMTAyLDE2MCwxMjYsPjQ5L";

const space = spaces[collection];

const options = {
  offset: 1,
};

const monitoring = {
  send: (message) => {}, // console.log("Monitoring:", message),
};

const network = new Network("http", new API(), ["127.0.0.1|21001"]);

const grid = new Grid(collection, space, options, monitoring, network);

await grid.init();

const bounds = [
  space.dimension(0).newSegment([45, 46, 2, 3]),
  space
    .dimension(1)
    .newSegment([
      new Date("2019-11-01").getTime() / 1000,
      new Date("2019-12-01").getTime() / 1000,
    ]),
];

for (let i = 0; i < 14; i++) {
  const data = await grid.display(i, bounds);
  console.log(i, data);

  await new Promise((r) => setTimeout(r, 200));
}
