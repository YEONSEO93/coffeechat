// server/controllers/streamController.js

const { getDB } = require('../config/db');
const axios = require('axios');
const { ObjectId } = require('mongodb');

const getStream = async (req, res) => {
    try {
        const user = req.user;
        const stream = await getDB().collection('liveStream').findOne({ userId: user._id });

        if (!stream) {
            return res.status(404).render('livestream', { user: req.user, stream: null });
        }

        res.render('livestream', { user: req.user, stream: stream });
    } catch (err) {
        console.error('Error fetching stream:', err);
        res.status(500).send('Internal Server Error');
    }
};

const startStream = async (req, res) => {
    try {
        const { title } = req.body;

        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
            {
                meta: { name: title },
                recording: { mode: "automatic" }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`
                }
            }
        );

        if (response.data.success) {
            const stream = await getDB().collection('liveStream').insertOne({
                title: title,
                stream_id: response.data.result.uid,
                stream_key: response.data.result.rtmps.streamKey,
                userId: req.user._id
            });

            res.redirect(`/streams/${stream.insertedId}`);
        } else {
            console.error('Error starting stream:', response.data.errors);
            res.status(500).send('Failed to start the stream.');
        }
    } catch (err) {
        console.error('Error starting stream:', err);
        res.status(500).send('Failed to start the stream.');
    }
};

module.exports = {
    getStream,
    startStream
};
