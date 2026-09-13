# 🚀 CodeStream AI - Deployment Guide

Complete deployment guide for AWS production environment.

---

## 📋 Prerequisites

### Required Tools
- AWS CLI configured with credentials
- Terraform >= 1.0
- Docker & Docker Compose
- Node.js 20+ & pnpm
- Python 3.11+
- PostgreSQL client (psql)

### AWS Services Used
- **Frontend**: Vercel (or S3 + CloudFront)
- **Backend API**: AWS Lambda + API Gateway
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **Message Queue**: Amazon MQ (RabbitMQ)
- **Vector DB**: Pinecone (external)
- **Monitoring**: CloudWatch + Sentry

---

## 🏗️ Infrastructure Setup

### 1. Configure AWS Credentials

```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1)
```

### 2. Deploy Infrastructure with Terraform

```bash
cd deploy/terraform

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Deploy infrastructure
terraform apply

# Save outputs
terraform output > ../terraform-outputs.txt
```

This creates:
- VPC with public/private subnets
- RDS PostgreSQL database
- ElastiCache Redis cluster
- Security groups
- Internet Gateway

### 3. Database Migration

```bash
# Get RDS endpoint from Terraform outputs
export DB_ENDPOINT=$(terraform output -raw rds_endpoint)

# Run migrations
cd ../../apps/api
alembic upgrade head
```

---

## 🖥️ Backend Deployment (AWS Lambda)

### 1. Package Backend

```bash
cd apps/api

# Install dependencies
pip install -r requirements.txt -t ./package

# Package Lambda function
cd package
zip -r ../lambda.zip .
cd ..
zip -g lambda.zip -r app/

# Upload to S3
aws s3 cp lambda.zip s3://codestream-deployments/lambda/backend.zip
```

### 2. Create Lambda Function

```bash
aws lambda create-function \
  --function-name codestream-api \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler app.main.handler \
  --code S3Bucket=codestream-deployments,S3Key=lambda/backend.zip \
  --timeout 30 \
  --memory-size 1024 \
  --environment Variables="{
    DATABASE_URL=postgresql://...,
    REDIS_URL=redis://...,
    SECRET_KEY=...,
    PINECONE_API_KEY=...,
    AWS_BEDROCK_REGION=us-east-1
  }"
```

### 3. Setup API Gateway

```bash
# Create REST API
aws apigateway create-rest-api \
  --name codestream-api \
  --endpoint-configuration types=REGIONAL

# Configure routes and integration
# (Use AWS Console or CLI for detailed setup)
```

---

## 🌐 Frontend Deployment (Vercel)

### 1. Connect GitHub to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd apps/web
vercel --prod
```

### 2. Configure Environment Variables

In Vercel dashboard, add:
```
NEXT_PUBLIC_API_URL=https://api.codestream.ai
```

---

## ⚙️ Celery Workers (AWS ECS/Fargate)

### 1. Build Docker Image

```bash
cd apps/api

# Build image
docker build -t codestream-worker:latest .

# Tag for ECR
docker tag codestream-worker:latest \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/codestream-worker:latest

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/codestream-worker:latest
```

### 2. Create ECS Task Definition

```json
{
  "family": "codestream-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [{
    "name": "worker",
    "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/codestream-worker:latest",
    "command": ["celery", "-A", "app.celery_app", "worker", "--loglevel=info"],
    "environment": [
      {"name": "RABBITMQ_URL", "value": "amqp://..."},
      {"name": "REDIS_URL", "value": "redis://..."}
    ]
  }]
}
```

### 3. Launch Service

```bash
aws ecs create-service \
  --cluster codestream-cluster \
  --service-name codestream-workers \
  --task-definition codestream-worker \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[...],securityGroups=[...],assignPublicIp=ENABLED}"
```

---

## 📊 Monitoring Setup

### 1. CloudWatch Dashboards

```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name CodeStream \
  --dashboard-body file://cloudwatch-dashboard.json
```

### 2. Sentry Configuration

```bash
# Install Sentry
pip install sentry-sdk[fastapi]

# Configure in main.py
import sentry_sdk
sentry_sdk.init(
    dsn="YOUR_SENTRY_DSN",
    traces_sample_rate=0.1
)
```

---

## ✅ Testing Deployment

### 1. Health Checks

```bash
# Backend health
curl https://api.codestream.ai/health

# Frontend
curl https://codestream.vercel.app/

# Database connection
psql -h RDS_ENDPOINT -U postgres -d codestream -c "SELECT 1;"
```

### 2. Load Testing

```bash
# Install k6
brew install k6  # or download from k6.io

# Run load test
k6 run tests/load-test.js
```

### 3. E2E Tests

```bash
cd apps/web
npm run test:e2e
```

---

## 🔥 Teardown (After Testing)

**IMPORTANT**: This will destroy all AWS resources!

```bash
cd deploy/terraform

# Destroy infrastructure
terraform destroy

# Confirm with 'yes' when prompted
```

Manual cleanup:
1. Delete Lambda functions
2. Delete API Gateway
3. Delete ECS services and tasks
4. Delete ECR images
5. Delete S3 buckets
6. Delete CloudWatch logs

---

## 💰 Cost Estimate

### Daily Costs (Testing Period)
- RDS t3.micro: $0.41/day
- ElastiCache t3.micro: $0.41/day
- Lambda (1M requests): $0.20/day
- API Gateway: $0.35/day
- ECS Fargate (3 tasks): $2.88/day
- **Total**: ~$4-5/day

### Recommendation
- Test for 1-2 days: **$5-10 total**
- Destroy immediately after testing
- Monitor AWS billing dashboard

---

## 🚨 Common Issues

### Issue: Lambda timeout
**Solution**: Increase timeout to 30s in Lambda configuration

### Issue: Database connection failed
**Solution**: Check security group rules allow Lambda VPC access

### Issue: Workers not processing
**Solution**: Verify RabbitMQ connection string and ECS task status

### Issue: High costs
**Solution**: Use `terraform destroy` immediately after testing

---

## 📚 Additional Resources

- [AWS Lambda Python Documentation](https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Celery on AWS ECS](https://docs.celeryproject.org/en/stable/userguide/workers.html)

---

**Need Help?** Check logs:
- Lambda: CloudWatch Logs
- Workers: ECS task logs
- Frontend: Vercel deployment logs
- Database: RDS query logs
