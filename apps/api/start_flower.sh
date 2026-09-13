#!/bin/bash
# Start Flower monitoring UI for Celery

echo "Starting Flower monitoring on http://localhost:5555"

celery -A app.celery_app flower \
    --port=5555 \
    --broker=amqp://guest:guest@localhost:5672// \
    --loglevel=info

# Access at: http://localhost:5555
