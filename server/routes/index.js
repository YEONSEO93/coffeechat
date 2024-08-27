//server/routes/index.js

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const chatRoutes = require('./chatRoutes');
const postRoutes = require('./postRoutes');
const streamRoutes = require('./streamRoutes');
const commentRoutes = require('./commentRoutes');

router.use(authRoutes);
router.use('/chat', chatRoutes);
router.use('/posts', postRoutes);
router.use(commentRoutes);

module.exports = router;
