//server/config/db.js

const { MongoClient } = require('mongodb');

let db;

const connectDB = async () => {
  try {
    const client = await MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true });
    console.log('DB connected!');
    db = client.db(process.env.DB_NAME); // Use the database name from environment variables
  } catch (err) {
    console.error('Failed to connect to the database', err);
  }
};

function getDB() {
  return db;
}

module.exports = { connectDB, getDB };
