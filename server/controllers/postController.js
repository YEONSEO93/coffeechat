
const { getPreSignedUrl, uploadFileToS3, deleteImageFromS3 } = require('./s3Controller.js'); // Correct import for all S3-related functions
const { getDB } = require('../config/db');
const { getParameterValue } = require('../config/secretsManager'); // Import the updated secretsManager file
const { ObjectId } = require('mongodb');

// Create a new post and store the image in S3
const createPost = async (req, res) => {
    try {
        let imageUrl = null;

        // Fetch AWS_BUCKET_NAME and AWS_REGION from Parameter Store
        const awsBucketName = await getParameterValue('/n11725605/AWS_BUCKET_NAME');
        const awsRegion = await getParameterValue('/n11725605/AWS_REGION');

        if (req.file) {
            // Generate a unique file name
            const fileName = Date.now() + path.extname(req.file.originalname);

            // Get a pre-signed URL for the file
            const preSignedUrl = await getPreSignedUrl(fileName);
            if (!preSignedUrl) {
                throw new Error('Failed to generate pre-signed URL');
            }

            // Upload the file to S3
            const fileBuffer = req.file.buffer;
            const contentType = req.file.mimetype;
            await uploadFileToS3(fileBuffer, preSignedUrl, contentType); // Upload to S3

            // Set the image URL (where the file will be located)
            imageUrl = `https://${awsBucketName}.s3.${awsRegion}.amazonaws.com/${fileName}`;
        }

        const newPost = {
            title: req.body.title,
            content: req.body.content,
            imageUrl: imageUrl,
            user: req.user._id,
            username: req.user.username,
            createdAt: new Date(),
        };

        await getDB().collection('post').insertOne(newPost);
        res.redirect('/posts/list');
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).send('Failed to create post');
    }
};

// Retrieve all posts with the number of comments for each post
const getPosts = async (req, res) => {
    try {
        const posts = await getDB().collection('post').aggregate([
            {
                $lookup: {
                    from: 'comment',
                    localField: '_id',
                    foreignField: 'parentId',
                    as: 'comments',
                },
            },
            {
                $addFields: {
                    commentCount: { $size: '$comments' },
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $project: {
                    comments: 0, // Exclude comments from the result to reduce payload
                },
            },
        ]).toArray();
        
         // Generate pre-signed URLs for images if they exist
        for (const post of posts) {
            if (post.imageUrl) {
                post.preSignedUrl = await getPreSignedReadUrl(post.imageUrl);
            }
        }

        res.render('list', { posts, user: req.user });
    } catch (err) {
        console.error('Failed to fetch posts:', err);
        res.status(500).send('Failed to fetch posts');
    }
};

// Retrieve a specific post by its ID along with its comments
const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;

        if (!ObjectId.isValid(postId)) {
            return res.status(400).send('Invalid post ID');
        }

        const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });
        const comments = await getDB().collection('comment').find({ parentId: new ObjectId(postId) }).toArray();

        if (post) {
            if (post.imageUrl) {
                post.imageUrl = await getPreSignedReadUrl(post.imageUrl); // Generate a pre-signed URL for reading the image
            }
            res.render('detail', { result: post, result2: comments, user: req.user });
        } else {
            res.status(404).send('Post not found');
        }
    } catch (err) {
        console.error('Failed to fetch post and comments:', err);
        res.status(500).send('Failed to fetch post and comments');
    }
};

// Edit a post, allowing only the user who created it to make changes
const editPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).send('Post not found');
        }

        const updateData = {
            title: req.body.title,
            content: req.body.content,
            updatedAt: new Date(),
        };

        if (req.file) {
             // Fetch AWS_BUCKET_NAME and AWS_REGION from Parameter Store
            const awsBucketName = await getParameterValue('/n11725605/AWS_BUCKET_NAME');
            const awsRegion = await getParameterValue('/n11725605/AWS_REGION');

            // Delete the old image if it exists
            if (post.imageUrl) {
                const imageKey = post.imageUrl.split('/').pop(); // Extract image key from URL
                await deleteImageFromS3(imageKey); // Delete image from S3
            }

            // Upload the new image to S3
            const fileName = req.file.filename;
            const preSignedUrl = await getPreSignedUrl(fileName);
            await uploadFileToS3(req.file, preSignedUrl);
            console.log("Upload result:", uploadResult);


            // Update the image URL
            updateData.imageUrl = `https://${awsBucketName}.s3.${awsRegion}.amazonaws.com/${fileName}`;
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
};

// Delete a post, ensuring only the user who created it can delete it
const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await getDB().collection('post').findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).send('Post not found');
        }

        // Ensure only the post creator can delete it
        if (!post.user.equals(req.user._id)) {
            return res.status(403).send('Unauthorized to delete this post');
        }

        // Delete the associated image from S3 if it exists
        if (post.imageUrl) {
            const imageKey = post.imageUrl.split('/').pop(); // Extract image key from the URL
            await deleteImageFromS3(imageKey); // Delete image from S3
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
    deletePost,
};
