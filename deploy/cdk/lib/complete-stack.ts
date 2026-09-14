import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CompleteCodeStreamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================================
    // DYNAMODB TABLES (Multi-Tenant SaaS Ready)
    // ==========================================

    // Users Table
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Code Rooms Table (Multi-tenant with version history)
    const codeRoomsTable = new dynamodb.Table(this, 'CodeRoomsTable', {
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for querying latest version
    codeRoomsTable.addGlobalSecondaryIndex({
      indexName: 'LatestVersionIndex',
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Chat Messages Table
    const chatMessagesTable = new dynamodb.Table(this, 'ChatMessagesTable', {
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // WebSocket Connections Table
    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for querying by roomId
    connectionsTable.addGlobalSecondaryIndex({
      indexName: 'RoomIdIndex',
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ==========================================
    // S3 + CLOUDFRONT (Frontend)
    // ==========================================

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
    });

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
    });

    frontendBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['s3:GetObject'],
      resources: [`${frontendBucket.bucketArn}/*`],
      conditions: {
        'StringEquals': {
          'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
        },
      },
    }));

    // ==========================================
    // LAMBDA FUNCTIONS
    // ==========================================

    // Code Manager Lambda (Save/Load/Versions)
    const codeManagerLambda = new lambda.Function(this, 'CodeManagerLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'code_manager.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        CODE_ROOMS_TABLE: codeRoomsTable.tableName,
      },
    });

    codeRoomsTable.grantReadWriteData(codeManagerLambda);

    // Code Executor Lambda (Run Code Safely - Python)
    const codeExecutorLambda = new lambda.Function(this, 'CodeExecutorLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'code_executor.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    // JavaScript Executor Lambda (Node.js runtime)
    const jsExecutorLambda = new lambda.Function(this, 'JSExecutorLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'js_executor.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    // Workers Stats Lambda
    const workersStatsLambda = new lambda.Function(this, 'WorkersStatsLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'workers_stats.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Grant permissions for workers stats to read Lambda and SQS
    workersStatsLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:ListFunctions', 'sqs:ListQueues', 'sqs:GetQueueAttributes'],
      resources: ['*'],
    }));

    // Chat Manager Lambda
    const chatManagerLambda = new lambda.Function(this, 'ChatManagerLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'chat_manager.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        CHAT_MESSAGES_TABLE: chatMessagesTable.tableName,
      },
    });

    chatMessagesTable.grantReadWriteData(chatManagerLambda);

    // Auth Lambda
    const authLambda = new lambda.Function(this, 'AuthLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'auth_handler.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        USERS_TABLE: usersTable.tableName,
        JWT_SECRET: 'codestream-ai-secret-key-change-in-production-' + this.account,
      },
    });

    usersTable.grantReadWriteData(authLambda);

    // Analytics Lambda
    const analyticsLambda = new lambda.Function(this, 'AnalyticsLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'analytics_handler.handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        USERS_TABLE: usersTable.tableName,
        CODE_ROOMS_TABLE: codeRoomsTable.tableName,
        CHAT_MESSAGES_TABLE: chatMessagesTable.tableName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    usersTable.grantReadData(analyticsLambda);
    codeRoomsTable.grantReadData(analyticsLambda);
    chatMessagesTable.grantReadData(analyticsLambda);
    connectionsTable.grantReadData(analyticsLambda);

    // WebSocket Handler Lambdas
    const wsConnectLambda = new lambda.Function(this, 'WSConnectLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'ws_handler.connect_handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const wsDisconnectLambda = new lambda.Function(this, 'WSDisconnectLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'ws_handler.disconnect_handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const wsMessageLambda = new lambda.Function(this, 'WSMessageLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'ws_handler.message_handler',
      code: lambda.Code.fromAsset('../lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
        CODE_ROOMS_TABLE: codeRoomsTable.tableName,
      },
    });

    connectionsTable.grantReadWriteData(wsConnectLambda);
    connectionsTable.grantReadWriteData(wsDisconnectLambda);
    connectionsTable.grantReadWriteData(wsMessageLambda);
    codeRoomsTable.grantReadWriteData(wsMessageLambda);

    // ==========================================
    // REST API GATEWAY
    // ==========================================

    const api = new apigateway.RestApi(this, 'CodeStreamAPI', {
      restApiName: 'CodeStream AI API',
      description: 'REST API for CodeStream AI',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Code endpoints
    const codeResource = api.root.addResource('code');
    codeResource.addResource('save').addMethod('POST', new apigateway.LambdaIntegration(codeManagerLambda));
    const codeLoadResource = codeResource.addResource('load');
    codeLoadResource.addResource('{roomId}').addMethod('GET', new apigateway.LambdaIntegration(codeManagerLambda));
    const codeVersionsResource = codeResource.addResource('versions');
    codeVersionsResource.addResource('{roomId}').addMethod('GET', new apigateway.LambdaIntegration(codeManagerLambda));
    codeResource.addResource('execute').addMethod('POST', new apigateway.LambdaIntegration(codeExecutorLambda));
    codeResource.addResource('execute-js').addMethod('POST', new apigateway.LambdaIntegration(jsExecutorLambda));

    // Chat endpoints
    const chatResource = api.root.addResource('chat');
    chatResource.addResource('send').addMethod('POST', new apigateway.LambdaIntegration(chatManagerLambda));
    const chatRoomResource = chatResource.addResource('{roomId}');
    chatRoomResource.addMethod('GET', new apigateway.LambdaIntegration(chatManagerLambda));

    // Auth endpoints
    const apiResource = api.root.addResource('api');
    const authResource = apiResource.addResource('auth');
    authResource.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    authResource.addResource('login').addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    authResource.addResource('me').addMethod('GET', new apigateway.LambdaIntegration(authLambda));
    authResource.addResource('logout').addMethod('POST', new apigateway.LambdaIntegration(authLambda));

    // Analytics endpoints
    const analyticsResource = apiResource.addResource('analytics');
    const userAnalyticsResource = analyticsResource.addResource('user');
    userAnalyticsResource.addResource('{userId}').addMethod('GET', new apigateway.LambdaIntegration(analyticsLambda));

    // Tasks/Workers endpoints
    const tasksResource = apiResource.addResource('tasks');
    tasksResource.addResource('workers').addMethod('GET', new apigateway.LambdaIntegration(workersStatsLambda));

    // Health check
    const healthLambda = new lambda.Function(this, 'HealthLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
def handler(event, context):
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': '{"status": "online", "service": "CodeStream AI", "version": "2.0.0"}'
    }
      `),
    });

    api.root.addMethod('GET', new apigateway.LambdaIntegration(healthLambda));

    // ==========================================
    // WEBSOCKET API GATEWAY
    // ==========================================

    // Create WebSocket API
    const webSocketApi = new apigatewayv2.CfnApi(this, 'CodeStreamWSAPI', {
      name: 'CodeStream WebSocket API',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
    });

    // Lambda Integrations
    const connectIntegration = new apigatewayv2.CfnIntegration(this, 'ConnectIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${wsConnectLambda.functionArn}/invocations`,
    });

    const disconnectIntegration = new apigatewayv2.CfnIntegration(this, 'DisconnectIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${wsDisconnectLambda.functionArn}/invocations`,
    });

    const messageIntegration = new apigatewayv2.CfnIntegration(this, 'MessageIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${wsMessageLambda.functionArn}/invocations`,
    });

    // Routes
    const connectRoute = new apigatewayv2.CfnRoute(this, 'ConnectRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$connect',
      authorizationType: 'NONE',
      target: `integrations/${connectIntegration.ref}`,
    });

    const disconnectRoute = new apigatewayv2.CfnRoute(this, 'DisconnectRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$disconnect',
      authorizationType: 'NONE',
      target: `integrations/${disconnectIntegration.ref}`,
    });

    const defaultRoute = new apigatewayv2.CfnRoute(this, 'DefaultRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$default',
      authorizationType: 'NONE',
      target: `integrations/${messageIntegration.ref}`,
    });

    // Deployment and Stage
    const deployment = new apigatewayv2.CfnDeployment(this, 'Deployment', {
      apiId: webSocketApi.ref,
    });
    deployment.addDependency(connectRoute);
    deployment.addDependency(disconnectRoute);
    deployment.addDependency(defaultRoute);

    const stage = new apigatewayv2.CfnStage(this, 'ProductionStage', {
      apiId: webSocketApi.ref,
      stageName: 'prod',
      deploymentId: deployment.ref,
      defaultRouteSettings: {
        dataTraceEnabled: true,
        loggingLevel: 'INFO',
      },
    });

    // Lambda Permissions for API Gateway
    wsConnectLambda.addPermission('WSConnectPermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/*`,
    });

    wsDisconnectLambda.addPermission('WSDisconnectPermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/*`,
    });

    wsMessageLambda.addPermission('WSMessagePermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/*`,
    });

    // Grant WebSocket Lambda permission to manage connections
    const wsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.ref}/prod/POST/@connections/*`],
    });

    wsMessageLambda.addToRolePolicy(wsPolicy);

    const wsUrl = `wss://${webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`;

    // ==========================================
    // OUTPUTS
    // ==========================================

    new cdk.CfnOutput(this, 'RESTAPIEndpoint', {
      value: api.url,
      description: 'REST API Endpoint',
    });

    new cdk.CfnOutput(this, 'WebSocketAPIEndpoint', {
      value: wsUrl,
      description: 'WebSocket API Endpoint',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Frontend URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 Bucket Name',
    });

    new cdk.CfnOutput(this, 'CodeRoomsTableName', {
      value: codeRoomsTable.tableName,
      description: 'Code Rooms DynamoDB Table',
    });

    new cdk.CfnOutput(this, 'ConnectionsTableName', {
      value: connectionsTable.tableName,
      description: 'WebSocket Connections Table',
    });
  }
}
