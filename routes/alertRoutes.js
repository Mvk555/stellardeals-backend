const express = require('express');
const router = express.Router();
const { createAlert, getMyAlerts, deleteAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createAlert);
router.get('/', protect, getMyAlerts);
router.delete('/:id', protect, deleteAlert);

module.exports = router;