const express = require('express');
const multer = require('multer');
const router = express.Router();
const ensureAuthenticated = require('../middleware/auth');
const { getDB } = require('../config/db');
const { createPost, getPosts, getPostById, editPost, deletePost } = require('../controllers/postController');
const { upload } = require('../middleware/fileUpload');
const { ObjectId } = require('mongodb');


router.get('/write', ensureAuthenticated, (req, res) => {

    res.render('write');
});



router.post('/add', ensureAuthenticated, upload.single('img1'), (req, res) => {
    console.log('Post request received');  
    createPost(req, res);
}, (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send('File too large. Maximum size allowed is 5MB.');
    }
    // Handle other Multer errors here if necessary
  } else if (err) {
    return res.status(500).send('An unexpected error occurred.');
  }
});

router.get('/list', getPosts);
router.get('/detail/:id', getPostById);







router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const postId = req.params.id;

        // Validate the ObjectId
        if (!ObjectId.isValid(postId)) {
            return res.status(400).send('Invalid post ID');
        }

        // Find the post by ID
        const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

        // Check if the post exists
        if (!post) {
            return res.status(404).send('Post not found');
        }

        // Render the edit page with the post data
        res.render('edit', { result: post });

    } catch (err) {
        console.error('Failed to load the edit page:', err);
        res.status(500).send('Failed to load the edit page');
    }
});


router.post('/edit/:id', ensureAuthenticated, upload.single('img1'), async (req, res) => {
    try {
        const postId = req.params.id;
            console.log(postId);  // This should output the correct ID

        const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).send('Post not found');
        }

        // Only allow the user who created the post to edit it
        if (!post.user.equals(req.user._id)) {
            return res.status(403).send('Unauthorized to edit this post');
        }

        // Prepare the update data
        const updateData = {
            title: req.body.title,
            content: req.body.content,
            updatedAt: new Date(),
        };

        // If a new GIF or image is uploaded, update the imageUrl
        if (req.file) {
            const mimeType = req.file.mimetype;

            // Check if the file is a GIF
            if (mimeType === 'image/gif') {
                updateData.imageUrl = `/uploads/${req.file.filename}`;
            } else {
                // Handle case if the file is not a GIF
                updateData.imageUrl = `/uploads/${req.file.filename}`;
            }
        }

        await getDB().collection('post').updateOne(
            { _id: new ObjectId(postId) },
            { $set: updateData }
        );

        res.redirect('/posts/list');
    } catch (err) {
        console.error('Failed to update post:', err);
        res.status(500).send('Failed to update post');
    }
});



// router.post('/edit/:id', ensureAuthenticated, editPost);
router.delete('/delete/:id', ensureAuthenticated, deletePost);

module.exports = router;
