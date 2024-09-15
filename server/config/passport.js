const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { getDB } = require('./db'); // Ensure that getDB is correctly importing your database config
const { ObjectId } = require('mongodb');

// Local strategy for user authentication
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await getDB().collection('user').findOne({ username: username });

    if (!user) {
      return done(null, false, { message: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return done(null, false, { message: 'Incorrect password' });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Serialize user instance to store in session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await getDB().collection('user').findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
