import { spaces } from "./spaces.js";
import { Local, Network, API } from "../src/index.js";

const collection = "DENjYsMTAyLDE2MCwxMjYsPjQ5L";

const space = spaces[collection];

const gps = space.dimension(0);
const time = space.dimension(1);

const options = {
  cap: 2,
  step: 10,
  origins: {
    gps: gps.newPoint([46, 2]),
    time: time.newPoint([new Date("2019-11-01").getTime() / 1000]),
  },
  filters: {
    gps: gps.newFilter([0, 0], [0, 360]),
    time: time.newFilter([0, 0], [0]),
  },
};

const output = {
  send: (result) => console.log("Output:", result),
};
const monitoring = {
  send: (message) => {}, // console.log("Monitoring:", message),
};

const network = new Network("http", new API(), ["127.0.0.1|21001"]);

const local = new Local(spaces, options, output, monitoring, network);

try {
  await local.search();
} catch (error) {
  console.error("An error occurred during the search process:", error);
}
