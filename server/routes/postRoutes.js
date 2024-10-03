
const express = require("express");
const multer = require("multer");
const router = express.Router();
const ensureAuthenticated = require("../middleware/auth");
const { getDB } = require("../config/db");
const {
  getPreSignedUrlWithUser,
  uploadFileToS3,
  getPreSignedReadUrl,
} = require("../controllers/s3Controller.js"); // Import S3 functions correctly
const { upload } = require("../middleware/fileUpload"); // Import multer configuration
const { ObjectId } = require("mongodb");
const path = require("path");
const { deletePostFromDynamo } = require("../controllers/dynamoController");
const { deleteImageFromS3 } = require("../controllers/s3Controller");

// Import the required AWS SDK modules for DynamoDB
const { createDynamoDBClient } = require("../controllers/dynamoController"); // Import the function correctly
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid"); // Import the uuidv4 function

const qutUsername = process.env.QUT_USERNAME; // Fixed partition key

// Route to render the write post page
router.get("/write", ensureAuthenticated, (req, res) => {
  res.render("write", { user: req.user });
});

// Route to handle adding a new post
router.post(
  "/add",
  ensureAuthenticated,
  multer().single("img1"),
  async (req, res) => {
    try {
      console.log("Post request received");

      // Ensure multer has processed the file
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      // Generate a unique file name and postId
      const userId = req.user.sub || req.user.email; // Cognito로 인증된 유저의 ID 또는 이메일
      const fileName = Date.now() + path.extname(req.file.originalname);
      const postId = uuidv4(); // Generate postId here using uuidv4
      console.log("Generated postId:", postId);
      console.log("Generated fileName:", fileName);

      // Generate a pre-signed URL for uploading the file to S3
      const preSignedUrl = await getPreSignedUrlWithUser(fileName, userId);
      if (!preSignedUrl) {
        throw new Error("Failed to generate pre-signed URL");
      }
      console.log("Pre-Signed URL:", preSignedUrl);

      // Upload the file to S3
      const fileBuffer = req.file.buffer;
      const contentType = req.file.mimetype;
      console.log("File Buffer:", fileBuffer);
      console.log("Content Type:", contentType);

      await uploadFileToS3(fileBuffer, preSignedUrl, contentType); // Upload to S3

      // Create post data to insert into MongoDB
      const postData = {
        ...req.body,
        imageUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${userId}/${fileName}`, // Store S3 URL
        user: userId, // 수정: Cognito에서 가져온 userId 사용
        createdAt: new Date(),
      };

      await getDB().collection("post").insertOne(postData);

      // Additionally, store post data in DynamoDB
      const dynamoPostData = {
        "qut-username": qutUsername, // Partition key
        postId: postId, // Sort key (UUID)
        title: req.body.title,
        content: req.body.content,
        imageUrl: postData.imageUrl, // S3 file URL
        timestamp: new Date().toISOString(),
        uploadedBy: userId, // 수정: Cognito 유저 ID 사용
      };

      const docClient = await createDynamoDBClient();
      await docClient.send(
        new PutCommand({
          TableName: process.env.DYNAMO_TABLE_NAME,
          Item: dynamoPostData,
        })
      );

      res.redirect("/posts/list");
    } catch (err) {
      console.error("Failed to add post:", err);
      res.status(500).send("An unexpected error occurred.");
    }
  }
);

// Route to get all posts
router.get("/list", ensureAuthenticated, async (req, res) => {
  try {
    const posts = await getDB()
      .collection("post")
      .aggregate([
        {
          $lookup: {
            from: "comment",
            localField: "_id",
            foreignField: "parentId",
            as: "comments",
          },
        },
        {
          $addFields: {
            commentCount: { $size: "$comments" },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $project: {
            comments: 0,
          },
        },
      ])
      .toArray();

    // 유저 정보와 함께 posts를 렌더링
    res.render("list", { posts, user: req.user });
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    res.status(500).send("Failed to fetch posts");
  }
});

// // Route to get details of a specific post by ID
// router.get("/detail/:id", async (req, res) => {
//   try {
//     const postId = req.params.id;

//     // Validate the ObjectId
//     if (!ObjectId.isValid(postId)) {
//       return res.status(400).send("Invalid post ID");
//     }

//     const post = await getDB()
//       .collection("post")
//       .findOne({ _id: new ObjectId(postId) });
//     const comments = await getDB()
//       .collection("comment")
//       .find({ parentId: new ObjectId(postId) })
//       .toArray();

//     if (post) {
//       if (post.imageUrl) {
//         post.preSignedUrl = await getPreSignedReadUrl(post.imageUrl); // Generate pre-signed URL for image
//       }
//       res.render("detail", { result: post, result2: comments, user: req.user });
//     } else {
//       res.status(404).send("Post not found");
//     }
//   } catch (err) {
//     console.error("Failed to fetch post details:", err);
//     res.status(500).send("Failed to fetch post details");
//   }
// });

// Route to render the edit page for a specific post by ID
router.get("/edit/:id", ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.params.id;

    // Validate the ObjectId
    if (!ObjectId.isValid(postId)) {
      return res.status(400).send("Invalid post ID");
    }

    const post = await getDB()
      .collection("post")
      .findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return res.status(404).send("Post not found");
    }

    res.render("edit", { result: post });
  } catch (err) {
    console.error("Failed to load the edit page:", err);
    res.status(500).send("Failed to load the edit page");
  }
});

// Route to handle updating a specific post by ID
router.post(
  "/edit/:id",
  ensureAuthenticated,
  upload.single("img1"),
  async (req, res) => {
    try {
      const postId = req.params.id;
      const updateData = {
        title: req.body.title,
        content: req.body.content,
        updatedAt: new Date(),
      };

      // Validate the ObjectId
      if (!ObjectId.isValid(postId)) {
        return res.status(400).send("Invalid post ID");
      }

      // If a new image is uploaded, update the image URL and pre-signed URL
      if (req.file) {
        const userId = req.user.sub || req.user.email; // 사용자 정보
        const fileName = Date.now() + path.extname(req.file.originalname); // 새로운 파일 이름 생성
        const preSignedUrl = await getPreSignedUrlWithUser(fileName, userId); // 유저 정보를 포함한 Pre-signed URL 생성

        // 이미지 URL 업데이트
        updateData.imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${userId}/${fileName}`;
        updateData.preSignedUrl = preSignedUrl;
      }

      await getDB()
        .collection("post")
        .updateOne({ _id: new ObjectId(postId) }, { $set: updateData });

      res.redirect("/posts/list");
    } catch (err) {
      console.error("Failed to update post:", err);
      res.status(500).send("Failed to update post");
    }
  }
);

// // Route to handle deleting a specific post by ID
// router.delete("/delete/:id", ensureAuthenticated, async (req, res) => {
//   try {
//     const postId = req.params.id;

//     // Validate the ObjectId
//     if (!ObjectId.isValid(postId)) {
//       return res.status(400).send("Invalid post ID");
//     }

//     await getDB()
//       .collection("post")
//       .deleteOne({ _id: new ObjectId(postId) });

//     res.redirect("/posts/list");
//   } catch (err) {
//     console.error("Failed to delete post:", err);
//     res.status(500).send("Failed to delete post");
//   }
// });

// Route to handle generating a pre-signed URL for an uploaded file
router.get("/presigned-url", async (req, res) => {
  const { fileName } = req.query;

  if (!fileName) {
    return res.status(400).send("File name is required");
  }

  try {
    const preSignedUrl = await getPreSignedUrlWithUser(fileName);
    res.json({ url: preSignedUrl });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    res.status(500).send("Failed to generate pre-signed URL");
  }
});

router.delete("/delete/:postId", ensureAuthenticated, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.sub || req.user.email; // Cognito로 가져온 사용자 ID 또는 이메일

  try {
    const post = await getDB()
      .collection("post")
      .findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return res.status(404).send("Post not found");
    }

    // 현재 유저가 게시물 작성자인지 확인
    if (post.user !== userId) {
      return res.status(403).send("You are not authorized to delete this post");
    }

    // MongoDB에서 게시물 삭제
    await getDB()
      .collection("post")
      .deleteOne({ _id: new ObjectId(postId) });

    // DynamoDB에서 게시물 삭제
    await deletePostFromDynamo(postId, process.env.QUT_USERNAME);

    // S3에서 이미지 삭제 (만약 이미지가 있을 경우)
    if (post.imageUrl) {
      const fileKey = post.imageUrl.split(".amazonaws.com/")[1];
      await deleteImageFromS3(fileKey);
    }

    res.status(200).send({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).send("An unexpected error occurred");
  }
});

module.exports = router;
