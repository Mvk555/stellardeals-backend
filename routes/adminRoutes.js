const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const {
  createProduct, updateProduct, deleteProduct,
  getAllUsers, getStats, getAnalytics, runPriceJobNow
} = require('../controllers/adminController');

router.use(protect, admin);

router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.post('/price-job/run', runPriceJobNow);

router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/users', getAllUsers);

module.exports = router;
