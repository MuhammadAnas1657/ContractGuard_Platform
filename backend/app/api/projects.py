"""
ContractGuard-X Project Management & Ingestion Router
Features: F5 (Project Management & Listings), F13 (Dual API Keys Auto-Provisioning)
"""
from __future__ import annotations
import uuid
import yaml
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import ProjectRecord, ApiKeyRecord, PolicyRecord, UserRecord
from ..models.schemas import (
    DiscoveredToolsResponse,
    ToolDefinitionSchema,
    InterviewQuestionSchema,
    ProjectCreateRequest,
    ProjectListItemResponse,
    ProjectDetailResponse,
    DualKeyInfoSchema
)
from ..core.zip_extractor import ZipToolExtractor
from ..core.policy_compiler import PolicyGapDetector, PolicyCompiler
from ..core.key_service import provision_dual_keys_for_project

router = APIRouter(prefix="/project", tags=["Projects & Ingestion"])


def _extract_project_dual_keys(db: Session, project: ProjectRecord) -> Dict[str, Optional[DualKeyInfoSchema]]:
    """Fetches or auto-provisions ingress and egress keys for a project."""
    keys = db.query(ApiKeyRecord).filter(
        ApiKeyRecord.project_id == project.id,
        ApiKeyRecord.is_active == True
    ).all()

    ingress_key = next((k for k in keys if k.key_type == "ingress"), None)
    egress_key = next((k for k in keys if k.key_type == "egress"), None)

    # Auto-provision dual keys if missing (e.g. legacy projects)
    if not ingress_key or not egress_key:
        prov = provision_dual_keys_for_project(
            db=db,
            project_id=project.id,
            project_name=project.name,
            user_id=project.user_id
        )
        keys = db.query(ApiKeyRecord).filter(
            ApiKeyRecord.project_id == project.id,
            ApiKeyRecord.is_active == True
        ).all()
        ingress_key = next((k for k in keys if k.key_type == "ingress"), None)
        egress_key = next((k for k in keys if k.key_type == "egress"), None)

    return {
        "ingress": DualKeyInfoSchema(
            key_id=ingress_key.id,
            key_prefix=ingress_key.key_prefix,
            key_type=ingress_key.key_type,
            is_active=ingress_key.is_active,
            created_at=str(ingress_key.created_at),
            last_used_at=str(ingress_key.last_used_at) if ingress_key.last_used_at else None
        ) if ingress_key else None,
        "egress": DualKeyInfoSchema(
            key_id=egress_key.id,
            key_prefix=egress_key.key_prefix,
            key_type=egress_key.key_type,
            is_active=egress_key.is_active,
            created_at=str(egress_key.created_at),
            last_used_at=str(egress_key.last_used_at) if egress_key.last_used_at else None
        ) if egress_key else None
    }


@router.post("/create")
def create_project(req: ProjectCreateRequest, db: Session = Depends(get_db)):
    """Creates a new project and auto-provisions dual API keys (Ingress and Egress)."""
    proj_id = f"proj_{uuid.uuid4().hex[:8]}"
    user_id = req.user_id
    if not user_id:
        first_user = db.query(UserRecord).first()
        user_id = first_user.id if first_user else "usr_default_dev"

    record = ProjectRecord(
        id=proj_id,
        user_id=user_id,
        name=req.name,
        filename=req.filename,
        extracted_files=[],
        discovered_tools=[]
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Auto-provision dual keys
    dual_keys = provision_dual_keys_for_project(
        db=db,
        project_id=proj_id,
        project_name=req.name,
        user_id=user_id
    )

    return {
        "id": proj_id,
        "name": record.name,
        "filename": record.filename,
        "user_id": user_id,
        "created_at": str(record.created_at),
        "dual_keys": {
            "ingress": dual_keys["ingress"],
            "egress": dual_keys["egress"]
        },
        "ingress_key": dual_keys["ingress"],
        "egress_key": dual_keys["egress"]
    }


@router.post("/upload-zip", response_model=DiscoveredToolsResponse)
async def upload_agent_zip(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    project_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Zero-Trust Developer Ingestion:
    Upload an agent .zip file to sandboxed AST parser. Extracts tools without running code,
    updates an existing project or creates a new project record, runs gap detection, and auto-provisions dual API keys.
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

    existing_proj = None
    if project_id:
        existing_proj = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()

    proj_id = existing_proj.id if existing_proj else f"proj_{uuid.uuid4().hex[:8]}"
    name = project_name or (existing_proj.name if existing_proj else file.filename.replace(".zip", ""))

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

    # Canonical gap detection for standard compliance
    gaps = PolicyGapDetector.detect_gaps(tools)
    canonical_questions = PolicyGapDetector.generate_interview_questions(tools, gaps)

    # Combine: dynamic AI questions first, deduplicated with canonical questions
    ai_questions = ai_audit.get("questions") or []
    seen_ids = set()
    combined_questions = []
    for q in ai_questions + canonical_questions:
        qid = q.get("id")
        if qid not in seen_ids:
            seen_ids.add(qid)
            combined_questions.append(InterviewQuestionSchema(**q))

    draft_yaml = PolicyCompiler.synthesize_policy(tools=tools, answers={}, agent_name=name)
    parsed_draft = yaml.safe_load(draft_yaml) or {}

    if existing_proj:
        existing_proj.name = name
        existing_proj.filename = file.filename
        existing_proj.extracted_files = extracted_files
        existing_proj.discovered_tools = tools
        existing_proj.policy_yaml = draft_yaml
        existing_proj.policy_json = parsed_draft
        db.commit()
        dual_keys = _extract_project_dual_keys(db, existing_proj)
    else:
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
        dual_keys = provision_dual_keys_for_project(
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
        dual_keys=dual_keys,
        detected_conflicts=ai_audit.get("conflicts"),
        missing_safeguards=ai_audit.get("missing_safeguards"),
        detected_privileges=ai_audit.get("privileges"),
        risk_summary=ai_audit.get("risk_summary"),
        model_used=ai_audit.get("model_used")
    )


@router.get("/{project_id}/integration-guide")
def get_project_integration_guide(project_id: str, db: Session = Depends(get_db)):
    """Generates project-tailored markdown integration guide with active dual keys."""
    from fastapi.responses import PlainTextResponse
    from ..core.guide_generator import generate_integration_guide

    proj = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    dual_keys = _extract_project_dual_keys(db, proj)
    ing_key = dual_keys["ingress"].raw_key if dual_keys.get("ingress") and dual_keys["ingress"].raw_key else (dual_keys["ingress"].key_prefix + "..." if dual_keys.get("ingress") else "cgx_ing_your_key")
    egr_key = dual_keys["egress"].raw_key if dual_keys.get("egress") and dual_keys["egress"].raw_key else (dual_keys["egress"].key_prefix + "..." if dual_keys.get("egress") else "cgx_egr_your_key")

    guide_md = generate_integration_guide(
        project_name=proj.name,
        domain=(proj.policy_json or {}).get("domain", "Custom"),
        ingress_key=ing_key,
        egress_key=egr_key
    )
    clean_filename = f"ContractGuard_Integration_Guide_{proj.name.replace(' ', '_')}.md"
    return PlainTextResponse(
        content=guide_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{clean_filename}"'}
    )


@router.get("/list", response_model=List[ProjectListItemResponse])
def list_projects(db: Session = Depends(get_db)):
    """Lists all registered projects with dual key prefixes, tool counts, and policy statuses."""
    projects = db.query(ProjectRecord).order_by(ProjectRecord.created_at.desc()).all()
    results = []

    for proj in projects:
        dual_keys = _extract_project_dual_keys(db, proj)
        ing_prefix = dual_keys["ingress"].key_prefix if dual_keys.get("ingress") else None
        egr_prefix = dual_keys["egress"].key_prefix if dual_keys.get("egress") else None

        policy = db.query(PolicyRecord).filter(PolicyRecord.project_id == proj.id).first()
        policy_status = "NONE"
        if policy:
            policy_status = "APPROVED" if policy.is_active else "DRAFT"

        results.append(ProjectListItemResponse(
            id=proj.id,
            name=proj.name,
            filename=proj.filename,
            user_id=proj.user_id,
            created_at=str(proj.created_at),
            tools_count=len(proj.discovered_tools or []),
            extracted_files_count=len(proj.extracted_files or []),
            policy_status=policy_status,
            ingress_key_prefix=ing_prefix,
            egress_key_prefix=egr_prefix,
            dual_keys=dual_keys
        ))

    return results


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project_details(project_id: str, db: Session = Depends(get_db)):
    """Retrieves detailed project metadata, extracted files, discovered tools, active policy, and dual keys."""
    proj = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    dual_keys = _extract_project_dual_keys(db, proj)
    policy_rec = (
        db.query(PolicyRecord)
        .filter(PolicyRecord.project_id == project_id)
        .order_by(PolicyRecord.is_active.desc(), PolicyRecord.created_at.desc())
        .first()
    )
    policy_data = None
    policy_status = "NONE"
    policy_yaml = proj.policy_yaml
    if policy_rec:
        policy_status = "APPROVED" if policy_rec.is_active else "DRAFT"
        policy_yaml = policy_rec.yaml_content or proj.policy_yaml
        policy_data = {
            "id": policy_rec.id,
            "version": policy_rec.version,
            "is_active": policy_rec.is_active,
            "parsed_contract": policy_rec.parsed_json or {},
            "yaml_content": policy_rec.yaml_content
        }
    elif proj.policy_yaml:
        policy_status = "DRAFT"

    return ProjectDetailResponse(
        id=proj.id,
        name=proj.name,
        filename=proj.filename,
        user_id=proj.user_id,
        created_at=str(proj.created_at),
        tools_count=len(proj.discovered_tools or []),
        extracted_files=proj.extracted_files or [],
        discovered_tools=proj.discovered_tools or [],
        policy=policy_data,
        policy_yaml=policy_yaml,
        policy_status=policy_status,
        dual_keys=dual_keys
    )


@router.post("/{project_id}/generate-keys")
def generate_project_keys(project_id: str, db: Session = Depends(get_db)):
    """
    Methodology Invariant #1: Policy-First API Key Gating.
    Strictly verifies that the project's security policy is APPROVED before issuing production dual API keys.
    """
    proj = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    policy_rec = (
        db.query(PolicyRecord)
        .filter(PolicyRecord.project_id == project_id, PolicyRecord.is_active == True)
        .first()
    )
    if not policy_rec:
        raise HTTPException(
            status_code=400,
            detail="Security Policy approval required before generating Production API keys (Methodology Invariant #1). Please complete the AI Policy Architect interview and approve the policy."
        )

    # Deactivate old keys for this project
    old_keys = db.query(ApiKeyRecord).filter(ApiKeyRecord.project_id == project_id, ApiKeyRecord.is_active == True).all()
    for k in old_keys:
        k.is_active = False
    db.commit()

    # Provision new dual keys
    dual_keys = provision_dual_keys_for_project(
        db=db,
        project_id=proj.id,
        project_name=proj.name,
        user_id=proj.user_id
    )
    return {
        "project_id": proj.id,
        "policy_id": policy_rec.id,
        "policy_version": policy_rec.version,
        "status": "KEYS_GENERATED",
        "dual_keys": dual_keys,
        "ingress_key": dual_keys["ingress"],
        "egress_key": dual_keys["egress"]
    }


@router.post("/{project_id}/rotate-keys")
def rotate_project_dual_keys(project_id: str, db: Session = Depends(get_db)):
    """Revokes existing project API keys and provisions a fresh pair of Ingress and Egress keys with one-time raw_key reveal."""
    proj = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Deactivate old keys for this project
    old_keys = db.query(ApiKeyRecord).filter(ApiKeyRecord.project_id == project_id, ApiKeyRecord.is_active == True).all()
    for k in old_keys:
        k.is_active = False
    db.commit()

    # Provision new dual keys
    dual_keys = provision_dual_keys_for_project(
        db=db,
        project_id=proj.id,
        project_name=proj.name,
        user_id=proj.user_id
    )
    return {
        "project_id": proj.id,
        "dual_keys": dual_keys,
        "ingress_key": dual_keys["ingress"],
        "egress_key": dual_keys["egress"]
    }


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Deletes a project and revokes its associated API keys."""
    proj = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Revoke keys
    keys = db.query(ApiKeyRecord).filter(ApiKeyRecord.project_id == project_id).all()
    for k in keys:
        k.is_active = False

    db.delete(proj)
    db.commit()
    return {"status": "DELETED", "project_id": project_id}


@router.post("/tools/discover", response_model=DiscoveredToolsResponse)
def discover_preset_tools(template: str = "customer_support"):
    """Returns sample agent tools without needing to upload a zip file."""
    tools = ZipToolExtractor.get_preset_template(template)
    return DiscoveredToolsResponse(
        project_id=f"preset_{template}",
        filename=f"{template}.py",
        extracted_files=[f"{template}.py"],
        tools=[ToolDefinitionSchema(**t) for t in tools]
    )
