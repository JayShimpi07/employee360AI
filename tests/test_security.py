import time
from backend.core.security import (
    get_password_hash, verify_password,
    create_access_token, decode_access_token,
    generate_candidate_token, verify_candidate_token
)

def test_password_hashing():
    raw = "SecureSecretPassword123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_lifecycle():
    payload = {"sub": "user_123", "role": "HR_ADMIN", "email": "admin@zensar.com"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user_123"
    assert decoded["role"] == "HR_ADMIN"
    assert decoded["email"] == "admin@zensar.com"

def test_candidate_invitation_token():
    session_id = "sess_abc_789"
    email = "candidate@example.com"

    token = generate_candidate_token(session_id, email)
    assert token is not None

    # Valid verification
    verified_session = verify_candidate_token(token, email)
    assert verified_session == session_id

    # Tampered email verification
    tampered_session = verify_candidate_token(token, "hacker@example.com")
    assert tampered_session is None

    # Tampered signature verification
    tampered_token = token[:-5] + "aaaaa"
    assert verify_candidate_token(tampered_token, email) is None
