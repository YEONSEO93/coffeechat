require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb"); // DynamoDB Client
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { getPreSignedUrlWithUser, uploadFileToS3 } = require("./s3Controller"); // Assuming you have this controller for S3 uploads
const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const tableName = process.env.DYNAMO_TABLE_NAME;
const qutUsername = process.env.QUT_USERNAME; // Fixed partition key

// DynamoDB Client setup and conversion to DocumentClient
async function createDynamoDBClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  });

  return DynamoDBDocumentClient.from(client); // Return DocumentClient
}

// Function to add a post
async function addPost(req, res) {
  const { title, content } = req.body;
  const file = req.file;

  if (!title || !content || !file) {
    return res.status(400).send("Title, content, or image file is missing.");
  }

  const postId = uuidv4(); // Generate a unique postId
  const userId = req.user.sub; // Cognito user ID

  try {
    // S3 file upload
    const fileName = `${Date.now()}_${file.originalname}`;
    const preSignedUrl = await getPreSignedUrlWithUser(fileName, userId);
    await uploadFileToS3(req.file.buffer, preSignedUrl, req.file.mimetype);

    // Post data to DynamoDB
    const docClient = await createDynamoDBClient();
    const postData = {
      "qut-username": qutUsername, // Partition key
      postId: postId, // Sort key (UUID)
      title,
      content,
      imageUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${userId}/${fileName}`, // S3 file URL
      timestamp: new Date().toISOString(),
      uploadedBy: userId, // Uploading user info
    };

    await docClient.send(
      new PutCommand({ TableName: tableName, Item: postData })
    );
    res.status(201).send({ message: "Post created successfully", postId });
  } catch (err) {
    console.error("Error adding post:", err);
    res.status(500).send("Error adding post");
  }
}

// Function to get a single post
async function getPost(req, res) {
  const { postId } = req.params;

  try {
    const docClient = await createDynamoDBClient();
    const params = {
      TableName: tableName,
      Key: {
        "qut-username": qutUsername,
        postId: postId,
      },
    };

    const data = await docClient.send(new GetCommand(params));
    if (data.Item) {
      res.status(200).send(data.Item);
    } else {
      res.status(404).send("Post not found");
    }
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).send("Error fetching post");
  }
}

// Function to get all posts
async function getAllPosts(req, res) {
  try {
    const docClient = await createDynamoDBClient();
    const params = {
      TableName: tableName,
    };

    const data = await docClient.send(new ScanCommand(params)); // Use 'scan' to get all items
    if (data.Items && data.Items.length > 0) {
      res.status(200).render("list", { posts: data.Items }); // Assuming 'list' is your view
    } else {
      res.status(404).send("No posts found");
    }
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).send("Error fetching posts");
  }
}

// Function to add a test item (for debugging purposes)
async function addTestItem() {
  const testItem = {
    "qut-username": process.env.QUT_USERNAME, // Partition key value
    postId: "testPost SY YS", // Test Post ID
    title: "Test Title",
    content: "This is test content for DynamoDB.",
    fileUrl: "https://example.com/test-image.jpg", // Test file URL
    timestamp: new Date().toISOString(),
    uploadedBy: "testUser@example.com", // Test uploader info
    userId: "testUserId", // Test user ID
  };

  try {
    const docClient = await createDynamoDBClient();
    const command = new PutCommand({
      TableName: process.env.DYNAMO_TABLE_NAME,
      Item: testItem,
    });

    // Log the command and response
    console.log("Sending PutCommand to DynamoDB:", command);
    const response = await docClient.send(command);

    console.log("DynamoDB PutCommand Response:", response); // Log the response
  } catch (err) {
    console.error("Error adding test item:", err); // Log errors
  }
}

async function deletePostFromDynamo(postId, qutUsername) {
  const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  const params = {
    TableName: process.env.DYNAMO_TABLE_NAME,
    Key: {
      "qut-username": qutUsername, // Partition key
      postId: postId, // Sort key
    },
  };

  try {
    await docClient.send(new DeleteCommand(params));
    console.log(`Post ${postId} deleted successfully from DynamoDB`);
  } catch (error) {
    console.error("Error deleting post from DynamoDB:", error);
    throw new Error("Error deleting post from DynamoDB");
  }
}

module.exports = {
  createDynamoDBClient,
  addPost, // If needed in other files
  getPost, // If needed in other files
  getAllPosts, // If needed in other files
  addTestItem, // If needed in other files
  deletePostFromDynamo,
};