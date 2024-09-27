// const multer = require('multer');
// const path = require('path');

// const fileFilter = (req, file, cb) => {
//     const allowedTypes = /jpeg|jpg|png|gif/;
//     const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = allowedTypes.test(file.mimetype);

//     if (extname && mimetype) {
//         return cb(null, true);
//     } else {
//         cb(new Error('Error: Images Only!'));
//     }
// };

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'uploads/');
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname)); 
//     }
// });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 50 * 1024 * 1024 },
//     fileFilter: fileFilter
// });

// module.exports = { upload };








const multer = require('multer');
const path = require('path');

const uploadFileToS3 = async (fileBuffer, preSignedUrl, contentType) => {
    try {
        const response = await fetch(preSignedUrl, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
                'Content-Type': contentType,  // Use appropriate file type
            }
        });

        // Log the response body and status for more details
        const responseText = await response.text();
        console.log('S3 Response Status:', response.status);
        console.log('S3 Response Body:', responseText);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload file: ${response.statusText}, ${errorText}`);
        }

        console.log('File uploaded successfully!');
    } catch (err) {
        console.error('Error uploading file:', err);
        throw err;
    }
};


// File filter to allow only specific types of images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only!'));
    }
};

// Use memory storage to store the file in memory instead of on disk
const storage = multer.memoryStorage(); // Switch to memory storage

// Initialize multer with memory storage, file size limit, and file filter
const upload = multer({
    storage: storage,  // Use memory storage for files
    limits: { fileSize: 50 * 1024 * 1024 },  // Limit file size to 50MB
    fileFilter: fileFilter
});

// Export the upload object for use in other parts of the application
module.exports = { upload };
