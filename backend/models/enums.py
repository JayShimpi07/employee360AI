from enum import Enum

class UserRole(str, Enum):
    HR_ADMIN = "HR_ADMIN"
    HR_REVIEWER = "HR_REVIEWER"
    EMPLOYEE = "EMPLOYEE"

class WorkflowCategory(str, Enum):
    HIRING = "HIRING"
    ONBOARDING = "ONBOARDING"
    ASSISTANCE = "ASSISTANCE"

class SessionStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ESCALATED = "ESCALATED"
    EXPIRED = "EXPIRED"

class TurnSpeaker(str, Enum):
    AI = "AI"
    CANDIDATE = "CANDIDATE"
    SYSTEM = "SYSTEM"

class EvidenceStatus(str, Enum):
    SUPPORTED = "SUPPORTED"
    PARTIAL = "PARTIAL"
    INSUFFICIENT = "INSUFFICIENT"

class AnomalyType(str, Enum):
    FACE_ABSENCE = "FACE_ABSENCE"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    GAZE_DEVIATION = "GAZE_DEVIATION"
    SECOND_VOICE = "SECOND_VOICE"
    DEVICE_BLUR = "DEVICE_BLUR"

class TaskStatus(str, Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class CaseStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"
