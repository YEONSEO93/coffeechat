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


// // MFA Input Route
// app.get('/auth/mfa', (req, res) => {
//     const mfa_msg = req.flash('mfa_msg');
//     res.render('mfa', { mfa_msg: mfa_msg.length > 0 ? mfa_msg : null });
// });


// app.post('/auth/mfa-verify', async (req, res) => {
//     const { mfaCode } = req.body; // Get MFA code from the form
//     const { email } = req.session; // Get the email stored in the session

//     const params = {
//         ClientId: process.env.COGNITO_CLIENT_ID,
//         ChallengeName: 'SOFTWARE_TOKEN_MFA', // MFA type
//         Session: req.session.mfaSession, // Ensure this is set when redirecting to MFA
//         ChallengeResponses: {
//             SOFTWARE_TOKEN_MFA: mfaCode, // The MFA code from the authenticator app
//             USERNAME: email, // Cognito username
//         },
//     };

//     try {
//         const data = await cognito.respondToAuthChallenge(params).promise();
        
//         // Successfully authenticated with MFA
//         req.session.token = data.AuthenticationResult.AccessToken; // Save access token
//         req.session.save((err) => {
//             if (err) {
//                 req.flash('error_msg', 'Session save failed');
//                 return res.redirect('/auth/login');
//             }
//             res.redirect('/posts/list'); // Redirect to the main page
//         });
//     } catch (err) {
//         console.error('MFA verification failed:', err.message);
//         req.flash('error_msg', 'Invalid MFA code, please try again.');
//         res.redirect('/auth/mfa'); // Redirect back to MFA page
//     }
// });

// app.post('/auth/mfa-verify', async (req, res) => {
//     const { mfaCode } = req.body;
//     const { email } = req.session; // Retrieve the email stored in session

//     const params = {
//         ClientId: process.env.COGNITO_CLIENT_ID,
//         ChallengeName: req.session.mfaChallenge,
//         Session: req.session.mfaSession, // Store the session returned from initiateAuth
//         ChallengeResponses: {
//             SMS_MFA_CODE: mfaCode,
//             USERNAME: email,
//         },
//     };

//     try {
//         const data = await cognito.respondToAuthChallenge(params).promise();
//         req.session.token = data.AuthenticationResult.AccessToken; // Save access token
//         req.session.save((err) => {
//             if (err) {
//                 req.flash('error_msg', 'Session save failed');
//                 return res.redirect('/auth/login');
//             }
//             res.redirect('/posts/list'); // Redirect to the main page
//         });
//     } catch (err) {
//         console.error('MFA verification failed:', err.message);
//         req.flash('error_msg', 'Invalid MFA code, please try again.');
//         res.redirect('/auth/mfa'); // Redirect back to MFA page
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
const multer = require('multer'); // Add multer for file upload handling
const upload = multer({ storage: multer.memoryStorage() });
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb'); // DynamoDB client
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb'); // Document client
const { v4: uuidv4 } = require('uuid'); // UUID for postId

const app = express();

// Function to retrieve AWS credentials from Secrets Manager
async function getAWSCredentials() {
    const client = new SecretsManagerClient({ region: 'ap-southeast-2' });
    const secretName = "n11725605-assignment2-latest";

    try {
        const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
        if (response.SecretString) {
            const secret = JSON.parse(response.SecretString);
            console.log("Retrieved AWS credentials:", secret); // Log the secret
            return secret;
        } else {
            console.log("SecretString is empty");
        }
    } catch (error) {
        console.error("Error retrieving secret:", error);
    }
}

// Function to initialize AWS SDK using credentials from Secrets Manager
async function initializeAWS() {
    const secret = await getAWSCredentials();
    AWS.config.update({
        accessKeyId: secret.accessKeyId,
        secretAccessKey: secret.secretAccessKey,
        sessionToken: secret.sessionToken || '',
        region: 'ap-southeast-2'
    });

    console.log('AWS SDK initialized with credentials from Secrets Manager.');
}

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
    secret: process.env.SESSION_SECRET || 'default_secret_key', // Ensure this is set in your environment variables
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL,
        dbName: process.env.DB_NAME, // Database name for session storage
        httpOnly: true, // Helps mitigate XSS attacks
    }),
    cookie: {
        maxAge: 3600000, // 1 hour
        secure: process.env.NODE_ENV === 'production', // Secure cookies in production
        httpOnly: true // Helps prevent XSS attacks
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

// S3 Client setup using AWS SDK v3
async function createS3Client() {
    const secret = await getAWSCredentials();

    // Log the credentials to ensure they are correctly retrieved
    console.log('AWS Credentials:', {
        accessKeyId: secret.accessKeyId,
        secretAccessKey: secret.secretAccessKey,
        sessionToken: secret.sessionToken,
    });
    
    // Ensure valid credentials
    if (!secret || !secret.accessKeyId || !secret.secretAccessKey) {
        throw new Error("Invalid AWS credentials");
    }

    return new S3Client({
        region: 'ap-southeast-2',
        credentials: {
            accessKeyId: secret.accessKeyId,
            secretAccessKey: secret.secretAccessKey,
            sessionToken: secret.sessionToken || '',
        }
    });
}

// DynamoDB Client creation function
async function createDynamoDBClient() {
    const secret = await getAWSCredentials();
    const client = new DynamoDBClient({
        region: 'ap-southeast-2',
        credentials: {
            accessKeyId: secret.accessKeyId,
            secretAccessKey: secret.secretAccessKey,
            sessionToken: secret.sessionToken
        }
    });
    return DynamoDBDocumentClient.from(client); // Convert to DocumentClient for easier interaction
}

// Route for file upload using AWS S3
app.post('/upload', ensureAuthenticated, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const userId = req.user.sub; // Cognito user ID
    const email = req.user.email; // User email
    const s3Client = await createS3Client(); // Create S3 client

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${userId}/${req.file.originalname}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: {
            'uploaded-by': email
        }
    };

    console.log('Uploading to bucket:', process.env.AWS_BUCKET_NAME);
    console.log('Uploading file with key:', `${userId}/${req.file.originalname}`);

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${userId}/${req.file.originalname}`;

        // Save post data in DynamoDB
        const docClient = await createDynamoDBClient(); // Create DynamoDB client
        const postId = uuidv4(); // Generate unique post ID

        const postData = {
            "qut-username": process.env.QUT_USERNAME, // Partition key
            "postId": postId, // Sort key
            title: req.body.title,
            content: req.body.content,
            imageUrl: fileUrl, // S3 file URL
            timestamp: new Date().toISOString(),
            uploadedBy: userId
        };

        await docClient.send(new PutCommand({ TableName: process.env.DYNAMO_TABLE_NAME, Item: postData }));
        res.status(201).send({ message: 'Post created successfully', postId });

    } catch (err) {
        console.error('Error uploading file or adding post:', err);
        res.status(500).send('File upload failed or post creation failed');
    }
});

// Route for Cognito authentication
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const authResult = await authenticateUser(username, password);
        res.json({ success: true, token: authResult.IdToken });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// MFA Input Route
app.get('/auth/mfa', (req, res) => {
    const mfa_msg = req.flash('mfa_msg');
    res.render('mfa', { mfa_msg: mfa_msg.length > 0 ? mfa_msg : null });
});

app.post('/auth/mfa-verify', async (req, res) => {
    const { mfaCode } = req.body; // Get MFA code from the form
    const { email } = req.session; // Get the email stored in the session

    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        ChallengeName: 'SOFTWARE_TOKEN_MFA', // MFA type
        Session: req.session.mfaSession, // Ensure this is set when redirecting to MFA
        ChallengeResponses: {
            SOFTWARE_TOKEN_MFA: mfaCode, // The MFA code from the authenticator app
            USERNAME: email, // Cognito username
        },
    };

    try {
        const data = await cognito.respondToAuthChallenge(params).promise();
        
        // Successfully authenticated with MFA
        req.session.token = data.AuthenticationResult.AccessToken; // Save access token
        req.session.save((err) => {
            if (err) {
                req.flash('error_msg', 'Session save failed');
                return res.redirect('/auth/login');
            }
            res.redirect('/posts/list'); // Redirect to the main page
        });
    } catch (err) {
        console.error('MFA verification failed:', err.message);
        req.flash('error_msg', 'Invalid MFA code, please try again.');
        res.redirect('/auth/mfa'); // Redirect back to MFA page
    }
});

// Test route to trigger addTestItem function
app.get('/test/add-item', async (req, res) => {
    try {
        await addTestItem(); // Call the function to add the test item
        res.status(200).send("Test item added successfully");
    } catch (err) {
        console.error("Error adding test item:", err);
        res.status(500).send("Failed to add test item");
    }
});

// Test Session Route
app.get('/test-session', (req, res) => {
    if (req.session.token) {
        res.send(`Session is active. Token: ${req.session.token}`);
    } else {
        res.send('No active session.');
    }
});

// Disable ETag
app.disable('etag');

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
