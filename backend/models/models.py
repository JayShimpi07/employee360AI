import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, DateTime, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
from backend.models.enums import (
    UserRole, WorkflowCategory, SessionStatus, TurnSpeaker,
    EvidenceStatus, AnomalyType, TaskStatus, CaseStatus
)

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def generate_uuid() -> str:
    return str(uuid.uuid4())

# 1. Users & Authentication
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationships
    created_jobs: Mapped[List["Job"]] = relationship(back_populates="creator")
    cases: Mapped[List["HRCase"]] = relationship(back_populates="employee")
    onboarding_tasks: Mapped[List["OnboardingTask"]] = relationship(back_populates="employee")

# 2. Workflow Definitions & Versions
class WorkflowDefinition(Base):
    __tablename__ = "workflow_definitions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[WorkflowCategory] = mapped_column(SAEnum(WorkflowCategory), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Versions
    versions: Mapped[List["WorkflowVersion"]] = relationship(back_populates="definition", cascade="all, delete-orphan")

class WorkflowVersion(Base):
    __tablename__ = "workflow_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_definitions.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    config_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    compiled_hash: Mapped[str] = mapped_column(String(64), nullable=False) # SHA-256
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    definition: Mapped["WorkflowDefinition"] = relationship(back_populates="versions")
    jobs: Mapped[List["Job"]] = relationship(back_populates="workflow_version")
    interview_sessions: Mapped[List["InterviewSession"]] = relationship(back_populates="workflow_version")

# 3. Jobs & Competency Rubrics
class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    workflow_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_versions.id"), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    creator: Mapped["User"] = relationship(back_populates="created_jobs")
    workflow_version: Mapped["WorkflowVersion"] = relationship(back_populates="jobs")
    competencies: Mapped[List["Competency"]] = relationship(back_populates="job", cascade="all, delete-orphan")
    interviews: Mapped[List["InterviewSession"]] = relationship(back_populates="job")

class Competency(Base):
    __tablename__ = "competencies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    rubric_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0)

    job: Mapped["Job"] = relationship(back_populates="competencies")
    evidence_records: Mapped[List["EvidenceRecord"]] = relationship(back_populates="competency")

# 4. Interview Sessions & Dialogue Turns
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    workflow_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_versions.id"), nullable=False)
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    resume_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[SessionStatus] = mapped_column(SAEnum(SessionStatus), default=SessionStatus.PENDING, nullable=False)
    invite_token: Mapped[str] = mapped_column(String(255), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    job: Mapped["Job"] = relationship(back_populates="interviews")
    workflow_version: Mapped["WorkflowVersion"] = relationship(back_populates="interview_sessions")
    turns: Mapped[List["TranscriptTurn"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    evidence_records: Mapped[List["EvidenceRecord"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    proctoring_events: Mapped[List["ProctoringEvent"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    evaluation_report: Mapped[Optional["EvaluationReport"]] = relationship(back_populates="session", uselist=False)

class TranscriptTurn(Base):
    __tablename__ = "transcript_turns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("interview_sessions.id"), nullable=False)
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker: Mapped[TurnSpeaker] = mapped_column(SAEnum(TurnSpeaker), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped["InterviewSession"] = relationship(back_populates="turns")

# 5. Evidence Records & Proctoring Events
class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("interview_sessions.id"), nullable=False)
    competency_id: Mapped[str] = mapped_column(String(36), ForeignKey("competencies.id"), nullable=False)
    claim_statement: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_quote: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False) # 0.0 - 1.0
    status: Mapped[EvidenceStatus] = mapped_column(SAEnum(EvidenceStatus), default=EvidenceStatus.INSUFFICIENT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped["InterviewSession"] = relationship(back_populates="evidence_records")
    competency: Mapped["Competency"] = relationship(back_populates="evidence_records")

class ProctoringEvent(Base):
    __tablename__ = "proctoring_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("interview_sessions.id"), nullable=False)
    timestamp_offset_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    anomaly_type: Mapped[AnomalyType] = mapped_column(SAEnum(AnomalyType), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False) # 0.0 - 1.0
    frame_snapshot_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    details_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped["InterviewSession"] = relationship(back_populates="proctoring_events")

# 6. Evaluation Reports (Proof-Carrying)
class EvaluationReport(Base):
    __tablename__ = "evaluation_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("interview_sessions.id"), unique=True, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False) # 0.0 - 100.0
    competency_scores_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    evidence_sufficiency_ratio: Mapped[float] = mapped_column(Float, nullable=False) # 0.0 - 1.0
    proctoring_integrity_score: Mapped[float] = mapped_column(Float, default=1.0)
    recommendation_narrative: Mapped[str] = mapped_column(Text, nullable=False)
    human_override_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped["InterviewSession"] = relationship(back_populates="evaluation_report")

# 7. Grounded Knowledge & Chunks
class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    chunks: Mapped[List["DocumentChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("knowledge_documents.id"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_json: Mapped[Optional[List[float]]] = mapped_column(JSON, nullable=True) # vector stored as float array for SQLite / pgvector compatible
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    document: Mapped["KnowledgeDocument"] = relationship(back_populates="chunks")

# 8. Employee Assistance & Mock HR Cases
class HRCase(Base):
    __tablename__ = "hr_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[CaseStatus] = mapped_column(SAEnum(CaseStatus), default=CaseStatus.OPEN, nullable=False)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    employee: Mapped["User"] = relationship(back_populates="cases")
    actions: Mapped[List["CaseAction"]] = relationship(back_populates="case", cascade="all, delete-orphan")

class CaseAction(Base):
    __tablename__ = "case_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("hr_cases.id"), nullable=False)
    action_name: Mapped[str] = mapped_column(String(100), nullable=False)
    input_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    result_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    case: Mapped["HRCase"] = relationship(back_populates="actions")

# 9. Onboarding Tasks
class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    task_title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    employee: Mapped["User"] = relationship(back_populates="onboarding_tasks")

# 10. Tamper-Evident Audit Ledger
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    actor_id: Mapped[str] = mapped_column(String(255), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
