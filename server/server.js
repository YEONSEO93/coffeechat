require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const sessionMiddleware = require('./middleware/session');
const viewGlobals = require('./middleware/viewGlobals');
const configureSocketIO = require('./config/socketio');


connectDB();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize HTTP and WebSocket server
const server = http.createServer(app);
configureSocketIO(server);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Middleware to serve static files (like CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(viewGlobals);

// Set up EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Passport configuration
const passport = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
connectDB();

// Import routes
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const chatRoutes = require('./routes/chatRoutes');
const streamRoutes = require('./routes/streamRoutes');
const commentRoutes = require('./routes/commentRoutes');

app.use('/', authRoutes);
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/chat', chatRoutes);
app.use('/stream', streamRoutes);
app.use('/comment', commentRoutes);


// Serve the homepage
app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

