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

    // Log the received postId
    console.log(`Received postId: ${postId}`);

    if (!ObjectId.isValid(postId)) {
      console.log('Invalid postId');
      return res.status(400).send('Invalid postId');
    }

    // Log the process of checking if the post exists
    console.log(`Checking if post exists for postId: ${postId}`);
    const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

    if (!post) {
      console.log('Post not found for postId:', postId);
      return res.status(404).send('Post not found.');
    }

    // Log that the post was found
    console.log(`Post found: ${post.title}`);

    // Log the process of checking if the chatroom exists
    console.log(`Checking if chatroom exists for members: [${req.user._id}, ${post.user}]`);
    const chatroomExists = await getDB().collection('chatroom').findOne({
      member: { $all: [req.user._id, post.user] },
      postTitle: post.title
    });

    if (!chatroomExists) {
      // Log the creation of a new chatroom
      console.log('Creating new chatroom');
      const newChatroom = await getDB().collection('chatroom').insertOne({
        member: [req.user._id, post.user],
        postTitle: post.title,
        postId: post._id,
        date: new Date()
      });
      console.log('New chatroom created with ID:', newChatroom.insertedId);
    } else {
      // Log that the chatroom already exists
      console.log('Chatroom already exists');
    }

    console.log('Redirecting to /chat/list');
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
