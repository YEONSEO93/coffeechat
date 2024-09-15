// server/routes/authRoutes.js

// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');

// // Register page route
// router.get('/register', authController.showRegisterPage);

// // Handle user registration
// router.post('/register', authController.registerUser);

// // Login page route
// router.get('/login', authController.showLoginPage);

// // Handle user login
// router.post('/login', authController.loginUser);

// // Logout route
// router.get('/logout', authController.logoutUser);

// module.exports = router;







const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();
const cognito = new AWS.CognitoIdentityServiceProvider();
const authController = require('../controllers/authController');

// Render Registration Page
router.get('/register', authController.showRegisterPage);

// Handle User Registration
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }]
    };

    try {
        await cognito.signUp(params).promise();
        req.session.tempPassword = password;
        res.render('confirm', { username: email });
    } catch (err) {
        console.error('Error registering:', err);
        req.flash('error_msg', err.message || 'Error registering');
        res.status(400).redirect('/auth/register');
    }
});

// Handle Confirmation Code Submission
router.post('/confirm', async (req, res) => {
    const { username, code } = req.body;
    const password = req.session.tempPassword;

    const confirmParams = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        ConfirmationCode: code,
        Username: username
    };

    try {
        await cognito.confirmSignUp(confirmParams).promise();
        const loginParams = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password
            }
        };
        const authData = await cognito.initiateAuth(loginParams).promise();
        req.session.token = authData.AuthenticationResult.AccessToken;
        delete req.session.tempPassword;
        res.redirect('/');
    } catch (err) {
        console.error('Error confirming email:', err);
        req.flash('error_msg', err.message || 'Error confirming email');
        res.status(400).redirect('/auth/confirm');
    }
});

// Render Login Page
router.get('/login', authController.showLoginPage);

// Handle User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password
        }
    };

    try {
        const data = await cognito.initiateAuth(params).promise();
        req.session.token = data.AuthenticationResult.AccessToken;
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                req.flash('error_msg', 'Session save failed');
                return res.redirect('/auth/login');
            }
            res.redirect('/posts/list');
        });
    } catch (err) {
        console.error('Login failed:', err);
        req.flash('error_msg', 'Login failed: ' + (err.message || 'Unknown error'));
        res.redirect('/auth/login');
    }
});

// Handle User Logout
router.get('/logout', authController.logoutUser);

module.exports = router;
