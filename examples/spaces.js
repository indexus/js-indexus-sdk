import { Collection, Space } from "../src/index.js";

const dimensions = [
  {
    name: "gps",
    type: "spherical",
    args: [-90, 90, -180, 180],
  },
  {
    name: "time",
    type: "linear",
    args: [
      new Date("2019-01-01").getTime() / 1000,
      new Date("2024-12-31").getTime() / 1000,
    ],
  },
];

const collection = new Collection("DENjYsMTAyLDE2MCwxMjYsPjQ5L", dimensions);

const space = new Space(
  collection.dimensions(),
  collection.mask(),
  collection.offset()
);

const spaces = {};
spaces[collection.name()] = space;

export { spaces };
