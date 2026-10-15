import re
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.models.models import (
    InterviewSession, TranscriptTurn, Competency, EvidenceRecord
)
from backend.models.enums import EvidenceStatus, TurnSpeaker
from backend.engine.rag import GroundedRAGEngine

class EvidenceSufficiencyEngine:
    """
    Evidence Sufficiency Engine:
    Evaluates candidate spoken utterances against formal competency evaluation rubrics,
    extracts verifiable quote citations, and determines evidence confidence.
    """

    SUFFICIENCY_THRESHOLD = 0.70

    @classmethod
    async def evaluate_session_evidence(
        cls, session_id: str, db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """
        Analyzes all dialogue turns for a session and populates evidence_records table.
        """
        # Fetch Session, Turns, and Competencies
        sess_res = await db.execute(
            select(InterviewSession).where(InterviewSession.id == session_id)
        )
        session = sess_res.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        # Fetch candidate turns
        turns_res = await db.execute(
            select(TranscriptTurn)
            .where(TranscriptTurn.session_id == session_id)
            .where(TranscriptTurn.speaker == TurnSpeaker.CANDIDATE)
            .order_by(TranscriptTurn.turn_index.asc())
        )
        candidate_turns = turns_res.scalars().all()

        # Fetch Job Competencies
        comp_res = await db.execute(
            select(Competency).where(Competency.job_id == session.job_id)
        )
        competencies = comp_res.scalars().all()

        if not competencies:
            return []

        # Clear existing evidence records for clean re-evaluation
        await db.execute(
            delete(EvidenceRecord).where(EvidenceRecord.session_id == session_id)
        )

        results = []

        for comp in competencies:
            evidence_data = cls._match_competency_to_turns(comp, candidate_turns)

            # Persist EvidenceRecord
            record = EvidenceRecord(
                session_id=session_id,
                competency_id=comp.id,
                claim_statement=f"Competency evaluation for {comp.name}",
                evidence_quote=evidence_data["quote"],
                confidence_score=evidence_data["confidence"],
                status=evidence_data["status"]
            )
            db.add(record)
            results.append({
                "competency_id": comp.id,
                "competency_name": comp.name,
                "weight": comp.weight,
                "evidence_quote": evidence_data["quote"],
                "confidence_score": evidence_data["confidence"],
                "status": evidence_data["status"].value,
                "turn_index": evidence_data.get("turn_index")
            })

        await db.commit()
        return results

    @classmethod
    def _match_competency_to_turns(
        cls, competency: Competency, candidate_turns: List[TranscriptTurn]
    ) -> Dict[str, Any]:
        """
        Matches candidate utterances against competency rubrics and calculates sufficiency.
        """
        if not candidate_turns:
            return {
                "quote": "No candidate responses available to evaluate.",
                "confidence": 0.0,
                "status": EvidenceStatus.INSUFFICIENT,
                "turn_index": None
            }

        # Build rubric semantic text
        rubric_str = f"{competency.name}. {competency.description}. "
        if isinstance(competency.rubric_json, dict):
            rubric_str += " ".join(str(v) for v in competency.rubric_json.values())

        best_quote = ""
        highest_score = 0.0
        best_turn_index = None

        for turn in candidate_turns:
            turn_text = turn.text.strip()
            # 1. Cosine Semantic Similarity
            sim = GroundedRAGEngine.cosine_similarity(
                GroundedRAGEngine.generate_embedding(rubric_str),
                GroundedRAGEngine.generate_embedding(turn_text)
            )

            # 2. Key Term Co-occurrence
            comp_terms = set(re.findall(r'\b[a-z]{4,}\b', rubric_str.lower()))
            turn_terms = set(re.findall(r'\b[a-z]{4,}\b', turn_text.lower()))
            overlap_ratio = len(comp_terms.intersection(turn_terms)) / max(len(comp_terms), 1)

            # Blended Confidence
            blended_score = (sim * 0.6) + (overlap_ratio * 0.4)
            # Normalize to 0.0 - 1.0
            confidence = min(1.0, max(0.0, blended_score * 1.8))

            if confidence > highest_score:
                highest_score = confidence
                best_quote = turn_text
                best_turn_index = turn.turn_index

        highest_score = round(highest_score, 2)

        if highest_score >= cls.SUFFICIENCY_THRESHOLD:
            status = EvidenceStatus.SUPPORTED
        elif highest_score >= 0.40:
            status = EvidenceStatus.PARTIAL
        else:
            status = EvidenceStatus.INSUFFICIENT

        return {
            "quote": best_quote if best_quote else "Insufficient candidate evidence recorded.",
            "confidence": highest_score,
            "status": status,
            "turn_index": best_turn_index
        }
