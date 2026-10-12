from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.core.database import get_db
from backend.core.config import settings
from backend.models.models import Job, InterviewSession, User, WorkflowDefinition

router = APIRouter(prefix="/system", tags=["System & Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "database": "sqlite_async" if "sqlite" in settings.DATABASE_URL else "postgresql_async"
    }

@router.get("/stats")
async def system_stats(db: AsyncSession = Depends(get_db)):
    user_count = await db.scalar(select(func.count(User.id)))
    job_count = await db.scalar(select(func.count(Job.id)))
    session_count = await db.scalar(select(func.count(InterviewSession.id)))
    workflow_count = await db.scalar(select(func.count(WorkflowDefinition.id)))

    return {
        "total_users": user_count or 0,
        "total_jobs": job_count or 0,
        "total_interviews": session_count or 0,
        "total_workflows": workflow_count or 0
    }
