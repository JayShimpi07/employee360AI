from fastapi import APIRouter
from backend.api.v1.auth import router as auth_router
from backend.api.v1.workflows import router as workflows_router
from backend.api.v1.jobs import router as jobs_router
from backend.api.v1.system import router as system_router
from backend.api.v1.interviews import router as interviews_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(system_router)
api_router.include_router(auth_router)
api_router.include_router(workflows_router)
api_router.include_router(jobs_router)
api_router.include_router(interviews_router)
