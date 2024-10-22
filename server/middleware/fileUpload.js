const multer = require('multer');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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

// Function to upload the file to S3
const uploadFileToS3 = async (fileBuffer, preSignedUrl, contentType) => {
    try {
        console.log("Pre-Signed URL:", preSignedUrl);
        console.log("File Buffer Size:", fileBuffer.length);
        console.log("Content Type:", contentType);

        const response = await fetch(preSignedUrl, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
                'Content-Type': contentType,  // Ensure content type is correct (e.g., 'image/gif')
                'x-amz-acl': 'public-read',   // Ensure the correct ACL is set
            },
        });

        // Log the response body and status for more details
        const responseText = await response.text();
        console.log('S3 Response Status:', response.status);
        console.log('S3 Response Body:', responseText);

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}, ${responseText}`);
        }

        console.log('File uploaded successfully!');
    } catch (err) {
        console.error('Error uploading file:', err);
        throw err;
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

// Export the upload and uploadFileToS3 functions for use in other parts of the application
module.exports = { upload, uploadFileToS3 };
