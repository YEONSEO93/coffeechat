// server/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register page route
router.get('/register', authController.showRegisterPage);

// Handle user registration
router.post('/register', authController.registerUser);

// Login page route
router.get('/login', authController.showLoginPage);

// Handle user login
router.post('/login', authController.loginUser);

// Logout route
router.get('/logout', authController.logoutUser);

module.exports = router;
