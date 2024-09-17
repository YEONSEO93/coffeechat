const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const jwt = require('jsonwebtoken');

// Render the registration page
const showRegisterPage = (req, res) => {
    res.render('register');
};

// Render the login page
const showLoginPage = (req, res) => {
    const error_msg = req.flash('error_msg');
    const success_msg = req.flash('success_msg');
    res.render('login', {
        error_msg: error_msg.length > 0 ? error_msg : null,
        success_msg: success_msg.length > 0 ? success_msg : null
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
        res.redirect('/auth/confirm');
    } catch (err) {
        console.error('Error registering user:', err);
        req.flash('error_msg', err.message || 'Error registering');
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
        console.error('Error confirming user:', err);
        req.flash('error_msg', err.message || 'Error confirming user');
        res.redirect('/auth/confirm');
    }
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
                console.error('Error saving session:', err);
                req.flash('error_msg', 'Session save failed');
                return res.redirect('/auth/login');
            }
            res.redirect('/posts/list');
        });
    } catch (err) {
        // Handle PasswordResetRequiredException
        if (err.code === 'PasswordResetRequiredException') {
            req.flash('error_msg', 'Password reset required. Please reset your password.');
            return res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`);
        }
        console.error('Login failed:', err.message);
        req.flash('error_msg', err.message || 'Login failed');
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
    showRegisterPage,
    showLoginPage,
    logoutUser,
    registerUser,
    confirmUser,
    loginUserCognito,
    ensureAuthenticated
};
