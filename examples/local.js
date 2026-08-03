import { spaces } from "./spaces.js";
import { Local, Network, API } from "../src/index.js";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const collection = "m2GR2Q9BLwF3gdXL";

const space = spaces[collection];
const final = {}
final[collection] = space

const gps = space.dimension(0);

const options = {
  cap: 2,
  step: 10,
  origins: {
    gps: gps.newPoint([46, 2]),
  },
  filters: {
    gps: gps.newFilter([0, 0], [0, 360]),
  },
};

const output = {
  send: async (searchResults) => {
    const storeIds = searchResults.map(result => result._id);
    const storeDetails = await fetchStoreDetails(storeIds);

    console.log(storeDetails);
    const enrichedResults = searchResults.map(result => {
      const details = storeDetails.stores.find(p => p._id === result._id);
      return {
        distance: result._distance,
        ...details,
      };
    });
    console.log(enrichedResults);
  },
};
const monitoring = {
  send: (message) => { }, // console.log("Monitoring:", message),
};

const network = new Network("https", new API(), ["bootstrap.indexus.network|21000"]);

const local = new Local(final, options, output, monitoring, network);

const fetchStoreDetails = async (ids) => {
  try {
    const response = await fetch(`https://127.0.0.1:8443/api/stores?ids=${ids.join(',')}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching store details:", error);
    throw error;
  }
};

try {
  await local.search();
} catch (error) {
  console.error("An error occurred during the search process:", error);
}