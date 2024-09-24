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
const { getSecretValue } = require('./config/secretsManager');

const AWS = require('aws-sdk');

const app = express();

async function initializeAWS() {
    try {
        const secret = await getSecretValue('n11725605-coffeechat4');  // 당신의 Secret 이름 사용
        if (!secret || !secret.accessKeyId || !secret.secretAccessKey) {
            throw new Error("Failed to retrieve AWS credentials from Secrets Manager.");
        }

        AWS.config.update({
            accessKeyId: secret.accessKeyId,
            secretAccessKey: secret.secretAccessKey,
            sessionToken: secret.sessionToken || process.env.AWS_SESSION_TOKEN, // 필요 시 사용
            region: process.env.AWS_REGION
        });

        console.log('AWS SDK successfully initialized with credentials from Secrets Manager.');
        return new AWS.S3();
    } catch (err) {
        console.error("Error initializing AWS:", err.message);
        throw err;
    }
}

(async () => {
    try {
        // Initialize AWS SDK with credentials from Secrets Manager
        const s3 = await initializeAWS();

        // MongoDB connection
        await connectDB();
        console.log("Connected to the database successfully");

        // File upload route
        app.post('/upload', upload.single('file'), async (req, res) => {
            if (!req.file) {
                return res.status(400).send('No file uploaded.');
            }

            const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: req.file.originalname,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
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

        // Start the Server
        const PORT = process.env.PORT || 8080;
        const server = http.createServer(app);
        configureSocketIO(server);
        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
    }
})();
