from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator
from backend.models.enums import WorkflowCategory

class PersonaConfig(BaseModel):
    name: str = Field(default="Alex", description="Name of the AI agent persona")
    role: str = Field(default="Technical HR Specialist", description="Organizational title")
    tone: str = Field(default="professional, empathetic, objective", description="Conversational style")
    instruction: str = Field(..., description="Core behavioral instructions for the agent")

class CompetencyItem(BaseModel):
    name: str = Field(..., description="Competency name (e.g. System Design)")
    min_evidence_score: float = Field(default=0.70, ge=0.0, le=1.0, description="Minimum sufficiency score")
    probe_questions: List[str] = Field(default_factory=list, description="Initial and follow-up probes")
    follow_up_strategy: str = Field(default="TARGETED_PROBE_ON_INSUFFICIENT")

class WorkflowStage(BaseModel):
    stage_id: str = Field(..., description="Unique identifier for the stage")
    type: str = Field(..., description="Stage type (e.g. GREETING, RESUME_VERIFICATION, COMPETENCY_ASSESSMENT, CLOSING)")
    script: Optional[str] = Field(None, description="Static introductory prompt if applicable")
    objective: Optional[str] = Field(None, description="Objective of this stage")
    competencies: Optional[List[CompetencyItem]] = Field(default=None, description="Competencies evaluated in this stage")
    max_turns: Optional[int] = Field(default=5, description="Maximum dialogue turns for this stage")
    transitions: List[str] = Field(default_factory=list, description="IDs of valid subsequent stages")

class ProctoringPolicyConfig(BaseModel):
    enabled: bool = Field(default=True)
    detectors: List[str] = Field(
        default=["FACE_PRESENCE", "MULTIPLE_FACES", "GAZE_DEVIATION", "SECOND_VOICE"],
        description="Active anomaly detectors"
    )
    action_on_flag: str = Field(default="LOG_AUDIT_ONLY", description="Strictly non-punitive audit logger")

class EscalationRulesConfig(BaseModel):
    on_connectivity_loss: str = Field(default="PAUSE_AND_NOTIFY")
    on_inconclusive_evidence: str = Field(default="FLAG_FOR_HUMAN_INTERVIEW")
    on_policy_gap: str = Field(default="CREATE_HUMAN_HR_TICKET")

class ActionToolDefinition(BaseModel):
    action_name: str
    parameters: List[str]
    verification_method: str

class ChecklistItem(BaseModel):
    task_id: str
    title: str
    action_trigger: Optional[str] = None
    required_verification: bool = True

class WorkflowConfigSchema(BaseModel):
    workflow_id: str = Field(..., description="Machine-readable workflow identifier")
    name: str = Field(..., description="Human-readable title")
    version: int = Field(default=1, ge=1)
    category: WorkflowCategory
    persona: PersonaConfig
    stages: Optional[List[WorkflowStage]] = Field(default=None, description="Stages for conversational flows")
    checklist_items: Optional[List[ChecklistItem]] = Field(default=None, description="Onboarding tasks")
    authorized_actions: Optional[List[ActionToolDefinition]] = Field(default=None, description="Allowed mock actions")
    rag_policy_sources: Optional[List[str]] = Field(default=None, description="Approved HR knowledge base files")
    proctoring_policy: Optional[ProctoringPolicyConfig] = Field(default_factory=ProctoringPolicyConfig)
    escalation_rules: Optional[EscalationRulesConfig] = Field(default_factory=EscalationRulesConfig)

    @field_validator("stages")
    def validate_stages(cls, v, info):
        category = info.data.get("category")
        if category == WorkflowCategory.HIRING and not v:
            raise ValueError("Hiring workflows must define at least one stage.")
        return v
