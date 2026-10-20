from typing import Optional
from pydantic import BaseModel, EmailStr
from backend.models.enums import UserRole

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: str
    full_name: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.EMPLOYEE

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool

class CandidateTokenVerifyRequest(BaseModel):
    token: str
    candidate_email: str

class CandidateTokenVerifyResponse(BaseModel):
    valid: bool
    session_id: Optional[str] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    access_token: Optional[str] = None
    error_message: Optional[str] = None

