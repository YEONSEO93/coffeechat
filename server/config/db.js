
const { MongoClient } = require('mongodb');
const { getSecretValue, getParameterValue } = require('./secretsManager');


let db;

const connectDB = async () => {
  try {
    // Fetch the database URL and name from AWS Parameter Store
    const uri = await getParameterValue('/n11725605/DB_URL'); // Replace with the correct parameter name
    const dbName = await getParameterValue('/n11725605/DB_NAME'); // Replace with the correct parameter name

    // Initialize the MongoClient and connect to the database
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    
    db = client.db(dbName); // Use the fetched DB name
    console.log('DB connected successfully!');
  } catch (err) {
    console.error('Failed to connect to the database:', err);
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