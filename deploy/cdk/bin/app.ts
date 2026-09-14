#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CompleteCodeStreamStack } from '../lib/complete-stack';

const app = new cdk.App();

new CompleteCodeStreamStack(app, 'CodeStreamAIStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
  },
  stackName: 'codestream-ai-complete',
  description: 'CodeStream AI - Complete Multi-Tenant SaaS Platform',
  tags: {
    Project: 'CodeStream AI',
    Environment: 'Production',
    ManagedBy: 'AWS CDK',
    Architecture: 'Serverless Multi-Tenant SaaS',
  },
});
