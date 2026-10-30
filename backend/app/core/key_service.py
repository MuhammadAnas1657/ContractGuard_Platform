"""
ContractGuard-X Key Management Service
Handles dual-key provisioning, SHA-256 hashing, and prefix conventions.
Features: F13 (Dual API Keys), F14 (Dual Key Role Enforcement)
"""
from __future__ import annotations
import uuid
import hashlib
import time
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models.db_models import ApiKeyRecord, UserRecord

KEY_PREFIXES = {
    "ingress": "cgx_ing_",
    "egress": "cgx_egr_",
    "gateway": "cgx_live_"
}


def generate_api_key_record(
    db: Session,
    user_id: str,
    key_name: str,
    key_type: str = "gateway",
    project_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a cryptographically secure key, hashes it with SHA-256,
    stores it in ApiKeyRecord, and returns the raw secret once.
    """
    key_type = (key_type or "gateway").lower()
    if key_type not in KEY_PREFIXES:
        key_type = "gateway"

    safe_key_name = str(key_name or "API Key")[:250]
    prefix_str = KEY_PREFIXES[key_type]
    raw_secret = f"{prefix_str}{uuid.uuid4().hex}"
    key_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()
    key_prefix = raw_secret[:14] + "..."
    key_id = f"key_{key_type[:3]}_{uuid.uuid4().hex[:8]}"

    record = ApiKeyRecord(
        id=key_id,
        user_id=user_id,
        project_id=project_id,
        key_name=safe_key_name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        key_type=key_type,
        is_active=True
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "key_id": key_id,
        "api_key": raw_secret,
        "raw_key": raw_secret,
        "key_prefix": key_prefix,
        "key_name": safe_key_name,
        "key_type": key_type,
        "project_id": project_id,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }


def provision_dual_keys_for_project(
    db: Session,
    project_id: str,
    project_name: str,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Auto-generates both Ingress and Egress keys for a project."""
    if not user_id:
        first_user = db.query(UserRecord).first()
        user_id = first_user.id if first_user else "usr_default_dev"

    clean_name = str(project_name or "Project")[:200]
    ingress_key = generate_api_key_record(
        db=db,
        user_id=user_id,
        key_name=f"{clean_name} Ingress Key",
        key_type="ingress",
        project_id=project_id
    )
    egress_key = generate_api_key_record(
        db=db,
        user_id=user_id,
        key_name=f"{clean_name} Egress Key",
        key_type="egress",
        project_id=project_id
    )

    return {
        "ingress": ingress_key,
        "egress": egress_key
    }
