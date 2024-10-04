// //server/routes/chatRoutes.js

// const express = require('express');
// const router = express.Router();
// const ensureAuthenticated = require('../middleware/auth');  // Ensure this path is correct

// const { getChatrooms, getChatroomDetails, createChatroomRequest } = require('../controllers/chatController');

// // Route to list chatrooms
// router.get('/list', ensureAuthenticated, getChatrooms);

// // Route to get details of a specific chatroom
// router.get('/detail/:id', ensureAuthenticated, getChatroomDetails);

// // Route to request a chatroom creation
// router.get('/request', ensureAuthenticated, createChatroomRequest);

// module.exports = router;







const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/auth');  // Ensure this path is correct

// Import the chat controller functions
const { getChatrooms, getChatroomDetails, createChatroomRequest } = require('../controllers/chatController');

// Route to list chatrooms
router.get('/list', ensureAuthenticated, getChatrooms);

// Route to get details of a specific chatroom
router.get('/detail/:id', ensureAuthenticated, getChatroomDetails);

// Route to request a chatroom creation
router.get('/request', ensureAuthenticated, createChatroomRequest);

module.exports = router;

