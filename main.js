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
} from "js-indexus-sdk";

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const bootstraps = ["bootstrap.indexus.io|21000"];

  // Instantiate collections
  const helloworld = new Collection("R9zIWvyC3RcBy2AIH9jeZIqUywU", [
    { name: "spherical", args: [-90, -180, 90, 180] },
    {
      name: "linear",
      args: [-126230400 * 16 * 16 * 8, 126230400 * 16 * 16 * 8],
    },
  ]);

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

  const temporality = space.dimension(1);

  options[temporality.name()] = {
    origin: temporality.newPoint([Date.now() / 1000]), // Current time in Unix timestamp
    filters: temporality.newFilter([0, 0], [0]), // One year in seconds
  };

  // Define cap, limit, and step
  const cap = 2; // Maximum number of sets to process per layer
  const step = 10; // Number of items to return per output step

  const output = {
    send: (result) => console.log("Output:", result),
  };
  const monitoring = {
    send: (message) => {}, //console.log("Monitoring:", message),
  };

  // Create a new Network instance
  const api = new API();
  const network = new Network(api, bootstraps);

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
    space.encode(
      [
        geospatiality.newPoint([0, 0]),
        temporality.newPoint([Date.now() / 1000]),
      ],
      27
    ),
    "myFirstItemId"
  );

  await indexus.addItem(item);

  await timeout(3000);

  try {
    await indexus.search();
  } catch (error) {
    console.error("An error occurred during the search process:", error);
  }
}

// Run the async function
run();
