
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
// const configureSocketIO = require('./config/socketio');
const WebSocket = require("ws");
const ensureAuthenticated = require('./middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { getSecretValue, getParameterValue } = require('./config/secretsManager');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb'); 
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid'); 
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
// const authRoutes = require('./routes/authRoutes');
const { SQSClient } = require("@aws-sdk/client-sqs");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
let cognitoClient; // Global declaration for Cognito

const server = http.createServer(app);
// WebSocket Server
const wss = new WebSocket.Server({ server });
wss.on("connection", (ws) => {
  console.log("WebSocket connected");
  ws.on("message", (message) => {
    console.log("Received:", message);

 try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.action === "upload") {
        console.log("Upload message received:", parsedMessage.data);
      } else if (parsedMessage.action === "chat") {
        console.log("Chat message received:", parsedMessage.data);
      }
    } catch (error) {
      console.log("Received non-JSON message:", message);
    }

    ws.send(`Echo: ${message}`);
  });
  ws.on("close", () => {
    console.log("WebSocket disconnected");
  });
});


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
      const tableName = await getParameterValue("/n11725605/DYNAMO_TABLE_NAME"); 
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
          region: await getParameterValue('/n11725605/AWS_REGION'), // Fetch region from Parameter Store

        // region: 'ap-southeast-2',
        credentials: {
            accessKeyId: secret.accessKeyId,
            secretAccessKey: secret.secretAccessKey,
            sessionToken: secret.sessionToken || '',
        }
    });
}





// Function to generate a pre-signed URL for file upload to S3
async function generatePreSignedUrl(fileName, userId) {
  try {
    const tableName = await getParameterValue("/n11725605/DYNAMO_TABLE_NAME");  
    const s3Client = await createS3Client(); // Use the S3 client with proper credentials
    const bucketName = await getParameterValue('/n11725605/AWS_BUCKET_NAME'); // Fetch bucket name from Parameter Store

    // Use userId in the file key for better organization
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${userId}/${fileName}`, // Store files under user-specific folder
      ACL: 'public-read', // Adjust ACL as needed
      Metadata: {
        'uploaded-by': userId, // Add metadata for tracking who uploaded the file
      },
    });

    // Generate pre-signed URL with 1-hour expiration
    const preSignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return preSignedUrl;
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
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


// SQS Client setup
async function createSQSClient() {
  return new SQSClient({
    region: await getParameterValue("/n11725605/prac-region"),
    credentials: {
      accessKeyId: await getParameterValue("/n11725605/prac-accessKeyId"),
      secretAccessKey: await getParameterValue(
        "/n11725605/prac-secretAccessKey"
      ),
      sessionToken: await getParameterValue("/n11725605/prac-sessionToken"),
    },
  });
}
// SQS sending a message
async function sendMessageToSQS(messageBody) {
  try {
    const tableName = await getParameterValue("/n11725605/DYNAMO_TABLE_NAME");  
    const sqsClient = await createSQSClient();
    const queueUrl =
      "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11682957-coffeechat-queue"; // SQS Queue URL
    const params = {
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageBody), // 메시지를 JSON으로 변환
    };
    const command = new SendMessageCommand(params);
    const response = await sqsClient.send(command);
    console.log("SQS Message Sent", response.MessageId);
    // WebSocket for client side
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ action: "newPost", data: messageBody }));
      }
    });
  } catch (error) {
    console.error("Error sending message to SQS:", error);
  }
}

async function processSQSMessages() {
  try {
    const tableName = await getParameterValue("/n11725605/DYNAMO_TABLE_NAME"); 
    const sqsClient = await createSQSClient();
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl:
        "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11682957-coffeechat-queue",
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
    });
    const receiveResponse = await sqsClient.send(receiveCommand);
    const messages = receiveResponse.Messages;
    if (!messages || messages.length === 0) {
      console.log("No messages in the queue.");
      return;
    }
    const message = messages[0];
    console.log("Processing message:", message.Body);
    // WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`New post notification: ${message.Body}`);
      }
    });
    // Delete a message
    const deleteCommand = new DeleteMessageCommand({
      QueueUrl:
        "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11682957-coffeechat-queue",
      ReceiptHandle: message.ReceiptHandle,
    });
    const deleteResponse = await sqsClient.send(deleteCommand);
    console.log("Message deleted:", deleteResponse);
  } catch (error) {
    console.error("Error processing SQS message:", error);
  }
}




// IIFE to handle async initialization and start the server
(async function startServer() {
    try {
const tableName = await getParameterValue("/n11725605/DYNAMO_TABLE_NAME");  
        // Initialize all services sequentially
        await initializeAWS(); 
        await initializeCognito(); // Initialize Cognito separately
        await connectToMongoDB(); // Connect to MongoDB after Cognito
        console.log("All services initialized successfully.");

        // // Initialize all services sequentially
        // await Promise.all([initializeAWS(), initializeCognito(), connectToMongoDB()]);

        // Middleware Setup
        app.use(cors({
            // origin: ['https://www.coffeechat.cab432.com'],
            origin: ["http://localhost:8080"],
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            credentials: true,
            optionsSuccessStatus: 204
        }));

        app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
       
       app.use(
      "/node_modules",
      express.static(path.join(__dirname, "node_modules"))
    );
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

        // user auth
        app.use((req, res, next) => {
      res.locals.user = req.user || null; 
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

// Route to handle pre-signed URL requests
app.get('/posts/presigned-url', async (req, res) => {
  const { fileName } = req.query;
  const userId = req.user.sub || req.user.email; // Ensure you get the user ID from the session or Cognito user pool

  try {
    const preSignedUrl = await generatePreSignedUrl(fileName, userId); // Pass userId to organize files
    res.json({ url: preSignedUrl });
  } catch (error) {
    res.status(500).json({ error: 'Error generating pre-signed URL' });
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
               
               const messageBody = {
            postId: postId,
            title: req.body.title,
            content: req.body.content,
            imageUrl: fileUrl,
            userId: userId,
          };
          await sendMessageToSQS(messageBody);
               
                res.status(201).send({ message: 'Post created successfully', postId });

            } catch (err) {
                console.error('Error uploading file or adding post:', err);
                res.status(500).send('File upload failed or post creation failed');
            }
        });


 app.get("/posts/presigned-url", async (req, res) => {
      const fileName = req.query.fileName; // 요청된 파일 이름
      const s3Client = await createS3Client(); // S3 클라이언트 생성
      const bucketName = await getParameterValue("/n11725605/AWS_BUCKET_NAME");
      const params = {
        Bucket: bucketName,
        Key: fileName,
        Expires: 60, // URL 만료 시간(초)
      };
      try {
        // const command = new AWS.S3.GetObjectCommand(params);
        // const preSignedUrl = await s3Client.getSignedUrl(command);
         const command = new GetObjectCommand(params);
        const preSignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 60,
        });
        res.json({ url: preSignedUrl });
      } catch (err) {
        console.error("Error generating pre-signed URL:", err);
        res.status(500).json({ error: "Error generating pre-signed URL" });
      }
    });


        const PORT = await getParameterValue('/n11725605/PORT');
        const server = http.createServer(app);
        // server.listen(PORT, () => {
            server.listen(PORT, '0.0.0.0', () => {

            console.log(`🚀💜 Server running at http://localhost:${PORT} 🚀💜`);
        });

    } catch (error) {
        console.error('Error starting the server:', error);
        process.exit(1);
    }
})();

module.exports = { createSQSClient };
