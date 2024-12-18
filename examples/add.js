import { spaces } from "./spaces.js";
import { Item, Network, API, Spherical } from "../src/index.js";

const collection = "DENjYsMTAyLDE2MCwxMjYsPjQ5L";

const space = spaces[collection];
const geospatiality = space.dimension(0);

const location = [geospatiality.newPoint([0, 0])];
const hash = space.encode(location, 27);
const metrics = [0.55, 0.78];
const reference = "myFirstItemId";

const network = new Network("http", new API(), ["127.0.0.1|21001"]);

try {
  await network.addItem(collection, "@", hash, reference);
  console.log("Item added successfully.");
} catch (error) {
  console.error("An error occurred when adding an item:", error);
}
