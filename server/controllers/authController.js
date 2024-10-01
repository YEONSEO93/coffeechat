// const AWS = require('aws-sdk');
// const jwt = require('jsonwebtoken');
// const { getSecretValue } = require('../config/secretsManager');
// let cognito = new AWS.CognitoIdentityServiceProvider(); // Change from const to let


// async function initializeCognito() {
//     const secret = await getSecretValue('n11725605-assignment2-latest');  // Use your secret name
//     AWS.config.update({
//     accessKeyId: secret.accessKeyId,
//     secretAccessKey: secret.secretAccessKey,
//     // Remove sessionToken only if you're using permanent credentials
//     sessionToken: secret.sessionToken || '', // Optional for temp credentials
//     region: 'ap-southeast-2'
// });
//     cognito = new AWS.CognitoIdentityServiceProvider();
// }

// initializeCognito().catch(err => {
//     console.error('Error initializing Cognito:', err);
// });


// // Render the registration page
// const showRegisterPage = (req, res) => {
//     res.render('register');
// };

// // Render the login page
// const showLoginPage = (req, res) => {
//     const error_msg = req.flash('error_msg');
//     const success_msg = req.flash('success_msg');
//     res.render('login', {
//         error_msg: error_msg.length > 0 ? error_msg : null,
//         success_msg: success_msg.length > 0 ? success_msg : null
//     });
// };

// // Handle user logout
// const logoutUser = (req, res) => {
//     req.session.destroy((err) => {
//         if (err) {
//             req.flash('error_msg', 'An error occurred during logout.');
//             return res.redirect('/');
//         }
//         req.flash('success_msg', 'You are logged out successfully');
//         res.redirect('/auth/login');
//     });
// };

// // AWS Cognito Registration
// const registerUser = async (req, res) => {
//     const { email, password } = req.body;
//     const params = {
//         ClientId: process.env.COGNITO_CLIENT_ID,
//         Username: email,
//         Password: password,
//         UserAttributes: [{ Name: 'email', Value: email }]
//     };
//     try {
//         await cognito.signUp(params).promise();
//         req.flash('success_msg', 'Registration successful! Please check your email to confirm your account.');
//         res.redirect('/auth/confirm');
//     } catch (err) {
//         console.error('Error registering user:', err);
//         req.flash('error_msg', err.message || 'Error registering');
//         res.redirect('/auth/register');
//     }
// };

// // AWS Cognito Email Confirmation
// const confirmUser = async (req, res) => {
//     const { username, code } = req.body;
//     const params = {
//         ClientId: process.env.COGNITO_CLIENT_ID,
//         ConfirmationCode: code,
//         Username: username
//     };
//     try {
//         await cognito.confirmSignUp(params).promise();
//         req.flash('success_msg', 'Email confirmed! You can now log in.');
//         res.redirect('/auth/login');
//     } catch (err) {
//         console.error('Error confirming user:', err);
//         req.flash('error_msg', err.message || 'Error confirming user');
//         res.redirect('/auth/confirm');
//     }
// };

// // AWS Cognito-Based Login
// const loginUserCognito = async (req, res) => {
//     const { email, password } = req.body;
//     const params = {
//         AuthFlow: 'USER_PASSWORD_AUTH',
//         ClientId: process.env.COGNITO_CLIENT_ID,
//         AuthParameters: { USERNAME: email, PASSWORD: password }
//     };
//     try {
//         const data = await cognito.initiateAuth(params).promise();
//         req.session.token = data.AuthenticationResult.AccessToken;
//         req.session.save((err) => {
//             if (err) {
//                 console.error('Error saving session:', err);
//                 req.flash('error_msg', 'Session save failed');
//                 return res.redirect('/auth/login');
//             }
//             res.redirect('/posts/list');
//         });
//     } catch (err) {
//         // Handle PasswordResetRequiredException
//         if (err.code === 'PasswordResetRequiredException') {
//             req.flash('error_msg', 'Password reset required. Please reset your password.');
//             return res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`);
//         }
//         console.error('Login failed:', err.message);
//         req.flash('error_msg', err.message || 'Login failed');
//         res.redirect('/auth/login');
//     }
// };

// // Middleware to ensure authentication using JWT
// const ensureAuthenticated = (req, res, next) => {
//     const token = req.session.token;
//     if (token) {
//         jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
//             if (err) {
//                 req.flash('error_msg', 'Session expired, please log in again');
//                 return res.redirect('/auth/login');
//             }
//             req.user = decoded;
//             next();
//         });
//     } else {
//         req.flash('error_msg', 'Please log in to view that resource');
//         res.redirect('/auth/login');
//     }
// };

// module.exports = {
//     initializeCognito,
//     showRegisterPage,
//     showLoginPage,
//     logoutUser,
//     registerUser,
//     confirmUser,
//     loginUserCognito,
//     ensureAuthenticated
// };



const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const { getSecretValue } = require('../config/secretsManager');
const crypto = require('crypto');

let cognito = new AWS.CognitoIdentityServiceProvider(); // Initialized at the start

// Initialize Cognito with credentials from Secrets Manager
async function initializeCognito() {
    try {
        const secret = await getSecretValue('n11725605-assignment2-latest');  // Use your secret name
        AWS.config.update({
            accessKeyId: secret.accessKeyId,
            secretAccessKey: secret.secretAccessKey,
            sessionToken: secret.sessionToken || '', // Optional for temporary credentials
            region: 'ap-southeast-2'
        });
        cognito = new AWS.CognitoIdentityServiceProvider();
        console.log('Cognito initialized successfully.');
    } catch (error) {
        console.error('Error initializing Cognito:', error);
        throw new Error('Failed to initialize AWS Cognito');
    }
}

// Render the registration page
const showRegisterPage = (req, res) => {
    res.render('register');
};

// Render the login page
const showLoginPage = (req, res) => {
    const error_msg = req.flash('error_msg');
    const success_msg = req.flash('success_msg');
    const state = crypto.randomBytes(16).toString('hex');  // Generate a random state token for OAuth login flow
    req.session.state = state;  // Store state in the session
    res.render('login', {
        error_msg: error_msg.length > 0 ? error_msg : null,
        success_msg: success_msg.length > 0 ? success_msg : null,
        state // Pass the state to the login view
    });
};

// Handle user logout
const logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            req.flash('error_msg', 'An error occurred during logout.');
            return res.redirect('/');
        }
        req.flash('success_msg', 'You are logged out successfully');
        res.redirect('/auth/login');
    });
};

// AWS Cognito Registration
const registerUser = async (req, res) => {
    const { email, password } = req.body;
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }]
    };

    try {
        await cognito.signUp(params).promise();
        req.flash('success_msg', 'Registration successful! Please check your email to confirm your account.');
        res.redirect(`/auth/confirm?username=${encodeURIComponent(email)}`);
    } catch (err) {
        if (err.code === 'InvalidPasswordException') {
            req.flash('error_msg', 'Password did not meet the policy requirements. It must have at least one symbol, uppercase letter, lowercase letter, and number.');
        } else {
            req.flash('error_msg', err.message || 'Error registering');
        }
        console.error('Error registering user:', err);
        res.redirect('/auth/register');
    }
};

// AWS Cognito Email Confirmation
const confirmUser = async (req, res) => {
    const { username, code } = req.body;
    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        ConfirmationCode: code,
        Username: username
    };

    try {
        await cognito.confirmSignUp(params).promise();
        req.flash('success_msg', 'Email confirmed! You can now log in.');
        res.redirect('/auth/login');
    } catch (err) {
        req.flash('error_msg', err.message || 'Error confirming user');
        console.error('Error confirming user:', err);
        res.redirect(`/auth/confirm?username=${encodeURIComponent(username)}`);
    }
};

// Render Email Confirmation Page
const showConfirmPage = (req, res) => {
    const username = req.query.username; // Extract the username from the query params
    res.render('confirm', { username }); // Pass the username to the confirm.ejs view
};

// AWS Cognito-Based Login
const loginUserCognito = async (req, res) => {
    const { email, password } = req.body;
    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password }
    };

    try {
        const data = await cognito.initiateAuth(params).promise();
        req.session.token = data.AuthenticationResult.AccessToken;
        req.session.save((err) => {
            if (err) {
                req.flash('error_msg', 'Session save failed');
                return res.redirect('/auth/login');
            }
            res.redirect('/posts/list');
        });
    } catch (err) {
        if (err.code === 'PasswordResetRequiredException') {
            req.flash('error_msg', 'Password reset required. Please reset your password.');
            return res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`);
        }
        req.flash('error_msg', err.message || 'Login failed');
        console.error('Login failed:', err);
        res.redirect('/auth/login');
    }
};

// Middleware to ensure authentication using JWT
const ensureAuthenticated = (req, res, next) => {
    const token = req.session.token;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
            if (err) {
                req.flash('error_msg', 'Session expired, please log in again');
                return res.redirect('/auth/login');
            }
            req.user = decoded;
            next();
        });
    } else {
        req.flash('error_msg', 'Please log in to view that resource');
        res.redirect('/auth/login');
    }
};

module.exports = {
    initializeCognito,
    showRegisterPage,
    showLoginPage,
    showConfirmPage,
    logoutUser,
    registerUser,
    confirmUser,
    loginUserCognito,
    ensureAuthenticated
};

