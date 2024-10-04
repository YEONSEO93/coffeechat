

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const { CognitoIdentityProviderClient, InitiateAuthCommand, ConfirmSignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { getSecretValue, getParameterValue } = require('../config/secretsManager');
const crypto = require('crypto');

// let cognito = new AWS.CognitoIdentityServiceProvider(); // Initialized at the start

// Initialize Cognito (to be set after retrieving credentials)
let cognitoClient = null;

// Initialize Cognito with credentials from Secrets Manager
async function initializeCognito() {
    if (!cognitoClient) { // Ensure initialization happens once
        try {
            const secret = await getSecretValue('n11725605-assignment2-latest');
            const region = await getParameterValue('/n11725605/AWS_REGION');

            cognitoClient = new CognitoIdentityProviderClient({
                region: region,
                credentials: {
                    accessKeyId: secret.accessKeyId,
                    secretAccessKey: secret.secretAccessKey,
                    sessionToken: secret.sessionToken || '' // Optional session token
                }
            });
            console.log('Cognito initialized successfully.');
        } catch (error) {
            console.error('Error initializing Cognito:', error);
            throw new Error('Failed to initialize AWS Cognito');
        }
    }
}

// async function initializeCognito() {
//     try {
//         const secret = await getSecretValue('n11725605-assignment2-latest'); // Use your secret name
//         AWS.config.update({
//             accessKeyId: secret.accessKeyId,
//             secretAccessKey: secret.secretAccessKey,
//             sessionToken: secret.sessionToken || '', // Optional for temporary credentials
//             region: 'ap-southeast-2'
//         });
//         cognito = new AWS.CognitoIdentityServiceProvider();
//         console.log('Cognito initialized successfully.');
//     } catch (error) {
//         console.error('Error initializing Cognito:', error);
//         throw new Error('Failed to initialize AWS Cognito');
//     }
// }



// Ensure Cognito is initialized before using it in loginUserCognito
const loginUserCognito = async (req, res) => {
    try {
        if (!cognitoClient) {
            await initializeCognito(); // Ensure Cognito is initialized
        }

        const { email, password } = req.body;
        const clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID');

        const authCommand = new InitiateAuthCommand({
            ClientId: clientId,
            AuthFlow: 'USER_PASSWORD_AUTH',
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        });

        const data = await cognitoClient.send(authCommand);
        req.session.token = data.AuthenticationResult.AccessToken;

        req.session.save((err) => {
            if (err) {
                req.flash('error_msg', 'Session save failed');
                return res.redirect('/auth/login');
            }
            res.redirect('/posts/list');
        });
    } catch (err) {
        console.error("Login failed:", err.message);
        req.flash('error_msg', err.message || 'Login failed');
        res.redirect('/auth/login');
    }
};

// Ensure Cognito is initialized before using it in confirmUser
const confirmUser = async (req, res) => {
    try {
        await initializeCognito(); // Ensure Cognito is initialized

        const { username, code } = req.body;
        const clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID');

        const confirmCommand = new ConfirmSignUpCommand({
            ClientId: clientId,
            Username: username,
            ConfirmationCode: code
        });

        await cognitoClient.send(confirmCommand);
        req.flash('success_msg', 'Email confirmed! You can now log in.');
        res.redirect('/auth/login');
    } catch (err) {
        req.flash('error_msg', err.message || 'Error confirming user');
        console.error("Error confirming user:", err);
        res.redirect(`/auth/confirm?username=${encodeURIComponent(username)}`);
    }
};



// Render the registration page
const showRegisterPage = (req, res) => {
    res.render('register');
};

// Render the login page
const showLoginPage = async (req, res) => {
    try {
        const clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID');
        const redirectUri = await getParameterValue('/n11725605/COGNITO_REDIRECT_URI');
        const cognitoDomain = await getParameterValue('/n11725605/COGNITO_DOMAIN');
        const state = crypto.randomBytes(16).toString('hex'); // Generate a random state token for OAuth login flow

        req.session.state = state; // Store state in the session
        res.render('login', {
            error_msg: req.flash('error_msg'),
            success_msg: req.flash('success_msg'),
            state: state,
            redirectUri: redirectUri,
            cognitoDomain: cognitoDomain,
            clientId: clientId
        });
    } catch (error) {
        console.error('Error rendering login page:', error);
        res.status(500).send('Internal server error');
    }
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
    const cognitoClientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID'); // Fetch Cognito Client ID
    const params = {
        ClientId: cognitoClientId,
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



// Render Email Confirmation Page
const showConfirmPage = (req, res) => {
    const username = req.query.username; // Extract the username from the query params
    res.render('confirm', { username }); // Pass the username to the confirm.ejs view
};



// Middleware to ensure authentication using JWT
const ensureAuthenticated = async (req, res, next) => {
    const token = req.session.token;
    if (token) {
        const jwtSecret = await getParameterValue('/n11725605/JWT_SECRET'); // Fetch JWT secret from Parameter Store
        jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }, (err, decoded) => {
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

