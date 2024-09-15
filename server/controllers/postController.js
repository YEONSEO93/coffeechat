// const { getDB } = require('../config/db');
// const { ObjectId } = require('mongodb');

// const createPost = async (req, res) => {
//   try {
//     const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

//     const newPost = {
//       title: req.body.title,
//       content: req.body.content,
//       imageUrl: imageUrl,
//       createdAt: new Date(),
//       user: req.user._id,
//       username: req.user.username
//     };

//     await getDB().collection('post').insertOne(newPost);

//     res.redirect('/posts/list');
//   } catch (err) {
//     console.error('Failed to create post:', err);
//     res.status(500).send('Failed to create post');
    
//   }
// };

// const getPosts = async (req, res) => {
//   try {
//     const posts = await getDB().collection('post').aggregate([
//       {
//         $lookup: {
//           from: 'comment',
//           localField: '_id',
//           foreignField: 'parentId',
//           as: 'comments'
//         }
//       },
//       {
//         $addFields: {
//           commentCount: { $size: '$comments' }
//         }
//       },
//       {
//         $sort: { createdAt: -1 }
//       },
//       {
//         $project: {
//           comments: 0
//         }
//       }
//     ]).toArray();

//     res.render('list', { posts, user: req.user });
//   } catch (err) {
//     console.error('Failed to fetch posts:', err);
//     res.status(500).send('Failed to fetch posts');
//   }
// };

// const getPostById = async (req, res) => {
//   try {
//     const post = await getDB().collection('post').findOne({ _id: new ObjectId(req.params.id) });
//     const comments = await getDB().collection('comment').find({ parentId: new ObjectId(req.params.id) }).toArray();

//     if (post) {
//       res.render('detail', { result: post, result2: comments, user: req.user });
//     } else {
//       res.status(404).send('Post not found');
//     }
//   } catch (err) {
//     console.error('Failed to fetch post and comments:', err);
//     res.status(500).send('Failed to fetch post and comments');
//   }
// };

// const editPost = async (req, res) => {
//     try {
//         const postId = req.params.id;
//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

//         if (post && post.user.equals(req.user._id)) {
//             const updateData = {
//                 title: req.body.title,
//                 content: req.body.content,
//                 updatedAt: new Date(),
//             };

//             // If a new GIF is uploaded, update the imageUrl
//             if (req.file) {
//                 updateData.imageUrl = `/uploads/${req.file.filename}`;
//             }

//             await getDB().collection('post').updateOne(
//                 { _id: new ObjectId(postId) },
//                 { $set: updateData }
//             );

//             res.redirect('/posts/list'); // Redirect to the list page after update
//         } else {
//             res.status(403).send('Unauthorized to edit this post');
//         }
//     } catch (err) {
//         console.error('Failed to update post:', err);
//         res.status(500).send('Failed to update post');
//     }
// };



// const deletePost = async (req, res) => {
//     try {
//         const postId = req.params.id;
//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });
//         if (!post) {
//             return res.status(404).send('Post not found');
//         }

//         if (!post.user.equals(req.user._id)) {
//             return res.status(403).send('Unauthorized to delete this post');
//         }

//         await getDB().collection('post').deleteOne({ _id: new ObjectId(postId) });

//         res.redirect('/posts/list');
//     } catch (err) {
//         console.error('Failed to delete post:', err);
//         res.status(500).send('Failed to delete post');
//     }
// };

// module.exports = {
//   createPost,
//   getPosts,
//   getPostById,
//   editPost,
//   deletePost
// };



// const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
// const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// const { ObjectId } = require('mongodb');
// const { getDB } = require('../config/db');

// // Initialize S3 client
// const s3 = new S3Client({ region: process.env.AWS_REGION });

// // Create a post and store the image in S3 using pre-signed URL
// const createPost = async (req, res) => {
//     const fileName = req.file ? req.file.filename : null;
    
//     if (fileName) {
//         const params = {
//             Bucket: process.env.AWS_BUCKET_NAME,
//             Key: fileName,
//         };

//         const command = new PutObjectCommand(params);
//         const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes expiration

//         // Store the post with the S3 URL for the image
//         const newPost = {
//             title: req.body.title,
//             content: req.body.content,
//             imageUrl: url,
//             user: req.user._id,
//             username: req.user.username,
//             createdAt: new Date(),
//         };

//         await getDB().collection('post').insertOne(newPost);
//     }

//     res.redirect('/posts/list');
// };

// // Retrieve all posts and count the number of comments for each post
// const getPosts = async (req, res) => {
//     try {
//         const posts = await getDB().collection('post').aggregate([
//             {
//                 $lookup: {
//                     from: 'comment',
//                     localField: '_id',
//                     foreignField: 'parentId',
//                     as: 'comments',
//                 },
//             },
//             {
//                 $addFields: {
//                     commentCount: { $size: '$comments' },
//                 },
//             },
//             {
//                 $sort: { createdAt: -1 },
//             },
//             {
//                 $project: {
//                     comments: 0, // Exclude comments from the result to reduce payload
//                 },
//             },
//         ]).toArray();

//         res.render('list', { posts, user: req.user });
//     } catch (err) {
//         console.error('Failed to fetch posts:', err);
//         res.status(500).send('Failed to fetch posts');
//     }
// };

// // Retrieve a specific post by its ID along with its comments
// const getPostById = async (req, res) => {
//     try {
//         const postId = req.params.id;

//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });
//         const comments = await getDB().collection('comment').find({ parentId: new ObjectId(postId) }).toArray();

//         if (post) {
//             res.render('detail', { result: post, result2: comments, user: req.user });
//         } else {
//             res.status(404).send('Post not found');
//         }
//     } catch (err) {
//         console.error('Failed to fetch post and comments:', err);
//         res.status(500).send('Failed to fetch post and comments');
//     }
// };

// // Edit a post, allowing only the user who created it to make changes
// const editPost = async (req, res) => {
//     try {
//         const postId = req.params.id;
//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

//         if (post && post.user.equals(req.user._id)) {
//             const updateData = {
//                 title: req.body.title,
//                 content: req.body.content,
//                 updatedAt: new Date(),
//             };

//             // If a new image is uploaded, update the imageUrl with a new S3 pre-signed URL
//             if (req.file) {
//                 const params = {
//                     Bucket: process.env.AWS_BUCKET_NAME,
//                     Key: req.file.filename,
//                 };
//                 const command = new PutObjectCommand(params);
//                 const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
//                 updateData.imageUrl = url;
//             }

//             await getDB().collection('post').updateOne(
//                 { _id: new ObjectId(postId) },
//                 { $set: updateData }
//             );

//             res.redirect('/posts/list'); // Redirect after updating the post
//         } else {
//             res.status(403).send('Unauthorized to edit this post');
//         }
//     } catch (err) {
//         console.error('Failed to update post:', err);
//         res.status(500).send('Failed to update post');
//     }
// };

// // Delete a post, ensuring only the user who created it can delete it
// const deletePost = async (req, res) => {
//     try {
//         const postId = req.params.id;
//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });
//         if (!post) {
//             return res.status(404).send('Post not found');
//         }

//         // Ensure only the post creator can delete it
//         if (!post.user.equals(req.user._id)) {
//             return res.status(403).send('Unauthorized to delete this post');
//         }

//         await getDB().collection('post').deleteOne({ _id: new ObjectId(postId) });

//         res.redirect('/posts/list');
//     } catch (err) {
//         console.error('Failed to delete post:', err);
//         res.status(500).send('Failed to delete post');
//     }
// };

// module.exports = {
//     createPost,
//     getPosts,
//     getPostById,
//     editPost,
//     deletePost,
// };






// const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
// const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// const { ObjectId } = require('mongodb');
// const { getDB } = require('../config/db');

// // Initialize S3 client
// const s3 = new S3Client({ region: process.env.AWS_REGION });

// // Generate a pre-signed URL for uploading an image to S3
// const getPreSignedUrl = async (fileName) => {
//     const params = {
//         Bucket: process.env.AWS_BUCKET_NAME,
//         Key: fileName,
//     };
//     const command = new PutObjectCommand(params);
//     return await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes expiration
// };



// // Retrieve all posts and count the number of comments for each post
// const getPosts = async (req, res) => {
//     try {
//         const posts = await getDB().collection('post').aggregate([
//             {
//                 $lookup: {
//                     from: 'comment',
//                     localField: '_id',
//                     foreignField: 'parentId',
//                     as: 'comments',
//                 },
//             },
//             {
//                 $addFields: {
//                     commentCount: { $size: '$comments' },
//                 },
//             },
//             {
//                 $sort: { createdAt: -1 },
//             },
//             {
//                 $project: {
//                     comments: 0, // Exclude comments from the result to reduce payload
//                 },
//             },
//         ]).toArray();

//         res.render('list', { posts, user: req.user });
//     } catch (err) {
//         console.error('Failed to fetch posts:', err);
//         res.status(500).send('Failed to fetch posts');
//     }
// };


// // Retrieve a specific post by its ID along with its comments
// const getPostById = async (req, res) => {
//     try {
//         const postId = req.params.id;

//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });
//         const comments = await getDB().collection('comment').find({ parentId: new ObjectId(postId) }).toArray();

//         if (post) {
//             res.render('detail', { result: post, result2: comments, user: req.user });
//         } else {
//             res.status(404).send('Post not found');
//         }
//     } catch (err) {
//         console.error('Failed to fetch post and comments:', err);
//         res.status(500).send('Failed to fetch post and comments');
//     }
// };


// // Create a post and store the image in S3 using pre-signed URL
// const createPost = async (req, res) => {
//     try {
//         if (!req.user || !req.user._id) {
//             throw new Error('User not authenticated');
//         }

//         const fileName = req.file ? req.file.filename : null;
//         let imageUrl = null;

//         if (fileName) {
//             imageUrl = await getPreSignedUrl(fileName);
//         }

//         const newPost = {
//             title: req.body.title,
//             content: req.body.content,
//             user: req.user._id,
//             username: req.user.username,
//             imageUrl: imageUrl,
//             createdAt: new Date(),
//         };

//         await getDB().collection('post').insertOne(newPost);
//         res.redirect('/posts/list');
//     } catch (err) {
//         console.error('Error creating post:', err);
//         req.flash('error_msg', 'Failed to create post.');
//         res.redirect('/posts/write');
//     }
// };


// // Edit a post, allowing only the user who created it to make changes
// const editPost = async (req, res) => {
//     try {
//         const postId = req.params.id;
//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

//         if (post && post.user.equals(req.user._id)) {
//             const updateData = {
//                 title: req.body.title,
//                 content: req.body.content,
//                 updatedAt: new Date(),
//             };

//             // If a new image is uploaded, update the imageUrl with a new S3 pre-signed URL
//             if (req.file) {
//                 const params = {
//                     Bucket: process.env.AWS_BUCKET_NAME,
//                     Key: req.file.filename,
//                 };
//                 const command = new PutObjectCommand(params);
//                 const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
//                 updateData.imageUrl = url;
//             }

//             await getDB().collection('post').updateOne(
//                 { _id: new ObjectId(postId) },
//                 { $set: updateData }
//             );

//             res.redirect('/posts/list'); // Redirect after updating the post
//         } else {
//             res.status(403).send('Unauthorized to edit this post');
//         }
//     } catch (err) {
//         console.error('Failed to update post:', err);
//         res.status(500).send('Failed to update post');
//     }
// };

// // Delete a post, ensuring only the user who created it can delete it
// const deletePost = async (req, res) => {
//     try {
//         const postId = req.params.id;

//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

//         if (!post) {
//             return res.status(404).send('Post not found');
//         }

//         // Ensure only the post creator can delete it
//         if (!post.user.equals(req.user._id)) {
//             return res.status(403).send('Unauthorized to delete this post');
//         }

//         await getDB().collection('post').deleteOne({ _id: new ObjectId(postId) });

//         res.redirect('/posts/list');
//     } catch (err) {
//         console.error('Failed to delete post:', err);
//         res.status(500).send('Failed to delete post');
//     }
// };


// // Export the controller functions
// module.exports = {
//     createPost,
//     getPosts,
//     getPostById,
//     editPost,
//     deletePost,
// };



const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// Create a new post
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
    console.error('Failed to create post:', err);
    res.status(500).send('Failed to create post');
  }
};

// Get all posts with comments count
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

// Get a post by ID with its comments
const getPostById = async (req, res) => {
  try {
    const postId = new ObjectId(req.params.id);

    const post = await getDB().collection('post').findOne({ _id: postId });
    const comments = await getDB().collection('comment').find({ parentId: postId }).toArray();

    if (post) {
      res.render('detail', { result: post, result2: comments, user: req.user });
    } else {
      res.status(404).send('Post not found');
    }
  } catch (err) {
    console.error('Failed to fetch post details:', err);
    res.status(500).send('Failed to fetch post details');
  }
};

// Delete a post by ID
const deletePost = async (req, res) => {
  try {
    const postId = new ObjectId(req.params.id);
    await getDB().collection('post').deleteOne({ _id: postId });
    res.redirect('/posts/list');
  } catch (err) {
    console.error('Failed to delete post:', err);
    res.status(500).send('Failed to delete post');
  }
};

module.exports = { createPost, getPosts, getPostById, deletePost };
