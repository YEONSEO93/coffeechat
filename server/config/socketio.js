
const { Server } = require('socket.io');
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const { getDB } = require('../config/db'); // Already fetching DB configuration securely
const { ObjectId } = require('mongodb');
const { getParameterValue } = require('../config/secretsManager'); // Helper to fetch secrets

async function configureSocketIO(server) {
  const io = new Server(server);

  // Fetch the session secret and DB URL securely from AWS
  const sessionSecret = await getParameterValue('/n11725605/SESSION_SECRET');
  const dbUrl = await getParameterValue('/n11725605/DB_URL');

  io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'connect.sid', // This is the default cookie name for express-session
    secret: sessionSecret, // Use the securely fetched session secret
    store: MongoStore.create({
      mongoUrl: dbUrl, // Use the securely fetched MongoDB URL
      dbName: 'coffeechat_ys', // Replace this if your database name differs
    }),
    success: (data, accept) => {
      console.log('Successful connection to socket.io');
      accept(null, true);
    },
    fail: (data, message, error, accept) => {
      if (error) {
        accept(new Error(message));
      }
      console.log('Failed connection to socket.io:', message);
      accept(null, false);
    }
  }));

  io.on('connection', (socket) => {
    console.log('WebSocket connected');

    socket.on('ask-join', (room) => {
      socket.join(room);
      console.log(`User joined room: ${room}`);
    });

    socket.on('message-send', async (data) => {
      try {
        const user = socket.request.user;
        const timestamp = new Date();

        if (!user) {
          console.error('User not found.');
          return;
        }

        const db = getDB(); // Fetch database connection
        await db.collection('chatMessage').insertOne({
          parentRoom: new ObjectId(data.room),
          content: data.msg,
          who: new ObjectId(user._id),
          username: user.username,
          timestamp: timestamp
        });

        const messageData = {
          username: user.username || 'Anonymous', 
          msg: data.msg,
          timestamp: timestamp
        };

        io.to(data.room).emit('newMessage', messageData);

      } catch (err) {
        console.error('Error handling message-send event:', err);
      }
    });
  });
}

module.exports = configureSocketIO;
