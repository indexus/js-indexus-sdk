# Indexus SDK

![Indexus Logo](https://your-logo-url.com/logo.png)

Welcome to the **Indexus SDK**, a powerful toolkit designed to facilitate the creation and management of decentralized, peer-to-peer networks. Whether you're building a distributed application, managing data across multiple nodes, or exploring the capabilities of decentralized systems, Indexus provides the essential tools and abstractions to streamline your development process.

---

## Table of Contents

- [Indexus SDK](#indexus-sdk)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Features](#features)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
  - [Getting Started](#getting-started)
    - [Setting Up Your Environment](#setting-up-your-environment)
    - [Running the Example](#running-the-example)
  - [Main Components](#main-components)
    - [1. Entities](#1-entities)
    - [2. Networking](#2-networking)
    - [3. Utilities](#3-utilities)
  - [Example Usage](#example-usage)
    - [Explanation](#explanation)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debugging Steps](#debugging-steps)
  - [Contributing](#contributing)
  - [License](#license)
  - [Contact](#contact)

---

## Introduction

The Indexus SDK empowers developers to build decentralized applications by providing a structured approach to managing collections, spaces, and peer-to-peer interactions. Leveraging concepts like consistent hashing, routing tables, and robust API interactions, Indexus ensures efficient data distribution and retrieval across a network of peers.

---

## Features

- **Peer-to-Peer Networking**: Seamlessly connect and interact with multiple peers in a decentralized network.
- **Consistent Hashing**: Efficiently distribute data across peers based on unique identifiers.
- **Modular Architecture**: Organized components for collections, spaces, localities, and networking.
- **Robust API**: Reliable methods for adding items, retrieving sets, and pinging peers.
- **Extensible Dimensions**: Support for various data dimensions like spherical and linear.
- **Monitoring and Output Handling**: Integrated mechanisms for monitoring network activity and handling outputs.

---

## Installation

### Prerequisites

- **Node.js** (v14 or newer)
- **npm** (v6 or newer)

### Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/indexus/js-indexus-sdk.git
   cd js-indexus-sdk
   ```

2. **Install Dependencies**

   ```bash
   npm install
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

2. **Configure Environment Variables**

   Create a `.env` file in the root directory to manage configuration settings (optional).

   ```env
   # .env
   PORT=21000
   BOOTSTRAP_PEER=bootstrap.indexus.io|21000
   ```

3. **Initialize the Project**

   If not already initialized, set up `package.json`:

   ```bash
   npm init -y
   ```

### Running the Example

The `main.js` file provides a comprehensive example of how to utilize the Indexus SDK. Follow the steps below to run it.

1. **Navigate to the Project Directory**

   ```bash
   cd js-indexus-sdk
   ```

2. **Run the Example**

   ```bash
   node main.js
   ```

   **Note**: Ensure that the bootstrap peer (`bootstrap.indexus.io:21000`) is accessible and operational.

---

## Main Components

### 1. Entities

- **Item**: Represents individual data items within a collection.
- **Collection**: Manages a group of items with defined dimensions and masking.
- **Space**: Defines the operational space based on collection dimensions, masks, and offsets.
- **Locality**: Handles data distribution and search operations within the network.

### 2. Networking

- **Peer**: Represents a network participant with unique identifiers and connection details.
- **Network**: Manages peer-to-peer interactions, including adding items and retrieving data sets.
- **API**: Facilitates communication between peers, handling requests like pinging and data retrieval.

### 3. Utilities

- **Spherical & Linear**: Define different dimensional models for data representation.
- **Encoding Utilities**: Provide functions like `charsToNumbers` for data encoding.

---

## Example Usage

Below is an example of how to set up and use the Indexus SDK based on the provided `main.js` code. This example demonstrates adding an item to the network and performing a search operation.

```javascript
// Import from the npm package instead of local files
import { Item, Collection, Space, Locality, Peer, Network, API, Spherical, Linear, charsToNumbers } from 'js-indexus-sdk';

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  send: (message) => {}, // console.log("Monitoring:", message),
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
    [geospatiality.newPoint([0, 0]), temporality.newPoint([Date.now() / 1000])],
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
```

### Explanation

1. **Importing Modules**: The necessary classes and utilities are imported to set up collections, spaces, networking, and data encoding.

2. **Configuration**:
   - **Bootstraps**: Defines the initial peer(s) to connect with.
   - **Collections**: Defines a collection named `helloworld` with spherical and linear dimensions, static masking, and basic encoding.

3. **Spaces and Options**:
   - **Space**: Initializes the operational space based on the collection's dimensions.
   - **Options**: Sets up geospatial and temporality options, including origin points and filters.

4. **Network Setup**:
   - **API & Network**: Initializes the API and network instances to manage peer interactions.
   - **Locality**: Creates a locality instance to handle adding items and performing searches.

5. **Adding an Item**:
   - **Item Creation**: Creates a new item with encoded spatial and temporal data.
   - **Adding to Network**: Adds the item to the network using the `indexus.addItem` method.

6. **Searching**:
   - **Timeout**: Waits for 3 seconds to ensure the item is propagated.
   - **Search Operation**: Performs a search operation to retrieve data sets from the network.

---

## Troubleshooting

### Common Issues

1. **Cannot Access 'Locality' Before Initialization**

   **Error Message**:
   ```
   ReferenceError: Cannot access 'Locality' before initialization
   ```

   **Cause**: Attempting to use the `Locality` class before it has been properly defined or imported, possibly due to circular dependencies.

   **Solution**:
   - **Check Imports**: Ensure that `Locality` is correctly imported before usage.
   - **Avoid Circular Dependencies**: Refactor your modules to eliminate circular dependencies. Consider consolidating related classes or using dependency injection.

2. **API Endpoint Not Reachable**

   **Cause**: The bootstrap peer (`bootstrap.indexus.io:21000`) might be down or unreachable.

   **Solution**:
   - **Verify Network Connectivity**: Ensure that your network allows outbound requests to the bootstrap peer.
   - **Check Peer Status**: Confirm that the bootstrap peer is operational and listening on the specified port.

3. **Invalid Host Format**

   **Error Message**:
   ```
   Error: Invalid host format: bootstrap.indexus.io:21000
   ```

   **Cause**: The host string does not match the expected format.

   **Solution**:
   - **Correct Format**: Ensure that the host is in the format `hostname:port` for IPv4 or `[ipv6]:port` for IPv6 addresses.
   - **Example**:
     - IPv4: `192.168.1.1:21000`
     - IPv6: `[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:21000`

4. **Missing Dependencies**

   **Cause**: Required packages like `axios` are not installed.

   **Solution**:
   - **Install Dependencies**:
     ```bash
     npm install axios
     ```

### Debugging Steps

1. **Check Console Logs**: Review the console output for any logged errors or warnings.
2. **Validate Configurations**: Ensure that all configurations, such as host addresses and ports, are correct.
3. **Use Logging**: Utilize the integrated logger to trace the flow of operations and identify where failures occur.

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

**Happy Coding! 🚀**