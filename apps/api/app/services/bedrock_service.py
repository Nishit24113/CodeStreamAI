"""
AWS Bedrock Service for AI Code Review
Streaming AI responses with Claude 3.5 Sonnet
"""

import json
import boto3
from typing import AsyncIterator
import os
from dotenv import load_dotenv

load_dotenv()

class BedrockService:
    def __init__(self):
        self.client = boto3.client(
            service_name='bedrock-runtime',
            region_name=os.getenv('AWS_REGION', 'us-east-1'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        )
        self.model_id = os.getenv(
            'BEDROCK_MODEL_ID',
            'anthropic.claude-3-5-sonnet-20241022-v2:0'
        )

    async def analyze_code_stream(
        self,
        code: str,
        language: str = "javascript",
        analysis_type: str = "comprehensive"
    ) -> AsyncIterator[str]:
        """
        Stream AI code analysis token-by-token

        Args:
            code: Source code to analyze
            language: Programming language
            analysis_type: Type of analysis (bugs, security, performance, comprehensive)

        Yields:
            str: Individual tokens from AI response
        """

        # Create analysis prompt based on type
        prompts = {
            "bugs": f"""Analyze this {language} code for bugs and logical errors.

Code:
```{language}
{code}
```

Provide:
1. List of potential bugs with line numbers
2. Severity (Critical/High/Medium/Low)
3. Suggested fixes

Format as structured JSON.""",

            "security": f"""Perform security analysis on this {language} code.

Code:
```{language}
{code}
```

Check for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
3. Authentication issues
4. Insecure dependencies
5. Hardcoded secrets

Format as structured JSON with CVE references if applicable.""",

            "performance": f"""Analyze performance bottlenecks in this {language} code.

Code:
```{language}
{code}
```

Identify:
1. Time complexity issues
2. Memory leaks
3. Inefficient algorithms
4. Database query optimization
5. Caching opportunities

Format as structured JSON.""",

            "comprehensive": f"""Perform comprehensive code review of this {language} code.

Code:
```{language}
{code}
```

Analyze:
1. **Bugs & Logic Errors:** Potential issues with line numbers
2. **Security:** Vulnerabilities (SQL injection, XSS, auth issues)
3. **Performance:** Bottlenecks and optimization opportunities
4. **Best Practices:** Code style, naming conventions, structure
5. **Suggestions:** Specific improvements with code examples

Provide detailed, actionable feedback with severity ratings."""
        }

        prompt = prompts.get(analysis_type, prompts["comprehensive"])

        # Prepare request body
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "top_p": 0.9,
        })

        try:
            # Invoke with streaming
            response = self.client.invoke_model_with_response_stream(
                modelId=self.model_id,
                body=body,
            )

            # Stream tokens
            stream = response.get('body')
            if stream:
                for event in stream:
                    chunk = event.get('chunk')
                    if chunk:
                        chunk_data = json.loads(chunk.get('bytes').decode())

                        # Extract token from response
                        if chunk_data.get('type') == 'content_block_delta':
                            delta = chunk_data.get('delta', {})
                            if delta.get('type') == 'text_delta':
                                token = delta.get('text', '')
                                if token:
                                    yield token

        except Exception as e:
            print(f"Bedrock streaming error: {e}")
            yield f"Error: {str(e)}"


    def analyze_code_sync(
        self,
        code: str,
        language: str = "javascript",
        analysis_type: str = "comprehensive"
    ) -> dict:
        """
        Synchronous code analysis (non-streaming)

        Returns:
            dict: Complete analysis results
        """

        prompt = f"""Analyze this {language} code and return structured JSON.

Code:
```{language}
{code}
```

Return JSON format:
{{
  "summary": "Brief overview",
  "bugs": [
    {{"line": 10, "severity": "high", "issue": "...", "fix": "..."}}
  ],
  "security": [
    {{"type": "sql_injection", "severity": "critical", "location": "...", "fix": "..."}}
  ],
  "performance": [
    {{"issue": "...", "impact": "high", "suggestion": "..."}}
  ],
  "score": 85
}}
"""

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.5,
        })

        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                body=body,
            )

            response_body = json.loads(response['body'].read())
            content = response_body.get('content', [])

            if content and len(content) > 0:
                text = content[0].get('text', '')
                # Try to parse as JSON
                try:
                    return json.loads(text)
                except:
                    return {"analysis": text, "raw": True}

            return {"error": "No response from model"}

        except Exception as e:
            return {"error": str(e)}


# Singleton instance
bedrock_service = BedrockService()
