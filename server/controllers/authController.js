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
        res.redirect('/login');
    } catch (err) {
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
            console.log('Error during authentication:', err);
            return next(err);
        }
        if (!user) {
            console.log('Authentication failed:', info.message);
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                console.log('Login error:', err);
                return next(err);
            }
            console.log('Login successful:', user);
            return res.redirect('/');
        });
    })(req, res, next);
};


// Handle user logout
const logoutUser = (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
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
