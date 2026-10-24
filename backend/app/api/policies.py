import uuid
import yaml
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.db_models import PolicyRecord
from ..models.schemas import (
    ToolDefinitionSchema,
    InterviewQuestionSchema,
    InterviewQuestionsResponse,
    PolicySynthesizeRequest,
    PolicySynthesizeResponse,
    PolicyValidateRequest,
    PolicyValidateResponse
)
from ..core.nebius_client import nebius_service

router = APIRouter(prefix="/policy", tags=["Policies"])

@router.post("/interview-questions", response_model=InterviewQuestionsResponse)
def get_interview_questions(
    tools: List[ToolDefinitionSchema],
    api_key: str = None
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
    db: Session = Depends(get_db)
):
    """Compiles developer answers into a mathematically verified contracts.yaml via Nemotron-70B."""
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

    policy_id = f"pol_{uuid.uuid4().hex[:8]}"
    record = PolicyRecord(
        id=policy_id,
        agent_name=req.agent_name,
        yaml_content=yaml_str,
        parsed_json=parsed,
        is_active=True
    )
    db.add(record)
    db.commit()

    return PolicySynthesizeResponse(
        yaml_content=yaml_str,
        parsed_contract=parsed,
        policy_id=policy_id
    )

@router.post("/validate", response_model=PolicyValidateResponse)
def validate_policy_yaml(req: PolicyValidateRequest):
    """Validates arbitrary YAML against the ContractGuard schema."""
    errors = []
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
    except Exception as e:
        errors.append(f"YAML Syntax Error: {e}")

    return PolicyValidateResponse(
        valid=len(errors) == 0,
        errors=errors,
        parsed_contract=parsed if len(errors) == 0 else None
    )

@router.post("/download-bundle")
def download_guarded_bundle(payload: dict):
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

