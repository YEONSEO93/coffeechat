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
//     cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
//   }));
// };



const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = (app) => {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: 'coffeechat_ys',
    }),
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
    secure: process.env.NODE_ENV === 'production', // secure only in production
      httpOnly: true, // Optional: Helps prevent XSS attacks    }
    }
  }));
};
