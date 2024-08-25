//server/routes/postRoutes.js
const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/auth');
const { getDB } = require('../config/db');
const { createPost, getPosts, getPostById, editPost, deletePost } = require('../controllers/postController');
const { upload } = require('../middleware/fileUpload');
const { ObjectId } = require('mongodb');

router.get('/write', ensureAuthenticated, (req, res) => res.render('write'));
router.post('/add', ensureAuthenticated, upload.single('img1'), (req, res) => {
  console.log('Post request received');  
  createPost(req, res);
});
router.post('/add', ensureAuthenticated, upload.single('img1'), (req, res) => {
  console.log('Post request received');  
  createPost(req, res);
});

router.get('/list', getPosts);
router.get('/detail/:id', getPostById);




router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.params.id;
    if (!ObjectId.isValid(postId)) {
      return res.status(400).send('Invalid post ID');
    }

    const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });
    
    if (!post) {
      return res.status(404).send('Post not found');
    }
    
    if (!post.user.equals(req.user._id)) {
      return res.status(403).send('Unauthorized to edit this post');
    }
    
    res.render('edit', { result: post });
  } catch (err) {
    console.error('Failed to load the edit page:', err);
    res.status(500).send('Failed to load the edit page');
  }
});


router.post('/edit/:id', ensureAuthenticated, editPost);
router.delete('/delete/:id', ensureAuthenticated, deletePost);



module.exports = router;

