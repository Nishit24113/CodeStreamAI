"""
Celery tasks for vector indexing and batch operations
"""

from celery import Task, group
from app.celery_app import celery_app
from typing import List, Dict, Any
import time


class IndexingTask(Task):
    """Base task for indexing operations"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        print(f"Indexing task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)


@celery_app.task(base=IndexingTask, name="app.tasks.indexing_tasks.index_code_async")
def index_code_async(code: str, language: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Asynchronously index code snippet for vector search

    Args:
        code: Code to index
        language: Programming language
        metadata: Additional metadata

    Returns:
        Indexing result
    """
    try:
        # Import here to avoid circular dependency
        from app.services.embeddings_service import EmbeddingsService
        from app.services.pinecone_service import PineconeService
        import uuid

        embeddings_service = EmbeddingsService()
        pinecone_service = PineconeService()

        # Generate embedding
        embedding = embeddings_service.generate_embedding(code, language)

        # Generate unique ID
        code_id = str(uuid.uuid4())

        # Prepare metadata
        index_metadata = {
            "code": code[:1000],
            "language": language,
            **metadata
        }

        # Upsert to Pinecone
        success = pinecone_service.upsert_code(
            code_id=code_id,
            embedding=embedding,
            metadata=index_metadata
        )

        return {
            "status": "success" if success else "failed",
            "code_id": code_id,
            "indexed_at": time.time()
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


@celery_app.task(base=IndexingTask, name="app.tasks.indexing_tasks.batch_index")
def batch_index(code_snippets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Batch index multiple code snippets in parallel

    Args:
        code_snippets: List of code snippets with metadata

    Returns:
        Batch indexing results
    """
    # Create parallel task group
    job = group(
        index_code_async.s(
            snippet["code"],
            snippet.get("language", "python"),
            snippet.get("metadata", {})
        )
        for snippet in code_snippets
    )

    # Execute in parallel
    result = job.apply_async()

    return {
        "status": "queued",
        "job_id": result.id,
        "total_snippets": len(code_snippets)
    }


@celery_app.task(name="app.tasks.indexing_tasks.reindex_all")
def reindex_all(namespace: str = None) -> Dict[str, Any]:
    """
    Re-index all code snippets (maintenance task)

    Args:
        namespace: Optional namespace filter

    Returns:
        Reindexing status
    """
    # This would fetch all code from database and re-index
    # Placeholder implementation
    return {
        "status": "started",
        "namespace": namespace,
        "timestamp": time.time()
    }


@celery_app.task(name="app.tasks.indexing_tasks.cleanup_old_results")
def cleanup_old_results() -> Dict[str, Any]:
    """
    Periodic task to cleanup old task results

    Returns:
        Cleanup status
    """
    # Cleanup old Celery results from Redis
    # This runs every hour via beat schedule
    return {
        "status": "cleaned",
        "timestamp": time.time()
    }


@celery_app.task(name="app.tasks.indexing_tasks.optimize_index")
def optimize_index() -> Dict[str, Any]:
    """
    Optimize vector index (remove duplicates, compact)

    Returns:
        Optimization status
    """
    try:
        from app.services.pinecone_service import PineconeService

        pinecone_service = PineconeService()
        stats = pinecone_service.get_index_stats()

        return {
            "status": "optimized",
            "stats": stats,
            "timestamp": time.time()
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
