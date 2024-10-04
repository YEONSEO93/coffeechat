
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { getParameterValue } = require('./config/secretsManager'); // Import the helper to fetch secrets/parameters

async function initializeSessionMiddleware() {
    // Fetch session-related secrets and parameters
    const sessionSecret = await getParameterValue('/n11725605/SESSION_SECRET'); // Fetch SESSION_SECRET from AWS Parameter Store
    const dbUrl = await getParameterValue('/n11725605/DB_URL'); // Fetch MongoDB connection URL from AWS Parameter Store

    return session({
        secret: sessionSecret, // Use the securely fetched session secret
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: dbUrl, // Use the securely fetched MongoDB URL
            dbName: 'coffeechat_ys', // Replace this with your database name or fetch dynamically if needed
        }),
        cookie: {
            maxAge: 60 * 60 * 1000, // 1 hour
            secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production
            httpOnly: true,
            sameSite: 'lax' // Adjust sameSite based on your requirements
        }
    });
}

// Middleware to ensure authentication
module.exports = async function ensureAuthenticated(req, res, next) {
    console.log('ensureAuthenticated middleware, session data:', req.session); // Log the entire session

    if (req.session.token) {
        return next(); // User is authenticated
    }

    console.log('Redirecting to login because session token is missing');
    res.redirect('/auth/login'); // Redirect to login if not authenticated
};

// Export the session middleware to be used in the server setup
module.exports.initializeSessionMiddleware = initializeSessionMiddleware;
