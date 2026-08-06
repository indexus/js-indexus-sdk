const express = require('express');
const router = express.Router();
const { Collection, Space, Network, API } = require('js-indexus-sdk');


const network = new Network("https", new API(), ["bootstrap.indexus.network|21000"]);

router.post('/', async (req, res) => {
    try {
        const collectionId = req.body.collectionId;
        const dimensions = req.body.dimensions;
        const itemId = req.body.itemId;
        const price = req.body.price;
        const rating = req.body.rating;

        const collection = new Collection(collectionId, dimensions);
        const space = new Space(
            collection.dimensions(),
            collection.mask(), 
            collection.offset()
        );

        const priceDim = space.dimension(0);
        const ratingDim = space.dimension(1);
        const location = [
            priceDim.newPoint([price]),
            ratingDim.newPoint([rating]),
        ];
        const hash = space.encode(location, 16);
        const metrics = [price, rating];

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