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
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import UserRecord

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
