import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class ServerlessCodeStreamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables (replacing PostgreSQL)
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const codeReviewsTable = new dynamodb.Table(this, 'CodeReviewsTable', {
      partitionKey: { name: 'reviewId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Code Rooms Table (for collaborative editing with version history)
    const codeRoomsTable = new dynamodb.Table(this, 'CodeRoomsTable', {
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Chat Messages Table
    const chatMessagesTable = new dynamodb.Table(this, 'ChatMessagesTable', {
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // SQS Queues (replacing RabbitMQ)
    const analysisQueue = new sqs.Queue(this, 'AnalysisQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(1),
    });

    const securityQueue = new sqs.Queue(this, 'SecurityQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(1),
    });

    const indexingQueue = new sqs.Queue(this, 'IndexingQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(1),
    });

    // S3 Bucket for Frontend (Private - CloudFront only access)
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    // CloudFront Origin Access Control (OAC) - Best Practice for S3
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
    });

    // CloudFront Distribution with OAC
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      comment: 'CodeStream AI - Frontend Distribution',
    });

    // Grant CloudFront OAC permission to read from S3 bucket
    frontendBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['s3:GetObject'],
      resources: [`${frontendBucket.bucketArn}/*`],
      conditions: {
        'StringEquals': {
          'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${distribution.distributionId}`,
        },
      },
    }));

    // Main API Lambda Function
    const apiLambda = new lambda.Function(this, 'APILambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
def handler(event, context):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        'body': '{"status": "online", "service": "CodeStream AI API", "version": "1.0.0"}'
    }
      `),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        USERS_TABLE: usersTable.tableName,
        REVIEWS_TABLE: codeReviewsTable.tableName,
        SESSIONS_TABLE: sessionsTable.tableName,
        ANALYSIS_QUEUE: analysisQueue.queueUrl,
        SECURITY_QUEUE: securityQueue.queueUrl,
        INDEXING_QUEUE: indexingQueue.queueUrl,
      },
    });

    // Grant permissions
    usersTable.grantReadWriteData(apiLambda);
    codeReviewsTable.grantReadWriteData(apiLambda);
    sessionsTable.grantReadWriteData(apiLambda);
    analysisQueue.grantSendMessages(apiLambda);
    securityQueue.grantSendMessages(apiLambda);
    indexingQueue.grantSendMessages(apiLambda);

    // Grant Bedrock access
    apiLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'CodeStreamAPI', {
      restApiName: 'CodeStream AI API',
      description: 'Serverless API for CodeStream AI',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
      },
    });

    const apiIntegration = new apigateway.LambdaIntegration(apiLambda);
    api.root.addMethod('GET', apiIntegration);

    const apiProxy = api.root.addResource('{proxy+}');
    apiProxy.addMethod('ANY', apiIntegration);

    // Worker Lambda Functions (SQS consumers)
    const analysisWorker = new lambda.Function(this, 'AnalysisWorker', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
def handler(event, context):
    print(f"Processing {len(event['Records'])} analysis tasks")
    return {'statusCode': 200}
      `),
      timeout: cdk.Duration.seconds(300),
      memorySize: 512,
    });

    const securityWorker = new lambda.Function(this, 'SecurityWorker', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
def handler(event, context):
    print(f"Processing {len(event['Records'])} security tasks")
    return {'statusCode': 200}
      `),
      timeout: cdk.Duration.seconds(300),
      memorySize: 512,
    });

    // Connect SQS to Lambda workers
    analysisWorker.addEventSource(
      new cdk.aws_lambda_event_sources.SqsEventSource(analysisQueue, {
        batchSize: 10,
      })
    );

    securityWorker.addEventSource(
      new cdk.aws_lambda_event_sources.SqsEventSource(securityQueue, {
        batchSize: 10,
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint',
      exportName: 'CodeStreamAPIEndpoint',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
      exportName: 'CodeStreamFrontendURL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend',
      exportName: 'CodeStreamFrontendBucket',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      description: 'DynamoDB users table',
    });

    new cdk.CfnOutput(this, 'ReviewsTableName', {
      value: codeReviewsTable.tableName,
      description: 'DynamoDB code reviews table',
    });

    new cdk.CfnOutput(this, 'AnalysisQueueOutput', {
      value: analysisQueue.queueUrl,
      description: 'SQS Analysis Queue URL',
    });

    new cdk.CfnOutput(this, 'SecurityQueueOutput', {
      value: securityQueue.queueUrl,
      description: 'SQS Security Queue URL',
    });
  }
}
