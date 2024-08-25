const { Server } = require('socket.io');
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');  // Make sure ObjectId is available

function configureSocketIO(server) {
  const io = new Server(server);

  io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'connect.sid',
    secret: 'your_secret_key',
    store: MongoStore.create({ mongoUrl: process.env.DB_URL, dbName: 'coffeechat_ys' }),
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

        const db = getDB();
        await db.collection('chatMessage').insertOne({
          parentRoom: new ObjectId(data.room),
          content: data.msg,
          who: new ObjectId(user._id),
          username: user.username,
          timestamp: timestamp
        });

        io.to(data.room).emit('newMessage', {
          msg: data.msg,
          username: user.username,
          timestamp: timestamp
        });

      } catch (err) {
        console.error('Error handling message-send event:', err);
      }
    });
  });
}

module.exports = configureSocketIO;
