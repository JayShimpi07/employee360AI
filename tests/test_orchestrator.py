import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.core.database import Base
from backend.models.models import (
    User, WorkflowDefinition, WorkflowVersion, Job, Competency, InterviewSession, TranscriptTurn
)
from backend.models.enums import UserRole, WorkflowCategory, SessionStatus
from backend.engine.compiler import HRAgentCompiler
from backend.engine.orchestrator import TurnOrchestrator

@pytest_asyncio.fixture
async def test_db():
    # In-memory SQLite for fast testing
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        # Seed test data
        admin = User(email="admin@test.com", hashed_password="pw", full_name="Admin", role=UserRole.HR_ADMIN)
        session.add(admin)
        await session.flush()

        wf_def = WorkflowDefinition(name="Test Hiring", category=WorkflowCategory.HIRING, description="Test")
        session.add(wf_def)
        await session.flush()

        config = {
            "workflow_id": "wf_test",
            "name": "Test",
            "version": 1,
            "category": "HIRING",
            "persona": {"name": "Alex", "role": "Interviewer", "tone": "objective", "instruction": "Evaluate"},
            "stages": [
                {"stage_id": "intro", "type": "GREETING", "script": "Hello test candidate!", "transitions": ["tech"]},
                {"stage_id": "tech", "type": "COMPETENCY_ASSESSMENT", "transitions": ["completed"]}
            ]
        }
        c_dict, c_hash = HRAgentCompiler.compile(config)
        wf_ver = WorkflowVersion(workflow_id=wf_def.id, version_number=1, config_json=c_dict, compiled_hash=c_hash, is_active=True)
        session.add(wf_ver)
        await session.flush()

        job = Job(title="Test Engineer", department="QA", description="Test job", workflow_version_id=wf_ver.id, created_by=admin.id)
        session.add(job)
        await session.flush()

        comp = Competency(job_id=job.id, name="Test Automation", description="Desc", rubric_json={"good": "yes"}, weight=1.0)
        session.add(comp)
        await session.flush()

        interview_session = InterviewSession(
            job_id=job.id,
            workflow_version_id=wf_ver.id,
            candidate_name="Alex River",
            candidate_email="alex.river@test.com",
            resume_text="5 years experience in Python and Pytest",
            status=SessionStatus.PENDING,
            invite_token="token_123"
        )
        session.add(interview_session)
        await session.commit()
        await session.refresh(interview_session)

        yield session, interview_session.id

    await engine.dispose()

@pytest.mark.asyncio
async def test_initial_greeting_generation(test_db):
    session, session_id = test_db
    greeting, turn_index = await TurnOrchestrator.get_initial_greeting(session_id, session)
    assert "Hello" in greeting
    assert turn_index == 1

@pytest.mark.asyncio
async def test_candidate_turn_processing(test_db):
    session, session_id = test_db
    # First get greeting
    await TurnOrchestrator.get_initial_greeting(session_id, session)

    # Candidate responds
    result = await TurnOrchestrator.process_candidate_turn(
        session_id=session_id,
        candidate_text="Yes, I can hear you clearly. I am Alex and I have built distributed test pipelines.",
        latency_ms=150.0,
        db=session
    )

    assert result["speaker"] == "AI"
    assert result["turn_index"] == 3 # Turn 1 = Greeting, Turn 2 = Candidate, Turn 3 = AI
    assert result["latency_ms"] >= 0
    assert "Alex River" in result["text"] or "project" in result["text"] or "system" in result["text"]
