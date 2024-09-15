const session = require('express-session');
const MongoStore = require('connect-mongo');

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your_fallback_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL,
        dbName: 'coffeechat_ys',
    }),
    cookie: {
        maxAge: 60 * 60 * 1000, // 1 hour
        secure: process.env.NODE_ENV === 'production', // Secure in production
        httpOnly: true,
        sameSite: 'lax'
    }
});

module.exports = sessionMiddleware;
