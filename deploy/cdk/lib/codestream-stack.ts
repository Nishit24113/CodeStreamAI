import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class CodeStreamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'CodeStreamVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // RDS PostgreSQL
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: true,
    });

    const database = new rds.DatabaseInstance(this, 'CodeStreamDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_1,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      databaseName: 'codestream',
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      securityGroups: [dbSecurityGroup],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo - change to RETAIN for production
      deletionProtection: false,
    });

    // ElastiCache Redis
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache Redis',
      allowAllOutbound: true,
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const redis = new elasticache.CfnCacheCluster(this, 'CodeStreamRedis', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    // S3 Bucket for Frontend (if not using Vercel)
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

    // Lambda Function for API
    const apiLambda = new lambda.Function(this, 'APILambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'main.handler',
      code: lambda.Code.fromAsset('../../apps/api'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_NAME: 'codestream',
        DB_SECRET_ARN: database.secret?.secretArn || '',
        REDIS_HOST: redis.attrRedisEndpointAddress,
        REDIS_PORT: redis.attrRedisEndpointPort,
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Grant Lambda permission to read database secret
    database.secret?.grantRead(apiLambda);

    // Allow Lambda to access database
    dbSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(apiLambda.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(5432),
      'Allow Lambda to access PostgreSQL'
    );

    // Allow Lambda to access Redis
    redisSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(apiLambda.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(6379),
      'Allow Lambda to access Redis'
    );

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

    // ECS Cluster for Celery Workers
    const cluster = new ecs.Cluster(this, 'WorkerCluster', {
      vpc,
      clusterName: 'codestream-workers',
    });

    // Fargate Task for Celery Workers
    const workerTask = new ecs.FargateTaskDefinition(this, 'WorkerTask', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    workerTask.addContainer('worker', {
      image: ecs.ContainerImage.fromRegistry('python:3.11-slim'),
      command: [
        'sh',
        '-c',
        'pip install -r requirements.txt && celery -A app.celery_app worker --loglevel=info',
      ],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'worker' }),
      environment: {
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_NAME: 'codestream',
        DB_SECRET_ARN: database.secret?.secretArn || '',
        REDIS_HOST: redis.attrRedisEndpointAddress,
        REDIS_PORT: redis.attrRedisEndpointPort,
      },
    });

    // Grant workers permission to read database secret
    database.secret?.grantRead(workerTask.taskRole);

    // Fargate Service for Workers
    new ecs.FargateService(this, 'WorkerService', {
      cluster,
      taskDefinition: workerTask,
      desiredCount: 3,
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
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

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.dbInstanceEndpointAddress,
      description: 'RDS PostgreSQL endpoint',
      exportName: 'CodeStreamDBEndpoint',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redis.attrRedisEndpointAddress,
      description: 'ElastiCache Redis endpoint',
      exportName: 'CodeStreamRedisEndpoint',
    });
  }
}
