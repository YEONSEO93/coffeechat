//server/controllers/commentController.js

const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

const addComment = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('You need to log in to add a comment');
  }
  try {
    await getDB().collection('comment').insertOne({
      content: req.body.content,
      writerId: new ObjectId(req.user._id),
      writer: req.user.username,
      parentId: new ObjectId(req.body.postId), // Ensure this is `postId` as used in the form
      createdAt: new Date(),
    });

    // Redirect to the post detail page with a cache-busting query parameter
    res.redirect(`/posts/detail/${req.body.postId}?nocache=${new Date().getTime()}`);
  } catch (err) {
    res.status(500).send('Failed to add comment');
  }
};


const editComment = async (req, res) => {
  try {
    await getDB().collection('comment').updateOne(
      { _id: new ObjectId(req.params.id), writerId: new ObjectId(req.user._id) },
      { $set: { content: req.body.content } }
    );
    res.redirect('back');
  } catch (err) {
    res.status(500).send('Failed to edit comment.');
  }
};

const deleteComment = async (req, res) => {
  try {
    await getDB().collection('comment').deleteOne({ _id: new ObjectId(req.params.id), writerId: new ObjectId(req.user._id) });
    res.redirect('back');
  } catch (err) {
    res.status(500).send('Failed to delete comment.');
  }
};

module.exports = { addComment, editComment, deleteComment };

