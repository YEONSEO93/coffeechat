// require('dotenv').config();
// const express = require('express');
// const path = require('path');
// const http = require('http');
// const cookieParser = require('cookie-parser');
// const { connectDB } = require('./config/db');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const flash = require('connect-flash');
// const passport = require('./config/passport');
// const cors = require('cors');
// const { getDB } = require('./config/db');
// const configureSocketIO = require('./config/socketio');
// const ensureAuthenticated = require('./middleware/auth');
// const multer = require('multer'); // Add multer for file upload handling
// const upload = multer({ storage: multer.memoryStorage() });
// const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
// const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { DynamoDBClient } = require('@aws-sdk/client-dynamodb'); // DynamoDB client
// const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb'); // Document client
// const { v4: uuidv4 } = require('uuid'); // UUID for postId

// const app = express();

// // Function to retrieve AWS credentials from Secrets Manager
// async function getAWSCredentials() {
//     const client = new SecretsManagerClient({ region: 'ap-southeast-2' });
//     const secretName = "n11725605-assignment2-latest";

//     try {
//         const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
//         if (response.SecretString) {
//             const secret = JSON.parse(response.SecretString);
//             console.log("Retrieved AWS credentials:", secret); // Log the secret
//             return secret;
//         } else {
//             console.log("SecretString is empty");
//         }
//     } catch (error) {
//         console.error("Error retrieving secret:", error);
//     }
// }

// // Function to initialize AWS SDK using credentials from Secrets Manager
// async function initializeAWS() {
//     const secret = await getAWSCredentials();
//     AWS.config.update({
//         accessKeyId: secret.accessKeyId,
//         secretAccessKey: secret.secretAccessKey,
//         sessionToken: secret.sessionToken || '',
//         region: 'ap-southeast-2'
//     });

//     console.log('AWS SDK initialized with credentials from Secrets Manager.');
// }

// // MongoDB connection
// connectDB().then(() => {
//     console.log("Connected to the database successfully");
// }).catch(err => {
//     console.error("Failed to connect to the database:", err);
//     process.exit(1);
// });

// // CORS Setup
// app.use(cors({
//     origin: ['http://localhost:3000'],
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true,
//     optionsSuccessStatus: 204
// }));

// // Middleware Setup
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(cookieParser());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// // Session Setup
// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//         mongoUrl: process.env.DB_URL
//     }),
//     cookie: { maxAge: 3600000 } // 1 hour
// }));

// // Flash Messages Setup
// app.use(flash());
// app.use((req, res, next) => {
//     res.locals.success_msg = req.flash('success_msg');
//     res.locals.error_msg = req.flash('error_msg');
//     next();
// });

// // Passport Setup
// app.use(passport.initialize());
// app.use(passport.session());

// // View Engine Setup
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// // S3 Client setup using AWS SDK v3
// async function createS3Client() {
//     const secret = await getAWSCredentials();

//      // Log the credentials to ensure they are correctly retrieved
//     console.log('AWS Credentials:', {
//         accessKeyId: secret.accessKeyId,
//         secretAccessKey: secret.secretAccessKey,
//         sessionToken: secret.sessionToken,
//     });
    
//     // Ensure valid credentials
//     if (!secret || !secret.accessKeyId || !secret.secretAccessKey) {
//         throw new Error("Invalid AWS credentials");
//     }

//     return new S3Client({
//         region: 'ap-southeast-2',
//         credentials: {
//             accessKeyId: secret.accessKeyId,
//             secretAccessKey: secret.secretAccessKey,
//             sessionToken: secret.sessionToken || '',
//         }
//     });
// }




// // DynamoDB Client creation function
// async function createDynamoDBClient() {
//     const secret = await getAWSCredentials();
//     const client = new DynamoDBClient({
//         region: 'ap-southeast-2',
//         credentials: {
//             accessKeyId: secret.accessKeyId,
//             secretAccessKey: secret.secretAccessKey,
//             sessionToken: secret.sessionToken
//         }
//     });
//     return DynamoDBDocumentClient.from(client); // Convert to DocumentClient for easier interaction
// }

// // Route for file upload using AWS S3
// app.post('/upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('No file uploaded.');
//     }

//     const userId = req.user.sub; // Cognito user ID
//     const email = req.user.email; // User email
//     const s3Client = await createS3Client(); // Create S3 client

//     const params = {
//         Bucket: process.env.AWS_BUCKET_NAME,
//         Key: `${userId}/${req.file.originalname}`,
//         Body: req.file.buffer,
//         ContentType: req.file.mimetype,
//         Metadata: {
//             'uploaded-by': email
//         }
//     };

//     console.log('Uploading to bucket:', process.env.AWS_BUCKET_NAME);
//     console.log('Uploading file with key:', `${userId}/${req.file.originalname}`);

//     try {
//         const command = new PutObjectCommand(params);
//         await s3Client.send(command);

//         const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${userId}/${req.file.originalname}`;

//         // Save post data in DynamoDB
//         const docClient = await createDynamoDBClient(); // Create DynamoDB client
//         const postId = uuidv4(); // Generate unique post ID

//         const postData = {
//             "qut-username": process.env.QUT_USERNAME, // Partition key
//             "postId": postId, // Sort key
//             title: req.body.title,
//             content: req.body.content,
//             imageUrl: fileUrl, // S3 file URL
//             timestamp: new Date().toISOString(),
//             uploadedBy: userId
//         };

//         await docClient.send(new PutCommand({ TableName: process.env.DYNAMO_TABLE_NAME, Item: postData }));
//         res.status(201).send({ message: 'Post created successfully', postId });

//     } catch (err) {
//         console.error('Error uploading file or adding post:', err);
//         res.status(500).send('File upload failed or post creation failed');
//     }
// });

// // Route for Cognito authentication
// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const authResult = await authenticateUser(username, password);
//         res.json({ success: true, token: authResult.IdToken });
//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// });

// // Test route to trigger addTestItem function
// app.get('/test/add-item', async (req, res) => {
//     try {
//         await addTestItem(); // Call the function to add the test item
//         res.status(200).send("Test item added successfully");
//     } catch (err) {
//         console.error("Error adding test item:", err);
//         res.status(500).send("Failed to add test item");
//     }
// });

// // Test Session Route
// app.get('/test-session', (req, res) => {
//     console.log('Session data:', req.session);
//     res.send(req.session); // Return session data to check if token exists
// });

// // Disable ETag
// app.disable('etag');

// // Routes for posts, comments, and chat
// const authRoutes = require('./routes/authRoutes');
// const postRoutes = require('./routes/postRoutes');
// const chatRoutes = require('./routes/chatRoutes');
// const commentRoutes = require('./routes/commentRoutes');

// app.use('/auth', authRoutes);
// app.use('/posts', ensureAuthenticated, postRoutes);
// app.use('/chat', ensureAuthenticated, chatRoutes);
// app.use('/comment', ensureAuthenticated, commentRoutes);

// // Home route
// app.get('/', async (req, res) => {
//     try {
//         const db = getDB();
//         if (req.session.token) {
//             const userPosts = await db.collection('post').find().toArray();
//             res.render('index', { user: true, posts: userPosts });
//         } else {
//             res.render('index', { user: null, posts: [] });
//         }
//     } catch (err) {
//         console.error('Error fetching posts:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// // Start the Server
// const PORT = process.env.PORT || 8080;
// const server = http.createServer(app);
// configureSocketIO(server);
// server.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
// });

// require('events').EventEmitter.defaultMaxListeners = 20; // Increase the limit as needed




// // latest
// const express = require('express');
// const path = require('path');
// const http = require('http');
// const cookieParser = require('cookie-parser');
// const { connectDB } = require('./config/db');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const flash = require('connect-flash');
// const passport = require('./config/passport');
// const cors = require('cors');
// const { getDB } = require('./config/db');
// const configureSocketIO = require('./config/socketio');
// const ensureAuthenticated = require('./middleware/auth');
// const multer = require('multer');
// const upload = multer({ storage: multer.memoryStorage() });
// const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
// const { getSecretValue, getParameterValue } = require('./config/secretsManager');
// const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { DynamoDBClient } = require('@aws-sdk/client-dynamodb'); 
// const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
// const { v4: uuidv4 } = require('uuid'); // UUID for postId


// const app = express();

// // IIFE to handle async initialization and start the server
// (async function startServer() {
//     try {
//         // Function to retrieve AWS credentials from Secrets Manager
//         async function getAWSCredentials() {
//             const secret = await getSecretValue('n11725605-assignment2-latest'); // Using Secrets Manager
//             return secret;
//         }

//         // Function to initialize AWS SDK using credentials from Secrets Manager
//         async function initializeAWS() {
//     const secret = await getAWSCredentials();
//     AWS.config.update({
//         accessKeyId: secret.accessKeyId,
//         secretAccessKey: secret.secretAccessKey,
//         sessionToken: secret.sessionToken || '',
//         region: 'ap-southeast-2'
//     });

//     console.log('AWS SDK initialized with credentials from Secrets Manager.');
// }

//         // MongoDB connection
//         await connectDB();
//         console.log("Connected to the database successfully");

//         // CORS Setup
//         app.use(cors({
//             origin: ['http://localhost:8080'],
//             methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//             credentials: true,
//             optionsSuccessStatus: 204
//         }));

//         // Middleware Setup
//         app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//         app.use(express.static(path.join(__dirname, 'public')));
//         app.use(cookieParser());
//         app.use(express.urlencoded({ extended: true }));
//         app.use(express.json());

//         // Session Setup with Secrets Manager
//         const sessionSecret = (await getSecretValue('n11725605-assignment2-latest')).SESSION_SECRET;
//         const dbUrl = await getParameterValue('/n11725605/DB_URL');
//         app.use(session({
//             secret: sessionSecret,
//             resave: false,
//             saveUninitialized: false,
//             store: MongoStore.create({
//                 mongoUrl: dbUrl,
//             }),
//             cookie: { maxAge: 3600000 } // 1 hour
//         }));

//         // Flash Messages Setup
//         app.use(flash());
//         app.use((req, res, next) => {
//             res.locals.success_msg = req.flash('success_msg');
//             res.locals.error_msg = req.flash('error_msg');
//             next();
//         });

//         // Passport Setup
//         app.use(passport.initialize());
//         app.use(passport.session());

//         // View Engine Setup
//         app.set('view engine', 'ejs');
//         app.set('views', path.join(__dirname, 'views'));

//         // S3 Client setup using AWS SDK v3
//         async function createS3Client() {
//             const secret = await getAWSCredentials();

//             return new S3Client({
//                 region: 'ap-southeast-2',
//                 credentials: {
//                     accessKeyId: secret.accessKeyId,
//                     secretAccessKey: secret.secretAccessKey,
//                     sessionToken: secret.sessionToken || '',
//                 }
//             });
//         }

//         // DynamoDB Client creation function
//         async function createDynamoDBClient() {
//             const secret = await getAWSCredentials();
//             const client = new DynamoDBClient({
//                 region: 'ap-southeast-2',
//                 credentials: {
//                     accessKeyId: secret.accessKeyId,
//                     secretAccessKey: secret.secretAccessKey,
//                     sessionToken: secret.sessionToken
//                 }
//             });
//             return DynamoDBDocumentClient.from(client);
//         }

//         // Route for file upload using AWS S3
//         app.post('/upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
//             if (!req.file) {
//                 return res.status(400).send('No file uploaded.');
//             }

//             const userId = req.user.sub;
//             const email = req.user.email;
//             const s3Client = await createS3Client();

//             const bucketName = await getParameterValue('/n11725605/AWS_BUCKET_NAME');
//             const region = await getParameterValue('/n11725605/AWS_REGION');
//             const params = {
//                 Bucket: bucketName,
//                 Key: `${userId}/${req.file.originalname}`,
//                 Body: req.file.buffer,
//                 ContentType: req.file.mimetype,
//                 Metadata: {
//                     'uploaded-by': email
//                 }
//             };

//             try {
//                 const command = new PutObjectCommand(params);
//                 await s3Client.send(command);

//                 const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${userId}/${req.file.originalname}`;

//                 // Save post data in DynamoDB
//                 const docClient = await createDynamoDBClient();
//                 const postId = uuidv4();

//                 const postData = {
//                     "qut-username": await getParameterValue('/n11725605/QUT_USERNAME'),
//                     "postId": postId,
//                     title: req.body.title,
//                     content: req.body.content,
//                     imageUrl: fileUrl,
//                     timestamp: new Date().toISOString(),
//                     uploadedBy: userId
//                 };

//                 await docClient.send(new PutCommand({ TableName: await getParameterValue('/n11725605/DYNAMO_TABLE_NAME'), Item: postData }));
//                 res.status(201).send({ message: 'Post created successfully', postId });

//             } catch (err) {
//                 console.error('Error uploading file or adding post:', err);
//                 res.status(500).send('File upload failed or post creation failed');
//             }
//         });

//         // Route for Cognito authentication
//         app.post('/login', async (req, res) => {
//             const { username, password } = req.body;
//             try {
//                 const authResult = await authenticateUser(username, password);
//                 res.json({ success: true, token: authResult.IdToken });
//             } catch (error) {
//                 res.status(500).json({ success: false, error: error.message });
//             }
//         });

//         // Test route to trigger addTestItem function
//         app.get('/test/add-item', async (req, res) => {
//             try {
//                 await addTestItem();
//                 res.status(200).send("Test item added successfully");
//             } catch (err) {
//                 console.error("Error adding test item:", err);
//                 res.status(500).send("Failed to add test item");
//             }
//         });

//         // Test Session Route
//         app.get('/test-session', (req, res) => {
//             console.log('Session data:', req.session);
//             res.send(req.session);
//         });

//         // Disable ETag
//         app.disable('etag');

//         // Routes for posts, comments, and chat
//         const authRoutes = require('./routes/authRoutes');
//         const postRoutes = require('./routes/postRoutes');
//         const chatRoutes = require('./routes/chatRoutes');
//         const commentRoutes = require('./routes/commentRoutes');

//         app.use('/auth', authRoutes);
//         app.use('/posts', ensureAuthenticated, postRoutes);
//         app.use('/chat', ensureAuthenticated, chatRoutes);
//         app.use('/comment', ensureAuthenticated, commentRoutes);

//         // Home route
//         app.get('/', async (req, res) => {
//             try {
//                 const db = getDB();
//                 if (req.session.token) {
//                     const userPosts = await db.collection('post').find().toArray();
//                     res.render('index', { user: true, posts: userPosts });
//                 } else {
//                     res.render('index', { user: null, posts: [] });
//                 }
//             } catch (err) {
//                 console.error('Error fetching posts:', err);
//                 res.status(500).send('Internal Server Error');
//             }
//         });

//         // Start the Server
//         const PORT = await getParameterValue('/n11725605/PORT');
//         const server = http.createServer(app);
//         configureSocketIO(server);
//         server.listen(PORT, () => {
//             console.log(`Server running at http://localhost:${PORT}`);
//         });

//         require('events').EventEmitter.defaultMaxListeners = 20; // Increase the limit as needed

//     } catch (error) {
//         console.error('Error starting the server:', error);
//         process.exit(1);
//     }
// })();



const AWS = require('aws-sdk');
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
const { getSecretValue, getParameterValue } = require('./config/secretsManager');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb'); 
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid'); 
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
const authRoutes = require('./routes/authRoutes');

const app = express();

let cognitoClient; // Global declaration for Cognito

// Initialize AWS SDK
async function initializeAWS() {
    const secret = await getSecretValue('n11725605-assignment2-latest');
    AWS.config.update({
        accessKeyId: secret.accessKeyId,
        secretAccessKey: secret.secretAccessKey,
        sessionToken: secret.sessionToken || '',
        region: 'ap-southeast-2'
    });
    console.log('AWS SDK initialized with credentials from Secrets Manager.');
}


// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;

//     try {
//         // Authenticate the user with Cognito
//         const authResult = await authenticateUser(username, password);

//         // Store token in the session or return it to the client
//         req.session.token = authResult.AccessToken; // Store token in session (optional)
//         res.json({
//             success: true,
//             idToken: authResult.IdToken,
//             accessToken: authResult.AccessToken,
//             refreshToken: authResult.RefreshToken, // If you need a refresh token
//         });
//     } catch (error) {
//         console.error("Login failed:", error.message);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });


// Ensure Cognito is initialized before login API
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!cognitoClient) {
            await initializeCognito(); // Initialize if not already done
        }

        const authResult = await authenticateUser(username, password);

        // Store token in the session or return it to the client
        req.session.token = authResult.AccessToken; 
        res.json({
            success: true,
            idToken: authResult.IdToken,
            accessToken: authResult.AccessToken,
            refreshToken: authResult.RefreshToken, // If you need a refresh token
        });
    } catch (error) {
        console.error("Login failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Initialize Cognito SDK
async function initializeCognito() {

    try {
        // Fetch Cognito configuration from AWS Secrets Manager and Parameter Store
        const secret = await getSecretValue('n11725605-assignment2-latest');
        const region = await getParameterValue('/n11725605/AWS_REGION');

        cognitoClient = new CognitoIdentityProviderClient({
            region: region,
            credentials: {
                accessKeyId: secret.accessKeyId,
                secretAccessKey: secret.secretAccessKey,
                sessionToken: secret.sessionToken || ''  // Optional session token if available
            }
        });

        console.log('Cognito initialized successfully.');
    } catch (error) {
        console.error('Error initializing AWS Cognito:', error);
        throw new Error('Failed to initialize AWS Cognito settings');
    }
}


// MongoDB connection
async function connectToMongoDB() {
    await connectDB();
    console.log("Connected to MongoDB successfully");
}

// S3 Client setup
async function createS3Client() {
    const secret = await getSecretValue('n11725605-assignment2-latest');
    return new S3Client({
        region: 'ap-southeast-2',
        credentials: {
            accessKeyId: secret.accessKeyId,
            secretAccessKey: secret.secretAccessKey,
            sessionToken: secret.sessionToken || '',
        }
    });
}

// DynamoDB Client creation
async function createDynamoDBClient() {
    const secret = await getSecretValue('n11725605-assignment2-latest');
    const client = new DynamoDBClient({
        region: 'ap-southeast-2',
        credentials: {
            accessKeyId: secret.accessKeyId,
            secretAccessKey: secret.secretAccessKey,
            sessionToken: secret.sessionToken,
        }
    });
    return DynamoDBDocumentClient.from(client);
}

// IIFE to handle async initialization and start the server
(async function startServer() {
    try {

        // Initialize all services sequentially
        await initializeAWS(); 
        await initializeCognito(); // Initialize Cognito separately
        await connectToMongoDB(); // Connect to MongoDB after Cognito
        console.log("All services initialized successfully.");

        // // Initialize all services sequentially
        // await Promise.all([initializeAWS(), initializeCognito(), connectToMongoDB()]);

        // Middleware Setup
        app.use(cors({
            origin: ['http://localhost:8080'],
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            credentials: true,
            optionsSuccessStatus: 204
        }));

        app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
        app.use(express.static(path.join(__dirname, 'public')));
        app.use(cookieParser());
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());


        const sessionSecret = (await getSecretValue('n11725605-assignment2-latest')).SESSION_SECRET;
        const dbUrl = await getParameterValue('/n11725605/DB_URL');
        app.use(session({
            secret: sessionSecret,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ mongoUrl: dbUrl }),
            cookie: { maxAge: 3600000 } // 1 hour
        }));

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


        // Routes for posts, comments, and chat
        const authRoutes = require('./routes/authRoutes');
        const postRoutes = require('./routes/postRoutes');
        const chatRoutes = require('./routes/chatRoutes');
        const commentRoutes = require('./routes/commentRoutes');

        app.use('/auth', authRoutes);
        app.use('/posts', ensureAuthenticated, postRoutes);
        app.use('/chat', ensureAuthenticated, chatRoutes);
        app.use('/comment', ensureAuthenticated, commentRoutes);



        // Home route
        app.get('/', async (req, res) => {
            try {
                const db = getDB();
                let userPosts = [];

                if (req.session.token) {
                    userPosts = await db.collection('post').find().toArray();
                }
                
                // Render the index.ejs view with the retrieved posts
                res.render('index', { user: req.session.token ? true : false, posts: userPosts });
            } catch (err) {
                console.error('Error fetching posts:', err);
                res.status(500).send('Internal Server Error');
            }
        });



        // Route for file upload using AWS S3
        app.post('/upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
            if (!req.file) return res.status(400).send('No file uploaded.');

            const userId = req.user.sub;
            const email = req.user.email;
            const s3Client = await createS3Client();

            const bucketName = await getParameterValue('/n11725605/AWS_BUCKET_NAME');
            const region = await getParameterValue('/n11725605/AWS_REGION');
            const params = {
                Bucket: bucketName,
                Key: `${userId}/${req.file.originalname}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
                Metadata: { 'uploaded-by': email }
            };

            try {
                const command = new PutObjectCommand(params);
                await s3Client.send(command);

                const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${userId}/${req.file.originalname}`;
                const docClient = await createDynamoDBClient();
                const postId = uuidv4();

                const postData = {
                    "qut-username": await getParameterValue('/n11725605/QUT_USERNAME'),
                    "postId": postId,
                    title: req.body.title,
                    content: req.body.content,
                    imageUrl: fileUrl,
                    timestamp: new Date().toISOString(),
                    uploadedBy: userId
                };

                await docClient.send(new PutCommand({ TableName: await getParameterValue('/n11725605/DYNAMO_TABLE_NAME'), Item: postData }));
                res.status(201).send({ message: 'Post created successfully', postId });

            } catch (err) {
                console.error('Error uploading file or adding post:', err);
                res.status(500).send('File upload failed or post creation failed');
            }
        });

        // Other routes and configurations...

        const PORT = await getParameterValue('/n11725605/PORT');
        const server = http.createServer(app);
        configureSocketIO(server);
        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Error starting the server:', error);
        process.exit(1);
    }
})();
