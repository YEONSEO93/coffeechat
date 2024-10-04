variable "region" {
  description = "The AWS region"
  default     = "ap-southeast-2"
}

variable "bucketName" {
  description = "The S3 bucket name"
  default     = "n11725605-assignment2"
}

variable "clientId" {
  description = "The Cognito client ID"
  default     = "2lah4pcv6p0se9rs8226k76vg6"
}

variable "cognitoDomain" {
  description = "The Cognito domain"
  default     = "n11725605.auth.ap-southeast-2.amazoncognito.com"
}

variable "cognito_issuer" {
  description = "The Cognito issuer"
  default     = "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_V3WpJeTI8"
}

variable "redirectUri" {
  description = "The Cognito redirect URI"
  default     = "https://www.coffeechat.cab432.com/auth/callback"
}

variable "username" {
  description = "The Cognito user pool ID"
  default     = "ap-southeast-2_V3WpJeTI8"
}

variable "dbName" {
  description = "The database name"
  default     = "coffeechat_ys"
}

variable "db_url" {
  description = "The database connection URL"
  default     = "mongodb+srv://admin:YGTTagFKZG5NxsJ3@cluster0.zxfdzx0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
}

variable "tableName" {
  description = "The DynamoDB table name"
  default     = "n11725605-coffeechat-dynamo"
}

variable "clientId" {
  description = "Google client ID"
  default     = "1036856090008-m40pb0tvl1lh0teqh4ovi2v8mvbpcmia.apps.googleusercontent.com"
}

variable "clientSecret" {
  description = "Google client secret"
  default     = "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"
}

variable "jwks_uri" {
  description = "JWKS URI for Cognito"
  default     = "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_V3WpJeTI8/.well-known/jwks.json"
}

variable "node_env" {
  description = "Node environment"
  default     = "production"
}

variable "port" {
  description = "The application port"
  default     = "8080"
}

variable "qut_username" {
  description = "QUT Username"
  default     = "n11725605@qut.edu.au"
}

variable "session_secret" {
  description = "Session secret for the application"
  default     = "c74b489000c4b35f566fa2874b20a735bdaae355d4a72f9f1f287a1d4e814926fc6166cd512036a41b15d63f9503ee007924acfa5924b44fd5d2dba7518f8592"
}
