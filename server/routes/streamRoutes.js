// server/routes/streamRoutes.js

const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/auth');
const streamController = require('../controllers/streamController');


console.log(streamController); // Add this line to see what the streamController contains

// Route to render the live stream page (with authentication)
router.get('/livestream', ensureAuthenticated, streamController.viewStream);

// Route to start a new live stream (with authentication)
router.post('/start-stream', ensureAuthenticated, streamController.startStream);

router.put('/stream/rename', ensureAuthenticated, streamController.renameStreamController);
router.delete('/stream/:streamId', ensureAuthenticated, streamController.deleteStreamController);



module.exports = router;