#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CodeStreamStack } from '../lib/codestream-stack';

const app = new cdk.App();

new CodeStreamStack(app, 'CodeStreamAIStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  stackName: 'codestream-ai-production',
  description: 'CodeStream AI - Distributed Real-Time Code Review Platform',
  tags: {
    Project: 'CodeStream AI',
    Environment: 'Production',
    ManagedBy: 'AWS CDK',
  },
});
