require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('./config/passport');
const cors = require('cors');
const { getDB } = require('./config/db');
const configureSocketIO = require('./config/socketio');
const ensureAuthenticated = require('./middleware/auth');
const multer = require('multer'); // Add multer
const upload = multer({ storage: multer.memoryStorage() });

const app = express();

// MongoDB connection
connectDB().then(() => {
    console.log("Connected to the database successfully");
}).catch(err => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
});


// AWS SDK Setup
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region: process.env.AWS_REGION
});


console.log('AWS Access Key ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('AWS Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY);
console.log('AWS Session Token:', process.env.AWS_SESSION_TOKEN);

const s3 = new AWS.S3();
// File upload route
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: req.file.originalname,  // Use original file name or generate a unique key
        Body: req.file.buffer,       // File content from memory
        ContentType: req.file.mimetype // Correct file MIME type
    };

    console.log('Uploading to bucket:', process.env.AWS_BUCKET_NAME);
    console.log('Uploading file with key:', req.file.originalname);

    try {
        const data = await s3.upload(params).promise();
        res.status(200).send(`File uploaded successfully: ${data.Location}`);
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).send('File upload failed');
    }
});


const cognito = new AWS.CognitoIdentityServiceProvider();



// CORS Setup
app.use(cors({
    origin: ['http://localhost:8080'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

// Middleware Setup
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL
    }),
    cookie: {
        maxAge: 3600000,
        secure: false,  // Set to true in production with HTTPS
        sameSite: 'lax' // This allows cross-site cookies, essential in OAuth flows
    }
}));

// Flash Messages Setup
app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Passport Setup
app.use(passport.initialize());
app.use(passport.session());

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const chatRoutes = require('./routes/chatRoutes');
const commentRoutes = require('./routes/commentRoutes');

app.use('/auth', authRoutes);
app.use('/posts', ensureAuthenticated, postRoutes);
app.use('/chat', ensureAuthenticated, chatRoutes);
app.use('/comment', ensureAuthenticated, commentRoutes);

app.get('/', async (req, res) => {
    try {
        const db = getDB();
        if (req.session.token) {
            const userPosts = await db.collection('post').find().toArray();
            res.render('index', { user: true, posts: userPosts });
        } else {
            res.render('index', { user: null, posts: [] });
        }
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/dashboard', (req, res) => {
    const user = req.session.user;  // Assuming user data is stored in session after login
    const posts = [ /* fetch posts for the user */ ];
    
    res.render('dashboard', { user, posts });
});


// Test Session Route
app.get('/test-session', (req, res) => {
    console.log('Session data:', req.session);
    res.send(req.session); // Return session data to check if token exists
});

// Disable ETag
app.disable('etag');

// Start the Server
const PORT = process.env.PORT || 8080;
const server = http.createServer(app);
configureSocketIO(server);
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
