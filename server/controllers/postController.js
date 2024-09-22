const { getPreSignedUrl, uploadFileToS3, deleteImageFromS3 } = require('./s3Controller.js');
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const path = require('path');

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
                post.preSignedUrl = await getPreSignedUrl(post.imageUrl);
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
                post.imageUrl = await getPreSignedUrl(post.imageUrl); // Generate a pre-signed URL for reading the image
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
            // Delete the old image if it exists
            if (post.imageUrl) {
                const imageKey = post.imageUrl.split('/').pop(); // Extract image key from URL
                await deleteImageFromS3(imageKey); // Delete image from S3
            }

            // Upload the new image to S3
            const fileName = req.file.filename;
            const preSignedUrl = await getPreSignedUrl(fileName);
            await uploadFileToS3(req.file.buffer, preSignedUrl); // Ensure to send buffer

            // Update the image URL
            updateData.imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
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
    getPosts,
    getPostById,
    editPost,
    deletePost,
};
