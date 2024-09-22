// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const { ObjectId } = require('mongodb');
// const ensureAuthenticated = require('../middleware/auth');
// const { addPost, getPost } = require("../controllers/dynamoDBController"); // DynamoDB 관련 함수 추가
// const { getPreSignedUrl, uploadFileToS3, deleteImageFromS3, getPreSignedReadUrl } = require('../controllers/s3Controller'); // S3 관련 함수들
// const { getDB } = require('../config/db');

// const router = express.Router();
// const upload = multer();  // Multer를 사용해 파일 처리

// // 게시물 추가 라우트 (DynamoDB)
// router.post("/addPost", addPost);

// // 게시물 조회 라우트 (DynamoDB)
// router.get("/getPost/:postId", getPost);

// // Route to render the write post page
// router.get('/write', ensureAuthenticated, (req, res) => {
//     res.render('write', { user: req.user });
// });

// // Route to handle adding a new post
// router.post('/add', ensureAuthenticated, upload.single('img1'), async (req, res) => {
//     try {
//         console.log('Post request received');
        
//         // Ensure multer has processed the file
//         if (!req.file) {
//             return res.status(400).send('No file uploaded');
//         }

//         // Generate a unique file name
//         const fileName = Date.now() + path.extname(req.file.originalname);
//         console.log('Generated fileName:', fileName);

//         // Generate a pre-signed URL for uploading the file to S3
//         const preSignedUrl = await getPreSignedUrl(fileName);
//         if (!preSignedUrl) {
//             throw new Error('Failed to generate pre-signed URL');
//         }
//         console.log('Pre-Signed URL:', preSignedUrl);

//         // Upload the file to S3
//         const fileBuffer = req.file.buffer;
//         const contentType = req.file.mimetype;
//         console.log('File Buffer:', fileBuffer);
//         console.log('Content Type:', contentType);

//         await uploadFileToS3(fileBuffer, preSignedUrl, contentType);  // Upload to S3

//         // Create post data
//         const postData = {
//             ...req.body,
//             imageUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`,  // Store S3 URL
//             user: req.user._id,
//             createdAt: new Date(),
//         };

//         await getDB().collection('post').insertOne(postData);
//         res.redirect('/posts/list');
//     } catch (err) {
//         console.error('Failed to add post:', err);
//         res.status(500).send('An unexpected error occurred.');
//     }
// });

// // Route to get all posts
// router.get('/list', async (req, res) => {
//     try {
//         const posts = await getDB().collection('post').aggregate([
//             {
//                 $lookup: {
//                     from: 'comment',
//                     localField: '_id',
//                     foreignField: 'parentId',
//                     as: 'comments'
//                 }
//             },
//             {
//                 $addFields: {
//                     commentCount: { $size: '$comments' }
//                 }
//             },
//             {
//                 $sort: { createdAt: -1 }
//             },
//             {
//                 $project: {
//                     comments: 0
//                 }
//             }
//         ]).toArray();

//         // Generate pre-signed URLs for images or GIFs if they exist
//         for (const post of posts) {
//             if (post.imageUrl) {
//                 post.preSignedUrl = await getPreSignedReadUrl(post.imageUrl);
//             }
//         }

//         // Render the list page with posts including images/GIFs
//         res.render('list', { posts, user: req.user });
//     } catch (err) {
//         console.error('Failed to fetch posts:', err);
//         res.status(500).send('Failed to fetch posts');
//     }
// });

// // Route to get details of a specific post by ID
// router.get('/detail/:id', async (req, res) => {
//     try {
//         const postId = req.params.id;

//         // Validate the ObjectId
//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });
//         const comments = await getDB().collection('comment').find({ parentId: new ObjectId(postId) }).toArray();

//         if (post) {
//             if (post.imageUrl) {
//                 post.preSignedUrl = await getPreSignedReadUrl(post.imageUrl); // Generate pre-signed URL for image
//             }
//             res.render('detail', { result: post, result2: comments, user: req.user });
//         } else {
//             res.status(404).send('Post not found');
//         }
//     } catch (err) {
//         console.error('Failed to fetch post details:', err);
//         res.status(500).send('Failed to fetch post details');
//     }
// });

// // Route to render the edit page for a specific post by ID
// router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
//     try {
//         const postId = req.params.id;

//         // Validate the ObjectId
//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

//         if (!post) {
//             return res.status(404).send('Post not found');
//         }

//         res.render('edit', { result: post });
//     } catch (err) {
//         console.error('Failed to load the edit page:', err);
//         res.status(500).send('Failed to load the edit page');
//     }
// });

// // Route to handle updating a specific post by ID
// router.post('/edit/:id', ensureAuthenticated, upload.single('img1'), async (req, res) => {
//     try {
//         const postId = req.params.id;
//         const updateData = {
//             title: req.body.title,
//             content: req.body.content,
//             updatedAt: new Date(),
//         };

//         // Validate the ObjectId
//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         // If a new image is uploaded, update the image URL and pre-signed URL
//         if (req.file) {
//             const fileName = req.file.filename;
//             const preSignedUrl = await getPreSignedUrl(fileName);

//             updateData.imageUrl = fileName;
//             updateData.preSignedUrl = preSignedUrl;
//         }

//         await getDB().collection('post').updateOne({ _id: new ObjectId(postId) }, { $set: updateData });

//         res.redirect('/posts/list');
//     } catch (err) {
//         console.error('Failed to update post:', err);
//         res.status(500).send('Failed to update post');
//     }
// });

// // Route to handle deleting a specific post by ID
// router.delete('/delete/:id', ensureAuthenticated, async (req, res) => {
//     try {
//         const postId = req.params.id;

//         // Validate the ObjectId
//         if (!ObjectId.isValid(postId)) {
//             return res.status(400).send('Invalid post ID');
//         }

//         await getDB().collection('post').deleteOne({ _id: new ObjectId(postId) });

//         res.redirect('/posts/list');
//     } catch (err) {
//         console.error('Failed to delete post:', err);
//         res.status(500).send('Failed to delete post');
//     }
// });

// // Route to handle generating a pre-signed URL for an uploaded file
// router.get('/presigned-url', async (req, res) => {
//     const { fileName } = req.query;

//     if (!fileName) {
//         return res.status(400).send('File name is required');
//     }

//     try {
//         const preSignedUrl = await getPreSignedUrl(fileName);
//         res.json({ url: preSignedUrl });
//     } catch (error) {
//         console.error('Error generating pre-signed URL:', error);
//         res.status(500).send('Failed to generate pre-signed URL');
//     }
// });

// module.exports = router;


const express = require('express');
const multer = require('multer');
const path = require('path');
const { ObjectId } = require('mongodb');
const ensureAuthenticated = require('../middleware/auth');
const { addPost, getPost } = require("../controllers/dynamoDBController"); // DynamoDB 관련 함수 추가
const { getPreSignedUrl, uploadFileToS3, deleteImageFromS3, getPreSignedReadUrl } = require('../controllers/s3Controller'); // S3 관련 함수들
const { getDB } = require('../config/db');

const router = express.Router();
const upload = multer();  // Multer를 사용해 파일 처리

// 게시물 추가 라우트 (DynamoDB)
router.post("/addPost", upload.single('img1'), addPost); // img1로 파일 업로드

// 게시물 조회 라우트 (DynamoDB)
router.get("/getPost/:postId", getPost);

// Route to render the write post page
router.get('/write', ensureAuthenticated, (req, res) => {
    res.render('write', { user: req.user });
});

// Route to handle adding a new post
router.post('/add', ensureAuthenticated, upload.single('img1'), async (req, res) => {
    try {
        console.log('Post request received');
        
        // Ensure multer has processed the file
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Generate a unique file name
        const fileName = Date.now() + path.extname(req.file.originalname);
        console.log('Generated fileName:', fileName);

        // Generate a pre-signed URL for uploading the file to S3
        const preSignedUrl = await getPreSignedUrl(fileName);
        if (!preSignedUrl) {
            throw new Error('Failed to generate pre-signed URL');
        }
        console.log('Pre-Signed URL:', preSignedUrl);

        // Upload the file to S3
        const fileBuffer = req.file.buffer;
        const contentType = req.file.mimetype;
        console.log('File Buffer:', fileBuffer);
        console.log('Content Type:', contentType);

        await uploadFileToS3(fileBuffer, preSignedUrl, contentType);  // Upload to S3

        // Create post data
        const postData = {
            ...req.body,
            imageUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`,  // Store S3 URL
            user: req.user._id,
            createdAt: new Date(),
        };

        await getDB().collection('post').insertOne(postData);
        res.redirect('/posts/list');
    } catch (err) {
        console.error('Failed to add post:', err);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
});

// Route to get all posts
router.get('/list', async (req, res) => {
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

        // Generate pre-signed URLs for images or GIFs if they exist
        for (const post of posts) {
            if (post.imageUrl) {
                post.preSignedUrl = await getPreSignedReadUrl(post.imageUrl);
            }
        }

        // Render the list page with posts including images/GIFs
        res.render('list', { posts, user: req.user });
    } catch (err) {
        console.error('Failed to fetch posts:', err);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Route to get details of a specific post by ID
router.get('/detail/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        // Validate the ObjectId
        if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });
        const comments = await getDB().collection('comment').find({ parentId: new ObjectId(postId) }).toArray();

        if (post) {
            if (post.imageUrl) {
                post.preSignedUrl = await getPreSignedReadUrl(post.imageUrl); // Generate pre-signed URL for image
            }
            res.render('detail', { result: post, result2: comments, user: req.user });
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (err) {
        console.error('Failed to fetch post details:', err);
        res.status(500).json({ error: 'Failed to fetch post details' });
    }
});

// Route to render the edit page for a specific post by ID
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const postId = req.params.id;

        // Validate the ObjectId
        if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.render('edit', { result: post });
    } catch (err) {
        console.error('Failed to load the edit page:', err);
        res.status(500).json({ error: 'Failed to load the edit page' });
    }
});

// Route to handle updating a specific post by ID
router.post('/edit/:id', ensureAuthenticated, upload.single('img1'), async (req, res) => {
    try {
        const postId = req.params.id;
        const updateData = {
            title: req.body.title,
            content: req.body.content,
            updatedAt: new Date(),
        };

        // Validate the ObjectId
        if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        // If a new image is uploaded, update the image URL and pre-signed URL
        if (req.file) {
            const fileName = req.file.filename;
            const preSignedUrl = await getPreSignedUrl(fileName);

            updateData.imageUrl = fileName;
            updateData.preSignedUrl = preSignedUrl;
        }

        await getDB().collection('post').updateOne({ _id: new ObjectId(postId) }, { $set: updateData });

        res.redirect('/posts/list');
    } catch (err) {
        console.error('Failed to update post:', err);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// Route to handle deleting a specific post by ID
router.delete('/delete/:id', ensureAuthenticated, async (req, res) => {
    try {
        const postId = req.params.id;

        // Validate the ObjectId
        if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ error: 'Invalid post ID' });
        }

        await getDB().collection('post').deleteOne({ _id: new ObjectId(postId) });

        res.redirect('/posts/list');
    } catch (err) {
        console.error('Failed to delete post:', err);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Route to handle generating a pre-signed URL for an uploaded file
router.get('/presigned-url', async (req, res) => {
    const { fileName } = req.query;

    if (!fileName) {
        return res.status(400).json({ error: 'File name is required' });
    }

    try {
        const preSignedUrl = await getPreSignedUrl(fileName);
        res.json({ url: preSignedUrl });
    } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        res.status(500).json({ error: 'Failed to generate pre-signed URL' });
    }
});

module.exports = router;
