import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class SimpleCodeStreamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for Frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });

    // Lambda Function for API (without VPC - simplified)
    const apiLambda = new lambda.Function(this, 'APILambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'main.handler',
      code: lambda.Code.fromAsset('../../apps/api'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        ENVIRONMENT: 'demo',
        // Add other env vars as needed
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'CodeStreamAPI', {
      restApiName: 'CodeStream AI API',
      description: 'API for CodeStream AI platform',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const apiIntegration = new apigateway.LambdaIntegration(apiLambda);
    api.root.addProxy({
      defaultIntegration: apiIntegration,
    });

    // Outputs
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint',
      exportName: 'CodeStreamAPIEndpoint',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution URL',
      exportName: 'CodeStreamFrontendURL',
    });

    new cdk.CfnOutput(this, 'FrontendBucket', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend',
      exportName: 'CodeStreamFrontendBucket',
    });
  }
}
