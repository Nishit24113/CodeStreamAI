"""
Task management routes for monitoring and controlling Celery workers
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from celery.result import AsyncResult
from celery import group

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.celery_app import celery_app
from app.tasks import analysis_tasks, security_tasks, indexing_tasks

router = APIRouter()


class TaskSubmitRequest(BaseModel):
    """Request to submit a task"""
    task_type: str = Field(..., description="Type: analysis, security, indexing")
    code: str = Field(..., min_length=10)
    language: str = Field(default="python")
    checks: Optional[List[str]] = None


class TaskStatusResponse(BaseModel):
    """Task status response"""
    task_id: str
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None


class BatchTaskRequest(BaseModel):
    """Request for batch task processing"""
    snippets: List[Dict[str, str]]
    task_type: str = Field(..., description="Type: analysis, security")


@router.post("/submit", response_model=TaskStatusResponse)
async def submit_task(
    request: TaskSubmitRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Submit a code analysis task to the worker queue

    Args:
        request: Task submission request
        current_user: Authenticated user

    Returns:
        Task ID and initial status
    """
    try:
        # Select task based on type
        if request.task_type == "analysis":
            if request.language == "python":
                task = analysis_tasks.analyze_python.apply_async(
                    args=[request.code, request.checks or ["pylint", "flake8", "complexity"]]
                )
            elif request.language in ["javascript", "typescript"]:
                task = analysis_tasks.analyze_javascript.apply_async(
                    args=[request.code, request.checks or ["eslint"]]
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported language for analysis: {request.language}"
                )

        elif request.task_type == "security":
            if request.language == "python":
                task = security_tasks.scan_python_security.apply_async(args=[request.code])
            elif request.language in ["javascript", "typescript"]:
                task = security_tasks.scan_javascript_security.apply_async(args=[request.code])
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported language for security scan: {request.language}"
                )

        elif request.task_type == "indexing":
            task = indexing_tasks.index_code_async.apply_async(
                args=[request.code, request.language, {"user_id": current_user.id}]
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown task type: {request.task_type}"
            )

        return TaskStatusResponse(
            task_id=task.id,
            status="queued",
            result=None,
            error=None
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit task: {str(e)}"
        )


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get status of a running or completed task

    Args:
        task_id: Celery task ID
        current_user: Authenticated user

    Returns:
        Task status and result if completed
    """
    try:
        task_result = AsyncResult(task_id, app=celery_app)

        response = TaskStatusResponse(
            task_id=task_id,
            status=task_result.status.lower(),
            result=None,
            error=None
        )

        if task_result.successful():
            response.result = task_result.result
        elif task_result.failed():
            response.error = str(task_result.info)

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task status: {str(e)}"
        )


@router.post("/batch")
async def submit_batch_tasks(
    request: BatchTaskRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Submit batch of tasks for parallel processing

    Args:
        request: Batch task request
        current_user: Authenticated user

    Returns:
        List of submitted task IDs
    """
    try:
        if request.task_type == "analysis":
            result = analysis_tasks.batch_analyze.apply_async(
                args=[request.snippets]
            )
        elif request.task_type == "security":
            result = security_tasks.batch_security_scan.apply_async(
                args=[request.snippets]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid task type for batch operation"
            )

        return {
            "batch_task_id": result.id,
            "status": "queued",
            "total_snippets": len(request.snippets)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit batch: {str(e)}"
        )


@router.get("/workers")
async def get_worker_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about active Celery workers

    Args:
        current_user: Authenticated user

    Returns:
        Worker statistics
    """
    try:
        # Get worker stats
        inspect = celery_app.control.inspect()

        stats = {
            "active_workers": 0,
            "active_tasks": {},
            "registered_tasks": [],
            "queues": {}
        }

        # Active workers
        active = inspect.active()
        if active:
            stats["active_workers"] = len(active)
            stats["active_tasks"] = {
                worker: len(tasks) for worker, tasks in active.items()
            }

        # Registered tasks
        registered = inspect.registered()
        if registered:
            for worker, tasks in registered.items():
                stats["registered_tasks"].extend(tasks)
            stats["registered_tasks"] = list(set(stats["registered_tasks"]))

        # Queue lengths (requires RabbitMQ management)
        stats["queues"] = {
            "analysis": 0,
            "security": 0,
            "indexing": 0
        }

        return stats

    except Exception as e:
        return {
            "error": str(e),
            "message": "Failed to get worker stats. Make sure workers are running."
        }


@router.post("/cancel/{task_id}")
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a running task

    Args:
        task_id: Task ID to cancel
        current_user: Authenticated user

    Returns:
        Cancellation status
    """
    try:
        celery_app.control.revoke(task_id, terminate=True)

        return {
            "task_id": task_id,
            "status": "cancelled"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel task: {str(e)}"
        )
