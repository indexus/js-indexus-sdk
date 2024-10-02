
# Custom SDK

This SDK provides a simple interface to interact with the custom peer-to-peer protocol.

## Installation

```bash
npm install custom-sdk
```

## Usage

```javascript
const sdk = require('custom-sdk');

sdk.addItem({/* item details */});
const set = sdk.getSet('collectionId', 'location');
```

## Tests

```bash
npm test
```
