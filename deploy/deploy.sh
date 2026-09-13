#!/bin/bash
# One-click deployment script for CodeStream AI

set -e

echo "🚀 CodeStream AI - One-Click Deployment"
echo "========================================"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Install CDK dependencies
echo "📦 Installing CDK dependencies..."
cd deploy/cdk
npm install
echo "✅ Dependencies installed"
echo ""

# Bootstrap CDK (first time only)
echo "🔧 Bootstrapping AWS CDK..."
npx cdk bootstrap
echo "✅ CDK bootstrapped"
echo ""

# Deploy infrastructure
echo "🏗️  Deploying infrastructure to AWS..."
npm run deploy

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Getting deployment outputs..."
aws cloudformation describe-stacks \
    --stack-name codestream-ai-production \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo "🎉 Your application is now deployed!"
echo ""
echo "Next steps:"
echo "1. Frontend: Deploy to Vercel or upload to S3"
echo "2. Update frontend .env with API endpoint"
echo "3. Run database migrations"
echo "4. Test the deployed application"
echo ""
echo "To destroy (cleanup):"
echo "  cd deploy/cdk && npm run destroy"
echo ""
