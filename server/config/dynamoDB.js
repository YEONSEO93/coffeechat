// require("dotenv").config();
// const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

// // DynamoDB 클라이언트 설정
// const client = new DynamoDBClient({ region: process.env.AWS_REGION });
// const docClient = DynamoDBDocumentClient.from(client);

// module.exports = { docClient, client };

require("dotenv").config();
const AWS = require('aws-sdk');
const { getSecretValue } = require('./secretsManager');

async function createDynamoDBClient() {
    const secret = await getSecretValue('n11725605-coffeechat4'); // Secrets Manager에서 자격증명 가져오기

    // AWS SDK v2를 사용하여 DynamoDB 클라이언트 설정
    const client = new AWS.DynamoDB.DocumentClient({
        region: process.env.AWS_REGION,
        accessKeyId: secret.accessKeyId,
        secretAccessKey: secret.secretAccessKey,
    });

    return client; // DocumentClient 반환
}

module.exports = { createDynamoDBClient };