require('dotenv').config();
const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');

// Configure multer for file upload handling
const upload = multer({ dest: 'uploads/' });

// Initialize HTTP and WebSocket server
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const axios = require('axios');

// Middleware to serve static files (like CSS, images, etc.)
app.use(express.static(__dirname + '/public'));

// Set up EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse the body of POST requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up session middleware with MongoStore
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URL,
    dbName: 'coffeechat_ys',
  }),
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// Initialize Passport and configure session support
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy for login
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await db.collection('user').findOne({ username: username });
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

// Serialize and deserialize user information for sessions
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.collection('user').findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// MongoDB connection
let db;
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true })
  .then(client => {
    console.log('DB connected!');
    db = client.db('coffeechat_ys');
  })
  .catch(err => {
    console.error('Failed to connect to the database', err);
  });

// Serve the homepage
app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

// Registration routes
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await db.collection('user').insertOne({
      username: req.body.username,
      password: hashedPassword,
    });
    res.redirect('/login');
  } catch (err) {
    res.status(500).send('Error registering new user');
  }
});

// Login routes
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: false
}));

// Logout route
app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Serve the list of posts
app.get('/list', async (req, res) => {
  try {
    const posts = await db.collection('post').aggregate([
      {
        $lookup: {
          from: 'comment',
          localField: '_id',
          foreignField: 'parentId',
          as: 'comments'
        }
      },
      {
        $addFields: {
          commentCount: { $size: '$comments' }
        }
      }
    ]).toArray();

    res.render('list', { posts: posts, user: req.user });
  } catch (err) {
    console.error('Failed to fetch posts with comment counts', err);
    res.status(500).send('Failed to fetch posts');
  }
});

// Render the write form
app.get('/write', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.render('write');
});

app.post('/add', upload.single('img1'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('You need to log in to add a post');
  }

  let imageUrl = null;

  if (req.file) {
    try {
      const formData = new FormData();
      const fileStream = fs.createReadStream(req.file.path);
      const contentType = req.file.mimetype;

      // Append the file with the correct content type and filename
      formData.append('file', fileStream, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const response = await axios.post(
        'https://api.cloudflare.com/client/v4/accounts/626e6384b0c0fb9f6780cfadeff08425/images/v1',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
            ...formData.getHeaders(),
          },
        }
      );

      const data = response.data;

      if (data.success) {
        const imageId = data.result.id;
        const accountHash = '946t3Bn7epLNWC96BjzU3Q'; // Your account hash
        imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`;
      } else {
        console.error('Error uploading image to Cloudflare:', data.errors);
      }

      // Remove the file from the server after upload
      fs.unlinkSync(req.file.path);

    } catch (err) {
      console.error('Failed to upload image:', err);
    }
  }

  try {
    await db.collection('post').insertOne({
      title: req.body.title,
      content: req.body.content,
      imageUrl: imageUrl,
      createdAt: new Date(),
      user: req.user._id,               // Store the logged-in user's ID
      username: req.user.username       // Store the logged-in user's username
    });
    res.redirect('/list');
  } catch (err) {
    console.error('Database error occurred:', err);
    res.status(500).send('Failed to save the post');
  }
});

// Handle fetching a post by ID with error handling
app.get('/detail/:id', async (req, res) => {
  try {
    const result = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
    const result2 = await db.collection('comment').find({ parentId: new ObjectId(req.params.id) }).toArray();
    res.render('detail', { result: result, result2: result2, user: req.user });
  } catch (err) {
    console.error('Invalid ID format or database error:', err);
    res.status(400).send('Invalid ID format or database error.');
  }
});

app.post('/edit-comment/:id', async (req, res) => {
  try {
    await db.collection('comment').updateOne(
      { _id: new ObjectId(req.params.id), writerId: new ObjectId(req.user._id) },
      { $set: { content: req.body.content } }
    );
    res.redirect('back');
  } catch (err) {
    console.error('Failed to edit comment:', err);
    res.status(500).send('Failed to edit comment.');
  }
});

app.post('/delete-comment/:id', async (req, res) => {
  try {
    await db.collection('comment').deleteOne({ _id: new ObjectId(req.params.id), writerId: new ObjectId(req.user._id) });
    res.redirect('back');
  } catch (err) {
    console.error('Failed to delete comment:', err);
    res.status(500).send('Failed to delete comment.');
  }
});

// Handle adding a comment
app.post('/comment', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('You need to log in to add a comment');
  }
  try {
    await db.collection('comment').insertOne({
      content: req.body.content,
      writerId: new ObjectId(req.user._id),
      writer: req.user.username,
      parentId: new ObjectId(req.body.parentId),
      createdAt: new Date(),
    });
    res.redirect('back');
  } catch (err) {
    console.error('Failed to add comment:', err);
    res.status(500).send('Failed to add comment');
  }
});

// Render the edit form with the current post data
app.get('/edit/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  try {
    const post = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
    if (post) {
      if (post.user.equals(req.user._id)) {
        res.render('edit', { result: post });
      } else {
        res.status(403).send('You do not have permission to edit this post.');
      }
    } else {
      res.status(404).send('Post not found.');
    }
  } catch (err) {
    console.error('Invalid ID format or database error:', err);
    res.status(400).send('Invalid ID format or database error.');
  }
});

// Handle updating a post
app.post('/edit/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  try {
    const post = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
    if (post) {
      if (post.user.equals(req.user._id)) {
        if (req.body.title === '') {
          res.status(400).send('Title is required.');
        } else {
          await db.collection('post').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { title: req.body.title, content: req.body.content } }
          );
          res.redirect('/list');
        }
      } else {
        res.status(403).send('You do not have permission to edit this post.');
      }
    } else {
      res.status(404).send('Post not found.');
    }
  } catch (err) {
    console.error('Database error occurred:', err);
    res.status(500).send('Failed to update the post.');
  }
});

// Handle deleting a post
app.delete('/delete/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('You need to log in to delete a post');
  }
  try {
    const post = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
    if (post) {
      if (post.user.equals(req.user._id)) {
        await db.collection('post').deleteOne({ _id: new ObjectId(req.params.id) });
        res.send('Post deleted');
      } else {
        res.status(403).send('You do not have permission to delete this post.');
      }
    } else {
      res.status(404).send('Post not found.');
    }
  } catch (err) {
    console.error('Failed to delete post:', err);
    res.status(500).send('Failed to delete the post.');
  }
});

// Chat request and chatroom creation
app.get('/chat/request', ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.query.postId;
    if (!ObjectId.isValid(postId)) {
      return res.status(400).send('Invalid postId');
    }

    const post = await db.collection('post').findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return res.status(404).send('Post not found.');
    }

    const chatroomExists = await db.collection('chatroom').findOne({
      member: { $all: [req.user._id, post.user] }
    });

    if (!chatroomExists) {
      await db.collection('chatroom').insertOne({
        member: [req.user._id, post.user],
        postTitle: post.title, // Store the post title
        date: new Date()
      });
    }

    res.redirect('/chat/list');
  } catch (err) {
    console.error('Error creating chatroom:', err.message, err.stack);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/chat/request', ensureAuthenticated, async (req, res) => {
  console.log('Authenticated user:', req.user);
  try {
    const postId = req.query.postId;
    if (!ObjectId.isValid(postId)) {
      return res.status(400).send('Invalid postId');
    }

    const post = await db.collection('post').findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return res.status(404).send('Post not found.');
    }

    const chatroomExists = await db.collection('chatroom').findOne({
      member: { $all: [req.user._id, post.user] }
    });

    if (!chatroomExists) {
      await db.collection('chatroom').insertOne({
        member: [req.user._id, post.user],
        postTitle: post.title, // Store the post title
        date: new Date()
      });
    }

    res.redirect('/chat/list');
  } catch (err) {
    console.error('Error creating chatroom:', err.message, err.stack);
    res.status(500).send('Internal Server Error');
  }
});









// Fetch chatrooms for a user
app.get('/chat/list', async (req, res) => {
  try {
    const chatrooms = await db.collection('chatroom').find({ member: req.user._id }).toArray();
    res.render('chatList', { chatrooms: chatrooms });
  } catch (err) {
    console.error('Failed to fetch chatrooms:', err);
    res.status(500).send('Failed to fetch chatrooms');
  }
});

// Fetch chatroom details and messages
app.get('/chat/detail/:id', async (req, res) => {
  try {
    const chatroom = await db.collection('chatroom').findOne({ _id: new ObjectId(req.params.id) });

    if (!chatroom) {
      return res.status(404).send('Chatroom not found.');
    }

    const members = await db.collection('user').find({ _id: { $in: chatroom.member } }).toArray();
    const memberUsernames = members.map(member => member.username);

    res.render('chatDetail', { chatroom: chatroom, memberUsernames: memberUsernames });
  } catch (err) {
    console.error('Error fetching chatroom details:', err);
    res.status(500).send('Internal Server Error');
  }
});






io.on('connection', (socket) => {
  console.log('WebSocket connected');

  // Handle joining a room
  socket.on('ask-join', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  // Handle sending a message
  socket.on('message-send', async (data) => {
    try {
      const user = socket.request.user; // Now you can directly access user data
      const timestamp = new Date();

      if (!user) {
        console.error('User not found.');
        return;
      }

      // Save the message to the database
      await db.collection('chatMessage').insertOne({
        parentRoom: new ObjectId(data.room),   // Room ID
        content: data.msg,                     // The message content
        who: new ObjectId(user._id),           // The user ID who sent the message
        username: user.username,               // The username of the sender
        timestamp: timestamp                   // The time when the message was sent
      });

      // Broadcast the message to others in the room
      io.to(data.room).emit('newMessage', {
        msg: data.msg,
        username: user.username,               // Send the username to the client
        timestamp: timestamp                   // Send the timestamp to the client
      });

    } catch (err) {
      console.error('Error handling message-send event:', err);
    }
  });
});






function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Protect the write page
app.get('/write', ensureAuthenticated, (req, res) => {
  res.render('write');
});

// Protect the post addition route
app.post('/add', ensureAuthenticated, upload.single('img1'), async (req, res) => {
  try {
    let imageUrl = null;

    if (req.file) {
      // Handle image upload logic
    }

    await db.collection('post').insertOne({
      title: req.body.title,
      content: req.body.content,
      imageUrl: imageUrl,
      createdAt: new Date(),
      user: req.user._id,
      username: req.user.username
    });
    res.redirect('/list');
  } catch (err) {
    console.error('Database error occurred:', err);
    res.status(500).send('Failed to save the post');
  }
});

// Protect the edit route
app.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const post = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
    if (post) {
      if (post.user.equals(req.user._id)) {
        res.render('edit', { result: post });
      } else {
        res.status(403).send('You do not have permission to edit this post.');
      }
    } else {
      res.status(404).send('Post not found.');
    }
  } catch (err) {
    console.error('Invalid ID format or database error:', err);
    res.status(400).send('Invalid ID format or database error.');
  }
});

// Protect the chat room list
app.get('/chat/list', ensureAuthenticated, async (req, res) => {
  try {
    const chatrooms = await db.collection('chatroom').find({ member: req.user._id }).toArray();
    res.render('chatList', { chatrooms: chatrooms });
  } catch (err) {
    console.error('Failed to fetch chatrooms:', err);
    res.status(500).send('Failed to fetch chatrooms');
  }
});

// Protect the chat request route
app.get('/chat/request', ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.query.postId;
    if (!ObjectId.isValid(postId)) {
      return res.status(400).send('Invalid postId');
    }

    const post = await db.collection('post').findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return res.status(404).send('Post not found.');
    }

    const chatroomExists = await db.collection('chatroom').findOne({
      member: { $all: [req.user._id, post.user] }
    });

    if (!chatroomExists) {
      await db.collection('chatroom').insertOne({
        member: [req.user._id, post.user],
        postTitle: post.title,
        date: new Date()
      });
    }

    res.redirect('/chat/list');
  } catch (err) {
    console.error('Error creating chatroom:', err.message, err.stack);
    res.status(500).send('Internal Server Error');
  }
});


const passportSocketIo = require('passport.socketio');

// Set up session middleware for Socket.IO
io.use(passportSocketIo.authorize({
  cookieParser: require('cookie-parser'), // the same cookie parser middleware
  key: 'connect.sid', // the cookie key (default is 'connect.sid')
  secret: 'your_secret_key', // the session secret as used in the express-session middleware
  store: MongoStore.create({ mongoUrl: process.env.DB_URL, dbName: 'coffeechat_ys' }), // session store as used in the express-session middleware
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







// Route to render the live stream page
app.get('/livestream', ensureAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        const stream = await db.collection('liveStream').findOne({ userId: user._id });

        if (!stream) {
            return res.status(404).render('livestream', { user: req.user, stream: null });
        }

        res.render('livestream', { user: req.user, stream: stream });
    } catch (err) {
        console.error('Error fetching stream:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Start live stream logic
app.post('/start-stream', ensureAuthenticated, async (req, res) => {
    try {
        const { title } = req.body;

        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
            {
                meta: { name: title },
                recording: { mode: "automatic" }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`
                }
            }
        );

        if (response.data.success) {
            const stream = await db.collection('liveStream').insertOne({
                title: title,
                stream_id: response.data.result.uid,
                stream_key: response.data.result.rtmps.streamKey,
                userId: req.user._id
            });

            res.redirect(`/streams/${stream.insertedId}`);
        } else {
            console.error('Error starting stream:', response.data.errors);
            res.status(500).send('Failed to start the stream.');
        }
    } catch (err) {
        console.error('Error starting stream:', err);
        res.status(500).send('Failed to start the stream.');
    }
});

// Fetch and display a stream
app.get('/streams/:id', ensureAuthenticated, async (req, res) => {
    try {
        const stream = await db.collection('liveStream').findOne({ _id: new ObjectId(req.params.id) });
        if (!stream) {
            return res.status(404).send('Stream not found');
        }
        res.render('livestream', { stream, user: req.user });
    } catch (err) {
        console.error('Error fetching stream:', err);
        res.status(500).send('Failed to load the stream');
    }
});











// Function to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get('/start-stream', ensureAuthenticated, (req, res) => {
    res.render('startStream', { user: req.user });
});

app.post('/start-stream', ensureAuthenticated, async (req, res) => {
    try {
        const { title } = req.body;

        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
            {
                meta: { name: title },
                recording: { mode: "automatic" }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`
                }
            }
        );

        const data = response.data;
        const stream = await db.collection('liveStream').insertOne({
            title: title,
            stream_id: data.result.uid,
            stream_key: data.result.rtmps.streamKey,
            userId: req.user._id
        });

        res.redirect(`/streams/${stream.insertedId}`);
    } catch (err) {
        console.error('Error starting stream:', err);
        res.status(500).send('Failed to start the stream.');
    }
});

