from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.core.database import get_db
from backend.models.models import EvaluationReport, InterviewSession, User
from backend.models.enums import UserRole
from backend.engine.decision_engine import ProofCarryingDecisionEngine
from backend.api.deps import require_roles, get_current_user

router = APIRouter(prefix="/evidence", tags=["Evidence & Decision Center"])

@router.post("/sessions/{session_id}/evaluate")
async def evaluate_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        report = await ProofCarryingDecisionEngine.generate_evaluation_report(session_id, db)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@router.get("/sessions/{session_id}/report")
async def get_session_report(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(EvaluationReport)
        .where(EvaluationReport.session_id == session_id)
        .options(selectinload(EvaluationReport.session).selectinload(InterviewSession.job))
    )
    report = res.scalar_one_or_none()
    if not report:
        # If report not generated yet, try generating it automatically
        try:
            return await ProofCarryingDecisionEngine.generate_evaluation_report(session_id, db)
        except Exception:
            raise HTTPException(status_code=404, detail="Evaluation report not found.")

    from backend.engine.resume_defender import ResumeDefender
    resume_claims = ResumeDefender.extract_claims(report.session.resume_text)

    return {
        "report_id": report.id,
        "session_id": report.session_id,
        "candidate_name": report.session.candidate_name,
        "job_title": report.session.job.title,
        "overall_score": report.overall_score,
        "evidence_sufficiency_ratio": report.evidence_sufficiency_ratio,
        "competency_breakdown": report.competency_scores_json,
        "resume_claims": resume_claims,
        "recommendation_narrative": report.recommendation_narrative,
        "human_override_status": report.human_override_status,
        "is_finalized": report.is_finalized,
        "created_at": report.created_at.isoformat()
    }

@router.get("/reports")
async def list_reports(
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(EvaluationReport)
        .options(selectinload(EvaluationReport.session).selectinload(InterviewSession.job))
        .order_by(EvaluationReport.created_at.desc())
    )
    reports = res.scalars().all()
    return [
        {
            "report_id": r.id,
            "session_id": r.session_id,
            "candidate_name": r.session.candidate_name,
            "candidate_email": r.session.candidate_email,
            "job_title": r.session.job.title,
            "overall_score": r.overall_score,
            "evidence_sufficiency_ratio": r.evidence_sufficiency_ratio,
            "human_override_status": r.human_override_status,
            "is_finalized": r.is_finalized,
            "created_at": r.created_at.isoformat()
        }
        for r in reports
    ]

@router.post("/reports/{report_id}/signoff")
async def reviewer_signoff(
    report_id: str,
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HR_ADMIN, UserRole.HR_REVIEWER]))
):
    status_choice = payload.get("status") # APPROVED, FLAGGED, REJECTED
    notes = payload.get("notes", "")

    res = await db.execute(select(EvaluationReport).where(EvaluationReport.id == report_id))
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Evaluation report not found.")

    report.human_override_status = status_choice
    report.is_finalized = True
    if notes:
        report.recommendation_narrative += f" [Reviewer Note by {current_user.full_name}: {notes}]"

    await db.commit()
    return {
        "report_id": report.id,
        "human_override_status": report.human_override_status,
        "is_finalized": report.is_finalized,
        "reviewer": current_user.full_name
    }
