from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import get_db
from backend.core.security import (
    verify_password, get_password_hash, create_access_token,
    verify_candidate_token
)
from backend.models.models import User, InterviewSession, Job
from backend.models.enums import UserRole
from backend.schemas.auth_schema import (
    LoginRequest, TokenResponse, UserCreate, UserResponse,
    CandidateTokenVerifyRequest, CandidateTokenVerifyResponse
)
from backend.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value, "email": user.email}
    )
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        user_id=user.id,
        full_name=user.full_name
    )

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active
    )

@router.post("/candidate/verify-token", response_model=CandidateTokenVerifyResponse)
async def verify_candidate(
    req: CandidateTokenVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    session_id = verify_candidate_token(req.token, req.candidate_email)
    if not session_id:
        return CandidateTokenVerifyResponse(valid=False)

    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session or session.candidate_email != req.candidate_email:
        return CandidateTokenVerifyResponse(valid=False)

    # Fetch Job title
    job_res = await db.execute(select(Job).where(Job.id == session.job_id))
    job = job_res.scalar_one_or_none()
    job_title = job.title if job else "Technical Interview"

    # Issue a temporary candidate interview session token
    candidate_access_token = create_access_token(
        data={"sub": session.id, "role": "CANDIDATE", "email": session.candidate_email}
    )

    return CandidateTokenVerifyResponse(
        valid=True,
        session_id=session.id,
        candidate_name=session.candidate_name,
        job_title=job_title,
        access_token=candidate_access_token
    )
