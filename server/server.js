// require('dotenv').config();
// const express = require('express');
// const path = require('path');
// const http = require('http');
// const cookieParser = require('cookie-parser');
// const { connectDB } = require('./config/db');
// const sessionMiddleware = require('./middleware/session');
// const viewGlobals = require('./middleware/viewGlobals');
// const configureSocketIO = require('./config/socketio');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const flash = require('connect-flash');
// const passport = require('./config/passport');
// const cors = require('cors');
// const { getDB } = require('./config/db');
// const app = express();


// const AWS = require('aws-sdk');
// AWS.config.update({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     sessionToken: process.env.AWS_SESSION_TOKEN,
//     region: process.env.AWS_REGION
// });

// const s3 = new AWS.S3();
// const cognito = new AWS.CognitoIdentityServiceProvider();


// const corsOptions = {
//     origin: ['http://localhost:3000'],
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true,
//     optionsSuccessStatus: 204
// };

// app.use(cors(corsOptions));

// connectDB().then(() => {
//     console.log("Connected to the database successfully");
// }).catch(err => {
//     console.error("Failed to connect to the database:", err);
//     process.exit(1); 
// });

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(cookieParser());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// app.use(session({
//   secret: process.env.SESSION_SECRET || 'default_secret_key',
//   resave: false,
//   saveUninitialized: false,
//   store: MongoStore.create({
//     mongoUrl: process.env.DB_URL
//   })
// }));

// app.use(flash());

// app.use((req, res, next) => {
//   res.locals.success_msg = req.flash('success_msg');
//   res.locals.error_msg = req.flash('error_msg');

//   next();
// });

// app.use(sessionMiddleware);
// app.use(passport.initialize());
// app.use(passport.session());

// app.use(viewGlobals);

// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));


// const server = http.createServer(app);
// configureSocketIO(server);

// const authRoutes = require('./routes/authRoutes');
// const postRoutes = require('./routes/postRoutes');
// const chatRoutes = require('./routes/chatRoutes');
// const commentRoutes = require('./routes/commentRoutes');

// app.use('/', authRoutes);
// app.use('/auth', authRoutes);
// app.use('/posts', postRoutes);
// app.use('/chat', chatRoutes);
// app.use('/comment', commentRoutes);

// app.get('/', async (req, res) => {
//     try {
//         const db = getDB();

//         if (req.user) {
//             const userPosts = await db.collection('post').find({ user: req.user._id }).toArray();
//             res.render('index', { user: req.user, posts: userPosts });
//         } else {
//             res.render('index', { user: null, posts: [] });
//         }
//     } catch (err) {
//         console.error('Error fetching user posts:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });


// app.disable('etag'); // Disable ETag to prevent caching issues

// const PORT = process.env.PORT || 8080;
// server.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });



// const fs = require('fs');
// const { createCanvas } = require('canvas');
// const GIFEncoder = require('gif-encoder-2');


// // Route for custom CPU-intensive task
// app.get('/create-intensive-gif', (req, res) => {
//     const text = "Test CPU Load"; // Sample text for the GIF

//     // Create a simple canvas image in memory
//     const width = 300;
//     const height = 300;
//     const canvas = createCanvas(width, height);
//     const ctx = canvas.getContext('2d');

//     // Fill the background with a color
//     ctx.fillStyle = 'blue';
//     ctx.fillRect(0, 0, width, height);

//     // Load the text onto the canvas
//     ctx.font = 'bold 30px Arial';
//     ctx.fillStyle = 'white';
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     ctx.fillText(text, width / 2, height / 2);

//     // Simulate a custom CPU-intensive task by applying complex transformations
//     const encoder = new GIFEncoder(width, height);
//     encoder.start();
//     encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
//     encoder.setDelay(500);  // frame delay in ms
//     encoder.setQuality(10); // image quality. 10 is default.

//     for (let i = 0; i < 50; i++) { // Repeat multiple times to increase CPU load
//         // Custom transformation: Rotate and apply a color filter
//         ctx.save();
//         ctx.translate(width / 2, height / 2);
//         ctx.rotate((Math.PI / 25) * i); // Rotate the image slightly on each frame
//         ctx.translate(-width / 2, -height / 2);

//         // Apply a custom color filter (invert colors as an example)
//         const imageData = ctx.getImageData(0, 0, width, height);
//         for (let j = 0; j < imageData.data.length; j += 4) {
//             imageData.data[j] = 255 - imageData.data[j];     // Red
//             imageData.data[j + 1] = 255 - imageData.data[j + 1]; // Green
//             imageData.data[j + 2] = 255 - imageData.data[j + 2]; // Blue
//         }
//         ctx.putImageData(imageData, 0, 0);

//         encoder.addFrame(ctx);
//         ctx.restore(); // Restore the original canvas state
//     }

//     encoder.finish();

//     // Simulate processing the GIF data without saving it
//     const gifBuffer = encoder.out.getData();
//     console.log('GIF buffer size:', gifBuffer.length);

//     res.send(`CPU-intensive processing completed. GIF buffer size: ${gifBuffer.length} bytes`);
// });



// // Load test script
// const numRequests = 1000; // Adjust the number to increase or decrease the load
// const concurrency = 50;   // Number of concurrent requests at a time
// const duration = 5 * 60 * 1000; // 5 minutes duration in milliseconds

// function sendRequest() {
//     return new Promise((resolve, reject) => {
//         const req = http.get(`http://localhost:${PORT}/create-intensive-gif`, (res) => {
//             res.on('data', () => {});
//             res.on('end', () => resolve());
//         });

//         req.on('error', reject);
//     });
// }

// async function startLoadTest() {
//     console.log('Starting load test...');
//     const startTime = Date.now();

//     while (Date.now() - startTime < duration) {
//         const promises = [];
//         for (let i = 0; i < concurrency; i++) {
//             promises.push(sendRequest());
//         }

//         await Promise.all(promises);
//     }

//     console.log('Load test completed.');
// }

// //http://localhost:8080/create-intensive-gif







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
    origin: ['http://localhost:3000'],
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
    cookie: { maxAge: 3600000 } // 1 hour
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
