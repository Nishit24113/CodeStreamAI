#!/bin/bash
# Start Celery worker for CodeStream AI

echo "Starting Celery worker..."

# Start worker with 5 concurrent processes
celery -A app.celery_app worker \
    --loglevel=info \
    --concurrency=5 \
    --queues=analysis,security,indexing \
    --hostname=worker@%h \
    --max-tasks-per-child=1000

# For production, use:
# celery -A app.celery_app worker -l info -c 10 --autoscale=10,3
