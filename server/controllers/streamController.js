// // // server/controllers/streamController.js

// // const { getDB } = require('../config/db');
// // const axios = require('axios');
// // const { ObjectId } = require('mongodb');

// // const getStream = async (req, res) => {
// //     try {
// //         const user = req.user;
// //         const stream = await getDB().collection('liveStream').findOne({ userId: user._id });

// //         if (!stream) {
// //             return res.status(404).render('livestream', { user: req.user, stream: null });
// //         }

// //         res.render('livestream', { user: req.user, stream: stream });
// //     } catch (err) {
// //         console.error('Error fetching stream:', err);
// //         res.status(500).send('Internal Server Error');
// //     }
// // };

// // const startStream = async (req, res) => {
// //     try {
// //         const { title } = req.body;

// //         const response = await axios.post(
// //             `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
// //             {
// //                 meta: { name: title },
// //                 recording: { mode: "automatic" }
// //             },
// //             {
// //                 headers: {
// //                     'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`
// //                 }
// //             }
// //         );

// //         if (response.data.success) {
// //             const stream = await getDB().collection('liveStream').insertOne({
// //                 title: title,
// //                 stream_id: response.data.result.uid,
// //                 stream_key: response.data.result.rtmps.streamKey,
// //                 userId: req.user._id
// //             });

// //             res.redirect(`/streams/${stream.insertedId}`);
// //         } else {
// //             console.error('Error starting stream:', response.data.errors);
// //             res.status(500).send('Failed to start the stream.');
// //         }
// //     } catch (err) {
// //         console.error('Error starting stream:', err);
// //         res.status(500).send('Failed to start the stream.');
// //     }
// // };


// // // server/controllers/streamController.js

// // exports.viewStream = async (req, res) => {
// //     try {
// //         const stream = await getStream(req.user._id); // Assuming you have a function to get a stream by user ID
// //         res.render('livestream', { stream });
// //     } catch (err) {
// //         console.error('Error fetching stream:', err);
// //         res.status(500).send('Internal Server Error');
// //     }
// // };

// // exports.startStream = async (req, res) => {
// //     try {
// //         const stream = await startStream(req.user._id, req.body.title); // Assuming you have a function to start a stream
// //         res.redirect(`/stream/livestream`);
// //     } catch (err) {
// //         console.error('Error starting stream:', err);
// //         res.status(500).send('Internal Server Error');
// //     }
// // };


// // module.exports = {
// //     getStream,
// //     startStream
// // };





// // server/controllers/streamController.js

// const { getDB } = require('../config/db');
// const axios = require('axios');
// const { ObjectId } = require('mongodb');



// // Function to start a new stream
// const startStream = async (req, res) => {
//     try {
//         const { title } = req.body;

//         const response = await axios.post(
//             `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
//             {
//                 meta: { name: title },
//                 recording: { mode: "automatic" }
//             },
//             {
//                 headers: {
//                     'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`
//                 }
//             }
//         );

//         if (response.data.success) {
//             const stream = await getDB().collection('liveStream').insertOne({
//                 title: title,
//                 stream_id: response.data.result.uid,
//                 stream_key: response.data.result.rtmps.streamKey,
//                 userId: req.user._id
//             });

//             res.redirect(`/streams/${stream.insertedId}`);
//         } else {
//             console.error('Error starting stream:', response.data.errors);
//             res.status(500).send('Failed to start the stream.');
//         }
//     } catch (err) {
//         console.error('Error starting stream:', err);
//         res.status(500).send('Failed to start the stream.');
//     }
// };



// const viewStream = async (req, res) => {
//     try {
//         const user = req.user;
//         const stream = await getDB().collection('liveStream').findOne({ userId: user._id });

//         if (!stream) {
//             return res.status(404).render('livestream', { user: req.user, stream: null });
//         }

//         res.render('livestream', { user: req.user, stream: stream });
//     } catch (err) {
//         console.error('Error fetching stream:', err);
//         res.status(500).send('Internal Server Error');
//     }
// };

// console.log('Inside viewStream');

// module.exports = {
//     viewStream,
//     startStream
// };


const { getDB } = require('../config/db');
const axios = require('axios');
const { ObjectId } = require('mongodb');

// Function to get stream details
const getStream = async (id) => {
  const db = getDB();
  const stream = await db.collection('liveStream').findOne({ _id: new ObjectId(id) }, {
    projection: {
      title: 1,
      stream_key: 1,
      stream_id: 1,
      userId: 1,
      user: {
        avatar: 1,
        username: 1,
      },
    },
  });
  return stream;
};

// Controller to handle rendering the stream details page
const streamDetail = async (req, res) => {
  const id = req.params.id;

  // Check if ID is a valid ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(404).send('Stream not found');
  }

  const stream = await getStream(id);
  if (!stream) {
    return res.status(404).send('Stream not found');
  }

  const session = req.user;

  // Construct the iframe source URL
  const iframeSrc = `https://${process.env.CLOUDFLARE_DOMAIN}/${stream.stream_id}/iframe`;

  res.render('livestream', {
    iframeSrc,
    stream,
    session,
    isOwner: stream.userId.equals(session._id)
  });
};

// Function to start a new stream
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

// Function to view an existing stream
const viewStream = async (req, res) => {
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




const renameStreamController = async (req, res) => {
    const { streamId, newName } = req.body;

    await renameStream(streamId, newName);

    res.redirect('/stream/livestream');
};

const deleteStreamController = async (req, res) => {
    const { streamId } = req.params;

    await deleteStream(streamId);

    res.redirect('/stream/livestream');
};

const renameStream = async (streamId, newName) => {
    try {
        const response = await axios.put(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${streamId}`,
            {
                meta: { name: newName },
                recording: { mode: "automatic", timeoutSeconds: 10 }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`
                }
            }
        );

        if (response.data.success) {
            console.log('Stream renamed successfully');
        } else {
            console.error('Error renaming stream:', response.data.errors);
        }
    } catch (err) {
        console.error('Error renaming stream:', err);
    }
};


const deleteStream = async (streamId) => {
    try {
        const response = await axios.delete(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${streamId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`
                }
            }
        );

        if (response.data.success) {
            console.log('Stream deleted successfully');
        } else {
            console.error('Error deleting stream:', response.data.errors);
        }
    } catch (err) {
        console.error('Error deleting stream:', err);
    }
};










module.exports = {
  streamDetail,
  startStream,
  viewStream,
  renameStreamController,
deleteStreamController
};

