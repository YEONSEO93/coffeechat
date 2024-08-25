// server/routes/streamRoutes.js

const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/auth');
const { getStream, startStream } = require('../controllers/streamController');

// Route to render the live stream page
router.get('/livestream', ensureAuthenticated, getStream);

// Route to start a new live stream
router.post('/start-stream', ensureAuthenticated, startStream);

module.exports = router;
