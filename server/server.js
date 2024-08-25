// require('dotenv').config();
// const express = require('express');
// const app = express();
// const path = require('path');
// const http = require('http');
// const cookieParser = require('cookie-parser');
// const { connectDB } = require('./config/db');
// const sessionMiddleware = require('./middleware/session');
// const viewGlobals = require('./middleware/viewGlobals');
// const configureSocketIO = require('./config/socketio');


// connectDB();
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Initialize HTTP and WebSocket server
// const server = http.createServer(app);
// configureSocketIO(server);

// const PORT = process.env.PORT || 8080;
// server.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });

// // Middleware to serve static files (like CSS, images, etc.)
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(cookieParser());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(sessionMiddleware);
// app.use(viewGlobals);

// // Set up EJS as the templating engine
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// // Passport configuration
// const passport = require('./config/passport');
// app.use(passport.initialize());
// app.use(passport.session());

// // MongoDB connection
// connectDB();

// // Import routes
// const authRoutes = require('./routes/authRoutes');
// const postRoutes = require('./routes/postRoutes');
// const chatRoutes = require('./routes/chatRoutes');
// const streamRoutes = require('./routes/streamRoutes');
// const commentRoutes = require('./routes/commentRoutes');

// app.use('/', authRoutes);
// app.use('/auth', authRoutes);
// app.use('/posts', postRoutes);
// app.use('/chat', chatRoutes);
// app.use('/stream', streamRoutes);
// app.use('/comment', commentRoutes);


// // Serve the homepage
// app.get('/', (req, res) => {
//   res.render('index', { user: req.user });
// });






require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const sessionMiddleware = require('./middleware/session');
const viewGlobals = require('./middleware/viewGlobals');
const configureSocketIO = require('./config/socketio');
const session = require('express-session');
const flash = require('connect-flash');
const ensureAuthenticated = require('./middleware/auth');
const { getDB } = require('./config/db');
const app = express();




const cors = require('cors');

// Configure CORS options
const corsOptions = {
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 204 // Some legacy browsers choke on 204
};

// Apply CORS middleware
app.use(cors(corsOptions));



// Connect to the database
connectDB().then(() => {
    console.log("Connected to the database successfully");
}).catch(err => {
    console.error("Failed to connect to the database:", err);
    process.exit(1); 
});


// Set up static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Set up middleware to parse cookies and request bodies
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_key', // Use an environment variable for the secret or a fallback string
  resave: false,
  saveUninitialized: true,
}));

// Set up flash middleware
app.use(flash());

// Pass flash messages to views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// Set up custom session middleware and global view variables
app.use(sessionMiddleware);
app.use(viewGlobals);

// Set up EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Passport configuration for authentication
const passport = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Initialize HTTP and WebSocket server
const server = http.createServer(app);
configureSocketIO(server);

// Import and use routes
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
// app.get('/', (req, res) => {
//   res.render('index', { user: req.user });
// });




app.get('/', async (req, res) => {
    try {
        const db = getDB();  // Get the DB instance

        // If the user is logged in, fetch their posts
        if (req.user) {
            const userPosts = await db.collection('post').find({ user: req.user._id }).toArray();
            res.render('index', { user: req.user, posts: userPosts });
        } else {
            // If the user is not logged in, render the page without posts
            res.render('index', { user: null, posts: [] });
        }
    } catch (err) {
        console.error('Error fetching user posts:', err);
        res.status(500).send('Internal Server Error');
    }
});







// // Serve the homepage, showing only the user's posts
// app.get('/', ensureAuthenticated, async (req, res) => {
//     try {
//         const userPosts = await getDB().collection('post').find({ user: req.user._id }).toArray();
//         res.render('index', { user: req.user, posts: userPosts });
//     } catch (err) {
//         console.error('Error fetching user posts:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });




// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
