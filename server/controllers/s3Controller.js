require("dotenv").config(); // Load .env variables for other parts of the application
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { fromSSO } = require("@aws-sdk/credential-provider-sso"); // Use SSO credentials for AWS
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Using environment variables for S3 configuration
const bucketName = process.env.AWS_BUCKET_NAME; // Bucket name from .env
const region = process.env.AWS_REGION; // AWS region from .env

// Function to generate a pre-signed URL for file upload with user ID included
const getPreSignedUrlWithUser = async (fileName, userId) => {
  const s3Client = new S3Client({
    region,
    credentials: fromSSO({ profile: "default" }),
  });
  const key = `${userId}/${fileName}`; // Use user ID as part of the file key
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ACL: "public-read", // Adjust ACL as needed
    Metadata: {
      "uploaded-by": userId, // Add user info to metadata
    },
  });

  try {
    const preSignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });
    return preSignedUrl;
  } catch (err) {
    console.error("Error generating pre-signed URL:", err);
    throw err;
  }
};

// Upload the file to S3 using a pre-signed URL
const uploadFileToS3 = async (fileBuffer, preSignedUrl, contentType) => {
  try {
    console.log("Uploading file to S3...");
    console.log("File size:", fileBuffer.length);

    const response = await fetch(preSignedUrl, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": contentType,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    console.log("File uploaded successfully!");
  } catch (err) {
    console.error("Error uploading file:", err);
    throw err;
  }
};

// Function to generate a pre-signed URL for reading a file from S3
const getPreSignedReadUrl = async (fileName) => {
  const s3Client = new S3Client({
    region,
    credentials: fromSSO({ profile: "default" }),
  });
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });

  try {
    const preSignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // URL expires in 1 hour
    return preSignedUrl;
  } catch (err) {
    console.error("Error generating pre-signed read URL:", err);
    throw err;
  }
};

// S3에서 이미지 삭제 함수
const deleteImageFromS3 = async (fileKey) => {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME, // S3 버킷 이름
    Key: fileKey, // S3 파일 키
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`File ${fileKey} deleted successfully from S3`);
  } catch (err) {
    console.error("Error deleting file from S3:", err);
    throw new Error("Error deleting file from S3");
  }
};

// Export the S3 functions for external use in other parts of the application
module.exports = {
  getPreSignedUrlWithUser,
  uploadFileToS3,
  getPreSignedReadUrl,
  deleteImageFromS3,
};