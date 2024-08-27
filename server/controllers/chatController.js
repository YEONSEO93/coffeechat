//server/controllers/chatController.js

const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

const getChatrooms = async (req, res) => {
  try {
    const chatrooms = await getDB().collection('chatroom').find({ member: req.user._id }).toArray();
    res.render('chatList', { chatrooms: chatrooms });
  } catch (err) {
    console.error('Failed to fetch chatrooms:', err);
    res.status(500).send('Failed to fetch chatrooms');
  }
};

const getChatroomDetails = async (req, res) => {
  try {
    const chatroom = await getDB().collection('chatroom').findOne({ _id: new ObjectId(req.params.id) });

    if (!chatroom) {
      return res.status(404).send('Chatroom not found.');
    }

    const members = await getDB().collection('user').find({ _id: { $in: chatroom.member } }).toArray();
    const memberUsernames = members.map(member => member.username);

    res.render('chatDetail', { chatroom: chatroom, memberUsernames: memberUsernames });
  } catch (err) {
    console.error('Error fetching chatroom details:', err);
    res.status(500).send('Internal Server Error');
  }
};

const createChatroomRequest = async (req, res) => {
  try {
    const postId = req.query.postId;
    if (!ObjectId.isValid(postId)) {
      return res.status(400).send('Invalid postId');
    }

    const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return res.status(404).send('Post not found.');
    }

    const chatroomExists = await getDB().collection('chatroom').findOne({
      member: { $all: [req.user._id, post.user] }
    });

    if (!chatroomExists) {
      await getDB().collection('chatroom').insertOne({
        member: [req.user._id, post.user],
        postTitle: post.title,
        date: new Date()
      });
    }

    res.redirect('/chat/list');
  } catch (err) {
    console.error('Error creating chatroom:', err.message, err.stack);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  getChatrooms,
  getChatroomDetails,
  createChatroomRequest
};
