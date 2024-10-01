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
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const AWS = require('aws-sdk');

const app = express();

// Function to fetch the AWS credentials from Secrets Manager
async function getAWSCredentials() {
    const client = new SecretsManagerClient({ region: 'ap-southeast-2' });
    const secretName = "n11725605-assignment2-latest";

    try {
        const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
        if (response.SecretString) {
            const secret = JSON.parse(response.SecretString);
            AWS.config.update({
                accessKeyId: secret.accessKeyId,
                secretAccessKey: secret.secretAccessKey,
                region: 'ap-southeast-2'
            });
            console.log('AWS SDK Initialized with Secrets Manager credentials');
            return secret;
        }
    } catch (error) {
        if (error.name === 'ExpiredTokenException') {
            console.error("Your AWS token has expired. Please run 'aws sso login' to refresh.");
        } else {
            console.error("Error retrieving secret:", error);
        }
        throw error;
    }
}

// Initialize AWS SDK with credentials from Secrets Manager
async function initializeAWS() {
    try {
        const secret = await getAWSCredentials();  // Use fetched credentials
        AWS.config.update({
            accessKeyId: secret.accessKeyId,
            secretAccessKey: secret.secretAccessKey,
            sessionToken: secret.sessionToken || '',  // Optional for temp credentials
            region: 'ap-southeast-2'
        });

        console.log('AWS SDK initialized with credentials from Secrets Manager.');
        return new AWS.S3();
    } catch (err) {
        console.error("Error initializing AWS SDK:", err.message);
        throw err;
    }
}

// Cognito initialization
let cognito;

async function initializeCognito() {
    const secret = await getAWSCredentials();  // Use fetched credentials
    AWS.config.update({
        accessKeyId: secret.accessKeyId,
        secretAccessKey: secret.secretAccessKey,
        // sessionToken: secret.sessionToken || '', // Optional for temp credentials
        region: 'ap-southeast-2'
    });
    cognito = new AWS.CognitoIdentityServiceProvider();
    console.log("Cognito initialized");
}

(async () => {
    try {
        // Initialize AWS SDK, Cognito, and MongoDB
        await initializeAWS();
        await initializeCognito();
        await connectDB();
        console.log("Connected to the database successfully");

        // Define routes and start server
        const PORT = process.env.PORT || 8080;
        const server = http.createServer(app);
        configureSocketIO(server);
        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Error starting the server:", err);
    }
})();

// S3 Client setup using AWS SDK v3
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Using environment variables for S3 configuration
const bucketName = process.env.AWS_BUCKET_NAME; // Bucket name from .env
const region = process.env.AWS_REGION; // AWS region from .env

// S3 Client setup
const s3Client = new S3Client({
    region,
    credentials: AWS.config.credentials // Use credentials from AWS SDK
});

// MongoDB connection
connectDB().then(() => {
    console.log("Connected to the database successfully");
}).catch(err => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
});

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

// File upload route with S3Client from AWS SDK v3
app.post('/upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const userId = req.user.sub;  // Get user ID from Cognito
    const email = req.user.email;

    const params = {
        Bucket: bucketName,
        Key: `${userId}/${req.file.originalname}`,  // User-specific folder
        Body: req.file.buffer,  // File content from memory
        ContentType: req.file.mimetype,
        Metadata: {
            'uploaded-by': email  // Add user email as metadata
        }
    };

    console.log('Uploading to bucket:', bucketName);
    console.log('Uploading file with key:', `${userId}/${req.file.originalname}`);

    try {
        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);
        res.status(200).send(`File uploaded successfully: https://${bucketName}.s3.${region}.amazonaws.com/${userId}/${req.file.originalname}`);
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).send('File upload failed');
    }
});

// Test Session Route
app.get('/test-session', (req, res) => {
    console.log('Session data:', req.session);
    res.send(req.session); // Return session data to check if token exists
});

// Disable ETag
app.disable('etag');

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

// Start the Server
const PORT = process.env.PORT || 8080;
const server = http.createServer(app);
configureSocketIO(server);
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

require('events').EventEmitter.defaultMaxListeners = 20; // Increase the limit as needed
