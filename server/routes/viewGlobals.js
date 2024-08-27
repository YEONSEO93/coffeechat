// middleware/viewGlobals.js

function viewGlobals(req, res, next) {
    res.locals.user = req.user || null;
    next();
}

module.exports = viewGlobals;





