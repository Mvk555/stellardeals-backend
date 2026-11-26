const express = require('express');
const router = express.Router();
const { trackClick } = require('../controllers/clickController');
const { optionalProtect } = require('../middleware/authMiddleware');

router.post('/', optionalProtect, trackClick);

module.exports = router;
