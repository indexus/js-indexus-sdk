import { Collection, Space } from "../src/index.js";

const collection1 = new Collection("DENjYsMTAyLDE2MCwxMjYsPjQ5L", [
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
]);

const collection2 = new Collection("DENjYsMTAyLDE2MEwxMjYsPjQ5L", [
  {
    name: "gps",
    type: "spherical",
    args: [-90, 90, -180, 180],
  },
]);

const spaces = {};
const bounds = {};

spaces[collection1.name()] = new Space(
  collection1.dimensions(),
  collection1.mask(),
  collection1.offset()
);
bounds[collection1.name()] = [
  spaces[collection1.name()].dimension(0).newSegment([45, 46, 2, 3]),
  spaces[collection1.name()]
    .dimension(1)
    .newSegment([
      new Date("2019-11-01").getTime() / 1000,
      new Date("2019-12-01").getTime() / 1000,
    ]),
];

spaces[collection2.name()] = new Space(
  collection2.dimensions(),
  collection2.mask(),
  collection2.offset()
);
bounds[collection2.name()] = [
  spaces[collection2.name()].dimension(0).newSegment([45, 46, 2, 3]),
];

export { spaces, bounds };
