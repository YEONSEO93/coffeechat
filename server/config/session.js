

// const session = require('express-session');
// const MongoStore = require('connect-mongo');

// module.exports = (app) => {
//   app.use(session({
//     secret: process.env.SESSION_SECRET || 'default_secret_key',
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//       mongoUrl: process.env.DB_URL,
//       dbName: 'coffeechat_ys',
//     }),
//     cookie: {
//       maxAge: 60 * 60 * 1000, // 1 hour
//     secure: process.env.NODE_ENV === 'production', // secure only in production
//       httpOnly: true, // Optional: Helps prevent XSS attacks    }
//     }
//   }));
// };





const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = function ensureAuthenticated(req, res, next) {
    console.log('ensureAuthenticated middleware, session data:', req.session); // Log the entire session

    if (req.session.token) {
        return next(); // User is authenticated
    }

    console.log('Redirecting to login because session token is missing');
    res.redirect('/auth/login'); // Redirect to login if not authenticated
};

