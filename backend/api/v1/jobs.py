from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.core.database import get_db
from backend.core.config import settings
from backend.core.security import generate_candidate_token
from backend.models.models import Job, Competency, InterviewSession, WorkflowVersion, User
from backend.models.enums import UserRole, SessionStatus
from backend.schemas.job_schema import (
    JobCreate, JobResponse, CompetencyResponse,
    InviteCandidateRequest, InviteCandidateResponse
)
from backend.api.deps import require_roles, get_current_user

router = APIRouter(prefix="/jobs", tags=["Jobs, Competencies & Invitations"])

@router.get("/", response_model=List[JobResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job).options(selectinload(Job.competencies))
    )
    jobs = result.scalars().all()
    return [
        JobResponse(
            id=j.id,
            title=j.title,
            department=j.department,
            description=j.description,
            workflow_version_id=j.workflow_version_id,
            created_by=j.created_by,
            competencies=[
                CompetencyResponse(
                    id=c.id,
                    job_id=c.job_id,
                    name=c.name,
                    description=c.description,
                    rubric_json=c.rubric_json,
                    weight=c.weight
                )
                for c in j.competencies
            ]
        )
        for j in jobs
    ]

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_in: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HR_ADMIN]))
):
    # Verify workflow version exists
    ver_res = await db.execute(
        select(WorkflowVersion).where(WorkflowVersion.id == job_in.workflow_version_id)
    )
    if not ver_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid workflow_version_id.")

    job = Job(
        title=job_in.title,
        department=job_in.department,
        description=job_in.description,
        workflow_version_id=job_in.workflow_version_id,
        created_by=current_user.id
    )
    db.add(job)
    await db.flush()

    for comp in job_in.competencies:
        competency = Competency(
            job_id=job.id,
            name=comp.name,
            description=comp.description,
            rubric_json=comp.rubric_json,
            weight=comp.weight
        )
        db.add(competency)

    await db.commit()
    await db.refresh(job)
    
    # Reload with competencies
    res = await db.execute(
        select(Job).where(Job.id == job.id).options(selectinload(Job.competencies))
    )
    loaded_job = res.scalar_one()

    return JobResponse(
        id=loaded_job.id,
        title=loaded_job.title,
        department=loaded_job.department,
        description=loaded_job.description,
        workflow_version_id=loaded_job.workflow_version_id,
        created_by=loaded_job.created_by,
        competencies=[
            CompetencyResponse(
                id=c.id,
                job_id=c.job_id,
                name=c.name,
                description=c.description,
                rubric_json=c.rubric_json,
                weight=c.weight
            )
            for c in loaded_job.competencies
        ]
    )

@router.post("/invite", response_model=InviteCandidateResponse)
async def invite_candidate(
    invite_in: InviteCandidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HR_ADMIN]))
):
    job_res = await db.execute(select(Job).where(Job.id == invite_in.job_id))
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # Create InterviewSession
    session = InterviewSession(
        job_id=job.id,
        workflow_version_id=job.workflow_version_id,
        candidate_name=invite_in.candidate_name,
        candidate_email=invite_in.candidate_email,
        resume_text=invite_in.resume_text,
        status=SessionStatus.PENDING,
        invite_token="PENDING" # updated right after ID generation
    )
    db.add(session)
    await db.flush()

    # Generate cryptographic HMAC invitation token
    token = generate_candidate_token(session.id, invite_in.candidate_email)
    session.invite_token = token
    await db.commit()
    await db.refresh(session)

    invite_url = f"{settings.FRONTEND_URL}/interview?token={token}&email={invite_in.candidate_email}"

    return InviteCandidateResponse(
        session_id=session.id,
        candidate_name=session.candidate_name,
        candidate_email=session.candidate_email,
        invite_url=invite_url,
        invite_token=token
    )
