require('dotenv').config(); // Load environment variables from .env file
const express = require('express'); // Import Express framework
const app = express(); // Create an Express application instance
const { MongoClient } = require('mongodb'); // Import MongoDB client
const path = require('path'); // Import path module for working with file and directory paths

// Middleware to serve static files (like CSS, images, etc.)
app.use(express.static(__dirname + '/public'));

// Set up EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Set the views directory for EJS templates

// Start the server on port 8080
app.listen(8080, () => {
    console.log('Server running at http://localhost:8080');
});

// Serve the homepage (index.html)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html'); // Send index.html file as a response
});

let db; // Declare a variable to hold the database connection
const url = process.env.DB_URL; // Get MongoDB URL from environment variables

// Connect to MongoDB
new MongoClient(url)
    .connect()
    .then((client) => {
        console.log('DB connected!'); // Log successful connection
        db = client.db('coffeechat_ys'); // Store the database connection
    })
    .catch((err) => {
        console.error('Failed to connect to the database', err); // Log any connection errors
    });

// Serve a welcome message
app.get('/', (req, res) => {
    res.send('Welcome to Coffee Chat!'); // Send a welcome message as a response
});

// Serve the list of posts
app.get('/list', async (req, res) => {
    try {
        const posts = await db.collection('post').find().toArray(); // Fetch all posts from the 'post' collection
        res.render('list', { posts: posts }); // Render the 'list' EJS template with the posts data
    } catch (err) {
        console.error('Failed to fetch posts', err); // Log any errors during fetching
        res.status(500).send('Failed to fetch posts'); // Send an error response if fetching fails
    }
});
