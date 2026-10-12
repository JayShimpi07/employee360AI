import hmac
import hashlib
import time
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from backend.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    # Truncate to 72 bytes if necessary per bcrypt specification
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

# Candidate Invitation Tokens (HMAC-SHA256 based with expiration)
def generate_candidate_token(session_id: str, candidate_email: str) -> str:
    """
    Generates a secure, URL-safe invitation token for candidates.
    Format: session_id:expires_timestamp:signature
    """
    expires_at = int(time.time()) + (settings.CANDIDATE_TOKEN_EXPIRE_HOURS * 3600)
    payload = f"{session_id}:{candidate_email}:{expires_at}"
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{session_id}.{expires_at}.{signature}"

def verify_candidate_token(token: str, candidate_email: str) -> Optional[str]:
    """
    Verifies token validity and expiration. Returns session_id if valid, None otherwise.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        session_id, expires_at_str, signature = parts
        expires_at = int(expires_at_str)
        
        # Check expiration
        if time.time() > expires_at:
            return None
        
        # Verify signature
        payload = f"{session_id}:{candidate_email}:{expires_at}"
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if hmac.compare_digest(signature, expected_sig):
            return session_id
        return None
    except Exception:
        return None
