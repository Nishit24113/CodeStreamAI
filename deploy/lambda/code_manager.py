import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('CODE_ROOMS_TABLE')
table = dynamodb.Table(table_name)

def handler(event, context):
    """
    Handle code room operations:
    - POST /code/save - Save code to room
    - GET /code/load/{roomId} - Load latest code
    - GET /code/versions/{roomId} - Get version history
    - DELETE /code/{roomId} - Delete room (admin only)
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

        if http_method == 'POST' and '/code/save' in path:
            return save_code(event, headers)

        elif http_method == 'GET' and '/code/load' in path:
            return load_code(event, headers)

        elif http_method == 'GET' and '/code/versions' in path:
            return get_versions(event, headers)

        elif http_method == 'DELETE' and '/code/' in path:
            return delete_room(event, headers)

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

def save_code(event, headers):
    """Save code to DynamoDB with versioning"""
    body = json.loads(event.get('body', '{}'))

    room_id = body.get('roomId')
    code = body.get('code')
    language = body.get('language', 'javascript')
    user_id = body.get('userId', 'anonymous')

    if not room_id or code is None:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Missing roomId or code'})
        }

    # Get current version
    response = table.query(
        KeyConditionExpression='roomId = :rid',
        ExpressionAttributeValues={':rid': room_id},
        ScanIndexForward=False,
        Limit=1
    )

    current_version = 0
    if response.get('Items'):
        current_version = int(response['Items'][0].get('version', 0))

    new_version = current_version + 1

    # Save new version
    item = {
        'roomId': room_id,
        'version': new_version,
        'code': code,
        'language': language,
        'userId': user_id,
        'timestamp': int(datetime.now().timestamp() * 1000),
        'createdAt': datetime.now().isoformat()
    }

    table.put_item(Item=item)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'success': True,
            'version': new_version,
            'roomId': room_id
        })
    }

def load_code(event, headers):
    """Load latest code from room"""
    path_params = event.get('pathParameters', {})
    room_id = path_params.get('roomId')

    if not room_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Missing roomId'})
        }

    # Get latest version
    response = table.query(
        KeyConditionExpression='roomId = :rid',
        ExpressionAttributeValues={':rid': room_id},
        ScanIndexForward=False,
        Limit=1
    )

    if not response.get('Items'):
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'error': 'Room not found'})
        }

    item = response['Items'][0]

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'roomId': item.get('roomId'),
            'code': item.get('code'),
            'language': item.get('language'),
            'version': int(item.get('version')),
            'timestamp': int(item.get('timestamp'))
        })
    }

def get_versions(event, headers):
    """Get version history for a room"""
    path_params = event.get('pathParameters', {})
    room_id = path_params.get('roomId')

    if not room_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Missing roomId'})
        }

    # Get last 10 versions
    response = table.query(
        KeyConditionExpression='roomId = :rid',
        ExpressionAttributeValues={':rid': room_id},
        ScanIndexForward=False,
        Limit=10
    )

    versions = []
    for item in response.get('Items', []):
        versions.append({
            'version': int(item.get('version')),
            'timestamp': int(item.get('timestamp')),
            'userId': item.get('userId'),
            'codePreview': item.get('code', '')[:100] + '...' if len(item.get('code', '')) > 100 else item.get('code', '')
        })

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'roomId': room_id,
            'versions': versions
        })
    }

def delete_room(event, headers):
    """Delete all versions of a room (admin only)"""
    path_params = event.get('pathParameters', {})
    room_id = path_params.get('roomId')

    if not room_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Missing roomId'})
        }

    # Get all versions
    response = table.query(
        KeyConditionExpression='roomId = :rid',
        ExpressionAttributeValues={':rid': room_id}
    )

    # Delete all versions
    with table.batch_writer() as batch:
        for item in response.get('Items', []):
            batch.delete_item(
                Key={
                    'roomId': item['roomId'],
                    'version': item['version']
                }
            )

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'success': True,
            'message': f'Room {room_id} deleted'
        })
    }
