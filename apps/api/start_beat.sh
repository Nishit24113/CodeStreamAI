#!/bin/bash
# Start Celery beat scheduler for periodic tasks

echo "Starting Celery beat scheduler..."

celery -A app.celery_app beat \
    --loglevel=info \
    --pidfile=/tmp/celerybeat.pid \
    --schedule=/tmp/celerybeat-schedule
