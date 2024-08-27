const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

const createPost = async (req, res) => {
  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newPost = {
      title: req.body.title,
      content: req.body.content,
      imageUrl: imageUrl,
      createdAt: new Date(),
      user: req.user._id,
      username: req.user.username
    };

    await getDB().collection('post').insertOne(newPost);

    res.redirect('/posts/list');
  } catch (err) {
    res.status(500).send('Failed to create post');
  }
};

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
        $sort: { createdAt: -1 }
      },
      {
        $project: {
          comments: 0
        }
      }
    ]).toArray();

    res.render('list', { posts, user: req.user });
  } catch (err) {
    console.error('Failed to fetch posts:', err);
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
        const postId = req.params.id;
        const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

        if (post && post.user.equals(req.user._id)) {
            const updateData = {
                title: req.body.title,
                content: req.body.content,
                updatedAt: new Date(),
            };

            // If a new GIF is uploaded, update the imageUrl
            if (req.file) {
                updateData.imageUrl = `/uploads/${req.file.filename}`;
            }

            await getDB().collection('post').updateOne(
                { _id: new ObjectId(postId) },
                { $set: updateData }
            );

            res.redirect('/posts/list'); // Redirect to the list page after update
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
