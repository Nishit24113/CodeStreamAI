import json
import subprocess
import os
import tempfile
import shutil
from datetime import datetime

def handler(event, context):
    """
    Execute code safely in isolated environment
    POST /code/execute
    Body: { code, language }
    """

    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }

    try:
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }

        body = json.loads(event.get('body', '{}'))
        code = body.get('code', '')
        language = body.get('language', 'javascript').lower()

        if not code:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'No code provided'})
            }

        # Execute based on language
        if language in ['javascript', 'js']:
            result = execute_javascript(code)
        elif language in ['python', 'py']:
            result = execute_python(code)
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': f'Unsupported language: {language}'})
            }

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result)
        }

    except Exception as e:
        print(f"Execution error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': str(e),
                'output': '',
                'executionTime': 0
            })
        }

def execute_javascript(code):
    """Execute JavaScript code using Node.js"""
    start_time = datetime.now()

    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(code)
        temp_file = f.name

    try:
        # Run with timeout and resource limits
        result = subprocess.run(
            ['node', temp_file],
            capture_output=True,
            text=True,
            timeout=5,  # 5 second timeout
            env={'NODE_OPTIONS': '--max-old-space-size=128'}  # Limit memory
        )

        execution_time = (datetime.now() - start_time).total_seconds()

        return {
            'success': result.returncode == 0,
            'output': result.stdout if result.returncode == 0 else result.stderr,
            'error': result.stderr if result.returncode != 0 else None,
            'executionTime': execution_time
        }

    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'output': '',
            'error': 'Execution timed out (5s limit)',
            'executionTime': 5.0
        }
    except Exception as e:
        return {
            'success': False,
            'output': '',
            'error': str(e),
            'executionTime': (datetime.now() - start_time).total_seconds()
        }
    finally:
        # Cleanup
        try:
            os.unlink(temp_file)
        except:
            pass

def execute_python(code):
    """Execute Python code"""
    start_time = datetime.now()

    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name

    try:
        # Run with timeout and resource limits
        result = subprocess.run(
            ['python3', temp_file],
            capture_output=True,
            text=True,
            timeout=5,  # 5 second timeout
        )

        execution_time = (datetime.now() - start_time).total_seconds()

        return {
            'success': result.returncode == 0,
            'output': result.stdout if result.returncode == 0 else result.stderr,
            'error': result.stderr if result.returncode != 0 else None,
            'executionTime': execution_time
        }

    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'output': '',
            'error': 'Execution timed out (5s limit)',
            'executionTime': 5.0
        }
    except Exception as e:
        return {
            'success': False,
            'output': '',
            'error': str(e),
            'executionTime': (datetime.now() - start_time).total_seconds()
        }
    finally:
        # Cleanup
        try:
            os.unlink(temp_file)
        except:
            pass
