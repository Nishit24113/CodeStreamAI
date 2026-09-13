"""
Celery application configuration for distributed task processing
"""

from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Celery configuration
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery app
celery_app = Celery(
    "codestream",
    broker=RABBITMQ_URL,
    backend=REDIS_URL,
    include=[
        "app.tasks.analysis_tasks",
        "app.tasks.security_tasks",
        "app.tasks.indexing_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Result backend settings
    result_expires=3600,  # 1 hour
    result_backend_transport_options={
        "master_name": "mymaster",
        "socket_keepalive": True,
    },

    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=True,

    # Task execution settings
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=300,  # 5 minutes hard limit
    task_soft_time_limit=240,  # 4 minutes soft limit

    # Retry settings
    task_autoretry_for=(Exception,),
    task_retry_kwargs={"max_retries": 3},
    task_retry_backoff=True,
    task_retry_backoff_max=600,
    task_retry_jitter=True,

    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-old-results": {
            "task": "app.tasks.indexing_tasks.cleanup_old_results",
            "schedule": 3600.0,  # Every hour
        },
        "health-check-workers": {
            "task": "app.tasks.analysis_tasks.health_check",
            "schedule": 300.0,  # Every 5 minutes
        },
    },
)

# Task routes
celery_app.conf.task_routes = {
    "app.tasks.analysis_tasks.*": {"queue": "analysis"},
    "app.tasks.security_tasks.*": {"queue": "security"},
    "app.tasks.indexing_tasks.*": {"queue": "indexing"},
}

if __name__ == "__main__":
    celery_app.start()
