
// middleware/auth.js
function ensureAuthenticated(req, res, next) {
    console.log('ensureAuthenticated middleware, user:', req.user);
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
}

module.exports = ensureAuthenticated;