import json
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.models import (
    InterviewSession, EvaluationReport, EvidenceRecord, Competency, Job
)
from backend.models.enums import EvidenceStatus
from backend.engine.evidence_engine import EvidenceSufficiencyEngine
from backend.engine.resume_defender import ResumeDefender

class ProofCarryingDecisionEngine:
    """
    Proof-Carrying Decision Engine:
    Constructs transparent, auditable evaluation reports linking requirements,
    evidence citations, rubric weights, and overall recommendations.
    """

    @classmethod
    async def generate_evaluation_report(
        cls, session_id: str, db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Executes evidence sufficiency evaluation and produces an immutable evaluation report.
        """
        # 1. Run Evidence Sufficiency Engine
        evidence_results = await EvidenceSufficiencyEngine.evaluate_session_evidence(session_id, db)

        # 2. Fetch Session & Resume Claims
        sess_res = await db.execute(
            select(InterviewSession).where(InterviewSession.id == session_id)
        )
        session = sess_res.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        # Extract & verify resume claims
        resume_claims = ResumeDefender.extract_claims(session.resume_text)

        # 3. Calculate Weighted Competency Scores
        total_weight = 0.0
        weighted_sum = 0.0
        competency_scores = {}
        supported_count = 0

        for item in evidence_results:
            weight = item.get("weight", 1.0)
            conf = item.get("confidence_score", 0.0)
            score_out_of_100 = round(conf * 100, 1)

            competency_scores[item["competency_name"]] = {
                "score": score_out_of_100,
                "weight": weight,
                "confidence": conf,
                "status": item["status"],
                "evidence_quote": item["evidence_quote"],
                "turn_index": item.get("turn_index")
            }

            weighted_sum += (score_out_of_100 * weight)
            total_weight += weight

            if item["status"] == EvidenceStatus.SUPPORTED.value:
                supported_count += 1

        total_competencies = len(evidence_results)
        overall_score = round(weighted_sum / total_weight, 1) if total_weight > 0 else 0.0
        sufficiency_ratio = round(supported_count / total_competencies, 2) if total_competencies > 0 else 0.0

        # 4. Generate Proof-Carrying Narrative
        recommendation_tier = (
            "STRONG HIRE — High competency evidence coverage with verified technical depth."
            if overall_score >= 80 and sufficiency_ratio >= 0.70
            else "HIRE WITH RESERVATIONS — Demonstrated competency in core domains with minor evidence gaps."
            if overall_score >= 65
            else "INSUFFICIENT EVIDENCE — Key competency rubrics were not sufficiently established during interview."
        )

        narrative = (
            f"Candidate {session.candidate_name} achieved an overall evidence score of {overall_score}/100 "
            f"across {total_competencies} evaluated competencies ({supported_count}/{total_competencies} fully supported). "
            f"Recommendation: {recommendation_tier}"
        )

        # 4b. Compute Proctoring Integrity Score (Phase 4)
        from backend.models.models import ProctoringEvent
        from backend.engine.proctoring import ProctoringEngine
        proc_events_res = await db.execute(
            select(ProctoringEvent).where(ProctoringEvent.session_id == session_id)
        )
        proc_events = proc_events_res.scalars().all()
        proc_summary = ProctoringEngine.calculate_session_integrity_score([
            {"anomaly_type": e.anomaly_type.value} for e in proc_events
        ])
        proctoring_score = proc_summary["integrity_score"]

        if proc_summary["is_flagged"] and proc_summary["total_anomalies"] > 0:
            narrative += f" [Proctoring Audit: Integrity score {int(proctoring_score * 100)}% with {proc_summary['total_anomalies']} visual/environmental anomalies recorded.]"

        # 5. Persist or Update EvaluationReport
        report_res = await db.execute(
            select(EvaluationReport).where(EvaluationReport.session_id == session_id)
        )
        report = report_res.scalar_one_or_none()

        if not report:
            report = EvaluationReport(
                session_id=session_id,
                overall_score=overall_score,
                competency_scores_json=competency_scores,
                evidence_sufficiency_ratio=sufficiency_ratio,
                proctoring_integrity_score=proctoring_score,
                recommendation_narrative=narrative,
                human_override_status="FLAGGED" if proc_summary["is_flagged"] else "PENDING_REVIEW",
                is_finalized=False
            )
            db.add(report)
        else:
            report.overall_score = overall_score
            report.competency_scores_json = competency_scores
            report.evidence_sufficiency_ratio = sufficiency_ratio
            report.proctoring_integrity_score = proctoring_score
            report.recommendation_narrative = narrative

        await db.commit()
        await db.refresh(report)

        return {
            "report_id": report.id,
            "session_id": session.id,
            "candidate_name": session.candidate_name,
            "overall_score": report.overall_score,
            "evidence_sufficiency_ratio": report.evidence_sufficiency_ratio,
            "proctoring_integrity_score": report.proctoring_integrity_score,
            "proctoring_summary": proc_summary,
            "competency_breakdown": report.competency_scores_json,
            "resume_claims": resume_claims,
            "recommendation_narrative": report.recommendation_narrative,
            "human_override_status": report.human_override_status,
            "is_finalized": report.is_finalized,
            "created_at": report.created_at.isoformat()
        }
