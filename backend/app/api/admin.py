"""
ContractGuard-X Admin Governance & Analytics Router
Features: Platform Structuring KPIs, Registered Users Directory, Cross-Platform Projects Portfolio, Policy Audit Controls
"""
from __future__ import annotations
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import UserRecord, ProjectRecord, PolicyRecord, ApiKeyRecord
from .auth import require_auth

router = APIRouter(prefix="/admin", tags=["Admin Governance"])


class UpdateRoleRequest(BaseModel):
    role: str  # "developer" or "admin"


@router.get("/overview")
def get_admin_overview(
    auth: Dict[str, Any] = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Returns platform structuring metrics, complete registered users list with project counts,
    and all ingested agent projects with owner attribution and policy statuses.
    Requires Admin privileges.
    """
    user_role = auth.get("role")
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges required to access governance console."
        )

    # 1. Fetch all records from database
    users = db.query(UserRecord).order_by(UserRecord.created_at.desc()).all()
    projects = db.query(ProjectRecord).order_by(ProjectRecord.created_at.desc()).all()
    policies = db.query(PolicyRecord).all()
    api_keys = db.query(ApiKeyRecord).filter(ApiKeyRecord.is_active == True).all()

    # User lookup map
    user_map = {u.id: u for u in users}

    # Project counting per user
    user_project_counts: Dict[str, int] = {}
    user_policy_counts: Dict[str, int] = {}
    for p in projects:
        if p.user_id:
            user_project_counts[p.user_id] = user_project_counts.get(p.user_id, 0) + 1
    for pol in policies:
        if pol.user_id:
            user_policy_counts[pol.user_id] = user_policy_counts.get(pol.user_id, 0) + 1

    # Policies status mapping per project
    project_policy_map: Dict[str, PolicyRecord] = {}
    for pol in policies:
        if pol.project_id:
            project_policy_map[pol.project_id] = pol

    # Dual key lookup mapping per project
    project_keys_map: Dict[str, Dict[str, str]] = {}
    for k in api_keys:
        if k.project_id:
            if k.project_id not in project_keys_map:
                project_keys_map[k.project_id] = {}
            if k.key_type == "ingress":
                project_keys_map[k.project_id]["ingress"] = k.key_prefix or ""
            elif k.key_type == "egress":
                project_keys_map[k.project_id]["egress"] = k.key_prefix or ""

    # 2. Compute Structuring Metrics
    total_users = len(users)
    developer_count = sum(1 for u in users if u.role == "developer")
    admin_count = sum(1 for u in users if u.role == "admin")

    total_projects = len(projects)
    total_tools_extracted = sum(len(p.discovered_tools or []) for p in projects)

    policies_approved = sum(1 for pol in policies if pol.is_active)
    policies_draft = sum(1 for pol in policies if not pol.is_active)
    projects_with_policy = set(pol.project_id for pol in policies if pol.project_id)
    policies_unconfigured = sum(1 for p in projects if p.id not in projects_with_policy)

    active_dual_keys = len(api_keys)

    # 3. Format Users list
    user_items = []
    for u in users:
        user_items.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "projects_count": user_project_counts.get(u.id, 0),
            "policies_count": user_policy_counts.get(u.id, 0)
        })

    # 4. Format Projects list with owner attribution
    project_items = []
    for p in projects:
        owner = user_map.get(p.user_id)
        pol = project_policy_map.get(p.id)
        pol_status = "NONE"
        pol_id = None
        if pol:
            pol_status = "APPROVED" if pol.is_active else "DRAFT"
            pol_id = pol.id

        k_info = project_keys_map.get(p.id, {})

        project_items.append({
            "id": p.id,
            "name": p.name,
            "filename": p.filename,
            "user_id": p.user_id,
            "owner_email": owner.email if owner else "unassigned@system.local",
            "owner_name": owner.full_name if owner else "Unassigned Developer",
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "tools_count": len(p.discovered_tools or []),
            "discovered_tools": p.discovered_tools or [],
            "extracted_files_count": len(p.extracted_files or []),
            "extracted_files": p.extracted_files or [],
            "policy_id": pol_id,
            "policy_status": pol_status,
            "policy_yaml": pol.yaml_content if pol else p.policy_yaml,
            "policy_json": pol.parsed_json if pol else p.policy_json,
            "ingress_key_prefix": k_info.get("ingress", ""),
            "egress_key_prefix": k_info.get("egress", "")
        })

    return {
        "metrics": {
            "total_users": total_users,
            "developer_count": developer_count,
            "admin_count": admin_count,
            "total_projects": total_projects,
            "total_tools_extracted": total_tools_extracted,
            "policies_approved": policies_approved,
            "policies_draft": policies_draft,
            "policies_unconfigured": policies_unconfigured,
            "active_dual_keys": active_dual_keys
        },
        "users": user_items,
        "projects": project_items
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    req: UpdateRoleRequest,
    auth: Dict[str, Any] = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Updates user role between developer and admin. Requires Admin privileges."""
    caller_role = auth.get("role")
    caller_id = auth.get("user_id")
    if caller_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges required to update user roles."
        )

    if req.role not in ("developer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role: Must be 'developer' or 'admin'."
        )

    # Prevent admin from accidentally demoting themselves to developer
    if caller_id == user_id and req.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote your own account. Another administrator must modify this role."
        )

    target_user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    target_user.role = req.role
    db.commit()
    db.refresh(target_user)

    return {
        "status": "success",
        "message": f"User {target_user.email} role updated to {target_user.role}",
        "user_id": target_user.id,
        "role": target_user.role
    }

