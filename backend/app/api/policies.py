import uuid
import yaml
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.db_models import PolicyRecord
from ..models.schemas import (
    ToolDefinitionSchema,
    InterviewQuestionSchema,
    InterviewQuestionsResponse,
    PolicySynthesizeRequest,
    PolicySynthesizeResponse,
    PolicyValidateRequest,
    PolicyValidateResponse,
    PolicyApproveRequest,
    PolicyApproveResponse
)
from ..core.nebius_client import nebius_service
from ..core.policy_compiler import policy_compiler
from .auth import require_auth

router = APIRouter(prefix="/policy", tags=["Policies (M1 Control Plane)"])


@router.post("/interview-questions", response_model=InterviewQuestionsResponse)
def get_interview_questions(
    tools: List[ToolDefinitionSchema],
    api_key: Optional[str] = None
):
    """Uses NVIDIA Nemotron to generate context-aware security interview questions for the tools."""
    tools_dict = [t.model_dump() for t in tools]
    questions = nebius_service.generate_interview_questions(tools_dict, api_key=api_key)
    return InterviewQuestionsResponse(
        questions=[InterviewQuestionSchema(**q) for q in questions]
    )


@router.post("/synthesize", response_model=PolicySynthesizeResponse)
def synthesize_policy(
    req: PolicySynthesizeRequest,
    auth: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Compiles developer answers into a typed contracts.yaml draft via Nemotron-70B.
    Invariant #1: AI output is stored as an unapproved DRAFT (is_active=False) and statically linted;
    explicit human approval via /approve is required to freeze and activate it.
    """
    tools_dict = [t.model_dump() for t in req.tools]
    yaml_str = nebius_service.synthesize_policy(
        tools=tools_dict,
        answers=req.answers,
        agent_name=req.agent_name,
        api_key=req.api_key
    )

    try:
        parsed = yaml.safe_load(yaml_str) or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse generated YAML: {e}")

    lint_res = policy_compiler.lint_policy(parsed)

    policy_id = f"pol_{uuid.uuid4().hex[:8]}"
    record = PolicyRecord(
        id=policy_id,
        agent_name=req.agent_name,
        version="1.0.0-draft",
        yaml_content=yaml_str,
        parsed_json=parsed,
        is_active=False  # Remains draft until developer approves
    )
    db.add(record)
    db.commit()

    return PolicySynthesizeResponse(
        id=policy_id,
        yaml_content=yaml_str,
        parsed_contract=parsed,
        policy_id=policy_id,
        status="DRAFT",
        is_active=False,
        signature="",
        lint_result=lint_res.model_dump()
    )


@router.post("/validate", response_model=PolicyValidateResponse)
def validate_policy_yaml(
    req: PolicyValidateRequest,
    auth: dict = Depends(require_auth)
):
    """Validates and statically lints YAML against ContractGuard M1 security invariants."""
    errors = []
    warnings = []
    issues_dump = []
    fixes = []
    pos_tests = []
    neg_tests = []
    parsed = None
    try:
        parsed = yaml.safe_load(req.yaml_content)
        if not isinstance(parsed, dict):
            errors.append("Root of contracts.yaml must be an object/dictionary.")
        else:
            if "global_envelope" not in parsed:
                errors.append("Missing required section: 'global_envelope'")
            if "tools" not in parsed:
                errors.append("Missing required section: 'tools'")

            lint_res = policy_compiler.lint_policy(parsed)
            for issue in lint_res.issues:
                issues_dump.append(issue.model_dump())
                if issue.severity == "ERROR":
                    errors.append(f"[{issue.rule}] {issue.message}")
                elif issue.severity == "WARNING":
                    warnings.append(f"[{issue.rule}] {issue.message}")
            fixes = lint_res.suggested_fixes
            pos_tests = lint_res.positive_tests
            neg_tests = lint_res.negative_tests
    except Exception as e:
        errors.append(f"YAML Syntax Error: {e}")

    return PolicyValidateResponse(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        issues=issues_dump,
        suggested_fixes=fixes,
        positive_tests=pos_tests,
        negative_tests=neg_tests,
        parsed_contract=parsed if len(errors) == 0 else None
    )


@router.post("/{policy_id}/approve", response_model=PolicyApproveResponse)
def approve_and_freeze_policy(
    policy_id: str,
    req: PolicyApproveRequest,
    auth: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Explicit human developer approval and version freeze (Invariant #1).
    Rejects AI self-approvals or policies failing critical static lint checks.
    """
    rec = db.query(PolicyRecord).filter(PolicyRecord.id == policy_id).first()
    yaml_to_sign = req.yaml_content or (rec.yaml_content if rec else None)
    if not yaml_to_sign:
        raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found and no yaml_content provided.")

    try:
        signed_pkg = policy_compiler.sign_and_publish(
            contract_yaml=yaml_to_sign,
            policy_id=policy_id,
            approved_by=req.approved_by,
            version=req.version
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if rec:
        rec.version = signed_pkg.version
        rec.yaml_content = signed_pkg.contract_yaml
        rec.parsed_json = signed_pkg.parsed_contract
        rec.is_active = True
        db.commit()
    else:
        new_rec = PolicyRecord(
            id=policy_id,
            agent_name=signed_pkg.parsed_contract.get("agent_metadata", {}).get("agent_name", "ApprovedAgent"),
            version=signed_pkg.version,
            yaml_content=signed_pkg.contract_yaml,
            parsed_json=signed_pkg.parsed_contract,
            is_active=True
        )
        db.add(new_rec)
        db.commit()

    return PolicyApproveResponse(
        id=signed_pkg.policy_id,
        policy_id=signed_pkg.policy_id,
        version=signed_pkg.version,
        status=signed_pkg.status,
        is_active=True,
        approved_by=signed_pkg.approved_by,
        approved_at=signed_pkg.approved_at,
        sha256_signature=signed_pkg.sha256_signature,
        signature=signed_pkg.sha256_signature,
        immutable=signed_pkg.immutable,
        parsed_contract=signed_pkg.parsed_contract
    )


@router.get("/{policy_id}")
def get_policy_by_id(policy_id: str, db: Session = Depends(get_db)):
    """Returns policy version with redacted metadata."""
    signed = policy_compiler.get_approved(policy_id)
    if signed:
        return {
            "policy_id": signed.policy_id,
            "version": signed.version,
            "status": signed.status,
            "approved_by": signed.approved_by,
            "sha256_signature": signed.sha256_signature,
            "immutable": signed.immutable,
            "parsed_contract": signed.parsed_contract
        }

    rec = db.query(PolicyRecord).filter(PolicyRecord.id == policy_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found.")
    return {
        "policy_id": rec.id,
        "agent_name": rec.agent_name,
        "version": rec.version,
        "status": "APPROVED" if rec.is_active else "DRAFT",
        "is_active": rec.is_active,
        "parsed_contract": rec.parsed_json
    }


@router.post("/download-bundle")
def download_guarded_bundle(
    payload: dict,
    auth: dict = Depends(require_auth)
):
    """Generates and streams a downloadable zip containing contracts.yaml, drop-in middleware, and integration guide."""
    from fastapi.responses import Response
    from ..core.zip_extractor import ZipToolExtractor

    yaml_content = payload.get("yaml_content", "")
    agent_name = payload.get("agent_name", "GuardedAgent")
    zip_bytes = ZipToolExtractor.create_guarded_bundle_zip(yaml_content, agent_name=agent_name)

    filename = f"contractguard_{agent_name.lower().replace(' ', '_')}_bundle.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
