const { DynamoDBClient } = require("@aws-sdk/client-dynamodb"); // DynamoDB Client
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { getPreSignedUrlWithUser, uploadFileToS3 } = require("./s3Controller");
const { getSecretValue, getParameterValue } = require('../config/secretsManager'); // Import both functions

// DynamoDB Client setup and conversion to DocumentClient
async function createDynamoDBClient() {
  const secret = await getSecretValue('n11725605-assignment2-latest'); // Fetch credentials from Secrets Manager

  const client = new DynamoDBClient({
    region: secret.region,
    credentials: {
      accessKeyId: secret.accessKeyId,
      secretAccessKey: secret.secretAccessKey,
      sessionToken: secret.sessionToken
    }
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

    // Retrieve the table name and bucket name from the Parameter Store
    const tableName = await getParameterValue('/n11725605/DYNAMO_TABLE_NAME');
    const bucketName = await getParameterValue('/n11725605/AWS_BUCKET_NAME');
    const region = await getParameterValue('/n11725605/AWS_REGION');

    // Post data to DynamoDB
    const docClient = await createDynamoDBClient();
    const postData = {
      "qut-username": await getParameterValue('/n11725605/QUT_USERNAME'), // Partition key
      postId: postId, // Sort key (UUID)
      title,
      content,
      imageUrl: `https://${bucketName}.s3.${region}.amazonaws.com/${userId}/${fileName}`, // S3 file URL
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
    const tableName = await getParameterValue('/n11725605/DYNAMO_TABLE_NAME');
    const qutUsername = await getParameterValue('/n11725605/QUT_USERNAME');
    const docClient = await createDynamoDBClient();
    const params = {
      TableName: tableName,
      Key: {
        "qut-username": qutUsername, // Partition key
        postId: postId, // Sort key
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
    const tableName = await getParameterValue('/n11725605/DYNAMO_TABLE_NAME');
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
    "qut-username": await getParameterValue('/n11725605/QUT_USERNAME'), // Partition key value
    postId: "testPost", // Test Post ID
    title: "Test Title",
    content: "This is test content for DynamoDB.",
    fileUrl: "https://example.com/test-image.jpg", // Test file URL
    timestamp: new Date().toISOString(),
    uploadedBy: "testUser@example.com", // Test uploader info
  };

  try {
    const tableName = await getParameterValue('/n11725605/DYNAMO_TABLE_NAME');
    const docClient = await createDynamoDBClient();
    const command = new PutCommand({
      TableName: tableName,
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

// Function to delete a post from DynamoDB
async function deletePostFromDynamo(postId, qutUsername) {
  try {
    const tableName = await getParameterValue("/n11725605/DYNAMO_TABLE_NAME"); // Add tableName here

    const docClient = await createDynamoDBClient();
    const params = {
      TableName: tableName,
      Key: {
        "qut-username": qutUsername, // Partition key
        postId: postId, // Sort key
      },
    };

    await docClient.send(new DeleteCommand(params));
    console.log(`Post ${postId} deleted successfully from DynamoDB`);
  } catch (error) {
    console.error("Error deleting post from DynamoDB:", error);
    throw new Error("Error deleting post from DynamoDB");
  }
}

module.exports = {
  createDynamoDBClient,
  addPost, 
  getPost, 
  getAllPosts, 
  addTestItem, 
  deletePostFromDynamo, 
};
