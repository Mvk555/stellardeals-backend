const express = require('express');
const router = express.Router();
const { getProducts, getProductById, getFeaturedProducts, getProductMeta, getPriceHistory } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/meta', getProductMeta);            // keep above '/:id'
router.get('/:id/price-history', getPriceHistory);
router.get('/:id', getProductById);

module.exports = router;
