import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('CHAT_MESSAGES_TABLE')
table = dynamodb.Table(table_name)

def handler(event, context):
    """
    Handle chat operations:
    - POST /chat/send - Send a message
    - GET /chat/{roomId} - Get chat history
    - DELETE /chat/{roomId}/{timestamp} - Delete a message (admin only)
    """

    http_method = event.get('httpMethod', '')
    path = event.get('path', '')

    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }

    try:
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }

        if http_method == 'POST' and '/chat/send' in path:
            return send_message(event, headers)

        elif http_method == 'GET' and '/chat/' in path:
            return get_messages(event, headers)

        elif http_method == 'DELETE' and '/chat/' in path:
            return delete_message(event, headers)

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

def send_message(event, headers):
    """Send a chat message"""
    body = json.loads(event.get('body', '{}'))

    room_id = body.get('roomId')
    message = body.get('message')
    user_id = body.get('userId', 'anonymous')
    username = body.get('username', 'Anonymous')

    if not room_id or not message:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Missing roomId or message'})
        }

    timestamp = int(datetime.now().timestamp() * 1000)

    item = {
        'roomId': room_id,
        'timestamp': timestamp,
        'userId': user_id,
        'username': username,
        'message': message,
        'createdAt': datetime.now().isoformat()
    }

    table.put_item(Item=item)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'success': True,
            'message': item
        })
    }

def get_messages(event, headers):
    """Get chat history for a room"""
    path_params = event.get('pathParameters', {})
    room_id = path_params.get('roomId')

    if not room_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Missing roomId'})
        }

    # Get query parameters for pagination
    query_params = event.get('queryStringParameters') or {}
    limit = int(query_params.get('limit', 50))

    # Get messages
    response = table.query(
        KeyConditionExpression='roomId = :rid',
        ExpressionAttributeValues={':rid': room_id},
        ScanIndexForward=True,  # Oldest first
        Limit=limit
    )

    messages = []
    for item in response.get('Items', []):
        messages.append({
            'timestamp': int(item.get('timestamp')),
            'userId': item.get('userId'),
            'username': item.get('username'),
            'message': item.get('message')
        })

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'roomId': room_id,
            'messages': messages,
            'count': len(messages)
        })
    }

def delete_message(event, headers):
    """Delete a message (admin only)"""
    path_params = event.get('pathParameters', {})
    room_id = path_params.get('roomId')
    timestamp = path_params.get('timestamp')

    if not room_id or not timestamp:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Missing roomId or timestamp'})
        }

    table.delete_item(
        Key={
            'roomId': room_id,
            'timestamp': int(timestamp)
        }
    )

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'success': True,
            'message': 'Message deleted'
        })
    }
