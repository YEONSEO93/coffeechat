// require('dotenv').config(); // Load environment variables from .env file
// const express = require('express'); // Import Express framework
// const app = express(); // Create an Express application instance
// const { MongoClient, ObjectId } = require('mongodb'); // Import MongoDB client
// const path = require('path'); // Import path module for working with file and directory paths


// // Middleware to serve static files (like CSS, images, etc.)
// app.use(express.static(__dirname + '/public'));

// // Set up EJS as the templating engine
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views')); // Set the views directory for EJS templates

// // Middleware to parse the body of POST requests
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// // Start the server on port 8080
// app.listen(8080, () => {
//     console.log('Server running at http://localhost:8080');
// });

// // Serve the homepage (index.html)
// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/index.html'); // Send index.html file as a response
// });

// let db; // Declare a variable to hold the database connection
// const url = process.env.DB_URL; // Get MongoDB URL from environment variables

// // Connect to MongoDB
// new MongoClient(url)
//     .connect()
//     .then((client) => {
//         console.log('DB connected!'); // Log successful connection
//         db = client.db('coffeechat_ys'); // Store the database connection
//     })
//     .catch((err) => {
//         console.error('Failed to connect to the database', err); // Log any connection errors
//     });

// // Serve a welcome message
// app.get('/', (req, res) => {
//     res.send('Welcome to Coffee Chat!'); // Send a welcome message as a response
// });

// // Serve the list of posts
// app.get('/list', async (req, res) => {
//     try {
//         const posts = await db.collection('post').find().toArray(); // Fetch all posts from the 'post' collection
//         res.render('list', { posts: posts }); // Render the 'list' EJS template with the posts data
//     } catch (err) {
//         console.error('Failed to fetch posts', err); // Log any errors during fetching
//         res.status(500).send('Failed to fetch posts'); // Send an error response if fetching fails
//     }
// });


// app.get('/write', (req, res) => {
//     res.render('write.ejs');
// });


// // app.post('/add', (req, res) => {
// //     console.log(req.body); // This will log the form data to the console
// //     res.send('Form submitted successfully');
// // });


// app.post('/add', async (req, res) => {
//   await db.collection('post').insertOne({ title : req.body.title, content : req.body.content })
//   res.redirect('/list')
// });


// app.post('/add', async (req, res) => {
//   if (req.body.title === '') {
//     res.send('Title is required.');
//   } else {
//     try {
//       await db.collection('post').insertOne({ title: req.body.title, content: req.body.content });
//       res.redirect('/list');
//     } catch (e) {
//       console.error(e);
//       res.send('Database error occurred.');
//     }
//   }
// });


// app.get('/detail/:id', async (req, res) => {
//   let result = await db.collection('post').findOne({_id : new ObjectId(req.params.id) })
//   res.render('detail.ejs', {result : result})
// });




require('dotenv').config(); // Load environment variables from .env file
const express = require('express'); // Import Express framework
const app = express(); // Create an Express application instance
const { MongoClient, ObjectId } = require('mongodb'); // Import MongoDB client
const path = require('path'); // Import path module for working with file and directory paths

// Middleware to serve static files (like CSS, images, etc.)
app.use(express.static(__dirname + '/public'));

// Set up EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Set the views directory for EJS templates

// Middleware to parse the body of POST requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
MongoClient.connect(url, { useUnifiedTopology: true })
    .then((client) => {
        console.log('DB connected!'); // Log successful connection
        db = client.db('coffeechat_ys'); // Store the database connection
    })
    .catch((err) => {
        console.error('Failed to connect to the database', err); // Log any connection errors
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

// Render the write form
app.get('/write', (req, res) => {
    res.render('write.ejs');
});

// Handle adding a new post with validation and error handling
app.post('/add', async (req, res) => {
    if (req.body.title === '') {
        res.status(400).send('Title is required.');
    } else {
        try {
            await db.collection('post').insertOne({ title: req.body.title, content: req.body.content });
            res.redirect('/list');
        } catch (err) {
            console.error('Database error occurred:', err);
            res.status(500).send('Failed to save the post.');
        }
    }
});

// Handle fetching a post by ID with error handling
app.get('/detail/:id', async (req, res) => {
    try {
        const result = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.render('detail.ejs', { result: result });
        } else {
            res.status(404).send('Post not found.');
        }
    } catch (err) {
        console.error('Invalid ID format or database error:', err);
        res.status(400).send('Invalid ID format or database error.');
    }
});
