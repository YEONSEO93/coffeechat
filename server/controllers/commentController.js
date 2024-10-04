
//server/controllers/commentController.js

const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

const addComment = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You need to log in to add a comment' });
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
    console.error('Error adding comment:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

const editComment = async (req, res) => {
  try {
    const result = await getDB().collection('comment').updateOne(
      { _id: new ObjectId(req.params.id), writerId: new ObjectId(req.user._id) },
      { $set: { content: req.body.content } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Comment not found or you are not authorized to edit it' });
    }

    res.redirect('back');
  } catch (err) {
    console.error('Error editing comment:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to edit comment' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const result = await getDB().collection('comment').deleteOne(
      { _id: new ObjectId(req.params.id), writerId: new ObjectId(req.user._id) }
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Comment not found or you are not authorized to delete it' });
    }

    res.redirect('back');
  } catch (err) {
    console.error('Error deleting comment:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

module.exports = { addComment, editComment, deleteComment };
