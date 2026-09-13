"""
Vector search routes for semantic code search
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.services.embeddings_service import EmbeddingsService
from app.services.pinecone_service import PineconeService
import uuid

router = APIRouter()

# Initialize services
embeddings_service = EmbeddingsService()
pinecone_service = PineconeService()


class CodeIndexRequest(BaseModel):
    """Request to index code for vector search"""
    code: str = Field(..., min_length=10)
    language: str = Field(default="python")
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class CodeSearchRequest(BaseModel):
    """Request to search for similar code"""
    query_code: Optional[str] = None
    query_text: Optional[str] = None
    language: Optional[str] = None
    top_k: int = Field(default=10, ge=1, le=50)
    min_similarity: float = Field(default=0.7, ge=0.0, le=1.0)


class SearchResult(BaseModel):
    """Search result item"""
    id: str
    code: str
    language: str
    similarity_score: float
    description: Optional[str]
    tags: Optional[List[str]]
    user_id: int


@router.post("/index")
async def index_code(
    request: CodeIndexRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Index code snippet for semantic search

    Args:
        request: Code indexing request
        current_user: Authenticated user
        db: Database session

    Returns:
        Indexed code ID and confirmation
    """
    try:
        # Generate embedding
        embedding = embeddings_service.generate_embedding(
            request.code,
            request.language
        )

        # Extract code features
        features = embeddings_service.extract_code_features(
            request.code,
            request.language
        )

        # Generate unique ID
        code_id = str(uuid.uuid4())

        # Prepare metadata
        metadata = {
            "code": request.code[:1000],  # Store first 1000 chars in metadata
            "language": request.language,
            "user_id": current_user.id,
            "username": current_user.username,
            "description": request.description or "",
            "tags": ",".join(request.tags) if request.tags else "",
            "lines_of_code": features["lines_of_code"],
            "has_functions": features["has_functions"],
            "has_classes": features["has_classes"],
        }

        # Upsert to Pinecone
        success = pinecone_service.upsert_code(
            code_id=code_id,
            embedding=embedding,
            metadata=metadata
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to index code"
            )

        return {
            "code_id": code_id,
            "message": "Code indexed successfully",
            "features": features
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error indexing code: {str(e)}"
        )


@router.post("/search", response_model=List[SearchResult])
async def search_code(
    request: CodeSearchRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Search for similar code using semantic search

    Args:
        request: Search request (code or text query)
        current_user: Authenticated user

    Returns:
        List of similar code snippets with similarity scores
    """
    if not request.query_code and not request.query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either query_code or query_text must be provided"
        )

    try:
        # Generate query embedding
        if request.query_code:
            query_text = request.query_code
            language = request.language or "python"
        else:
            query_text = request.query_text
            language = request.language or "python"

        # Generate embedding
        query_embedding = embeddings_service.generate_embedding(
            query_text,
            language
        )

        # Build filter
        filter_dict = {}
        if request.language:
            filter_dict["language"] = request.language

        # Search Pinecone
        results = pinecone_service.search_similar_code(
            query_embedding=query_embedding,
            top_k=request.top_k,
            filter_dict=filter_dict if filter_dict else None
        )

        # Filter by minimum similarity
        filtered_results = [
            SearchResult(
                id=result["id"],
                code=result["metadata"].get("code", ""),
                language=result["metadata"].get("language", "python"),
                similarity_score=result["score"],
                description=result["metadata"].get("description"),
                tags=result["metadata"].get("tags", "").split(",") if result["metadata"].get("tags") else None,
                user_id=result["metadata"].get("user_id", 0)
            )
            for result in results
            if result["score"] >= request.min_similarity
        ]

        return filtered_results

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching code: {str(e)}"
        )


@router.get("/stats")
async def get_search_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get vector search statistics

    Args:
        current_user: Authenticated user

    Returns:
        Index statistics
    """
    try:
        stats = pinecone_service.get_index_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting stats: {str(e)}"
        )


@router.delete("/code/{code_id}")
async def delete_indexed_code(
    code_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete indexed code by ID

    Args:
        code_id: Unique code identifier
        current_user: Authenticated user

    Returns:
        Success message
    """
    try:
        success = pinecone_service.delete_code(code_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Code not found or already deleted"
            )

        return {"message": "Code deleted successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting code: {str(e)}"
        )
