# Provider Configuration
provider "aws" {
  region = "ap-southeast-2"
}

# SQS Queue for Load Distribution
resource "aws_sqs_queue" "load_queue" {
  name = "n11725605-load-queue"
}

# SNS Topic for AutoScaling Notifications
resource "aws_sns_topic" "autoscaling_notifications" {
  name = "AutoScaling_Notifications_n11725605"
}

resource "aws_sns_topic_subscription" "sqs_subscription" {
  topic_arn = aws_sns_topic.autoscaling_notifications.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.load_queue.arn
}

# CloudWatch Alarm to Monitor SQS Queue
resource "aws_cloudwatch_metric_alarm" "sqs_queue_alarm" {
  alarm_name                = "n11725605 SQS Queue Alert"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = 1
  metric_name               = "ApproximateNumberOfMessagesDelayed"
  namespace                 = "AWS/SQS"
  period                    = 300
  statistic                 = "Average"
  threshold                 = 10
  alarm_actions             = [aws_sns_topic.autoscaling_notifications.arn]
  dimensions = {
    QueueName = aws_sqs_queue.load_queue.name
  }
}

# Application Load Balancer for Auto Scaling
resource "aws_lb" "app_lb" {
  name               = "n11725605-autoscale-assignment3"
  internal           = false
  load_balancer_type = "application"
  security_groups    = ["sg-0df7690dc45862598"]
  subnets            = ["subnet-075811427d5564cf9", "subnet-04ca053dcbe5f49cc", "subnet-05a3b8177138c8b14"]

  listener {
    port     = 8080
    protocol = "HTTP"
    default_action {
      type             = "forward"
      target_group_arn = aws_lb_target_group.app_target_group.arn
    }
  }
}

# Target Group for Auto Scaling
resource "aws_lb_target_group" "app_target_group" {
  name     = "n11725605-autoscale-assigment3"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = "vpc-007bab53289655834"
}

# Launch Template for Auto Scaling
resource "aws_launch_template" "app_launch_template" {
  name          = "n11725605_coffeechat"
  image_id      = "ami-09d60ef68c99e2f85"
  instance_type = "t2.micro"

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "n11725605-auto-scale-instance"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app_asg" {
  desired_capacity     = 1
  max_size             = 3
  min_size             = 1
  vpc_zone_identifier  = ["subnet-075811427d5564cf9", "subnet-04ca053dcbe5f49cc", "subnet-05a3b8177138c8b14"]
  target_group_arns    = [aws_lb_target_group.app_target_group.arn]
  launch_template {
    id      = aws_launch_template.app_launch_template.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "n11725605-auto-scale-instance"
    propagate_at_launch = true
  }
}

# API Gateway for Accessing the Application
resource "aws_apigatewayv2_api" "app_api" {
  name          = "n11725605-api-assignment3"
  protocol_type = "HTTP"
}

# Lambda Function for API Gateway
resource "aws_lambda_function" "api_lambda" {
  function_name = "n11725605-assignment3-01"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  code          = filebase64sha256("lambda.zip")
}

resource "aws_lambda_function" "websocket_lambda" {
  function_name = "n11725605-WebSocket01"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  code          = filebase64sha256("lambda.zip")
}

# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_role" {
  name = "lambda_execution_role"
  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow"
      }
    ]
  })
}

# IAM Policy Attachment for Lambda Execution Role
resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
