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
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('./config/passport');
const cors = require('cors');
const { getDB } = require('./config/db');
const app = express();





const corsOptions = {
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

connectDB().then(() => {
    console.log("Connected to the database successfully");
}).catch(err => {
    console.error("Failed to connect to the database:", err);
    process.exit(1); 
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URL
  })
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
      console.log('res.locals after viewGlobals:', res.locals);

  next();
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.use(viewGlobals);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


const server = http.createServer(app);
configureSocketIO(server);

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const chatRoutes = require('./routes/chatRoutes');
const commentRoutes = require('./routes/commentRoutes');

app.use('/', authRoutes);
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/chat', chatRoutes);
app.use('/comment', commentRoutes);

app.get('/', async (req, res) => {
    try {
        const db = getDB();

        if (req.user) {
            const userPosts = await db.collection('post').find({ user: req.user._id }).toArray();
            res.render('index', { user: req.user, posts: userPosts });
        } else {
            res.render('index', { user: null, posts: [] });
        }
    } catch (err) {
        console.error('Error fetching user posts:', err);
        res.status(500).send('Internal Server Error');
    }
});


app.disable('etag'); // Disable ETag to prevent caching issues

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
