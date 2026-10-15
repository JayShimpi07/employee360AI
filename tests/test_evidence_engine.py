import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.core.database import Base
from backend.models.models import (
    User, WorkflowDefinition, WorkflowVersion, Job, Competency,
    InterviewSession, TranscriptTurn
)
from backend.models.enums import UserRole, WorkflowCategory, SessionStatus, TurnSpeaker
from backend.engine.compiler import HRAgentCompiler
from backend.engine.rag import GroundedRAGEngine
from backend.engine.resume_defender import ResumeDefender
from backend.engine.evidence_engine import EvidenceSufficiencyEngine
from backend.engine.decision_engine import ProofCarryingDecisionEngine

def test_rag_chunking_and_embedding():
    doc_text = (
        "Zensar leaves policy states that full-time employees receive 24 days of annual paid time off.\n\n"
        "Medical insurance covers the employee and immediate dependents up to $50,000 annually.\n\n"
        "Remote work policy permits 2 days per week of flexible home office work."
    )
    chunks = GroundedRAGEngine.chunk_document(doc_text)
    assert len(chunks) == 3

    emb = GroundedRAGEngine.generate_embedding(chunks[0]["content"])
    assert len(emb) == GroundedRAGEngine.DIMENSION

    # Test cosine search
    results = GroundedRAGEngine.search_similar("How many days of paid time off do I get?", chunks, top_k=1, threshold=0.15)
    assert len(results) == 1
    assert "24 days" in results[0]["content"]
    assert results[0]["similarity"] > 0.20

def test_resume_defender_extraction():
    resume = (
        "Senior Software Engineer\n"
        "• Architected distributed microservices platform using FastAPI and PostgreSQL handling 50k RPS.\n"
        "• Designed automated CI/CD deployment pipelines on Kubernetes reducing deploy lag by 70%.\n"
        "• Led a cross-functional team of 6 engineers."
    )
    claims = ResumeDefender.extract_claims(resume)
    assert len(claims) >= 2
    assert "FastAPI" in claims[0]["statement"] or "Kubernetes" in claims[1]["statement"]

@pytest_asyncio.fixture
async def evidence_test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        admin = User(email="admin@test.com", hashed_password="pw", full_name="Admin", role=UserRole.HR_ADMIN)
        session.add(admin)
        await session.flush()

        wf_def = WorkflowDefinition(name="Hiring WF", category=WorkflowCategory.HIRING)
        session.add(wf_def)
        await session.flush()

        config = {
            "workflow_id": "wf_test", "name": "Test", "version": 1, "category": "HIRING",
            "persona": {"name": "Alex", "role": "HR", "tone": "pro", "instruction": "Test"},
            "stages": [{"stage_id": "s1", "type": "GREETING", "transitions": ["completed"]}]
        }
        c_dict, c_hash = HRAgentCompiler.compile(config)
        wf_ver = WorkflowVersion(workflow_id=wf_def.id, version_number=1, config_json=c_dict, compiled_hash=c_hash, is_active=True)
        session.add(wf_ver)
        await session.flush()

        job = Job(title="Backend Lead", department="Eng", description="Build APIs", workflow_version_id=wf_ver.id, created_by=admin.id)
        session.add(job)
        await session.flush()

        comp1 = Competency(job_id=job.id, name="System Architecture", description="Distributed systems and database scaling", rubric_json={"rubric": "High scale"}, weight=1.5)
        comp2 = Competency(job_id=job.id, name="Problem Solving", description="Root cause debugging and latency reduction", rubric_json={"rubric": "Root cause"}, weight=1.0)
        session.add_all([comp1, comp2])
        await session.flush()

        interview_session = InterviewSession(
            job_id=job.id, workflow_version_id=wf_ver.id,
            candidate_name="Elena Vance", candidate_email="elena@test.com",
            resume_text="Architected distributed microservices platform using FastAPI and PostgreSQL handling 50k RPS.",
            status=SessionStatus.COMPLETED, invite_token="tok_1"
        )
        session.add(interview_session)
        await session.flush()

        # Add turns
        turn1 = TranscriptTurn(session_id=interview_session.id, turn_index=1, speaker=TurnSpeaker.AI, text="Tell me about your system architecture.")
        turn2 = TranscriptTurn(session_id=interview_session.id, turn_index=2, speaker=TurnSpeaker.CANDIDATE, text="I architected our distributed systems backend using FastAPI, Redis caching, and PostgreSQL horizontal read replicas which scaled to 50k RPS.")
        turn3 = TranscriptTurn(session_id=interview_session.id, turn_index=3, speaker=TurnSpeaker.CANDIDATE, text="When our production database locked up, I used root cause isolation and profiling to debug the slow queries, resolving the incident in 15 minutes.")
        session.add_all([turn1, turn2, turn3])
        await session.commit()

        yield session, interview_session.id

    await engine.dispose()

@pytest.mark.asyncio
async def test_evidence_and_decision_engine(evidence_test_db):
    session, session_id = evidence_test_db

    # Run decision engine
    report = await ProofCarryingDecisionEngine.generate_evaluation_report(session_id, session)

    assert report["candidate_name"] == "Elena Vance"
    assert report["overall_score"] >= 50.0
    assert len(report["competency_breakdown"]) == 2
    assert "System Architecture" in report["competency_breakdown"]
    # Check that quote was captured
    arch_comp = report["competency_breakdown"]["System Architecture"]
    assert "FastAPI" in arch_comp["evidence_quote"]
    assert report["recommendation_narrative"] is not None
