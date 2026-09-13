"""
CodeStream AI - FastAPI Backend
Real-time code review platform with distributed architecture
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import socketio

# Initialize FastAPI app
app = FastAPI(
    title="CodeStream AI API",
    description="Distributed real-time code review platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO server for WebSocket
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True,
)

# Wrap with ASGI app
socket_app = socketio.ASGIApp(sio, app)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "CodeStream AI API",
        "version": "1.0.0",
        "features": [
            "Real-time WebSocket collaboration",
            "Streaming AI code review",
            "Distributed task processing",
            "Vector code search",
            "Type-safe tRPC APIs",
        ]
    }


@app.get("/health")
async def health_check():
    """Health check for load balancers"""
    return JSONResponse(
        status_code=200,
        content={"status": "healthy", "checks": {"api": "ok"}}
    )


# WebSocket event handlers
@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    print(f"Client connected: {sid}")
    await sio.emit("connection_established", {"sid": sid}, room=sid)


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    print(f"Client disconnected: {sid}")


@sio.event
async def join_room(sid, data):
    """Join a code review room"""
    room = data.get("room")
    if room:
        sio.enter_room(sid, room)
        await sio.emit(
            "user_joined",
            {"sid": sid, "room": room},
            room=room,
            skip_sid=sid
        )


@sio.event
async def code_change(sid, data):
    """Broadcast code changes to room"""
    room = data.get("room")
    if room:
        await sio.emit(
            "code_update",
            {"sid": sid, "changes": data.get("changes")},
            room=room,
            skip_sid=sid
        )


@sio.event
async def cursor_move(sid, data):
    """Broadcast cursor position to room"""
    room = data.get("room")
    if room:
        await sio.emit(
            "cursor_update",
            {"sid": sid, "position": data.get("position")},
            room=room,
            skip_sid=sid
        )


# Database initialization
from app.database import init_db

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()
    print("✅ Database initialized")


# Mount routes
from app.routes import review, auth
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(review.router, prefix="/api/review", tags=["review"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
