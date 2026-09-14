import json
import boto3
import os
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
connections_table_name = os.environ.get('CONNECTIONS_TABLE')
connections_table = dynamodb.Table(connections_table_name)

code_rooms_table_name = os.environ.get('CODE_ROOMS_TABLE', '')
if code_rooms_table_name:
    code_rooms_table = dynamodb.Table(code_rooms_table_name)

apigateway_client = boto3.client('apigatewaymanagementapi')

def connect_handler(event, context):
    """
    Handle WebSocket connection
    Store connection ID with roomId from query parameters
    """
    connection_id = event['requestContext']['connectionId']
    query_params = event.get('queryStringParameters') or {}
    room_id = query_params.get('roomId', 'default')
    username = query_params.get('username', 'Anonymous')

    # TTL: 2 hours from now
    ttl = int((datetime.now() + timedelta(hours=2)).timestamp())

    # Store connection
    connections_table.put_item(Item={
        'connectionId': connection_id,
        'roomId': room_id,
        'username': username,
        'connectedAt': datetime.now().isoformat(),
        'ttl': ttl
    })

    print(f"User {username} connected to room {room_id} with connection {connection_id}")

    # Notify other users in the room
    try:
        broadcast_to_room(
            room_id,
            {
                'type': 'user_joined',
                'username': username,
                'connectionId': connection_id,
                'timestamp': int(datetime.now().timestamp() * 1000)
            },
            event['requestContext'],
            exclude_connection=connection_id
        )
    except Exception as e:
        print(f"Error broadcasting join: {e}")

    return {'statusCode': 200, 'body': 'Connected'}

def disconnect_handler(event, context):
    """
    Handle WebSocket disconnection
    Remove connection from table and notify room
    """
    connection_id = event['requestContext']['connectionId']

    try:
        # Get connection info before deleting
        response = connections_table.get_item(Key={'connectionId': connection_id})
        if 'Item' in response:
            item = response['Item']
            room_id = item.get('roomId')
            username = item.get('username')

            # Delete connection
            connections_table.delete_item(Key={'connectionId': connection_id})

            print(f"User {username} disconnected from room {room_id}")

            # Notify other users
            try:
                broadcast_to_room(
                    room_id,
                    {
                        'type': 'user_left',
                        'username': username,
                        'connectionId': connection_id,
                        'timestamp': int(datetime.now().timestamp() * 1000)
                    },
                    event['requestContext']
                )
            except Exception as e:
                print(f"Error broadcasting leave: {e}")

    except Exception as e:
        print(f"Error handling disconnect: {e}")

    return {'statusCode': 200, 'body': 'Disconnected'}

def message_handler(event, context):
    """
    Handle WebSocket messages
    Route messages based on action type:
    - code_change: Broadcast code changes to room
    - cursor_move: Broadcast cursor position
    - chat_message: Broadcast chat message
    - request_sync: Send current room state to requester
    """
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']

    # Set up API Gateway Management API endpoint
    global apigateway_client
    apigateway_client = boto3.client('apigatewaymanagementapi',
        endpoint_url=f"https://{domain_name}/{stage}")

    try:
        # Parse message
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', body.get('type', 'unknown'))

        # Get connection info
        response = connections_table.get_item(Key={'connectionId': connection_id})
        if 'Item' not in response:
            return {'statusCode': 404, 'body': 'Connection not found'}

        connection_info = response['Item']
        room_id = connection_info.get('roomId')
        username = connection_info.get('username')

        print(f"Message from {username} in room {room_id}: {action}")

        # Handle different message types
        if action == 'code_change':
            handle_code_change(room_id, username, connection_id, body, event['requestContext'])

        elif action == 'cursor_move':
            handle_cursor_move(room_id, username, connection_id, body, event['requestContext'])

        elif action == 'chat_message':
            handle_chat_message(room_id, username, connection_id, body, event['requestContext'])

        elif action == 'request_sync':
            handle_sync_request(room_id, connection_id, event['requestContext'])

        else:
            print(f"Unknown action: {action}")

        return {'statusCode': 200, 'body': 'Message processed'}

    except Exception as e:
        print(f"Error processing message: {e}")
        return {'statusCode': 500, 'body': f'Error: {str(e)}'}

def handle_code_change(room_id, username, connection_id, body, context):
    """Handle code change and broadcast to room"""
    code = body.get('code', '')
    language = body.get('language', 'javascript')

    # Save to DynamoDB (optional - for persistence)
    if code_rooms_table_name:
        try:
            # Get current version
            response = code_rooms_table.query(
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
            code_rooms_table.put_item(Item={
                'roomId': room_id,
                'version': new_version,
                'code': code,
                'language': language,
                'userId': username,
                'timestamp': int(datetime.now().timestamp() * 1000),
                'createdAt': datetime.now().isoformat()
            })
        except Exception as e:
            print(f"Error saving code: {e}")

    # Broadcast to all users in room
    broadcast_to_room(
        room_id,
        {
            'type': 'code_update',
            'code': code,
            'language': language,
            'username': username,
            'timestamp': int(datetime.now().timestamp() * 1000)
        },
        context,
        exclude_connection=connection_id  # Don't send back to sender
    )

def handle_cursor_move(room_id, username, connection_id, body, context):
    """Handle cursor movement and broadcast to room"""
    position = body.get('position', {})

    broadcast_to_room(
        room_id,
        {
            'type': 'cursor_update',
            'username': username,
            'connectionId': connection_id,
            'position': position,
            'timestamp': int(datetime.now().timestamp() * 1000)
        },
        context,
        exclude_connection=connection_id
    )

def handle_chat_message(room_id, username, connection_id, body, context):
    """Handle chat message and broadcast to room"""
    message = body.get('message', '')

    broadcast_to_room(
        room_id,
        {
            'type': 'chat_message',
            'username': username,
            'message': message,
            'timestamp': int(datetime.now().timestamp() * 1000)
        },
        context
    )

def handle_sync_request(room_id, connection_id, context):
    """Send current room state to requesting user"""
    try:
        # Get latest code from database
        if code_rooms_table_name:
            response = code_rooms_table.query(
                KeyConditionExpression='roomId = :rid',
                ExpressionAttributeValues={':rid': room_id},
                ScanIndexForward=False,
                Limit=1
            )

            if response.get('Items'):
                item = response['Items'][0]
                send_to_connection(
                    connection_id,
                    {
                        'type': 'sync_response',
                        'code': item.get('code', ''),
                        'language': item.get('language', 'javascript'),
                        'version': int(item.get('version', 0))
                    },
                    context
                )
    except Exception as e:
        print(f"Error handling sync request: {e}")

def broadcast_to_room(room_id, message, context, exclude_connection=None):
    """Broadcast message to all connections in a room"""
    try:
        # Get all connections for this room
        response = connections_table.query(
            IndexName='RoomIdIndex',
            KeyConditionExpression='roomId = :rid',
            ExpressionAttributeValues={':rid': room_id}
        )

        connections = response.get('Items', [])
        print(f"Broadcasting to {len(connections)} connections in room {room_id}")

        for connection in connections:
            conn_id = connection['connectionId']

            # Skip excluded connection (usually the sender)
            if exclude_connection and conn_id == exclude_connection:
                continue

            try:
                send_to_connection(conn_id, message, context)
            except Exception as e:
                print(f"Failed to send to {conn_id}: {e}")
                # Connection might be stale, remove it
                try:
                    connections_table.delete_item(Key={'connectionId': conn_id})
                except:
                    pass

    except Exception as e:
        print(f"Error broadcasting to room: {e}")

def send_to_connection(connection_id, message, context):
    """Send a message to a specific WebSocket connection"""
    apigateway_client.post_to_connection(
        ConnectionId=connection_id,
        Data=json.dumps(message).encode('utf-8')
    )
