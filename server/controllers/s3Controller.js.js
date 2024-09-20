// require('dotenv').config();  // Load .env variables for other parts of the application
// const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
// const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// const { fromSSO } = require('@aws-sdk/credential-provider-sso'); // Use SSO credentials for AWS
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// // Using environment variables for S3 configuration
// const bucketName = process.env.AWS_BUCKET_NAME; // Bucket name from .env
// const region = process.env.AWS_REGION; // AWS region from .env

// // Function to upload file to S3
// const uploadFileToS3 = async (file, preSignedUrl) => {
//     try {
//         const response = await fetch(preSignedUrl, {
//             method: 'PUT',
//             body: file.buffer,
//             headers: {
//                 'Content-Type': file.mimetype,
//             }
//         });

//         if (!response.ok) {
//             throw new Error(`Failed to upload file: ${response.statusText}`);
//         }

//         console.log('File uploaded successfully!');
//     } catch (err) {
//         console.error('Error uploading file:', err);
//     }
// };

// // Function to generate a pre-signed URL for file upload
// const getPreSignedUrl = async (fileName) => {
//     const s3Client = new S3Client({ region, credentials: fromSSO({ profile: 'default' }) });
//     const command = new PutObjectCommand({
//         Bucket: bucketName,
//         Key: fileName
//     });

//     return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
// };

// // Function to delete image from S3
// const deleteImageFromS3 = async (fileName) => {
//     const s3Client = new S3Client({ region, credentials: fromSSO({ profile: 'default' }) });
//     const command = new DeleteObjectCommand({
//         Bucket: bucketName,
//         Key: fileName
//     });

//     try {
//         await s3Client.send(command);
//         console.log(`File deleted successfully: ${fileName}`);
//     } catch (err) {
//         console.error('Error deleting file:', err);
//     }
// };

// // Function to generate a pre-signed URL for reading a file from S3
// const getPreSignedReadUrl = async (fileName) => {
//     const s3Client = new S3Client({ region, credentials: fromSSO({ profile: 'default' }) });
//     const command = new GetObjectCommand({
//         Bucket: bucketName,
//         Key: fileName
//     });

//     return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
// };

// // Main function demonstrating use of S3 functions
// async function main() {
//     const fileName = 'myAwesomeObjectKey';
//     const fileContent = 'This could be just about anything.';

//     // Generate a pre-signed URL for uploading a file
//     const preSignedUrl = await getPreSignedUrl(fileName);

//     // Simulate file upload
//     const file = { buffer: Buffer.from(fileContent), mimetype: 'text/plain' };
//     await uploadFileToS3(file, preSignedUrl);

//     // Generate a pre-signed URL for reading the uploaded file
//     const readUrl = await getPreSignedReadUrl(fileName);
//     console.log('Pre-signed URL to read the object:', readUrl);

//     // Fetch and log the file content using the pre-signed URL
//     const fetchResponse = await fetch(readUrl);
//     const object = await fetchResponse.text();
//     console.log('Object retrieved with pre-signed URL:', object);

//     // Optionally, delete the file after testing
//     await deleteImageFromS3(fileName);
// }

// // Call main function for demonstration
// main();

// // Export the S3 functions for external use in other parts of the application
// module.exports = {
//     uploadFileToS3,
//     getPreSignedUrl,
//     deleteImageFromS3,
//     getPreSignedReadUrl
// };





require('dotenv').config();  // Load .env variables for other parts of the application
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { fromSSO } = require('@aws-sdk/credential-provider-sso'); // Use SSO credentials for AWS
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Using environment variables for S3 configuration
const bucketName = process.env.AWS_BUCKET_NAME; // Bucket name from .env
const region = process.env.AWS_REGION; // AWS region from .env


// Function to generate a pre-signed URL for file upload
const getPreSignedUrl = async (fileName) => {
    const s3Client = new S3Client({ region, credentials: fromSSO({ profile: 'default' }) });
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ACL: 'public-read'
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

// Upload the file to S3 using a pre-signed URL
const uploadFileToS3 = async (fileBuffer, preSignedUrl, contentType) => {
    try {
        console.log('Uploading file to S3...');
        console.log('File size:', fileBuffer.length);

        const response = await fetch(preSignedUrl, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
                'Content-Type': contentType,
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}`);
        }

        console.log('File uploaded successfully!');
    } catch (err) {
        console.error('Error uploading file:', err);
        throw err;
    }
};

// Function to delete image from S3
const deleteImageFromS3 = async (fileName) => {
    const s3Client = new S3Client({ region, credentials: fromSSO({ profile: 'default' }) });
    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName
    });

    try {
        await s3Client.send(command);
        console.log(`File deleted successfully: ${fileName}`);
    } catch (err) {
        console.error('Error deleting file:', err);
    }
};

// Function to generate a pre-signed URL for reading a file from S3
const getPreSignedReadUrl = async (fileName) => {
    const s3Client = new S3Client({ region, credentials: fromSSO({ profile: 'default' }) });
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileName
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
};

// Main function demonstrating use of S3 functions
async function main() {
    const fileName = 'myAwesomeObjectKey';
    const fileContent = 'This could be just about anything.';

    // Generate a pre-signed URL for uploading a file
    const preSignedUrl = await getPreSignedUrl(fileName);

    // Simulate file upload
    const file = { buffer: Buffer.from(fileContent), mimetype: 'text/plain' };
    await uploadFileToS3(file, preSignedUrl);

    // Generate a pre-signed URL for reading the uploaded file
    const readUrl = await getPreSignedReadUrl(fileName);
    console.log('Pre-signed URL to read the object:', readUrl);

    // Fetch and log the file content using the pre-signed URL
    const fetchResponse = await fetch(readUrl);
    const object = await fetchResponse.text();
    console.log('Object retrieved with pre-signed URL:', object);

    // Optionally, delete the file after testing
    await deleteImageFromS3(fileName);
}

// Call main function for demonstration
main();

// Export the S3 functions for external use in other parts of the application
module.exports = {
    uploadFileToS3,
    getPreSignedUrl,
    deleteImageFromS3,
    getPreSignedReadUrl
};
