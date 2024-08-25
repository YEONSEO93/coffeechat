// server/routes/commentRoutes.js

const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/auth'); // Correct path to the auth middleware
const { addComment, editComment, deleteComment } = require('../controllers/commentController');

// Route to add a comment
router.post('/add', ensureAuthenticated, addComment);

// Route to edit a comment
router.post('/edit/:id', ensureAuthenticated, editComment);

// Route to delete a comment
router.post('/delete/:id', ensureAuthenticated, deleteComment);

module.exports = router;
