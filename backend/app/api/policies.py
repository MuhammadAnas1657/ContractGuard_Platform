import uuid
import yaml
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Union

from ..database import get_db
from ..models.db_models import PolicyRecord, ProjectRecord
from ..models.schemas import (
    ToolDefinitionSchema,
    InterviewQuestionSchema,
    InterviewQuestionsResponse,
    DiscoveredToolsResponse,
    ZipIngestResponseSchema,
    PolicySynthesizeRequest,
    PolicySynthesizeResponse,
    PolicyValidateRequest,
    PolicyValidateResponse,
    PolicyApproveRequest,
    PolicyApproveResponse
)
from ..core.nebius_client import nebius_service
from ..core.policy_compiler import policy_compiler, PolicyGapDetector, PolicyCompiler
from ..core.zip_extractor import ZipToolExtractor
from ..core.key_service import provision_dual_keys_for_project
from .auth import require_auth

router = APIRouter(prefix="/policy", tags=["Policies (M1 Control Plane)"])


@router.post("/ingest-zip", response_model=DiscoveredToolsResponse)
async def ingest_agent_zip(
    file: UploadFile = File(...),
    project_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Zero-Trust Developer Code Ingestion:
    Upload an agent .zip file to sandboxed AST parser. Extracts tools without running code,
    runs 7-canonical gap detection, generates interview questions, and provisions dual API keys.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported.")

    content = await file.read()
    try:
        extracted_files, tools, doc_texts = ZipToolExtractor.extract_tools_from_zip(
            content, raise_on_traversal=True, raise_on_encrypted=True
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    proj_id = f"proj_{uuid.uuid4().hex[:8]}"
    name = project_name or file.filename.replace(".zip", "")

    # Dynamic AI Security Analysis (Methodology Module 1: AI Policy Architect)
    overview_text = ""
    if doc_texts and isinstance(doc_texts, dict):
        overview_text = "\n\n".join(doc_texts.values())

    from .agentic_ai import analyze_custom_project_security
    ai_audit = analyze_custom_project_security(
        project_name=name,
        domain="Custom",
        tools=tools,
        overview_md=overview_text
    )

    # Run canonical gap detection
    gaps = PolicyGapDetector.detect_gaps(tools)
    canonical_questions = PolicyGapDetector.generate_interview_questions(tools, gaps)

    # Combine questions: dynamic AI questions first, deduplicated with canonical questions
    ai_questions = ai_audit.get("questions") or []
    seen_ids = set()
    combined_questions = []
    for q in ai_questions + canonical_questions:
        qid = q.get("id")
        if qid not in seen_ids:
            seen_ids.add(qid)
            combined_questions.append(InterviewQuestionSchema(**q))

    # Synthesize draft policy
    draft_yaml = PolicyCompiler.synthesize_policy(tools=tools, answers={}, agent_name=name)
    parsed_draft = yaml.safe_load(draft_yaml) or {}

    # Save project record
    record = ProjectRecord(
        id=proj_id,
        name=name,
        filename=file.filename,
        extracted_files=extracted_files,
        discovered_tools=tools,
        policy_yaml=draft_yaml,
        policy_json=parsed_draft
    )
    db.add(record)
    db.commit()

    # Auto-provision dual keys
    provision_dual_keys_for_project(
        db=db,
        project_id=proj_id,
        project_name=name
    )

    return DiscoveredToolsResponse(
        project_id=proj_id,
        filename=file.filename,
        extracted_files=extracted_files,
        tools=[ToolDefinitionSchema(**t) for t in tools],
        detected_gaps=gaps,
        draft_policy=parsed_draft,
        questions=combined_questions,
        detected_conflicts=ai_audit.get("conflicts"),
        missing_safeguards=ai_audit.get("missing_safeguards"),
        detected_privileges=ai_audit.get("privileges"),
        risk_summary=ai_audit.get("risk_summary"),
        model_used=ai_audit.get("model_used")
    )


@router.post("/interview-questions", response_model=InterviewQuestionsResponse)
def get_interview_questions(
    payload: Any = Body(...),
    api_key: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Generates context-aware security interview questions based on the 7 canonical policy gaps.
    Polymorphic: accepts either a raw list of ToolDefinitionSchema OR a request object with project_id and tools.
    """
    tools_dict: List[Dict[str, Any]] = []
    gaps_input: Optional[List[str]] = None
    req_api_key = api_key

    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                tools_dict.append(item)
            elif hasattr(item, "model_dump"):
                tools_dict.append(item.model_dump())
    elif isinstance(payload, dict):
        raw_tools = payload.get("tools") or []
        for item in raw_tools:
            if isinstance(item, dict):
                tools_dict.append(item)
            elif hasattr(item, "model_dump"):
                tools_dict.append(item.model_dump())

        proj_id = payload.get("project_id")
        if not tools_dict and proj_id:
            proj = db.query(ProjectRecord).filter(ProjectRecord.id == proj_id).first()
            if proj and proj.discovered_tools:
                tools_dict = proj.discovered_tools

        gaps_input = payload.get("gaps")
        if payload.get("api_key"):
            req_api_key = payload.get("api_key")

    detected_gaps = gaps_input if gaps_input is not None and len(gaps_input) > 0 else PolicyGapDetector.detect_gaps(tools_dict)
    questions = PolicyGapDetector.generate_interview_questions(tools_dict, detected_gaps)

    return InterviewQuestionsResponse(
        questions=[InterviewQuestionSchema(**q) for q in questions],
        gaps=detected_gaps
    )


@router.post("/synthesize", response_model=PolicySynthesizeResponse)
def synthesize_policy(
    req: PolicySynthesizeRequest,
    auth: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Compiles developer answers and tool limits into a typed contracts.yaml draft.
    Invariant #1: AI output is stored as an unapproved DRAFT (is_active=False) and statically linted;
    explicit human approval via /approve is required to freeze and activate it.
    """
    tools_dict = [t.model_dump() for t in (req.tools or [])]
    agent_name = req.agent_name

    # If tools list is empty and project_id is provided, load tools from project
    if not tools_dict and req.project_id:
        proj = db.query(ProjectRecord).filter(ProjectRecord.id == req.project_id).first()
        if proj:
            if proj.discovered_tools:
                tools_dict = proj.discovered_tools
            if proj.name:
                agent_name = proj.name

    try:
        yaml_str = PolicyCompiler.synthesize_policy(
            tools=tools_dict,
            answers=req.answers,
            agent_name=agent_name,
            tool_limits=req.tool_limits
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    try:
        parsed = yaml.safe_load(yaml_str) or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse generated YAML: {e}")

    lint_res = policy_compiler.lint_policy(parsed)

    policy_id = f"pol_{uuid.uuid4().hex[:8]}"
    record = PolicyRecord(
        id=policy_id,
        project_id=req.project_id,
        agent_name=agent_name,
        version="1.0.0-draft",
        yaml_content=yaml_str,
        parsed_json=parsed,
        is_active=False  # Invariant #1: Remains draft until developer approves
    )
    db.add(record)

    # Link policy to project if project_id is provided
    if req.project_id:
        proj = db.query(ProjectRecord).filter(ProjectRecord.id == req.project_id).first()
        if proj:
            proj.policy_yaml = yaml_str
            proj.policy_json = parsed

    db.commit()

    return PolicySynthesizeResponse(
        id=policy_id,
        policy_id=policy_id,
        project_id=req.project_id,
        yaml_content=yaml_str,
        contract_yaml=yaml_str,
        parsed_contract=parsed,
        policy=parsed,
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


def _lookup_policy(identifier: str, db: Session) -> Dict[str, Any]:
    """Helper to query policy by policy_id or project_id."""
    signed = policy_compiler.get_approved(identifier)
    if signed:
        return {
            "policy_id": signed.policy_id,
            "id": signed.policy_id,
            "project_id": None,
            "version": signed.version,
            "status": signed.status,
            "is_active": True,
            "approved_by": signed.approved_by,
            "sha256_signature": signed.sha256_signature,
            "immutable": signed.immutable,
            "yaml_content": signed.contract_yaml,
            "contract_yaml": signed.contract_yaml,
            "parsed_contract": signed.parsed_contract,
            "policy": signed.parsed_contract
        }

    rec = db.query(PolicyRecord).filter(
        (PolicyRecord.id == identifier) | (PolicyRecord.project_id == identifier)
    ).order_by(PolicyRecord.created_at.desc()).first()

    if rec:
        return {
            "policy_id": rec.id,
            "id": rec.id,
            "project_id": rec.project_id,
            "agent_name": rec.agent_name,
            "version": rec.version,
            "status": "APPROVED" if rec.is_active else "DRAFT",
            "is_active": rec.is_active,
            "yaml_content": rec.yaml_content,
            "contract_yaml": rec.yaml_content,
            "parsed_contract": rec.parsed_json or {},
            "policy": rec.parsed_json or {}
        }

    proj = db.query(ProjectRecord).filter(ProjectRecord.id == identifier).first()
    if proj and proj.policy_yaml:
        return {
            "policy_id": f"pol_{proj.id}",
            "id": f"pol_{proj.id}",
            "project_id": proj.id,
            "agent_name": proj.name,
            "version": "1.0.0-draft",
            "status": "DRAFT",
            "is_active": False,
            "yaml_content": proj.policy_yaml,
            "contract_yaml": proj.policy_yaml,
            "parsed_contract": proj.policy_json or {},
            "policy": proj.policy_json or {}
        }

    raise HTTPException(status_code=404, detail=f"Policy or project '{identifier}' not found.")


@router.get("/project/{project_id}")
def get_policy_by_project_id(project_id: str, db: Session = Depends(get_db)):
    """Retrieves compiled policy contract for a project by project ID."""
    return _lookup_policy(project_id, db)


@router.get("/{policy_id}")
def get_policy_by_id(policy_id: str, db: Session = Depends(get_db)):
    """Returns policy version or project policy by ID."""
    return _lookup_policy(policy_id, db)


@router.post("/download-bundle")
def download_guarded_bundle(
    payload: dict,
    auth: dict = Depends(require_auth)
):
    """Generates and streams a downloadable zip containing contracts.yaml, drop-in middleware, and integration guide."""
    from fastapi.responses import Response

    yaml_content = payload.get("yaml_content", "")
    agent_name = payload.get("agent_name", "GuardedAgent")
    zip_bytes = ZipToolExtractor.create_guarded_bundle_zip(yaml_content, agent_name=agent_name)

    filename = f"contractguard_{agent_name.lower().replace(' ', '_')}_bundle.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
