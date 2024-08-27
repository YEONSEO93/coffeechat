

const { MongoClient } = require('mongodb');
const uri = process.env.DB_URL;
let db;

const connectDB = async () => {
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    db = client.db(process.env.DB_NAME);
    console.log('DB connected!');
  } catch (err) {
    console.error('Failed to connect to the database', err);
    throw err;
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db;
};

module.exports = {
  connectDB,
  getDB,
};
