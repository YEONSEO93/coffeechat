require('dotenv').config();
const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
const multer = require('multer');

// Configure multer for file upload handling
const upload = multer({ dest: 'uploads/' });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');


const axios = require('axios');



// Middleware to serve static files (like CSS, images, etc.)
app.use(express.static(__dirname + '/public'));

// Set up EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse the body of POST requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up session middleware with MongoStore
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URL,
    dbName: 'coffeechat_ys',
  }),
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// Initialize Passport and configure session support
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy for login
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await db.collection('user').findOne({ username: username });
    if (!user) {
      return done(null, false, { message: 'User not found' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return done(null, false, { message: 'Incorrect password' });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Serialize and deserialize user information for sessions
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.collection('user').findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Start the server on port 8080
app.listen(8080, () => {
  console.log('Server running at http://localhost:8080');
});

// MongoDB connection
let db;
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true })
  .then(client => {
    console.log('DB connected!');
    db = client.db('coffeechat_ys');
  })
  .catch(err => {
    console.error('Failed to connect to the database', err);
  });

// Serve the homepage
app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

// Registration routes
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await db.collection('user').insertOne({
      username: req.body.username,
      password: hashedPassword,
    });
    res.redirect('/login');
  } catch (err) {
    res.status(500).send('Error registering new user');
  }
});

// Login routes
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: false
}));

// Logout route
app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Serve the list of posts
app.get('/list', async (req, res) => {
  try {
    const posts = await db.collection('post').find().toArray();
    res.render('list', { posts: posts, user: req.user });
  } catch (err) {
    console.error('Failed to fetch posts', err);
    res.status(500).send('Failed to fetch posts');
  }
});

// Render the write form
app.get('/write', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.render('write');
});

// // Handle adding a new post with image upload
// app.post('/add', upload.single('image'), async (req, res) => {
//     if (!req.isAuthenticated()) {
//         return res.status(401).send('You need to log in to add a post');
//     }

//     let imageUrl = null;

//     if (req.file) {
//         try {
//             const form = new FormData();
//             form.append('file', fs.createReadStream(req.file.path));

//             const response = await fetch('https://api.cloudflare.com/client/v4/accounts/626e6384b0c0fb9f6780cfadeff08425/images/v1', {
//                 method: 'POST',
//                 headers: {
//                     'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
//                 },
//                 body: form,
//             });

//             const data = await response.json();

//             if (data.success) {
//                 const imageId = data.result.id;
//                 const accountHash = '946t3Bn7epLNWC96BjzU3Q'; // Your account hash
//                 imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`; // Use the public variant URL
//             } else {
//                 console.error('Error uploading image to Cloudflare:', data.errors);
//             }

//             // Remove the file from the server after upload
//             fs.unlinkSync(req.file.path);

//         } catch (err) {
//             console.error('Failed to upload image:', err);
//         }
//     }

//     try {
//         await db.collection('post').insertOne({
//             title: req.body.title,
//             content: req.body.content,
//             imageUrl: imageUrl,
//             createdAt: new Date()
//         });
//         res.redirect('/list');
//     } catch (err) {
//         console.error('Database error occurred:', err);
//         res.status(500).send('Failed to save the post');
//     }
// });






app.post('/add', upload.single('image'), async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('You need to log in to add a post');
    }

    let imageUrl = null;

    if (req.file) {
        try {
            const formData = new FormData();
            const fileStream = fs.createReadStream(req.file.path);
            const contentType = req.file.mimetype;

            // Append the file with the correct content type
            formData.append('file', fileStream, {
                contentType: contentType,
                filename: req.file.originalname
            });

            const response = await axios.post('https://api.cloudflare.com/client/v4/accounts/626e6384b0c0fb9f6780cfadeff08425/images/v1', formData, {
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
                    ...formData.getHeaders()
                }
            });

            const data = response.data;

            if (data.success) {
                const imageId = data.result.id;
                const accountHash = '946t3Bn7epLNWC96BjzU3Q'; // Your account hash
                imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`;
            } else {
                console.error('Error uploading image to Cloudflare:', data.errors);
            }

            // Remove the file from the server after upload
            fs.unlinkSync(req.file.path);

        } catch (err) {
            console.error('Failed to upload image:', err);
        }
    }

    try {
        await db.collection('post').insertOne({
            title: req.body.title,
            content: req.body.content,
            imageUrl: imageUrl,
            createdAt: new Date()
        });
        res.redirect('/list');
    } catch (err) {
        console.error('Database error occurred:', err);
        res.status(500).send('Failed to save the post');
    }
});






// Handle fetching a post by ID with error handling
app.get('/detail/:id', async (req, res) => {
    try {
        const result = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.render('detail', { result: result });
        } else {
            res.status(404).send('Post not found.');
        }
    } catch (err) {
        console.error('Invalid ID format or database error:', err);
        res.status(400).send('Invalid ID format or database error.');
    }
});

// Render the edit form with the current post data
app.get('/edit/:id', async (req, res) => {
    try {
        const result = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
        if (result) {
            res.render('edit', { result: result });
        } else {
            res.status(404).send('Post not found.');
        }
    } catch (err) {
        console.error('Invalid ID format or database error:', err);
        res.status(400).send('Invalid ID format or database error.');
    }
});

// Handle updating a post
app.post('/edit/:id', async (req, res) => {
    if (req.body.title === '') {
        res.status(400).send('Title is required.');
    } else {
        try {
            await db.collection('post').updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { title: req.body.title, content: req.body.content } }
            );
            res.redirect('/list');
        } catch (err) {
            console.error('Database error occurred:', err);
            res.status(500).send('Failed to update the post.');
        }
    }
});

// Handle deleting a post
app.delete('/delete/:id', async (req, res) => {
    try {
        await db.collection('post').deleteOne({ _id: new ObjectId(req.params.id) });
        res.send('Post deleted');
    } catch (err) {
        console.error('Failed to delete post:', err);
        res.status(500).send('Failed to delete the post.');
    }
});
