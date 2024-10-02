# Indexus SDK

<a href="https://github.com/indexus/go-indexus-core/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"/></a> <a href="https://discord.gg/EXuGtcDgaS"><img src="https://img.shields.io/discord/1235219716738519080?logo=discord&logoColor=white" alt="Discord"/></a>

Welcome to the **Indexus SDK**, a powerful toolkit designed to facilitate the addition and retrieval of items in decentralized, peer-to-peer collections. With Indexus, developers can effortlessly manage data within collections, enabling efficient searches and data retrieval without the need to understand the underlying complexities of the network.

---

## 🌐 Demo Websites

Upcoming applications to see Indexus in action:

1. **Ephemeral Global Chat**: [Demo Link]()
   - A global chat platform allowing users to post and view messages on a world map in real-time.

2. **Multilevel Collaborative Drawing**: [Demo Link]()
   - A web application where users collaboratively create layered artworks, building upon each other's contributions.

3. **Multi-Collection Search**: [Demo Link]()
   - A unified search interface querying multiple collections like accommodations, hotels, and landmarks simultaneously.

4. **Multi-Dimensional Temporal Analysis**: [Demo Link]()
   - An analytical tool for visualizing data trends over time across different geographic regions.

5. **Geolocated News and Articles**: [Demo Link]()
   - Access news and articles from various sources, filtered by publication date and location.

6. **Semantic Search Engine**: [Demo Link]()
   - An advanced search engine leveraging semantic understanding to deliver contextually relevant results.

---

## About the SDK

The Indexus SDK allows developers to build decentralized applications by providing a structured approach to adding items to collections and performing efficient searches within those collections. By abstracting the complexities of the underlying peer-to-peer network, Indexus enables you to focus on creating innovative applications with seamless data management capabilities.

---

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Main Components](#main-components)
5. [Example Usage](#example-usage)
6. [Roadmap](#roadmap)
7. [Advanced Concepts](#advanced-concepts)
8. [Troubleshooting](#troubleshooting)
9. [Contributing](#contributing)
10. [License](#license)

---

## Features

### Granted

- **Add Items to Collections**: Easily add items (references) into decentralized collections with minimal code.
- **Search Capabilities**: Perform efficient searches within collections to retrieve items based on specific criteria.
- **Incremental Search**: Quickly retrieve subsequent items based on proximity to indexed items.
- **Simplified API**: Interact with the network using straightforward methods without worrying about the underlying peer-to-peer mechanisms.
- **Modular Architecture**: Organized components for collections, items, and networking, allowing for easy integration and extension.

### Upcoming

- **Aggregation Functions**: Aggregate data using sum, average, min, max, and more.
- **Sorting and Filtering**: Sort and filter items within collections on chosen dimensions.

---

## Installation

### Prerequisites

- **Node.js** (v14 or newer)
- **npm** (v6 or newer)

### Steps

1. **Install the Indexus SDK**

   ```bash
   npm install js-indexus-sdk
   ```

---

## Getting Started

### Setting Up Your Environment

1. **Ensure Node.js and npm are Installed**

   Verify the installation by checking the versions:

   ```bash
   node -v   # Should output Node.js version
   npm -v    # Should output npm version
   ```

2. **Initialize Your Project**

   Create a new project directory and initialize npm:

   ```bash
   mkdir my-indexus-project
   cd my-indexus-project
   npm init -y
   ```

3. **Install the Indexus SDK**

   ```bash
   npm install js-indexus-sdk
   ```

### Running the Example

Copy the example code provided in the [Example Usage](#example-usage) section into a file named `main.js` and run:

```bash
node main.js
```

---

## Main Components

### 1. Entities

- **Item**: Represents individual data items within a collection.
- **Collection**: Manages a group of items with defined dimensions and configurations.
- **Space**: Defines the operational space based on collection dimensions.
- **Locality**: Handles adding items to collections and performing search operations.

### 2. Networking

- **API**: Facilitates communication within the network, handling requests like adding items and searching.
- **Network**: Manages interactions, including connecting to bootstrap peers.

### 3. Utilities

- **Dimensions (Spherical & Linear)**: Define different dimensional models for data representation.
- **Encoding Utilities**: Provide functions like `charsToNumbers` for data encoding.

---

## Example Usage

Below is an example of how to set up and use the Indexus SDK. This example demonstrates adding an item to a collection and performing a search operation.

```javascript
// main.js

import {
  Item,
  Collection,
  Space,
  Locality,
  Network,
  API,
  charsToNumbers,
} from 'js-indexus-sdk';

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const bootstraps = ["bootstrap.indexus.io|21000"];

  // Instantiate collections
  const name = "R9zIWvyC3RcBy2AIH9jeZIqUywU";
  const helloworld = new Collection(
    name,
    [
      { name: "spherical", args: [-90, -180, 90, 180] },
      {
        name: "linear",
        args: [-126230400 * 16 * 16 * 8, 126230400 * 16 * 16 * 8],
      },
    ],
    { name: "static", args: [0, 1, 2, 0, 1, 2] },
    {
      name: "basic",
      args: [charsToNumbers(name)],
    }
  );

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
    origin: geospatiality.newPoint([0, 0]), // Origin coordinates
    filters: geospatiality.newFilter([0, 0], [0, 360]), // Distance and direction filters
  };

  const temporality = space.dimension(1);

  options[temporality.name()] = {
    origin: temporality.newPoint([Date.now() / 1000]), // Current time in Unix timestamp
    filters: temporality.newFilter([0, 0], [0]), // Time filters
  };

  // Define cap, limit, and step
  const cap = 2; // Maximum number of sets to process per layer
  const step = 10; // Number of items to return per output step

  const output = {
    send: (result) => console.log("Output:", result),
  };
  const monitoring = {
    send: (message) => {}, // Optional monitoring handler
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
```

### Explanation

1. **Importing Modules**: Import the necessary classes and utilities from the Indexus SDK.
2. **Configuration**:
   - **Bootstraps**: Defines the initial peer(s) to connect with.
   - **Collections**: Defines a collection with spherical and linear dimensions.
3. **Spaces and Options**:
   - **Space**: Initializes the operational space based on the collection's dimensions.
   - **Options**: Sets up options for geospatiality and temporality, including origin points and filters.
4. **Network Setup**:
   - **API & Network**: Initializes the API and network instances to manage interactions.
   - **Locality**: Creates a locality instance to handle adding items and performing searches.
5. **Adding an Item**:
   - **Item Creation**: Creates a new item with encoded spatial and temporal data.
   - **Adding to Collection**: Adds the item to the collection using the `indexus.addItem` method.
6. **Searching**:
   - **Timeout**: Waits for a few seconds to ensure the item is propagated.
   - **Search Operation**: Performs a search operation to retrieve items from the collection.

---

## Roadmap

We are continuously working to enhance the Indexus SDK and its capabilities. Here's a high-level roadmap of what's coming next:

- **SDK Enhancements**
  - **Aggregation Functions**: Implement sum, average, min, max operations on item properties.
  - **Advanced Filtering and Sorting**: Introduce more robust filtering and sorting options within collections.

- **Documentation**
  - **Comprehensive Guides**: Expand our documentation with detailed guides and tutorials.
  - **API Reference**: Provide an exhaustive API reference for all SDK functionalities.

- **Community and Collaboration**
  - **Open Source Contributions**: Encourage community contributions and provide support for developers.
  - **Community Events**: Host webinars and workshops to engage with the developer community.

- **Upcoming Use Cases and Demos**

Stay tuned for updates and new releases!

---

## Advanced Concepts

While the Indexus SDK abstracts the complexities of the underlying peer-to-peer network, it's built upon a robust protocol that ensures data is efficiently stored, indexed, and retrieved across a decentralized network of nodes.

### Overview of the Indexus Protocol

- **Decentralized Data Management**: Indexus uses a peer-to-peer protocol to distribute data across multiple nodes, ensuring high availability and resilience.
- **Binary Space Partitioning (BSP)**: Data is organized using BSP, allowing for efficient multidimensional searches and proximity queries.
- **Eventual Consistency**: The system ensures that all nodes eventually reach a consistent state, even in the presence of network partitions or node failures.
- **Conflict Resolution**: Indexus integrates Conflict-free Replicated Data Types (CRDT) to handle data synchronization and conflict resolution seamlessly.
- **Caching and Replication**: Frequently accessed data is cached by neighboring nodes, improving access speed and reducing latency.
- **Delegation Mechanism**: Sub-parts of collections are delegated to different nodes when they reach a certain size, ensuring balanced data distribution.

---

## Troubleshooting

### Common Issues

1. **Cannot Find Module 'js-indexus-sdk'**

   **Cause**: The Indexus SDK is not installed in your project.

   **Solution**:
   - Install the SDK:
     ```bash
     npm install js-indexus-sdk
     ```

2. **Await is Only Valid in Async Functions**

   **Cause**: Using `await` at the top level outside of an async function.

   **Solution**:
   - Wrap your code in an `async` function and call it.

3. **Network Errors**

   **Cause**: Unable to connect to the bootstrap peer or network issues.

   **Solution**:
   - Ensure that the bootstrap peer (`bootstrap.indexus.io:21000`) is accessible.
   - Check your network connection and firewall settings.

---

## Contributing

We welcome contributions from the community! If you'd like to contribute to the Indexus SDK, please follow these guidelines:

1. **Fork the Repository**
2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/YourFeature
   ```
3. **Commit Your Changes**
4. **Push to Your Fork**
5. **Create a Pull Request**

Please ensure that your code adheres to the project's coding standards and includes appropriate tests and documentation.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Contact

For any inquiries or support, please contact [contact@indexus.io](mailto:contact@indexus.io).

---

**Happy Coding with Indexus SDK! 🚀**

---

# Notes

The Indexus SDK simplifies the process of adding items to decentralized collections and performing efficient searches. By decoupling the data exploration protocol from its display, developers can focus on creating innovative user experiences while benefiting from the robust, decentralized infrastructure provided by Indexus.

---

*This README was last updated on October 2, 2024.*