// const session = require('express-session');
// const MongoStore = require('connect-mongo');

// const sessionMiddleware = session({
//     secret: process.env.SESSION_SECRET || 'your_fallback_secret_key',
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//         mongoUrl: process.env.DB_URL,
//         dbName: 'coffeechat_ys',
//     }),
//     cookie: {
//         maxAge: 60 * 60 * 1000, // 1 hour
//         secure: process.env.NODE_ENV === 'production', // Secure in production
//         httpOnly: true,
//         sameSite: 'lax'
//     }
// });

// module.exports = sessionMiddleware;





const session = require('express-session');
const MongoStore = require('connect-mongo');
const { getSecretValue } = require('../config/secretsManager');
const { getParameterValue } = require('../config/secretsManager'); // Assuming parameters are retrieved from AWS Systems Manager (SSM)

const setupSession = async () => {
    try {
        // Retrieve SESSION_SECRET from AWS Secrets Manager
        const secrets = await getSecretValue('n11725605-assignment2-latest');  // Adjust with your secret name
        const sessionSecret = secrets.SESSION_SECRET;

        // Retrieve DB_URL from AWS Systems Manager Parameter Store
        const dbUrl = await getParameterValue('/n11725605/DB_URL');

        // Create session middleware
        const sessionMiddleware = session({
            secret: sessionSecret,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: dbUrl,
                dbName: 'coffeechat_ys',
            }),
            cookie: {
                maxAge: 60 * 60 * 1000, // 1 hour
                secure: process.env.NODE_ENV === 'production', // Secure in production
                httpOnly: true,
                sameSite: 'lax'
            }
        });

        return sessionMiddleware;
    } catch (err) {
        console.error('Error setting up session middleware:', err);
        throw err;
    }
};

// Export the function that sets up session middleware
module.exports = setupSession;
