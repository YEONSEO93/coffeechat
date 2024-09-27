const express = require('express');
const AWS = require('aws-sdk');
const { CognitoIdentityProviderClient, ForgotPasswordCommand, ConfirmForgotPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const router = express.Router();
const authController = require('../controllers/authController');

// AWS Cognito Setup
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

// Routes for registration, login, and logout
router.get('/register', authController.showRegisterPage);
router.post('/register', authController.registerUser);
router.get('/login', authController.showLoginPage);
router.post('/login', authController.loginUserCognito);
router.get('/logout', authController.logoutUser);

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
