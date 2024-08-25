//server/controllers/postController.js

const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

const createPost = async (req, res) => {
  try {
    // Set the imageUrl based on whether a file was uploaded
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Create the new post object with the correct imageUrl
    const newPost = {
      title: req.body.title,
      content: req.body.content,
      imageUrl: imageUrl, // Use the correct imageUrl
      createdAt: new Date(),
      user: req.user._id,
      username: req.user.username
    };

    // Insert the new post into the database
    await getDB().collection('post').insertOne(newPost);

    // Redirect to the list of posts
    res.redirect('/posts/list');
  } catch (err) {
    // Handle any errors that occur during post creation
    res.status(500).send('Failed to create post');
  }
};


// const getPosts = async (req, res) => {
//   try {
//     const posts = await getDB().collection('post').find().toArray();
//     res.render('list', { posts, user: req.user });
//   } catch (err) {
//     res.status(500).send('Failed to fetch posts');
//   }
// };




const getPosts = async (req, res) => {
  try {
    const posts = await getDB().collection('post').aggregate([
      {
        $lookup: {
          from: 'comment',
          localField: '_id',
          foreignField: 'parentId',
          as: 'comments'
        }
      },
      {
        $addFields: {
          commentCount: { $size: '$comments' }
        }
      },
      {
        $project: {
          comments: 0 // Exclude the comments array, we only need the count
        }
      }
    ]).toArray();

    res.render('list', { posts, user: req.user });
  } catch (err) {
    res.status(500).send('Failed to fetch posts');
  }
};




const getPostById = async (req, res) => {
  try {
    const post = await getDB().collection('post').findOne({ _id: new ObjectId(req.params.id) });
    const comments = await getDB().collection('comment').find({ parentId: new ObjectId(req.params.id) }).toArray();

    if (post) {
      res.render('detail', { result: post, result2: comments, user: req.user });
    } else {
      res.status(404).send('Post not found');
    }
  } catch (err) {
    console.error('Failed to fetch post and comments:', err);
    res.status(500).send('Failed to fetch post and comments');
  }
};


const editPost = async (req, res) => {
  try {
    const post = await getDB().collection('post').findOne({ _id: new ObjectId(req.params.id) });
    if (post && post.user.equals(req.user._id)) {
      await getDB().collection('post').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { title: req.body.title, content: req.body.content } }
      );
      res.redirect('/posts/list');  // Update this line
    } else {
      res.status(403).send('Unauthorized to edit this post');
    }
  } catch (err) {
    res.status(500).send('Failed to update post');
  }
};



const deletePost = async (req, res) => {
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
            return res.status(403).send('Unauthorized to delete this post');
        }

        await getDB().collection('post').deleteOne({ _id: new ObjectId(postId) });

        // Redirect to the posts list after deletion
        res.redirect('/posts/list');
    } catch (err) {
        console.error('Failed to delete post:', err);
        res.status(500).send('Failed to delete post');
    }
};




module.exports = {
  createPost,
  getPosts,
  getPostById,
  editPost,
  deletePost
};
