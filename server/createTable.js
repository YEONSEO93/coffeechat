
require("dotenv").config();
const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

const tableName = process.env.DYNAMO_TABLE_NAME;
const sortKey = "postId"; 

async function createTable() {
    const command = new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
            { AttributeName: "qut-username", AttributeType: "S" },
            { AttributeName: sortKey, AttributeType: "S" },
        ],
        KeySchema: [
            { AttributeName: "qut-username", KeyType: "HASH" },
            { AttributeName: sortKey, KeyType: "RANGE" },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
    });

    try {
        const response = await client.send(command);
        console.log("Table creation successful:", response);
    } catch (err) {
        console.error("Failed to create table:", err);
    }
}

createTable();
