import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.core.database import get_db
from backend.core.security import (
    verify_password, get_password_hash, create_access_token,
    verify_candidate_token
)
from backend.models.models import User, InterviewSession, Job
from backend.models.enums import UserRole, SessionStatus
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

@router.get("/candidate/recent-invites")
async def get_recent_candidate_invites(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns recent pending candidate interview invites to enable 1-click test entry.
    """
    res = await db.execute(
        select(InterviewSession)
        .options(selectinload(InterviewSession.job))
        .where(InterviewSession.status.in_([SessionStatus.PENDING, SessionStatus.IN_PROGRESS]))
        .order_by(InterviewSession.created_at.desc())
        .limit(6)
    )
    sessions = res.scalars().all()
    return [
        {
            "session_id": s.id,
            "candidate_name": s.candidate_name,
            "candidate_email": s.candidate_email,
            "job_title": s.job.title if s.job else "Technical Interview",
            "invite_token": s.invite_token,
            "status": s.status.value,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in sessions
    ]

@router.post("/candidate/verify-token", response_model=CandidateTokenVerifyResponse)
async def verify_candidate(
    req: CandidateTokenVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    clean_email = (req.candidate_email or "").strip().lower()
    clean_tok = (req.token or "").strip()

    # Intelligent URL / query-string parsing in case candidate pasted full link or fragment
    if "token=" in clean_tok:
        try:
            parsed = urllib.parse.urlparse(clean_tok if clean_tok.startswith("http") else f"http://dummy/?{clean_tok.lstrip('?')}")
            qs = urllib.parse.parse_qs(parsed.query or parsed.path)
            if "token" in qs and qs["token"]:
                clean_tok = qs["token"][0]
            if "email" in qs and qs["email"] and not clean_email:
                clean_email = qs["email"][0].strip().lower()
        except Exception:
            pass

    if "&email=" in clean_tok:
        parts = clean_tok.split("&email=")
        clean_tok = parts[0]
        if len(parts) > 1 and not clean_email:
            clean_email = parts[1].split("&")[0].strip().lower()

    if "&" in clean_tok:
        clean_tok = clean_tok.split("&")[0]

    clean_tok = clean_tok.strip()

    # 1. First attempt: Standard HMAC signature verification
    session_id = verify_candidate_token(clean_tok, clean_email) if clean_email else None
    session = None

    if session_id:
        result = await db.execute(
            select(InterviewSession).where(InterviewSession.id == session_id)
        )
        session = result.scalar_one_or_none()

    # 2. Database exact match fallback (by email and clean_tok)
    if not session and clean_email:
        res = await db.execute(
            select(InterviewSession)
            .where(InterviewSession.candidate_email.ilike(clean_email))
            .where(InterviewSession.invite_token == clean_tok)
        )
        session = res.scalar_one_or_none()

    # 3. Database match by UUID directly (if user entered session UUID as token)
    if not session and len(clean_tok) == 36 and "-" in clean_tok:
        res = await db.execute(
            select(InterviewSession).where(InterviewSession.id == clean_tok)
        )
        session = res.scalar_one_or_none()

    # 4. Partial substring match: handles mouse selection truncation (e.g. last 25-40 chars of token)
    if not session and len(clean_tok) >= 8:
        if clean_email:
            res = await db.execute(
                select(InterviewSession)
                .where(InterviewSession.candidate_email.ilike(clean_email))
                .where(InterviewSession.invite_token.contains(clean_tok))
            )
            session = res.scalar_one_or_none()
        
        # Check if any session has this token fragment regardless of email
        if not session:
            res = await db.execute(
                select(InterviewSession)
                .where(InterviewSession.invite_token.contains(clean_tok))
            )
            session = res.scalar_one_or_none()

    # 5. Candidate email fallback: if email has an active pending session
    if not session and clean_email:
        res = await db.execute(
            select(InterviewSession)
            .where(InterviewSession.candidate_email.ilike(clean_email))
            .order_by(InterviewSession.created_at.desc())
        )
        sessions_for_email = res.scalars().all()
        for cand_session in sessions_for_email:
            if clean_tok and (clean_tok in cand_session.invite_token or cand_session.invite_token in clean_tok):
                session = cand_session
                break
        if not session and len(sessions_for_email) == 1 and sessions_for_email[0].status == SessionStatus.PENDING:
            session = sessions_for_email[0]

    if not session:
        return CandidateTokenVerifyResponse(
            valid=False,
            error_message="Invalid or expired interview token. Please ensure your token and email match the invitation."
        )

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

