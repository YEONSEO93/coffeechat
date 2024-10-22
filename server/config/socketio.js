
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { createDynamoDBClient } = require("../controllers/dynamoController"); // DynamoDB client function
const { PutCommand } = require("@aws-sdk/lib-dynamodb"); // DynamoDB PutCommand
const axios = require("axios");
const { getParameterValue } = require("../config/secretsManager"); // AWS Secrets Manager

async function configureSocketIO(server) {
  const io = new Server(server);


  const COGNITO_USER_POOL_ID = await getParameterValue(
    "/n11725605/COGNITO_USER_POOL_ID"
  );
  const AWS_REGION = await getParameterValue("/n11725605/prac-region");
  const QUT_USERNAME = await getParameterValue("/n11725605/QUT_USERNAME");
  const TABLE_NAME = "n11725605-ChatMessages";


  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication token is required."));
    }

    try {
   
      const decodedToken = jwt.verify(
        token,
        await getCognitoPublicKey(COGNITO_USER_POOL_ID, AWS_REGION)
      );
      socket.user = decodedToken; 
      next();
    } catch (error) {
      console.error("JWT verification failed:", error);
      next(new Error("Authentication failed."));
    }
  });


  io.on("connection", (socket) => {
    console.log("WebSocket connected");


    socket.on("ask-join", (room) => {
      socket.join(room);
      console.log(`User joined room: ${room}`);
    });

    socket.on("message-send", async (data) => {
      try {
        console.log("Message received on server:", data);

        const serverTimestamp = new Date().toISOString();
        console.log("Server Timestamp:", serverTimestamp);

        const messageData = {
          msg: data.msg,
          room: data.room,
          username: data.username,
          timestamp: serverTimestamp, 
        };

        console.log("Prepared message data:", messageData);

        io.to(data.room).emit("newMessage", messageData);
        console.log("Message broadcasted to room:", data.room);
      } catch (error) {
        console.error("Error in message-send event:", error);
      }
    });
  });
}

async function getCognitoPublicKey(userPoolId, region) {
  const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  const { data } = await axios.get(url);
  return data.keys[0]; 
}

module.exports = configureSocketIO;