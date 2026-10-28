"""
ContractGuard-X User Authentication Router
Provides secure JWT/HMAC token issuance, password hashing, and instant 1-click Judge login.
"""
from __future__ import annotations
import hmac
import hashlib
import base64
import json
import time
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import UserRecord, ApiKeyRecord

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = "cgx_hackathon_super_secret_signing_key_2026"
SALT = b"contractguard_salt_2026"

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "Developer"

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    access_token: str
    token_type: str = "Bearer"

def hash_password(password: str) -> str:
    """Secure PBKDF2 password hashing."""
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), SALT, 100000)
    return hashed.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(hash_password(plain_password), hashed_password)

def create_access_token(data: dict, expires_in_seconds: int = 86400 * 7) -> str:
    """Creates a signed tamper-proof token using HMAC-SHA256."""
    payload = data.copy()
    payload["exp"] = time.time() + expires_in_seconds
    raw_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    encoded_payload = base64.urlsafe_b64encode(raw_json).decode("utf-8").rstrip("=")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{encoded_payload}.{signature}"

def decode_access_token(token: str) -> Optional[dict]:
    """Validates signature and decodes payload."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        encoded_payload, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        # Add padding
        rem = len(encoded_payload) % 4
        if rem > 0:
            encoded_payload += "=" * (4 - rem)
        raw_json = base64.urlsafe_b64decode(encoded_payload.encode("utf-8"))
        payload = json.loads(raw_json.decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[UserRecord]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    return db.query(UserRecord).filter(UserRecord.id == payload["sub"]).first()


def validate_api_key_str(raw_key: Optional[str], db: Session) -> Optional[Dict[str, Any]]:
    """Validates an API key against demo whitelist or ApiKeyRecord in DB."""
    if not raw_key or not isinstance(raw_key, str):
        return None
    key = raw_key.strip()
    if not key:
        return None
    if key.startswith("Bearer "):
        key = key[7:].strip()
    if key == "judge_evaluator_key" or key.startswith("demo_") or key.startswith("mock_"):
        return {"type": "demo_key", "key": key, "user_id": "usr_judge_evaluator", "role": "judge"}

    key_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
    rec = db.query(ApiKeyRecord).filter(
        ApiKeyRecord.key_hash == key_hash,
        ApiKeyRecord.is_active == True
    ).first()
    if rec:
        return {"type": "api_key", "key_id": rec.id, "user_id": rec.user_id, "key": key}
    return None


def validate_bearer_token(raw_token: Optional[str], db: Session) -> Optional[Dict[str, Any]]:
    """Validates Bearer token: first checks JWT token, then API key or demo key."""
    if not raw_token or not isinstance(raw_token, str):
        return None
    token = raw_token.strip()
    if token.startswith("Bearer "):
        token = token[7:].strip()
    if not token:
        return None

    # Check JWT / HMAC token first
    payload = decode_access_token(token)
    if payload and "sub" in payload:
        user = db.query(UserRecord).filter(UserRecord.id == payload["sub"]).first()
        return {
            "type": "user_token",
            "user": user,
            "user_id": payload["sub"],
            "payload": payload,
            "role": payload.get("role", "developer")
        }

    # Second check if token is structured as API key or demo key
    return validate_api_key_str(token, db)


async def require_auth(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Unified authentication dependency that validates:
    a) Authorization: Bearer <token_or_key> (checks JWT token first, then API key hash if structured as API key or demo key).
    b) X-API-Key: <key> header (checks API key in DB or demo whitelist judge_evaluator_key, demo_*, mock_*).
    c) Optional request body api_key: <key>.
    If no valid credential is provided, raises HTTPException(401).
    """
    # 1. Authorization header
    auth_hdr = authorization or request.headers.get("authorization")
    if auth_hdr:
        res = validate_bearer_token(auth_hdr, db)
        if res:
            return res

    # 2. X-API-Key header (case-insensitive check)
    key_hdr = x_api_key or request.headers.get("x-api-key") or request.headers.get("X-API-Key")
    if key_hdr:
        res = validate_api_key_str(key_hdr, db)
        if res:
            return res

    # 3. Optional request body api_key
    try:
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            body = await request.json()
            if isinstance(body, dict):
                body_key = body.get("api_key")
                if body_key and isinstance(body_key, str):
                    res = validate_api_key_str(body_key, db)
                    if res:
                        return res
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required: Valid session token or ContractGuard API key must be provided."
    )


@router.post("/signup", response_model=UserResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(UserRecord).filter(UserRecord.email == req.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered. Please log in.")

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    user = UserRecord(
        id=user_id,
        email=req.email.strip().lower(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name or "Developer",
        role="developer"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        access_token=token
    )

@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserRecord).filter(UserRecord.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        access_token=token
    )

@router.post("/demo-login", response_model=UserResponse)
def demo_login(db: Session = Depends(get_db)):
    """1-Click instant login for Hackathon Judges and Evaluators."""
    demo_email = "judge@nebius-nvidia-hackathon.ai"
    user = db.query(UserRecord).filter(UserRecord.email == demo_email).first()
    if not user:
        user = UserRecord(
            id=f"usr_judge_{uuid.uuid4().hex[:8]}",
            email=demo_email,
            hashed_password=hash_password("hackathon2026"),
            full_name="Hackathon Evaluator",
            role="judge"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        access_token=token
    )

@router.get("/me")
def get_me(current_user: Optional[UserRecord] = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated or token expired.")
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }
