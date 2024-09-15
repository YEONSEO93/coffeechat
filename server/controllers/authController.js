// // server/controllers/authController.js

// const bcrypt = require('bcrypt');
// const { getDB } = require('../config/db');
// const passport = require('passport');

// // Render the registration page
// const showRegisterPage = (req, res) => {
//     res.render('register');
// };

// // Handle user registration
// const registerUser = async (req, res) => {
//     try {
//         const hashedPassword = await bcrypt.hash(req.body.password, 10);
//         const db = getDB();
//         await db.collection('user').insertOne({
//             username: req.body.username,
//             password: hashedPassword,
//         });
//         req.flash('success_msg', 'You are now registered and can log in!');
//         res.redirect('/login');
//     } catch (err) {
//         req.flash('error_msg', 'Error registering new user');
//         res.status(500).send('Error registering new user');
//     }
// };

// // Render the login page
// const showLoginPage = (req, res) => {
//     res.render('login');
// };

// // Handle user login
// const loginUser = (req, res, next) => {
//     passport.authenticate('local', (err, user, info) => {
//         if (err) {
//             req.flash('error_msg', 'An error occurred during authentication.');
//             return next(err);
//         }
//         if (!user) {
//             req.flash('error_msg', 'Invalid username or password.');
//             return res.redirect('/login');
//         }
//         req.logIn(user, (err) => {
//             if (err) {
//                 req.flash('error_msg', 'An error occurred during login.');
//                 return next(err);
//             }
//             req.flash('success_msg', 'You are now logged in!');
//             return res.redirect('/');
//         });
//     })(req, res, next);
// };

// // Handle user logout
// const logoutUser = (req, res) => {
//     req.logout((err) => {
//         if (err) {
//             req.flash('error_msg', 'An error occurred during logout.');
//             return next(err);
//         }
//         req.flash('success_msg', 'You are logged out');
//         res.redirect('/');
//     });
// };

// module.exports = {
//     showRegisterPage,
//     registerUser,
//     showLoginPage,
//     loginUser,
//     logoutUser
// };





// server/controllers/authController.js

// // server/controllers/authController.js

// const bcrypt = require('bcrypt');
// const { getDB } = require('../config/db');
// const passport = require('passport');

// // Render the registration page
// const showRegisterPage = (req, res) => {
//     res.render('register');
// };

// // Handle user registration
// const registerUser = async (req, res) => {
//     try {
//         const hashedPassword = await bcrypt.hash(req.body.password, 10);
//         const db = getDB();
//         await db.collection('user').insertOne({
//             username: req.body.username,
//             password: hashedPassword,
//         });
//         req.flash('success_msg', 'You are now registered and can log in!');
//         res.redirect('/login');
//     } catch (err) {
//         req.flash('error_msg', 'Error registering new user');
//         res.status(500).send('Error registering new user');
//     }
// };

// // Render the login page
// const showLoginPage = (req, res) => {
//     res.render('login');
// };

// // Handle user login
// const loginUser = (req, res, next) => {
//     passport.authenticate('local', (err, user, info) => {
//         if (err) {
//             req.flash('error_msg', 'An error occurred during authentication.');
//             return next(err);
//         }
//         if (!user) {
//             req.flash('error_msg', 'Invalid username or password.');
//             return res.redirect('/login');
//         }
//         req.logIn(user, (err) => {
//             if (err) {
//                 req.flash('error_msg', 'An error occurred during login.');
//                 return next(err);
//             }
//             req.flash('success_msg', 'You are now logged in!');
//             return res.redirect('/');
//         });
//     })(req, res, next);
// };

// // Handle user logout
// const logoutUser = (req, res) => {
//     req.logout((err) => {
//         if (err) {
//             req.flash('error_msg', 'An error occurred during logout.');
//             return next(err);
//         }
//         req.flash('success_msg', 'You are logged out');
//         res.redirect('/');
//     });
// };

// module.exports = {
//     showRegisterPage,
//     registerUser,
//     showLoginPage,
//     loginUser,
//     logoutUser
// };




// server/controllers/authController.js

const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Assuming you have a User model for custom JWT-based authentication

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
        console.error('Login failed:', err.message);
        req.flash('error_msg', err.message || 'Login failed');
        res.redirect('/auth/login');
    }
};

// Custom JWT-Based Login
const loginUserJWT = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            req.flash('error_msg', 'Invalid credentials');
            return res.redirect('/auth/login');
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordValid) {
            req.flash('error_msg', 'Invalid credentials');
            return res.redirect('/auth/login');
        }

        // Sign the JWT token
        const token = jwt.sign(
            { _id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h', algorithm: 'HS256' }
        );
        console.log('Generated JWT:', token);

        // Store token in session
        req.session.token = token;

        // Redirect to the posts list
        res.redirect('/posts/list');
    } catch (err) {
        console.error('Error during login:', err);
        req.flash('error_msg', 'Login failed');
        res.redirect('/auth/login');
    }
};

// Middleware to ensure authentication using JWT
const ensureAuthenticated = (req, res, next) => {
    const token = req.session.token;
    if (token) {
        console.log('Token before verification:', token);
        jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
            if (err) {
                console.log('Token verification failed or expired:', err.message);
                req.flash('error_msg', 'Session expired, please log in again');
                return res.redirect('/auth/login');
            }
            req.user = decoded;
            next();
        });
    } else {
        console.log('No token found, redirecting to login.');
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
    loginUserCognito,  // Cognito-based login
    loginUserJWT,      // Custom JWT-based login
    ensureAuthenticated
};
