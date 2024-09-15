# Assignment 1 - Web Server - Response to Criteria

## Overview

- **Name:** Yeonseo Ko
- **Student number:** n11725605
- **Application name:** CoffeeChat
- **Two line description:** A web application allowing users to create, view, and interact with posts. It also supports image and GIF uploads, real-time chatrooms, and personalized user experiences.

## Core criteria

### Docker image

- **ECR Repository name:** n11725605/yeonseoko
- **Video timestamp:** 0:37, 0:00
- ## **Relevant files:** /Dockerfile

### Docker image running on EC2

- **EC2 instance ID:** i-04c75a4ee4d987951
- **Video timestamp:** 0:00

### User login functionality

- **One line description:** User login with session-based authentication; error messages are displayed for incorrect credentials.
- **Video timestamp:** 0:40
- **Relevant files:** server/routes/authRoutes.js, server/controllers/authController.js, server/config/passport.js, server/config/session.js

### User dependent functionality

- **One line description:** Each user can view, edit, and delete their own posts and comments, with personalized dashboard content.
- **Video timestamp:** 1:04
- **Relevant files:** server/routes/postRoutes.js, server/controllers/postController.js, server/middleware/auth.js, server/config/session.js

### Web client

- **One line description:** The web client allows users to create, edit, and delete posts & comments, interact in real-time chatrooms, and manage user accounts.
- **Video timestamp:** 1:36
- **Relevant files:** server/public/, server/views/

### REST API

- **One line description:** REST API provides CRUD operations on posts and comments, user authentication and error handling.
- **Video timestamp:** 3:23
- **Relevant files:** server/routes/postRoutes.js, server/routes/commentRoutes.js, server/controllers/postController.js, server/controllers/commentController.js

### Two kinds of data

#### First kind

- **One line description:** User profiles, posts, comments, chats
- **Type:** Structured
- **Rationale:** Stored in MongoDB for efficient querying and relationship
- **Video timestamp:** 4:00
- **Relevant files:** server/config/db.js, server/controllers/postController.js

#### Second kind

- **One line description:** Images and GIFs.
- **Type:** Unstructured
- **Rationale:** Stored as binary files in the file system for direct access and manipulation.
- **Video timestamp:** 4:21
- **Relevant files:** server/middleware/fileUpload.js, server/routes/postRoutes.js

### CPU intensive task

- **One line description:** GIF creation involving complex image transformations and animations.
- **Video timestamp:** 5:15
- **Relevant files:** server/server.js

### CPU load testing method

- **One line description:** Simulated high-demand scenario using a script to trigger GIF creation repeatedly, monitored with AWS CloudWatch.
- **Video timestamp:** 5:01
- **Relevant files:** server/server.js

## Additional criteria

### Extensive REST API features

- **One line description:** Advanced features including sorting, aggregation with $lookup, and comprehensive error handling
- **Video timestamp:** 3:24
- **Relevant files:** server/routes/postRoutes.js, server/controllers/postController.js, server/config/db.js

### Use of external API(s)

- **One line description:** Not attempted
- **Video timestamp:**
- ## **Relevant files:**

### Extensive web client features

- **One line description:** Rich web client with GIF creation, real-time chat, and interactive post management.
- **Video timestamp:** 2:05
- **Relevant files:** server/public/, server/views/, server/routes/postRoutes.js

### Sophisticated data visualisations

- **One line description:** Not attempted
- **Video timestamp:**
- ## **Relevant files:**

### Additional kinds of data

- **One line description:** Management of structured data in MongoDB and unstructured image data on the server.
- **Video timestamp:** 4:00
- **Relevant files:** server/middleware/fileUpload.js, server/routes/postRoutes.js

### Significant custom processing

- **One line description:** CPU-intensive GIF creation with image manipulation and text rendering.
- **Video timestamp:** 2:15
- **Relevant files:** server/server.js, server/controllers/postController.js

### Live progress indication

- **One line description:** Real-time progress indication during GIF creation displayed on the client-side.
- **Video timestamp:** 2:20
- **Relevant files:** server/public/js/main.js, server/views/edit.ejs, /server/views/write.ejs

### Infrastructure as code

- **One line description:** Docker Compose setup for consistent deployment and environment configuration.
- **Video timestamp:** 05:23
- **Relevant files:** server/docker-compose.yml

### Other

- **One line description:** Not attempted
- **Video timestamp:**
- ## **Relevant files:**
