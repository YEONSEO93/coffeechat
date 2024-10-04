# Define provider for AWS
provider "aws" {
  region = var.region
}

# S3 Bucket for storing user-uploaded images/files
resource "aws_s3_bucket" "assignment2_bucket" {
  bucket = var.bucketName
  acl    = "private"

  tags = {
    Key   = "qut-username"
    Value = var.qut_username
    purpose = "assignment2"
  }
}

# S3 Bucket Policy to allow public access to the uploads folder
resource "aws_s3_bucket_policy" "assignment2_bucket_policy" {
  bucket = aws_s3_bucket.assignment2_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "arn:aws:s3:::${var.bucketName}/uploads/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "public-read"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = "*"
        Action = "s3:GetObject"
        Resource = "arn:aws:s3:::${var.bucketName}/uploads/*"
      }
    ]
  })
}

# DynamoDB table for CoffeeChat posts
resource "aws_dynamodb_table" "coffeechat_posts" {
  name         = var.tableName
  billing_mode = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1

  hash_key  = "qut-username"
  range_key = "postId"

  attribute {
    name = "qut-username"
    type = "S"
  }

  attribute {
    name = "postId"
    type = "S"
  }

  tags = {
    Environment = "Production"
    Project     = "CoffeeChat"
  }
}

# Cognito User Pool for user management
resource "aws_cognito_user_pool" "n11725605_cognito" {
  name = "n11725605-cognito-prac"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  tags = {
    purpose      = "assignment2"
    qut-username = var.qut_username
  }
}

# Cognito User Pool Client for user authentication
resource "aws_cognito_user_pool_client" "coffeechat_userpool_client" {
  name         = "n11725605-cognito-app-client"
  user_pool_id = aws_cognito_user_pool.n11725605_cognito.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]

  generate_secret = false
}

# EC2 instance for CoffeeChat
resource "aws_instance" "coffeechat_instance" {
  ami           = "ami-001f2488b35ca8aad"
  instance_type = "t2.micro"
  key_name      = "n11725605-assignment2-coffeechat"

  # Network configurations
  subnet_id                   = "subnet-075811427d5564cf9"
  associate_public_ip_address = true

  root_block_device {
    volume_size          = 8
    volume_type          = "gp2"
    delete_on_termination = true
  }

  ebs_block_device {
    device_name           = "/dev/sdf"
    volume_size           = 100
    delete_on_termination = false
  }

  vpc_security_group_ids = ["sg-0df7690dc45862598", "sg-032bd1ff8cf77dbb9"]

  tags = {
    Name        = "n11725605-assignment2-coffeechat"
    Environment = "Production"
    Project     = "CoffeeChat"
  }
}

# AWS Secrets Manager for securely storing credentials
resource "aws_secretsmanager_secret" "coffeechat_secrets" {
  name = "n11725605-assignment2-latest"

  tags = {
    qut-username = var.qut_username
    purpose      = "assignment2"
  }
}

# Store secrets into Secrets Manager
resource "aws_secretsmanager_secret_version" "coffeechat_secrets_version" {
  secret_name  = aws_secretsmanager_secret.coffeechat_secrets.name
  secret_string = jsonencode({
    accessKeyId     = "your-access-key-id"
    secretAccessKey = "your-secret-access-key"
    region          = var.region
    sessionToken    = "IQoJb3JpZ2luX2VjEIv//////////wEaDmFwLXNvdXRoZWFzdC0yIkcwRQIhALoct1e1VcjVPsYd6Q8B86JdNRIFnRPNngu0R/Pe/3UwAiAicDsCAEN89cwGmz3N8Ygbf9CQoLkOzds1vpIC+STqiyquAwjU//////////8BEAMaDDkwMTQ0NDI4MDk1MyIM6iCB6grPET+vcZjAKoIDqcS23yfxBUhRoBgM1utufeA4lgI3p+4n7aKtyUx+FsVNx7zTkckEegNAJeW/buOn8JNPjYzwPYtHHCZOT1e8FnLgkDVjcgnaw5h8KBbpqZB/owGLZcnn2zK0PiYDOlsPaHOFVjNtuUR9gNtbAuWHwXx9sWkqzA2ZJ/R0FKkTAPz6pE0iO01b6HUuLI++b4GoL2jQBAX9PmSZ2OPeHZwbSXrw7Q78VZkYcq/78ixFhy0N6/dn8lw1f/GEWaOosJFgFhHptnCNtfVH9mCADC7a6Kl1UA9JydNsvRM9WsB/KLb9MiExB4avdf1p9tu/pnieQF/Brt9F6tff/GgrLjJZQ6hr02SMPci/VQxfW/NJtLmLKyaYlun0J7QNONDAiv1MKhPAVxNMRaRsUUarYE2qJAqWry5UjtVe3Pf2tQcjGDUJ+Q4N/iz7sgUOmaunNpMAuBeApZFTsY7hMokyBx6c8dm/53G/MJ3v2hIiEWf1UPbjLdYN0jlgMC26zHI3MiQVGVww1pz/twY6pgE5PbDweqYKVncABUZShsFtX14DULlk6qO9xZ40SLdwHCMQm5mx5qHKunvdpJN6HoNbuCb1WfjTofIgBTXBpWXqneozbiZGwzARFpKiYGnsE0Uj1gXw9yr4LDTbFJ+Mh7lVm2wxdB+f2lGv9N/N7UAaHqgzk2qb2WmT87BB/YKwnqqOPM+Kjw4YekLY83xSIWAt4bruWvv/mvfaIWmg4YSqWLHU06dx"
    SESSION_SECRET = var.session_secret
    GOOGLE_CLIENT_SECRET = var.google_client_secret
  })
}

# Create SSM parameters for CoffeeChat project
resource "aws_ssm_parameter" "aws_bucket_name" {
  name  = "/n11725605/AWS_BUCKET_NAME"
  type  = "String"
  value = var.bucketName
}

resource "aws_ssm_parameter" "aws_region" {
  name  = "/n11725605/AWS_REGION"
  type  = "String"
  value = var.region
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "/n11725605/COGNITO_CLIENT_ID"
  type  = "String"
  value = var.clientId
}

resource "aws_ssm_parameter" "cognito_domain" {
  name  = "/n11725605/COGNITO_DOMAIN"
  type  = "String"
  value = var.cognitoDomain
}

resource "aws_ssm_parameter" "cognito_issuer" {
  name  = "/n11725605/COGNITO_ISSUER"
  type  = "String"
  value = var.cognito_issuer
}

resource "aws_ssm_parameter" "cognito_redirect_uri" {
  name  = "/n11725605/COGNITO_REDIRECT_URI"
  type  = "String"
  value = var.redirectUri
}

resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name  = "/n11725605/COGNITO_USER_POOL_ID"
  type  = "String"
  value = var.username
}

resource "aws_ssm_parameter" "db_name" {
  name  = "/n11725605/DB_NAME"
  type  = "String"
  value = var.dbName
}

resource "aws_ssm_parameter" "db_url" {
  name  = "/n11725605/DB_URL"
  type  = "String"
  value = var.db_url
}

resource "aws_ssm_parameter" "dynamo_table_name" {
  name  = "/n11725605/DYNAMO_TABLE_NAME"
  type  = "String"
  value = var.tableName
}

resource "aws_ssm_parameter" "google_client_id" {
  name  = "/n11725605/GOOGLE_CLIENT_ID"
  type  = "String"
  value = var.google_client_id
}

resource "aws_ssm_parameter" "google_client_secret" {
  name  = "/n11725605/GOOGLE_CLIENT_SECRET"
  type  = "String"
  value = var.google_client_secret
}

resource "aws_ssm_parameter" "jwks_uri" {
  name  = "/n11725605/JWKS_URI"
  type  = "String"
  value = var.jwks_uri
}

resource "aws_ssm_parameter" "node_env" {
  name  = "/n11725605/NODE_ENV"
  type  = "String"
  value = var.node_env
}

resource "aws_ssm_parameter" "port" {
  name  = "/n11725605/PORT"
  type  = "String"
  value = var.port
}

resource "aws_ssm_parameter" "qut_username" {
  name  = "/n11725605/QUT_USERNAME"
  type  = "String"
  value = var.qut_username
}

resource "aws_ssm_parameter" "session_secret" {
  name  = "/n11725605/SESSION_SECRET"
  type  = "String"
  value = var.session_secret
}
