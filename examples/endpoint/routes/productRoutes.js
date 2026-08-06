const express = require('express');
const router = express.Router();
const { Collection, Space, Network, API } = require('js-indexus-sdk');


const network = new Network("http", new API(), ["127.0.0.1|21001"]);

router.post('/', async (req, res) => {
    try {
        const collectionId = req.body.collectionId;
        const itemId = req.body.itemId;
        const coordinates = req.body.coordinates;

        if (!Array.isArray(coordinates)) {
            return res.status(400).json({
                success: false,
                message: 'Coordinates must be an array of values'
            });
        }

        const dimensions = coordinates.map((_, index) => {
            return {
                "name": index,
                "type": "linear",
                "args": [
                    0,
                    1
                ]
            };
        });

        const collection = new Collection(collectionId, dimensions);

        const space = new Space(
            collection.dimensions(),
            collection.mask(), 
            collection.offset()
        );

        const location = coordinates.map((coord, index) => {
            const dim = space.dimension(index);
            return dim.newPoint([coord]);
        });

        const hash = space.encode(location, 48);
        const metrics = [];

        try {
            await network.addItem(collectionId, "@", hash, metrics, itemId);
            
            res.status(201).json({
                success: true,
                message: 'Item added successfully to Indexus',
                data: {
                    itemId,
                    collectionId,
                    hash,
                    metrics
                }
            });
        } catch (error) {
            console.error("Indexus error:", error);
            res.status(400).json({
                success: false,
                message: 'Error adding item to Indexus',
                error: error.message
            });
        }
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;