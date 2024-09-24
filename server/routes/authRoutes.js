// const express = require('express');
// const AWS = require('aws-sdk');
// const { CognitoIdentityProviderClient, ForgotPasswordCommand, ConfirmForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
// const router = express.Router();
// const authController = require('../controllers/authController');

// // AWS Cognito Setup
// const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

// // Routes for registration, login, and logout
// router.get('/register', authController.showRegisterPage);
// router.post('/register', authController.registerUser);
// router.get('/login', authController.showLoginPage);
// router.post('/login', authController.loginUserCognito);
// router.get('/logout', authController.logoutUser);

// // Reset Password Routes
// router.get('/forgot-password', (req, res) => {
//     res.render('requestResetPassword', { error_msg: req.flash('error_msg'), success_msg: req.flash('success_msg') });
// });

// router.post('/forgot-password', async (req, res) => {
//     const { email } = req.body;
//     const params = {
//         ClientId: process.env.COGNITO_CLIENT_ID,
//         Username: email
//     };

//     try {
//         const command = new ForgotPasswordCommand(params);
//         await cognitoClient.send(command);

//         req.flash('success_msg', 'A password reset code has been sent to your email.');
//         res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`); // Redirect to reset form
//     } catch (err) {
//         console.error('Error sending reset code:', err);
//         req.flash('error_msg', err.message || 'Error sending reset code');
//         res.redirect('/auth/forgot-password');
//     }
// });

// // Render Reset Password Page
// router.get('/reset-password', (req, res) => {
//     const { email } = req.query;
//     if (!email) {
//         req.flash('error_msg', 'No email provided for password reset');
//         return res.redirect('/auth/forgot-password');
//     }
//     res.render('resetPassword', { email, error_msg: req.flash('error_msg'), success_msg: req.flash('success_msg') });
// });

// // Handle Password Reset Submission
// router.post('/confirm-reset-password', async (req, res) => {
//     const { email, verificationCode, newPassword } = req.body;

//     const params = {
//         ClientId: process.env.COGNITO_CLIENT_ID,
//         Username: email,
//         ConfirmationCode: verificationCode,
//         Password: newPassword
//     };

//     try {
//         const command = new ConfirmForgotPasswordCommand(params);
//         await cognitoClient.send(command);

//         req.flash('success_msg', 'Password reset successfully! You can now log in.');
//         res.redirect('/auth/login');
//     } catch (err) {
//         console.error('Error resetting password:', err);
//         req.flash('error_msg', err.message || 'Error resetting password');
//         res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`);
//     }
// });

// module.exports = router;









const express = require('express');
const AWS = require('aws-sdk');
const { CognitoIdentityProviderClient, ForgotPasswordCommand, ConfirmForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const router = express.Router();
const authController = require('../controllers/authController');
const crypto = require('crypto');


// Redirect to Google login page via AWS Cognito
router.get('/login/google', (req, res) => {
    // Generate a random string for the state parameter
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store the state in the session to verify later
    req.session.oauthState = state;
    console.log("Stored state:", req.session.oauthState); // Log state before redirecting

    const googleLoginUrl = `https://${process.env.COGNITO_DOMAIN}/oauth2/authorize?identity_provider=Google&redirect_uri=${process.env.COGNITO_REDIRECT_URI}&response_type=CODE&client_id=${process.env.COGNITO_CLIENT_ID}&scope=email+openid+profile&state=${state}`;
    console.log("Generated state:", state); // Log to ensure state is being generated

    res.redirect(googleLoginUrl);
});



// Handling OAuth Callback
router.get('/auth/callback', (req, res) => {
    const { code, state } = req.query;

    // Verify the state matches the one stored in the session
    if (state !== req.session.oauthState) {
        console.error("State mismatch. Expected:", req.session.oauthState, "but got:", state);
        req.flash('error_msg', 'Invalid state parameter.');

        return res.status(400).send('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokenUrl = `https://${process.env.COGNITO_DOMAIN}/oauth2/token`;
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.COGNITO_CLIENT_ID,
        redirect_uri: process.env.COGNITO_REDIRECT_URI,
        code: code
    });

    // Request the token from Cognito
    axios.post(tokenUrl, params)
        .then(response => {
            const { id_token } = response.data;
            req.session.token = id_token;  // Store the token in session
            res.redirect('/dashboard');  // Redirect to the protected resource
        })
        .catch(err => {
            console.error('Error during token exchange:', err);
            res.status(400).send('Token exchange failed');
        });
});


// AWS Cognito Setup
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

// Routes for registration, login, and logout
router.get('/register', authController.showRegisterPage);
router.post('/register', authController.registerUser);
router.get('/login', authController.showLoginPage);
router.post('/login', authController.loginUserCognito);
router.get('/logout', authController.logoutUser);
router.get('/callback', authController.handleGoogleCallback);



// Redirect to Google login page via AWS Cognito
router.get('/login/google', (req, res) => {
    const googleLoginUrl = `https://${process.env.COGNITO_DOMAIN}/oauth2/authorize?identity_provider=Google&redirect_uri=${process.env.COGNITO_REDIRECT_URI}&response_type=CODE&client_id=${process.env.COGNITO_CLIENT_ID}&scope=email+openid+profile`;
    console.log("Generated state:", state); // Log to ensure state is being generated

    res.redirect(googleLoginUrl);
});

// Reset Password Routes
router.get('/forgot-password', (req, res) => {
    res.render('requestResetPassword', { error_msg: req.flash('error_msg'), success_msg: req.flash('success_msg') });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email
    };

    try {
        const command = new ForgotPasswordCommand(params);
        await cognitoClient.send(command);
        req.flash('success_msg', 'A password reset code has been sent to your email.');
        res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
        console.error('Error sending reset code:', err);
        req.flash('error_msg', err.message || 'Error sending reset code');
        res.redirect('/auth/forgot-password');
    }
});

// Render Reset Password Page
router.get('/reset-password', (req, res) => {
    const { email } = req.query;
    if (!email) {
        req.flash('error_msg', 'No email provided for password reset');
        return res.redirect('/auth/forgot-password');
    }
    res.render('resetPassword', { email, error_msg: req.flash('error_msg'), success_msg: req.flash('success_msg') });
});

// Handle Password Reset Submission
router.post('/confirm-reset-password', async (req, res) => {
    const { email, verificationCode, newPassword } = req.body;
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: verificationCode,
        Password: newPassword
    };

    try {
        const command = new ConfirmForgotPasswordCommand(params);
        await cognitoClient.send(command);
        req.flash('success_msg', 'Password reset successfully! You can now log in.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Error resetting password:', err);
        req.flash('error_msg', err.message || 'Error resetting password');
        res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`);
    }
});

module.exports = router;
