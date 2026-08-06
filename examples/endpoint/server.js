const express = require('express');
const bodyParser = require('body-parser');
const itemRoutes = require('./routes/itemRoutes');
const productRoutes = require('./routes/productRoutes');
const locationRoutes = require('./routes/locationRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/item', itemRoutes);
app.use('/product', productRoutes);
app.use('/location', locationRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 