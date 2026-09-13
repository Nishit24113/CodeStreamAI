"""
Code Review API Routes
Streaming AI analysis with Server-Sent Events
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import asyncio

from app.services.bedrock_service import bedrock_service
from app.services.rag_service import RAGService

router = APIRouter()

# Initialize RAG service
rag_service = RAGService()


class CodeAnalysisRequest(BaseModel):
    code: str
    language: str = "javascript"
    analysis_type: str = "comprehensive"  # bugs, security, performance, comprehensive
    use_rag: bool = True  # Enable RAG by default
    top_k_context: int = 3  # Number of similar code examples for context


class CodeAnalysisResponse(BaseModel):
    analysis: dict
    score: Optional[int] = None


@router.post("/analyze/stream")
async def analyze_code_stream(request: CodeAnalysisRequest):
    """
    Stream AI code analysis token-by-token via Server-Sent Events

    Returns:
        StreamingResponse: SSE stream of analysis tokens
    """

    if not request.code or len(request.code.strip()) == 0:
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    async def generate():
        """Generator for SSE stream"""
        try:
            # Send initial connection event
            yield f"data: {{'type': 'connected', 'message': 'Analysis started'}}\n\n"

            # Stream AI tokens with RAG if enabled
            if request.use_rag:
                async for token in rag_service.analyze_with_rag_stream(
                    code=request.code,
                    language=request.language,
                    analysis_type=request.analysis_type,
                    use_rag=True,
                    top_k_context=request.top_k_context
                ):
                    # Format as SSE
                    yield f"data: {{'type': 'token', 'content': '{token.replace(chr(10), '\\n').replace(chr(39), chr(92) + chr(39))}'}}\n\n"
                    await asyncio.sleep(0.01)
            else:
                # Standard streaming without RAG
                async for token in bedrock_service.analyze_code_stream(
                    code=request.code,
                    language=request.language,
                    analysis_type=request.analysis_type
                ):
                    # Format as SSE
                    yield f"data: {{'type': 'token', 'content': '{token.replace(chr(10), '\\n').replace(chr(39), chr(92) + chr(39))}'}}\n\n"
                    await asyncio.sleep(0.01)

            # Send completion event
            yield f"data: {{'type': 'done', 'message': 'Analysis complete'}}\n\n"

        except Exception as e:
            yield f"data: {{'type': 'error', 'message': '{str(e)}'}}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


@router.post("/analyze", response_model=CodeAnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest):
    """
    Synchronous code analysis (non-streaming)

    Returns:
        CodeAnalysisResponse: Complete analysis results
    """

    if not request.code or len(request.code.strip()) == 0:
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    try:
        result = bedrock_service.analyze_code_sync(
            code=request.code,
            language=request.language,
            analysis_type=request.analysis_type
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return CodeAnalysisResponse(
            analysis=result,
            score=result.get("score")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check for review service"""
    return {"status": "healthy", "service": "code-review"}
