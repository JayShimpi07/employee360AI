from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr

class CompetencyCreate(BaseModel):
    name: str
    description: str
    rubric_json: Dict[str, Any]
    weight: float = 1.0

class CompetencyResponse(BaseModel):
    id: str
    job_id: str
    name: str
    description: str
    rubric_json: Dict[str, Any]
    weight: float

class JobCreate(BaseModel):
    title: str
    department: str
    description: str
    workflow_version_id: str
    competencies: List[CompetencyCreate]

class JobResponse(BaseModel):
    id: str
    title: str
    department: str
    description: str
    workflow_version_id: str
    created_by: str
    competencies: List[CompetencyResponse]

class InviteCandidateRequest(BaseModel):
    job_id: str
    candidate_name: str
    candidate_email: EmailStr
    resume_text: Optional[str] = None

class InviteCandidateResponse(BaseModel):
    session_id: str
    candidate_name: str
    candidate_email: str
    invite_url: str
    invite_token: str
