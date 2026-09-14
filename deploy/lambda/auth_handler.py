import json
import boto3
import os
import hashlib
import uuid
import jwt
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
users_table_name = os.environ.get('USERS_TABLE', 'UsersTable')
users_table = dynamodb.Table(users_table_name)

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

def handler(event, context):
    """
    Handle authentication operations:
    - POST /api/auth/register - Register new user
    - POST /api/auth/login - Login user
    - GET /api/auth/me - Get current user
    - POST /api/auth/logout - Logout user
    """

    http_method = event.get('httpMethod', '')
    path = event.get('path', '')

    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }

    try:
        if http_method == 'OPTIONS':
            return {'statusCode': 200, 'headers': headers, 'body': ''}

        if '/api/auth/register' in path:
            return register(event, headers)
        elif '/api/auth/login' in path:
            return login(event, headers)
        elif '/api/auth/me' in path:
            return get_current_user(event, headers)
        elif '/api/auth/logout' in path:
            return logout(event, headers)
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Not found'})
            }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def register(event, headers):
    """Register a new user"""
    body = json.loads(event.get('body', '{}'))

    email = body.get('email')
    username = body.get('username')
    password = body.get('password')
    full_name = body.get('full_name', '')

    if not email or not username or not password:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'detail': 'Missing required fields'})
        }

    # Check if user exists
    try:
        response = users_table.get_item(Key={'userId': email})
        if 'Item' in response:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'detail': 'User already exists'})
            }
    except:
        pass

    # Hash password
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    users_table.put_item(Item={
        'userId': email,
        'username': username,
        'email': email,
        'password_hash': password_hash,
        'full_name': full_name,
        'is_active': True,
        'is_verified': True,
        'created_at': now,
        'last_login': None
    })

    # Generate tokens
    access_token = generate_token(email, username)
    refresh_token = generate_token(email, username, expires_days=30)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer'
        })
    }

def login(event, headers):
    """Login user"""
    body = json.loads(event.get('body', '{}'))

    email = body.get('email')
    password = body.get('password')

    if not email or not password:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'detail': 'Missing email or password'})
        }

    # Get user
    try:
        response = users_table.get_item(Key={'userId': email})
        if 'Item' not in response:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'detail': 'Invalid credentials'})
            }

        user = response['Item']

        # Verify password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if user.get('password_hash') != password_hash:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'detail': 'Invalid credentials'})
            }

        # Update last login
        users_table.update_item(
            Key={'userId': email},
            UpdateExpression='SET last_login = :now',
            ExpressionAttributeValues={':now': datetime.now().isoformat()}
        )

        # Generate tokens
        access_token = generate_token(email, user.get('username'))
        refresh_token = generate_token(email, user.get('username'), expires_days=30)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'token_type': 'bearer'
            })
        }

    except Exception as e:
        print(f"Login error: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'detail': 'Login failed'})
        }

def get_current_user(event, headers):
    """Get current user from token"""
    auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')

    if not auth_header or not auth_header.startswith('Bearer '):
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({'detail': 'Not authenticated'})
        }

    token = auth_header.split(' ')[1]

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get('sub')

        response = users_table.get_item(Key={'userId': email})
        if 'Item' not in response:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'detail': 'User not found'})
            }

        user = response['Item']

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'id': 1,  # Dummy ID for compatibility
                'email': user.get('email'),
                'username': user.get('username'),
                'full_name': user.get('full_name'),
                'is_active': user.get('is_active', True),
                'is_verified': user.get('is_verified', True),
                'created_at': user.get('created_at'),
                'last_login': user.get('last_login')
            })
        }

    except jwt.ExpiredSignatureError:
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({'detail': 'Token expired'})
        }
    except jwt.InvalidTokenError:
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({'detail': 'Invalid token'})
        }

def logout(event, headers):
    """Logout user (client-side only)"""
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'message': 'Logged out successfully'})
    }

def generate_token(email, username, expires_days=1):
    """Generate JWT token"""
    payload = {
        'sub': email,
        'username': username,
        'exp': datetime.utcnow() + timedelta(days=expires_days),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
