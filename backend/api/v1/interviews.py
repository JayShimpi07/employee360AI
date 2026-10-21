from typing import List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.core.database import get_db
from backend.models.models import InterviewSession, TranscriptTurn, Job
from backend.models.enums import SessionStatus
from backend.engine.orchestrator import TurnOrchestrator
from backend.engine.speech import SpeechService

router = APIRouter(prefix="/interviews", tags=["Candidate Interviews"])

@router.get("/{session_id}")
async def get_interview_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id)
        .options(
            selectinload(InterviewSession.job),
            selectinload(InterviewSession.turns)
        )
    )
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    return {
        "id": session.id,
        "candidate_name": session.candidate_name,
        "candidate_email": session.candidate_email,
        "job_id": session.job_id,
        "job_title": session.job.title,
        "department": session.job.department,
        "job_description": session.job.description,
        "status": session.status.value,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "turn_count": len(session.turns)
    }

@router.post("/{session_id}/start")
async def start_interview_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if not session.started_at:
        session.started_at = datetime.now(timezone.utc)
    if session.status == SessionStatus.PENDING:
        session.status = SessionStatus.IN_PROGRESS
    await db.commit()

    # Get initial greeting
    greeting_text, turn_index = await TurnOrchestrator.get_initial_greeting(session_id, db)
    audio_base64 = await SpeechService.synthesize_speech_base64(greeting_text)

    return {
        "session_id": session.id,
        "status": session.status.value,
        "greeting": greeting_text,
        "turn_index": turn_index,
        "audio_base64": audio_base64
    }

@router.get("/{session_id}/transcript")
async def get_interview_transcript(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(TranscriptTurn)
        .where(TranscriptTurn.session_id == session_id)
        .order_by(TranscriptTurn.turn_index.asc())
    )
    turns = res.scalars().all()
    return [
        {
            "id": t.id,
            "turn_index": t.turn_index,
            "speaker": t.speaker.value,
            "text": t.text,
            "latency_ms": t.latency_ms,
            "created_at": t.created_at.isoformat()
        }
        for t in turns
    ]

@router.post("/{session_id}/complete")
async def complete_interview_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    session.status = SessionStatus.COMPLETED
    session.completed_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "session_id": session.id,
        "status": session.status.value,
        "completed_at": session.completed_at.isoformat()
    }

@router.delete("/{session_id}")
async def delete_interview_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a specific interview session and all associated data.
    """
    from backend.models.models import ProctoringEvent, TranscriptTurn, EvaluationReport
    from sqlalchemy import delete

    res = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    await db.execute(delete(EvaluationReport).where(EvaluationReport.session_id == session_id))
    await db.execute(delete(TranscriptTurn).where(TranscriptTurn.session_id == session_id))
    await db.execute(delete(ProctoringEvent).where(ProctoringEvent.session_id == session_id))
    await db.execute(delete(InterviewSession).where(InterviewSession.id == session_id))
    await db.commit()

    return {"success": True, "message": "Interview session deleted successfully."}

