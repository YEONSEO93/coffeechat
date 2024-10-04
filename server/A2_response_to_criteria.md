# Assignment 1 - Web Server - Response to Criteria

## Instructions

- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections. If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed

## Overview

- **Name: Yeonseo Ko**
- **Student number: n11725605**
- **Partner name (if applicable): Suyeon Kim (n11682957)**
- **Application name: Coffeechat**
- **Two line description:A web application allowing users to create, view, and interact with posts. It also supports image and GIF uploads, real-time chatrooms, and personalized user experiences.**
- **EC2 instance name or ID:i-0ed400be77427d93a(n11725605-assignment2-coffeechat)**

## Core criteria

### Core - First data persistence service

- **AWS service name: Amazon S3**
- **What data is being stored?: User-uploaded images/gifs**
- **Why is this service suited to this data?: S3 is optimal for storing large binary files such as images due to its scalability and cost-efficiency.**
- **Why is are the other services used not suitable for this data?: Services like DynamoDB or RDS are not designed for storing large binary files.**
- **Bucket/instance/table name:n11725605-assignment2**
- **Video timestamp:**
- ## **Relevant files: server/controllers/s3Controller.js, server/routes/postRoutes.js, server/controllers/postController.js, server/middleware/fileUpload.js, server/server.js, server/views/write.ejs**

### Core - Second data persistence service

- **AWS service name: DynamoDB**
- **What data is being stored?: Post metadata such as titles, content, and image URLs**
- **Why is this service suited to this data?: DynamoDB is ideal for high-throughput, low-latency access to structured data like post metadata.**
- **Why is are the other services used not suitable for this data?: Storing structured data with complex queries in S3 is inefficient, and RDS may introduce higher latency for the use case.**
- **Bucket/instance/table name: n11725605-coffeechat-dynamo**
- **Video timestamp:**
- ## **Relevant files: server/config/db.js, server/controllers/dynamoController.js, server/routes/postRoutes.js, server/server.js, server/createTable.js **

### Third data service

- **AWS service name: Amazon EBS (Elastic Block Store)** [eg. RDS]
- **What data is being stored?: Application code, machine learning models, and data storage required by the server** [eg video metadata]
- **Why is this service suited to this data?:EBS provides persistent block storage, ideal for frequently accessed data like application code, server files, and machine learning models. It integrates seamlessly with EC2 for low-latency access and ensures data persists across instance reboots.**
- **Why is are the other services used not suitable for this data?:
  S3: Great for backups and media but not optimized for low-latency or high IOPS operations.
  DynamoDB: A NoSQL database that doesn’t support block storage for large structured datasets like code or models.**
- **Bucket/instance/table name: vol-02b6b6fdb575c5f0b**
- **Video timestamp:**
- ## **Relevant files:**

### S3 Pre-signed URLs

- **S3 Bucket names: n11725605-assignment2**
- **Video timestamp:**
- ## **Relevant files:server/controllers/s3Controller.js, server/routes/postRoutes.js, server/controllers/postController.js, server/middleware/fileUpload.js, server/server.js, server/views/write.ejs**

### In-memory cache

- **ElastiCache instance name:**
- **What data is being cached?:** [eg. Thumbnails from YouTube videos obatined from external API]
- **Why is this data likely to be accessed frequently?:**
- **Video timestamp:**
- ## **Relevant files:**

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?: User-uploaded files temporarily stored in memory during upload before being uploaded to S3.**
- **Why is this data not considered persistent state?: The data is transient and is only used during the file upload process. It can be recreated from the source.**
- **How does your application ensure data consistency if the app suddenly stops?: AWS S3 and DynamoDB ensure data persistence, and session management is handled via MongoDB with regular checkpoints.**
- ## **Relevant files: server/controllers/s3Controller.js, server/routes/postRoutes.js, server/controllers/postController.js, server/middleware/fileUpload.js, server/server.js, server/views/write.ejs, server/config/db.js, server/controllers/dynamoController.js, server/server.js**

### Graceful handling of persistent connections

- **Type of persistent connection and use: WebSocket for real-time chat functionality** [eg. server-side-events for progress reporting]
- **Method for handling lost connections:**
- ## **Relevant files: server/config/socketio.js**

### Core - Authentication with Cognito

- **User pool name: n11725605-cognito-prac**
- **How are authentication tokens handled by the client?: Tokens are stored in sessions after login and passed in cookies for authenticated requests.**
- **Video timestamp:**
- ## **Relevant files: server/config/cognito.js, server/controllers/authController.js, server/middleware/auth.js, server/routes/authRoutes.js, server/server.js**

### Cognito multi-factor authentication

- **What factors are used for authentication: **
- **Video timestamp:**
- ## **Relevant files: **

### Cognito federated identities

- **Identity providers used: Google OAuth**
- **Video timestamp:**
- ## **Relevant files: server/config/cognito.js, server/controllers/authController.js, server/middleware/auth.js, server/routes/authRoutes.js, server/server.js**

### Cognito groups

- **How are groups used to set permissions?: Admin users can manage other users and posts.**
- **Video timestamp:**
- ## **Relevant files: server/config/cognito.js, server/controllers/authController.js, server/middleware/auth.js, server/routes/authRoutes.js, server/server.js**

### Core - DNS with Route53

- **Subdomain**: www.coffeechat.cab432.com
- **Video timestamp:**

### Custom security groups

- **Security group names:**
- **Services/instances using security groups:**
- **Video timestamp:**
- ## **Relevant files:**

### Parameter store

- **Parameter names: /n11725605/AWS_BUCKET_NAME,
  /n11725605/AWS_REGION, /n11725605/COGNITO_CLIENT_ID,
  /n11725605/COGNITO_DOMAIN,
  /n11725605/COGNITO_ISSUER, /n11725605/COGNITO_REDIRECT_URI,
  /n11725605/COGNITO_USER_POOL_ID,
  /n11725605/DB_NAME,
  /n11725605/DB_URL, /n11725605/DYNAMO_TABLE_NAME,
  /n11725605/GOOGLE_CLIENT_ID, /n11725605/GOOGLE_CLIENT_SECRET, /n11725605/JWKS_URI, /n11725605/NODE_ENV,
  /n11725605/PORT,
  /n11725605/QUT_USERNAME,
  /n11725605/SESSION_SECRET** [eg. n1234567/base_url]
- **Video timestamp:**
- ## **Relevant files: server/config/secretsManager.js, server/server.js**

### Secrets manager

- **Secrets names: n11725605-assignment2-latest/accessKeyId,
  secretAccessKey, sessionToken, region, SESSION_SECRET, GOOGLE_CLIENT_SECRET**
- **Video timestamp:**
- ## **Relevant files: server/config/secretsManager.js, server/server.js**

### Infrastructure as code

- **Technology used: AWS SDK**
- **Services deployed: EC2, S3, DynamoDB, Cognito, EBS**
- **Video timestamp:**
- ## **Relevant files: server/terraform/main.tf, server/terraform/outputs.tf, server/terraform/variables.tf**

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- ## **Relevant files:**

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- ## **Relevant files:**
