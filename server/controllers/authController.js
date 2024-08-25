// server/controllers/authController.js

const bcrypt = require('bcrypt');
const { getDB } = require('../config/db');
const passport = require('passport');

// Render the registration page
const showRegisterPage = (req, res) => {
    res.render('register');
};

// Handle user registration
const registerUser = async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const db = getDB();
        await db.collection('user').insertOne({
            username: req.body.username,
            password: hashedPassword,
        });
        req.flash('success_msg', 'You are now registered and can log in!');
        res.redirect('/login');
    } catch (err) {
        req.flash('error_msg', 'Error registering new user');
        res.status(500).send('Error registering new user');
    }
};

// Render the login page
const showLoginPage = (req, res) => {
    res.render('login');
};

// Handle user login
const loginUser = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            req.flash('error_msg', 'An error occurred during authentication.');
            return next(err);
        }
        if (!user) {
            req.flash('error_msg', 'Invalid username or password.');
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                req.flash('error_msg', 'An error occurred during login.');
                return next(err);
            }
            req.flash('success_msg', 'You are now logged in!');
            return res.redirect('/');
        });
    })(req, res, next);
};

// Handle user logout
const logoutUser = (req, res) => {
    req.logout((err) => {
        if (err) {
            req.flash('error_msg', 'An error occurred during logout.');
            return next(err);
        }
        req.flash('success_msg', 'You are logged out');
        res.redirect('/');
    });
};

module.exports = {
    showRegisterPage,
    registerUser,
    showLoginPage,
    loginUser,
    logoutUser
};
