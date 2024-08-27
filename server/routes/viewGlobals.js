// middleware/viewGlobals.js

function viewGlobals(req, res, next) {
    console.log('viewGlobals middleware executed, req.user:', req.user);
    res.locals.user = req.user || null; // Set res.locals.user based on req.user
    console.log('res.locals.user after assignment:', res.locals.user);
    next();
}

module.exports = viewGlobals;
