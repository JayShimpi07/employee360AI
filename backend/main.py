from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.core.database import init_db
from backend.api.api_router import api_router
from backend.api.ws.interview_socket import ws_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    print(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode...")
    await init_db()
    print("Database tables initialized successfully.")
    yield
    # Shutdown
    print(f"Shutting down {settings.APP_NAME}...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="An Evidence-Driven Autonomous AI Framework for Intelligent Employee Lifecycle Management",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API routes & WebSocket routes
app.include_router(api_router)
app.include_router(ws_router)

@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "api_v1": "/api/v1"
    }
