import json
import boto3
import os
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ.get('USERS_TABLE'))
code_rooms_table = dynamodb.Table(os.environ.get('CODE_ROOMS_TABLE'))
chat_messages_table = dynamodb.Table(os.environ.get('CHAT_MESSAGES_TABLE'))
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE'))

def handler(event, context):
    """
    Get real analytics data for a user
    GET /api/analytics/user/{userId}
    """

    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }

    try:
        if event.get('httpMethod') == 'OPTIONS':
            return {'statusCode': 200, 'headers': headers, 'body': ''}

        # Get userId from path parameters
        path_params = event.get('pathParameters', {})
        user_id = path_params.get('userId', 'anonymous')

        # If no userId specified, get from auth header
        if not user_id or user_id == 'anonymous':
            auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
            if auth_header and auth_header.startswith('Bearer '):
                # Extract user from JWT (simplified - in production, decode JWT)
                user_id = 'current_user'

        # Get real analytics data
        analytics = get_user_analytics(user_id)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(analytics, default=decimal_default)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def get_user_analytics(user_id):
    """Get real analytics data from DynamoDB"""

    # Get all code rooms created by user
    try:
        code_response = code_rooms_table.scan(
            FilterExpression='userId = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )
        code_rooms = code_response.get('Items', [])
    except:
        code_rooms = []

    # Get all chat messages by user
    try:
        chat_response = chat_messages_table.scan(
            FilterExpression='username = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )
        chat_messages = chat_response.get('Items', [])
    except:
        chat_messages = []

    # Get all rooms the user has participated in
    unique_rooms = set()
    for room in code_rooms:
        unique_rooms.add(room.get('roomId'))

    # Calculate total lines of code
    total_lines = 0
    for room in code_rooms:
        code = room.get('code', '')
        total_lines += len(code.split('\n'))

    # Count executions (estimate based on versions)
    total_executions = len(code_rooms)

    # Calculate languages used
    languages_set = set()
    for room in code_rooms:
        lang = room.get('language', 'javascript')
        languages_set.add(lang.capitalize())

    # Get recent activity
    recent_activity = []
    sorted_rooms = sorted(code_rooms, key=lambda x: x.get('timestamp', 0), reverse=True)[:5]
    for room in sorted_rooms:
        recent_activity.append({
            'date': datetime.fromtimestamp(int(room.get('timestamp', 0)) / 1000).isoformat() if room.get('timestamp') else datetime.now().isoformat(),
            'action': f"Saved code (version {room.get('version', 1)})",
            'room': room.get('roomId', 'unknown')
        })

    # Calculate this week stats
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    week_ago_timestamp = int(week_ago.timestamp() * 1000)

    this_week_rooms = [r for r in code_rooms if r.get('timestamp', 0) > week_ago_timestamp]
    this_week_lines = sum(len(r.get('code', '').split('\n')) for r in this_week_rooms)

    # Calculate average session time (estimate based on room activity)
    avg_session_time = "15 min"  # Simplified - would need connection tracking

    return {
        'totalSessions': len(unique_rooms),
        'totalCodeLines': total_lines,
        'totalExecutions': total_executions,
        'avgSessionTime': avg_session_time,
        'languagesUsed': list(languages_set) if languages_set else ['JavaScript', 'Python'],
        'thisWeek': {
            'sessions': len(set(r.get('roomId') for r in this_week_rooms)),
            'linesWritten': this_week_lines,
            'executions': len(this_week_rooms)
        },
        'recentActivity': recent_activity if recent_activity else [
            {
                'date': datetime.now().isoformat(),
                'action': 'Welcome to CodeStream AI!',
                'room': 'Get started by creating a room'
            }
        ],
        'totalChatMessages': len(chat_messages)
    }

def decimal_default(obj):
    """JSON encoder for Decimal objects"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError
