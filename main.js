import {
  Item,
  Collection,
  Space,
  Locality,
  Peer,
  Network,
  API,
  Spherical,
  Linear,
} from "./src/index.js"; // js-indexus-sdk

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const protocol = "http";
  const bootstraps = ["127.0.0.1|21001"];

  // Instantiate collections
  const dimensions = [
    { name: "gps", type: "spherical", args: [-90, -180, 90, 180] },
  ];
  const helloworld = new Collection("MjYsMjQ5LDENjYsMTAyLDE2MCwx", dimensions);

  // Initialize spaces
  const space = new Space(
    helloworld.dimensions(),
    helloworld.mask(),
    helloworld.offset()
  );

  const spaces = {};
  spaces[helloworld.name()] = space;

  // Initialize options object
  const options = {};

  // Create dimensions and options
  const geospatiality = space.dimension(0);

  options[geospatiality.name()] = {
    origin: geospatiality.newPoint([0, 0]), // San Francisco coordinates
    filters: geospatiality.newFilter([0, 0], [0, 360]), // Distance in km, direction in degrees
  };

  // Define cap, limit, and step
  const cap = 2; // Maximum number of sets to process per layer
  const step = 10; // Number of items to return per output step

  const output = {
    send: (result) => console.log("Output:", result),
  };
  const monitoring = {
    send: (message) => {}, // console.log("Monitoring:", message),
  };

  // Create a new Network instance
  const api = new API();
  const network = new Network(protocol, api, bootstraps);

  // Create a new Locality instance
  const indexus = new Locality(
    spaces,
    options,
    cap,
    step,
    output,
    monitoring,
    network
  );

  const item = new Item(
    helloworld.name(),
    space.encode([geospatiality.newPoint([0, 0])], 27),
    [0.55, 0.78],
    "myFirstItemId"
  );

  // await indexus.addItem(item);

  try {
    await indexus.search();
  } catch (error) {
    console.error("An error occurred during the search process:", error);
  }
}

// Run the async function
run();
