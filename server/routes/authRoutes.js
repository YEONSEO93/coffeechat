
const express = require('express');
const AWS = require('aws-sdk');
const { CognitoIdentityProviderClient, ForgotPasswordCommand, ConfirmForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const router = express.Router();
const authController = require('../controllers/authController');
const axios = require('axios');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const { getSecretValue } = require('../config/secretsManager');
const { getParameterValue } = require('../config/secretsManager');

// AWS Cognito Setup
let cognitoClient;
let cognitoDomain;
let clientId;
let clientSecret;
let redirectUri;

const initializeCognito = async () => {
    try {
        // Fetch Cognito configuration from AWS Systems Manager Parameter Store
        cognitoDomain = await getParameterValue('/n11725605/COGNITO_DOMAIN');
        clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID');
        redirectUri = await getParameterValue('/n11725605/COGNITO_REDIRECT_URI');

        // Fetch client secret from AWS Secrets Manager
        const secrets = await getSecretValue('n11725605-assignment2-latest');
        clientSecret = secrets.GOOGLE_CLIENT_SECRET;

        cognitoClient = new CognitoIdentityProviderClient({ region: await getParameterValue('/n11725605/AWS_REGION') });
    } catch (error) {
        console.error('Error initializing AWS Cognito:', error);
        throw new Error('Failed to initialize AWS Cognito settings');
    }
};

// Initialize Cognito at the start
initializeCognito();

// Routes for registration, login, and logout
router.get('/register', authController.showRegisterPage);
router.post('/register', authController.registerUser);
router.get('/login', authController.showLoginPage);
router.post('/login', authController.loginUserCognito);
router.get('/logout', authController.logoutUser);
router.get('/confirm', authController.showConfirmPage);

// // Redirect to Google OAuth2 authorization endpoint
// router.get('/auth/google', async (req, res) => {
//     try {
//         const clientId = await getParameterValue('/n11725605/GOOGLE_CLIENT_ID'); // Fetch your Google Client ID
//         const redirectUri = await getParameterValue('/n11725605/COGNITO_REDIRECT_URI'); // Your redirect URI

//         const state = generateRandomState(); // You can generate a unique state string to track the request

//         const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email%20openid%20profile&state=${state}`;

//         // Redirect to Google OAuth2 authorization URL
//         res.redirect(googleOAuthUrl);
//     } catch (error) {
//         console.error('Error generating Google OAuth2 URL:', error);
//         res.status(500).send('Internal server error');
//     }
// });


// Redirect to AWS Cognito with Google as the identity provider
router.get('/auth/google', async (req, res) => {
    try {
        const clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID');
        const redirectUri = await getParameterValue('/n11725605/COGNITO_REDIRECT_URI');
        const cognitoDomain = await getParameterValue('/n11725605/COGNITO_DOMAIN');

        const state = generateRandomState();
        req.session.state = state;

        const cognitoLoginUrl = `https://${cognitoDomain}/oauth2/authorize?identity_provider=Google&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=CODE&client_id=${clientId}&scope=email+openid+profile&state=${state}`;

        res.redirect(cognitoLoginUrl);
    } catch (error) {
        console.error('Error generating Cognito OAuth2 URL:', error);
        res.status(500).send('Internal server error');
    }
});


// A helper function to generate a random state string (optional)
function generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

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
        res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`); // Redirect to reset form
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

router.post('/confirm', authController.confirmUser);

// Handle Password Reset Submission
router.post('/confirm-reset-password', async (req, res) => {
    const { email, verificationCode, newPassword } = req.body;

    const params = {
        ClientId: clientId,
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


// Handle OAuth2 callback
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    if (req.session.state !== state) {
        req.flash('error_msg', 'Invalid state parameter. Possible CSRF attack.');
        return res.redirect('/auth/login');
    }

    try {
        const clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID');
        const clientSecret = await getParameterValue('/n11725605/GOOGLE_CLIENT_SECRET');
        const redirectUri = await getParameterValue('/n11725605/COGNITO_REDIRECT_URI');
        const cognitoDomain = await getParameterValue('/n11725605/COGNITO_DOMAIN');

        // Exchange the authorization code for tokens
        const tokenResponse = await axios.post(
            `https://${cognitoDomain}/oauth2/token`,
            querystring.stringify({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code: code
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { id_token, access_token } = tokenResponse.data;
        const decoded = jwt.decode(id_token);

        req.session.token = access_token;
        req.session.user = decoded;

        res.redirect('/posts/list');
    } catch (error) {
        console.error('Error exchanging authorization code:', error);
        req.flash('error_msg', 'Authentication failed.');
        res.redirect('/auth/login');
    }
});

// router.get('/callback', async (req, res) => {
//     const { code, state } = req.query;
    
//     // Verify the state matches what we stored in the session to prevent CSRF attacks
//     if (req.session.state !== state) {
//         req.flash('error_msg', 'Invalid state parameter. Possible CSRF attack.');
//         return res.redirect('/auth/login');
//     }

//     try {
//         // Exchange authorization code for tokens
//         const tokenResponse = await axios.post(
//             `https://${cognitoDomain}/oauth2/token`,
//             querystring.stringify({
//                 grant_type: 'authorization_code',
//                 client_id: clientId,
//                 client_secret: clientSecret,
//                 redirect_uri: redirectUri,
//                 code: code
//             }),
//             { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
//         );

//         const { id_token, access_token } = tokenResponse.data;

//         // Verify the JWT token
//         const decoded = jwt.decode(id_token);

//         // Save the token and user info in the session
//         req.session.token = access_token;
//         req.session.user = decoded;

//         // Redirect to the protected page (e.g., post list)
//         res.redirect('/posts/list');
//     } catch (error) {
//         console.error('Error exchanging authorization code:', error);
//         req.flash('error_msg', 'Authentication failed.');
//         res.redirect('/auth/login');
//     }
// });


module.exports = router;
