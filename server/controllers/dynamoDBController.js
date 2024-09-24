require("dotenv").config(); // .env 파일에서 환경 변수 불러오기
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require("uuid");
const { getPreSignedUrl, uploadFileToS3 } = require('./s3Controller');
const { createDynamoDBClient } = require("../config/dynamoDB");

const qutUsername = process.env.QUT_USERNAME; // 고정된 사용자 이름
const tableName = process.env.DYNAMO_TABLE_NAME; // DynamoDB 테이블 이름
const sortKey = "postId"; // 정렬 키 정의

// Function to add a post
async function addPost(req, res) {
    const { title, content } = req.body; // 사용자로부터 입력받은 제목과 본문
    const file = req.file;  // Multer로 처리된 파일 객체

    // 입력값 확인
    if (!title || !content || !file) {
        return res.status(400).json({ error: "Title, content, or image file is missing." });
    }

    const postId = uuidv4();  // 고유한 postId 생성

    try {
        const docClient = await createDynamoDBClient(); // DynamoDB 클라이언트 생성

        // S3에 파일 업로드를 위한 pre-signed URL 가져오기
        const fileName = Date.now() + "_" + file.originalname;
        const preSignedUrl = await getPreSignedUrl(fileName);

        if (!preSignedUrl) {
            throw new Error("Failed to generate pre-signed URL");
        }

        // 파일을 S3에 업로드
        await uploadFileToS3(file.buffer, preSignedUrl, file.mimetype);

        // S3 URL 설정
        const s3ImageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        // DynamoDB에 포스트 정보 저장
        const params = {
            TableName: tableName,
            Item: {
                "qut-username": qutUsername, // 고정된 사용자 이름
                [sortKey]: postId, // 고유한 postId
                title,  // 제목
                content,  // 본문 내용
                s3ImageUrl,  // S3에 저장된 이미지 URL
                timestamp: new Date().toISOString(),  // 시간 정보
            },
        };

        console.log("Attempting to add item to DynamoDB:", params.Item);

        const response = await docClient.put(params).promise(); // AWS SDK v2의 put 메서드 사용
        console.log("DynamoDB response:", response);

        res.status(201).json({ message: "Post uploaded successfully.", data: response });
    } catch (err) {
        console.error("Failed to upload post:", err);
        res.status(500).json({ error: "Failed to upload post", details: err.message });
    }
}

// Function to get a post
async function getPost(req, res) {
    const { postId } = req.params;

    try {
        const docClient = await createDynamoDBClient(); // DynamoDB 클라이언트 생성

        const params = {
            TableName: tableName,
            Key: {
                "qut-username": qutUsername, // 고정된 사용자 이름
                [sortKey]: postId, // 정렬 키
            },
        };

        const response = await docClient.get(params).promise(); // AWS SDK v2의 get 메서드 사용
        if (!response.Item) {
            return res.status(404).json({ error: "Post not found." });
        }
        res.json({ post: response.Item });
    } catch (err) {
        console.error("Failed to retrieve post:", err);
        res.status(500).json({ error: "Failed to retrieve post", details: err.message });
    }
}

// Test function to add a test item to DynamoDB
const testAddItem = async () => {
    try {
        const docClient = await createDynamoDBClient(); // DynamoDB 클라이언트 생성 확인
        if (!docClient) {
            throw new Error("DynamoDB client initialization failed.");
        }

        const testItem = {
            "qut-username": qutUsername, // 고정된 사용자 이름
            postId: uuidv4(), // 테스트용 고유 postId 생성
            title: "Test Post SY",
            content: "This is a test content.",
            s3ImageUrl: "https://example.com/test-image.jpg",
            timestamp: new Date().toISOString(),
        };

        const params = {
            TableName: tableName,
            Item: testItem,
        };

        const response = await docClient.put(params).promise(); // AWS SDK v2의 put 메서드 사용
        console.log("Test item added successfully:", response);
    } catch (err) {
        console.error("Error adding test item:", err);
    }
};

// Uncomment this line to run the test when this file is executed
testAddItem();

module.exports = { addPost, getPost };
