import time
import json
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.models.models import (
    InterviewSession, TranscriptTurn, Job, WorkflowVersion, Competency
)
from backend.models.enums import TurnSpeaker, SessionStatus
from backend.core.config import settings

class TurnOrchestrator:
    """
    Contextual Turn Orchestrator:
    Manages interview state transitions according to the compiled workflow configuration,
    maintains conversation history, generates adaptive questions, and logs turns.
    """

    @classmethod
    async def get_initial_greeting(
        cls, session_id: str, db: AsyncSession
    ) -> Tuple[str, int]:
        """
        Retrieves or generates the initial greeting for a newly started interview.
        """
        res = await db.execute(
            select(InterviewSession)
            .where(InterviewSession.id == session_id)
            .options(
                selectinload(InterviewSession.job),
                selectinload(InterviewSession.workflow_version)
            )
        )
        session = res.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        config = session.workflow_version.config_json
        stages = config.get("stages", [])
        persona = config.get("persona", {})
        interviewer_name = persona.get("name", "Alex")

        # Find intro stage
        intro_script = None
        for stage in stages:
            if stage.get("type") == "GREETING" and stage.get("script"):
                intro_script = stage["script"]
                break

        if not intro_script:
            intro_script = (
                f"Hello {session.candidate_name}! I am {interviewer_name}, your AI interviewer for the "
                f"{session.job.title} role. Welcome! To get started, please confirm you can hear me well and briefly introduce yourself."
            )

        # Check if greeting already logged
        turns_res = await db.execute(
            select(TranscriptTurn)
            .where(TranscriptTurn.session_id == session_id)
            .order_by(TranscriptTurn.turn_index.asc())
        )
        existing_turns = turns_res.scalars().all()
        if existing_turns:
            return existing_turns[0].text, existing_turns[0].turn_index

        # Record initial AI greeting turn
        turn = TranscriptTurn(
            session_id=session.id,
            turn_index=1,
            speaker=TurnSpeaker.AI,
            text=intro_script,
            latency_ms=120.0
        )
        db.add(turn)
        await db.commit()
        await db.refresh(turn)

        return turn.text, turn.turn_index

    @classmethod
    async def process_candidate_turn(
        cls, session_id: str, candidate_text: str, latency_ms: float, db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Processes a candidate utterance, updates dialogue history, generates
        the next adaptive question, and updates session lifecycle.
        """
        start_time = time.time()

        res = await db.execute(
            select(InterviewSession)
            .where(InterviewSession.id == session_id)
            .options(
                selectinload(InterviewSession.job).selectinload(Job.competencies),
                selectinload(InterviewSession.workflow_version),
                selectinload(InterviewSession.turns)
            )
        )
        session = res.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        # Ensure session is IN_PROGRESS
        if session.status == SessionStatus.PENDING:
            session.status = SessionStatus.IN_PROGRESS
            await db.flush()

        current_turns = sorted(session.turns, key=lambda t: t.turn_index)
        next_turn_index = len(current_turns) + 1

        # 1. Log Candidate Turn
        cand_turn = TranscriptTurn(
            session_id=session.id,
            turn_index=next_turn_index,
            speaker=TurnSpeaker.CANDIDATE,
            text=candidate_text,
            latency_ms=latency_ms
        )
        db.add(cand_turn)
        await db.flush()

        # 2. Determine Current Workflow Stage & Target Question
        config = session.workflow_version.config_json
        stages = config.get("stages", [])
        competencies = session.job.competencies
        persona = config.get("persona", {})

        ai_response_text, is_final_stage = cls._generate_adaptive_response(
            candidate_text=candidate_text,
            turn_number=next_turn_index,
            candidate_name=session.candidate_name,
            job_title=session.job.title,
            stages=stages,
            competencies=competencies,
            persona=persona,
            resume_text=session.resume_text
        )

        # 3. Log AI Turn
        ai_turn_index = next_turn_index + 1
        processing_latency_ms = round((time.time() - start_time) * 1000, 2)

        ai_turn = TranscriptTurn(
            session_id=session.id,
            turn_index=ai_turn_index,
            speaker=TurnSpeaker.AI,
            text=ai_response_text,
            latency_ms=processing_latency_ms
        )
        db.add(ai_turn)

        if is_final_stage:
            session.status = SessionStatus.COMPLETED

        await db.commit()
        await db.refresh(ai_turn)

        return {
            "session_id": session.id,
            "turn_index": ai_turn_index,
            "speaker": "AI",
            "text": ai_response_text,
            "latency_ms": processing_latency_ms,
            "is_completed": is_final_stage,
            "status": session.status.value
        }

    @classmethod
    def _generate_adaptive_response(
        cls,
        candidate_text: str,
        turn_number: int,
        candidate_name: str,
        job_title: str,
        stages: List[Dict[str, Any]],
        competencies: List[Competency],
        persona: Dict[str, Any],
        resume_text: Optional[str]
    ) -> Tuple[str, bool]:
        """
        Determines the next adaptive question based on conversation progression.
        """
        # Turn progression mapping:
        # Turn 2 (Candidate's first reply) -> Transition to Resume Verification
        # Turn 4 (Candidate's 2nd reply) -> Transition to Primary Competency
        # Turn 6 (Candidate's 3rd reply) -> Transition to Secondary Competency
        # Turn 8 (Candidate's 4th reply) -> Transition to Closing stage
        # Turn 10+ -> Terminal Completed state

        if turn_number <= 2:
            # Stage: Resume & Experience Verification
            if resume_text:
                return (
                    f"Thank you, {candidate_name}. Based on your background, could you walk me through "
                    f"a key technical project from your experience that best demonstrates your qualifications for {job_title}?",
                    False
                )
            else:
                return (
                    f"Thank you, {candidate_name}. To begin our technical discussion for the {job_title} role, "
                    f"can you describe the most complex technical system you have contributed to recently?",
                    False
                )

        elif turn_number <= 4:
            # Stage: Primary Competency Assessment
            comp = competencies[0] if competencies else None
            comp_name = comp.name if comp else "System Architecture & Scalability"
            return (
                f"That is very insightful. Focusing on {comp_name}, could you explain how you made "
                f"key architectural decisions or handled performance bottlenecks in that system?",
                False
            )

        elif turn_number <= 6:
            # Stage: Secondary Competency Assessment / Targeted Follow-up
            comp = competencies[1] if len(competencies) > 1 else (competencies[0] if competencies else None)
            comp_name = comp.name if comp else "Problem Solving & Reliability"
            return (
                f"Understood. Moving to {comp_name}: could you describe a specific production incident, "
                f"challenging bug, or design conflict you had to resolve, and what steps you took?",
                False
            )

        elif turn_number <= 8:
            # Stage: Closing & Candidate Q&A
            return (
                f"Thank you for sharing those detailed examples, {candidate_name}. That wraps up our formal "
                f"technical evaluation questions for {job_title}. Do you have any questions about the role or team?",
                False
            )

        else:
            # Stage: Final Wrap Up
            return (
                f"Thank you for your time today, {candidate_name}. Your interview responses and evidence "
                f"have been recorded. Our HR team will review the evaluation report. Have a wonderful day!",
                True
            )
