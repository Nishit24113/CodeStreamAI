# 🚀 AWS CDK Deployment - CodeStream AI

One-click deployment using AWS CDK (TypeScript)

---

## 🎯 Quick Deploy

```bash
# From project root
./deploy/deploy.sh
```

That's it! This will:
- Install CDK dependencies
- Bootstrap AWS CDK
- Deploy all infrastructure
- Output endpoint URLs

---

## 📋 Prerequisites

1. **AWS CLI** configured with credentials:
   ```bash
   aws configure
   ```

2. **Node.js 20+** and **npm**

3. **AWS Account** with permissions for:
   - VPC, EC2, RDS, ElastiCache
   - Lambda, API Gateway
   - ECS, Fargate
   - S3, CloudFront
   - IAM roles

---

## 🏗️ What Gets Deployed

### Infrastructure:
- ✅ **VPC** with public/private subnets across 2 AZs
- ✅ **RDS PostgreSQL** (t3.micro)
- ✅ **ElastiCache Redis** (t3.micro)
- ✅ **Lambda Function** (Python 3.11)
- ✅ **API Gateway** (REST API)
- ✅ **ECS Fargate** (3 Celery workers)
- ✅ **S3 + CloudFront** (Frontend hosting)

### Security:
- Security groups with least privilege
- Private subnets for database/cache
- Secrets Manager for database credentials

---

## 💰 Cost Estimate

**Monthly costs** (with minimal usage):
- VPC: FREE
- RDS t3.micro: ~$12/month
- ElastiCache t3.micro: ~$12/month
- Lambda: ~$5/month (1M requests)
- API Gateway: ~$3.50/month
- ECS Fargate (3 tasks): ~$25/month
- S3 + CloudFront: ~$1/month

**Total**: ~$58-60/month

**For Demo/Testing**:
- Deploy for 1-2 days
- Cost: ~$2-4 total
- Destroy immediately after

---

## 📝 Commands

```bash
cd deploy/cdk

# Install dependencies
npm install

# Synthesize CloudFormation
npm run synth

# Deploy to AWS
npm run deploy

# Destroy all resources
npm run destroy
```

---

## 🔧 Manual Deployment Steps

If you prefer manual control:

### 1. Install Dependencies
```bash
cd deploy/cdk
npm install
```

### 2. Bootstrap CDK (first time only)
```bash
npx cdk bootstrap
```

### 3. Deploy
```bash
npx cdk deploy --all
```

### 4. Get Outputs
```bash
aws cloudformation describe-stacks \
  --stack-name codestream-ai-production \
  --query 'Stacks[0].Outputs'
```

---

## 🎯 Post-Deployment

### 1. Get API Endpoint
```bash
# Will output something like:
# https://abc123.execute-api.us-east-1.amazonaws.com/prod/
```

### 2. Deploy Frontend to Vercel
```bash
cd apps/web
vercel --prod

# Set environment variable:
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

### 3. Run Database Migrations
```bash
# Get database endpoint from outputs
# Connect and run:
alembic upgrade head
```

---

## 🗑️ Cleanup (IMPORTANT!)

**Always destroy after demo/testing:**

```bash
cd deploy/cdk
npm run destroy
```

This will:
- Delete all AWS resources
- Stop billing
- Clean up completely

**Estimated destruction time**: 5-10 minutes

---

## 🔍 Monitoring

### CloudWatch Logs:
- Lambda: `/aws/lambda/CodeStreamAIStack-APILambda*`
- Workers: `/ecs/worker`

### API Gateway:
- Endpoint: Check CloudFormation outputs
- Logs: API Gateway console

### Database:
- RDS Console → CodeStreamDB
- Credentials: Secrets Manager

---

## 🚨 Troubleshooting

**Issue**: CDK bootstrap fails  
**Fix**: Ensure AWS CLI is configured correctly

**Issue**: Deployment timeout  
**Fix**: Check CloudFormation events in AWS Console

**Issue**: Lambda can't connect to database  
**Fix**: Check security group rules allow Lambda → RDS

**Issue**: High costs  
**Fix**: Run `npm run destroy` immediately

---

## 📚 CDK Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html)
- [CDK Patterns](https://cdkpatterns.com/)

---

**Ready to deploy?**

```bash
cd CodeStreamAI
./deploy/deploy.sh
```

Your app will be live in ~15 minutes! 🚀
