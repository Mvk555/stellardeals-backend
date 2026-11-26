const express = require('express');
const router = express.Router();
const { getRecommendations, getTrending } = require('../controllers/recommendationController');

router.get('/trending', getTrending);
router.get('/:productId', getRecommendations);

module.exports = router;