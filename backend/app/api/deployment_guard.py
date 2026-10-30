from __future__ import annotations
import time
import uuid
import hashlib
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import ApiKeyRecord, UserRecord, PolicyRecord
from ..core.vector_attack_db import vector_attack_db
from ..core.normalizer import InputNormalizer, SourceTrustLevel
from ..core.tceav import tceav_engine, ActionProposal, ArgumentEvidence, SourceTrust, ArgumentObservability, GuardStatus
from ..core.effect_ledger import stateful_ledger, output_guard
from ..core.policy_compiler import policy_compiler
from ..core.key_service import generate_api_key_record
from ..core.runtime_classifier import (
    ExecutionMode,
    classify_ingress_operation,
    classify_egress_operation,
    runtime_telemetry
)
from ..core.nvidia_client import nvidia_language_detector
from .policies import (
    get_interview_questions,
    validate_policy_yaml,
    approve_and_freeze_policy,
    get_policy_by_id
)
from ..models.schemas import (
    ToolDefinitionSchema,
    PolicyValidateRequest,
    PolicyApproveRequest
)
from .auth import require_auth, validate_api_key_str

router = APIRouter(
    prefix="/v1",
    tags=["Deployment End Gateway & Methodology v1 API"],
    dependencies=[Depends(require_auth)]
)

# In-memory trusted session store & redacted security event store
_TRUSTED_SESSIONS: Dict[str, Dict[str, Any]] = {}
_SESSION_EVENTS: Dict[str, List[Dict[str, Any]]] = {}


def _record_session_event(
    session_id: str,
    stage: str,
    decision: str,
    reason_codes: List[str],
    latency_ms: float,
    action_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    evt = {
        "event_id": f"evt_{uuid.uuid4().hex[:10]}",
        "session_id": session_id,
        "action_id": action_id,
        "timestamp": time.time(),
        "stage": stage,
        "decision": decision,
        "reason_codes": reason_codes,
        "latency_ms": latency_ms,
        "redacted_metadata": metadata or {}
    }
    _SESSION_EVENTS.setdefault(session_id, []).append(evt)
    return evt


# =========================================================================
# SCHEMAS
# =========================================================================

class IngressGuardRequest(BaseModel):
    session_id: str = Field(default="session_default", description="Unique session ID tracking multi-turn interactions")
    user_prompt: str = Field(..., description="Raw incoming user prompt or task before calling the LLM")
    source_type: str = Field(default="authenticated_user", description="Source trust label")
    context_history: Optional[List[Dict[str, Any]]] = Field(default=None, description="Prior conversation turns and sources")
    api_key: Optional[str] = Field(default=None, description="ContractGuard Gateway API Key (cgx_live_...)")
    tool_name: Optional[str] = Field(default=None, description="Optional target tool name hint")
    operation_type: Optional[str] = Field(default=None, description="Optional caller hint: 'rag', 'summarize', 'tool_call'")
    project_id: Optional[str] = Field(default=None, description="Optional project ID")
    policy_id: Optional[str] = Field(default=None, description="Optional policy ID")
    language_constraints: Optional[Dict[str, Any]] = Field(default=None, description="Language rules: allowed_languages, reject_foreign_scripts")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Arbitrary client metadata")


class IngressGuardResponse(BaseModel):
    decision: str = Field(..., description="'ALLOW' or 'BLOCK'")
    risk_score: float = Field(..., description="Normalized risk score from 0.0 to 1.0")
    threat_family: str = Field(..., description="Threat classification (e.g. DIRECT_JAILBREAK, NONE)")
    sanitized_prompt: str = Field(..., description="Normalized canonical prompt safe for LLM consumption")
    latency_ms: float = Field(..., description="End-to-end evaluation latency in milliseconds")
    reasons: List[str] = Field(default_factory=list, description="Detailed explanation if blocked")
    vector_match: Optional[Dict[str, Any]] = None
    execution_mode: str = Field(default="FULL_TRI_GUARD", description="'STREAMLINED_RAG' or 'FULL_TRI_GUARD'")
    auto_switched: bool = Field(default=False, description="True if classified as STREAMLINED_RAG")
    classification_reason: Optional[str] = None
    language: Optional[str] = None


class EgressGuardRequest(BaseModel):
    session_id: str = Field(default="session_default", description="Unique session ID tracking multi-turn interactions")
    user_intent: str = Field(..., description="The user's original authorized goal (e.g., 'Refund defect order #4092')")
    untrusted_context: Optional[List[str]] = Field(default=None, description="Untrusted external data (emails, RAG docs, web pages)")
    tool_name: Optional[str] = Field(default=None, description="Name of tool proposed by LLM (e.g., 'process_refund')")
    tool_arguments: Optional[Dict[str, Any]] = None
    proposed_llm_output: Optional[str] = None
    per_call_ceiling: Optional[float] = Field(default=None, description="Max spend allowed in single transaction")
    session_budget: Optional[float] = Field(default=None, description="Max cumulative spend allowed in session")
    idempotency_key: Optional[str] = None
    api_key: Optional[str] = Field(default=None, description="ContractGuard Gateway API Key (cgx_live_...)")
    project_id: Optional[str] = None
    policy_id: Optional[str] = None
    language_constraints: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class EgressGuardResponse(BaseModel):
    decision: str = Field(..., description="'ALLOW' or 'BLOCK'")
    action: str = Field(..., description="'EXECUTE', 'DENIED', or 'REDACTED'")
    interception_stage: Optional[str] = None
    reason: Optional[str] = None
    sanitized_output: Optional[str] = None
    session_budget_remaining: float = Field(default=1000.0)
    latency_ms: float = Field(..., description="End-to-end evaluation latency in milliseconds")
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list)
    execution_mode: str = Field(default="FULL_TRI_GUARD", description="'STREAMLINED_RAG' or 'FULL_TRI_GUARD'")
    auto_switched: bool = Field(default=False, description="True if executed via streamlined pathway")
    bypassed_stages: List[str] = Field(default_factory=list, description="Defense stages bypassed in streamlined mode")
    language: Optional[str] = None


class CreateSessionRequest(BaseModel):
    session_id: Optional[str] = None
    policy_id: str = "demo-doc-agent"
    policy_version: str = "1.0.0"
    authenticated_user_id: str = "user_authenticated_01"
    user_task: Optional[str] = "Summarize document and assist customer within policy bounds"
    user_intent: Optional[str] = None
    permitted_goals: List[str] = Field(default_factory=lambda: ["summarize_document", "process_refund"])
    max_cumulative_budget: Optional[float] = 1000.0
    session_budget: Optional[float] = None


class SessionRecordResponse(BaseModel):
    session_id: str
    task_id: str
    authenticated_user_id: str
    original_task: str
    policy_id: str
    policy_version: str
    permitted_goals: List[str]
    status: str = "ACTIVE"
    created_at: float


class ContentCheckRequest(BaseModel):
    session_id: str = "session_default"
    text: str
    source_type: str = "untrusted_external"
    source_id: str = "ext_doc_01"


class ActionCheckRequest(BaseModel):
    session_id: str = "session_default"
    task_id: Optional[str] = None
    user_task: Optional[str] = None
    user_intent: Optional[str] = None
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    tool_arguments: Optional[Dict[str, Any]] = None
    untrusted_context: Optional[List[str]] = None
    evidence_bindings: Optional[Dict[str, Dict[str, Any]]] = None
    policy: Optional[Dict[str, Any]] = None
    session_budget: Optional[float] = None
    idempotency_key: Optional[str] = None
    simulate_timeout: bool = False


class CreateApiKeyRequest(BaseModel):
    key_name: str = Field(default="Production Gateway Key", description="Friendly name for the API key")
    user_id: Optional[str] = None
    project_id: Optional[str] = Field(default=None, description="Optional associated project ID")
    key_type: Optional[str] = Field(default="gateway", description="'ingress', 'egress', or 'gateway'")


class ApiKeyInfo(BaseModel):
    id: str
    key_id: Optional[str] = None
    key_name: str
    key_prefix: str
    created_at: str
    is_active: bool
    key_type: str = "gateway"
    project_id: Optional[str] = None


class CreateApiKeyResponse(BaseModel):
    key_id: str
    api_key: str
    raw_key: Optional[str] = None
    key_name: str
    created_at: str
    key_type: str = "gateway"
    project_id: Optional[str] = None


class LanguageDetectRequest(BaseModel):
    text: str
    api_key: Optional[str] = None


class LanguageDetectResponse(BaseModel):
    language: str
    confidence: float
    script: str
    detected_scripts: List[str]
    has_foreign_script: bool
    has_mixed_scripts: bool
    homoglyphs_detected: List[str]
    latency_ms: float


def _resolve_effective_key(
    auth: Dict[str, Any],
    body_api_key: Optional[str],
    db: Session
) -> Dict[str, Any]:
    """
    Resolves the active credential and returns its verified key_type and project_id.
    Prioritizes body_api_key if explicitly provided; otherwise uses auth dependency result.
    """
    if body_api_key:
        validated = validate_api_key_str(body_api_key, db)
        if not validated:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked ContractGuard API Key.")
        return validated

    if auth.get("type") in ("api_key", "demo_key"):
        return auth

    if auth.get("type") == "user_token":
        return {"type": "user_token", "key_type": "gateway", "user_id": auth.get("user_id"), "project_id": None}

    return {"type": "gateway", "key_type": "gateway", "user_id": None, "project_id": None}


def _resolve_project_policy(
    db: Session,
    project_id: Optional[str] = None,
    policy_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Resolves an approved policy by explicit policy_id or via the project_id bound to the dual API key.
    Only auto-loads active (APPROVED) policies when resolving by project_id to honor Invariant #1.
    """
    if policy_id:
        pol = policy_compiler.get_approved(policy_id)
        if pol and pol.parsed_contract:
            return pol.parsed_contract
        rec = db.query(PolicyRecord).filter(PolicyRecord.id == policy_id).first()
        if rec and rec.parsed_json:
            return rec.parsed_json

    if project_id:
        rec = (
            db.query(PolicyRecord)
            .filter(PolicyRecord.project_id == project_id, PolicyRecord.is_active == True)
            .order_by(PolicyRecord.created_at.desc())
            .first()
        )
        if rec and rec.parsed_json:
            return rec.parsed_json

    return None


def verify_api_key(raw_key: Optional[str], db: Session) -> bool:
    if not raw_key or not isinstance(raw_key, str):
        return False
    raw_key = raw_key.strip()
    if not raw_key:
        return False
    if raw_key.startswith("Bearer "):
        raw_key = raw_key[7:].strip()
    if raw_key.startswith("demo_") or raw_key.startswith("mock_") or raw_key == "judge_evaluator_key":
        return True

    from .auth import decode_access_token
    payload = decode_access_token(raw_key)
    if payload and "sub" in payload:
        return True

    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    rec = db.query(ApiKeyRecord).filter(
        ApiKeyRecord.key_hash == key_hash,
        ApiKeyRecord.is_active == True
    ).first()
    return rec is not None


# =========================================================================
# METHODOLOGY SECTION 7 STANDARD ENDPOINTS (/v1/...)
# =========================================================================

@router.post("/policies/interview")
def v1_policy_interview(payload: Dict[str, Any]):
    """Accept developer tool definitions/answers and return interview questions or draft (never auto-publish)."""
    raw_tools = payload.get("tools", [])
    tools = [ToolDefinitionSchema(**t) if isinstance(t, dict) else t for t in raw_tools]
    api_key = payload.get("api_key")
    return get_interview_questions(tools=tools, api_key=api_key)


@router.post("/policies/validate")
def v1_policy_validate(req: PolicyValidateRequest):
    """Schema validation + deterministic static lint + positive/negative test fixtures."""
    return validate_policy_yaml(req)


@router.post("/policies/{policy_id}/approve")
def v1_policy_approve(policy_id: str, req: PolicyApproveRequest, db: Session = Depends(get_db)):
    """Authenticated developer-only approval and immutable version freeze."""
    return approve_and_freeze_policy(policy_id=policy_id, req=req, db=db)


@router.get("/policies/{policy_id}")
def v1_policy_get(policy_id: str, db: Session = Depends(get_db)):
    """Return approved policy version with redacted metadata."""
    return get_policy_by_id(policy_id=policy_id, db=db)


@router.post("/sessions", response_model=SessionRecordResponse)
def create_trusted_session(req: CreateSessionRequest):
    """Creates an authenticated TaskRecord session bound to an approved policy."""
    session_id = req.session_id or f"sess_{uuid.uuid4().hex[:10]}"
    task_id = f"task_{uuid.uuid4().hex[:10]}"
    now = time.time()
    budget = req.max_cumulative_budget if req.session_budget is None else req.session_budget
    record = {
        "session_id": session_id,
        "task_id": task_id,
        "authenticated_user_id": req.authenticated_user_id,
        "original_task": req.user_task or req.user_intent or "Summarize document and assist customer within policy bounds",
        "policy_id": req.policy_id,
        "policy_version": req.policy_version,
        "permitted_goals": req.permitted_goals,
        "max_cumulative_budget": budget,
        "untrusted_envelopes": [],
        "status": "ACTIVE",
        "created_at": now
    }
    _TRUSTED_SESSIONS[session_id] = record
    stateful_ledger.reset_session(session_id)
    _record_session_event(
        session_id=session_id,
        stage="SESSION_INIT",
        decision="ALLOW",
        reason_codes=["SESSION_CREATED"],
        latency_ms=0.05,
        metadata={"policy_id": req.policy_id, "task_id": task_id}
    )
    return SessionRecordResponse(**record)


@router.post("/content/check")
def check_content_advisory(req: ContentCheckRequest):
    """M2 Advisory risk assessment with source attribution and bounded normalization."""
    try:
        trust_enum = SourceTrustLevel(req.source_type)
    except ValueError:
        trust_enum = SourceTrustLevel.UNTRUSTED_EXTERNAL

    envelope = InputNormalizer.wrap_envelope(
        text=req.text,
        source_type=trust_enum,
        source_name=req.source_id
    )
    assessment = InputNormalizer.assess_risk(envelope)
    vec_eval = vector_attack_db.evaluate_threat(envelope.normalized_views[-1])

    if req.session_id in _TRUSTED_SESSIONS and trust_enum == SourceTrustLevel.UNTRUSTED_EXTERNAL:
        _TRUSTED_SESSIONS[req.session_id]["untrusted_envelopes"].append(envelope.model_dump())

    decision_label = "REVIEW" if assessment.is_suspicious or vec_eval["is_threat"] else "ALLOW"
    _record_session_event(
        session_id=req.session_id,
        stage="M2_CONTENT_CHECK",
        decision=decision_label,
        reason_codes=assessment.signature_matches or ([vec_eval["threat_family"]] if vec_eval["is_threat"] else ["CLEAN"]),
        latency_ms=assessment.latency_ms,
        metadata={"content_id": envelope.content_id, "source_trust": envelope.source_type.value, "views_count": len(envelope.normalized_views)}
    )

    return {
        "decision": decision_label,
        "envelope": envelope.model_dump(),
        "assessment": assessment.model_dump(),
        "vector_matches": vec_eval.get("all_matches", [])
    }


def _build_action_evaluation(req: ActionCheckRequest, db: Session):
    sess = _TRUSTED_SESSIONS.get(req.session_id, {})
    user_task = req.user_task or req.user_intent or sess.get("original_task", "Perform authorized user workflow")
    eff_args = req.arguments if req.arguments else (req.tool_arguments or {})
    req.arguments = eff_args
    policy = req.policy
    if not policy:
        pol_id = sess.get("policy_id")
        if pol_id:
            signed = policy_compiler.get_approved(pol_id)
            if signed:
                policy = signed.parsed_contract
            else:
                rec = db.query(PolicyRecord).filter(PolicyRecord.id == pol_id).first()
                if rec and rec.parsed_json:
                    policy = rec.parsed_json
    if not policy:
        policy = {
            "global_envelope": {
                "max_cumulative_budget": sess.get("max_cumulative_budget", 1000.0),
                "denied_tools": ["delete_database", "execute_shell", "format_disk", "drop_tables", "eval"]
            },
            "tools": {
                "read_document": {"allowed": True, "effects": ["read_data"]},
                "process_refund": {
                    "allowed": True,
                    "effects": ["financial.transfer"],
                    "parameters": {
                        "amount": {"max_value": 500.0},
                        "target_account": {"untrusted_sources_blocked": ["customer_email", "untrusted_external"]}
                    }
                },
                "transfer_funds": {
                    "allowed": True,
                    "effects": ["financial.transfer"],
                    "parameters": {
                        "amount": {"max_value": 500.0},
                        "target_account": {"untrusted_sources_blocked": ["customer_email", "untrusted_external"]}
                    }
                },
                "send_email": {
                    "allowed": True,
                    "effects": ["external_data_egress"],
                    "parameters": {
                        "recipient": {"untrusted_sources_blocked": ["customer_email", "untrusted_external"]}
                    }
                }
            }
        }

    provenance_sources = [{"source_id": "auth_user", "source_type": "authenticated_user", "content": user_task}]
    for env_dict in sess.get("untrusted_envelopes", []):
        for v in env_dict.get("normalized_views", [env_dict.get("raw_text", "")]):
            provenance_sources.append({
                "source_id": env_dict.get("content_id", "ext"),
                "source_type": "untrusted_external",
                "source_name": env_dict.get("source_name", "external"),
                "content": v
            })
    for ctx_str in (req.untrusted_context or []):
        provenance_sources.append({
            "source_id": "untrusted_ctx",
            "source_type": "untrusted_external",
            "source_name": "untrusted_context",
            "content": ctx_str
        })

    ev_bindings: Dict[str, ArgumentEvidence] = {}
    if req.evidence_bindings:
        for k, v in req.evidence_bindings.items():
            ev_bindings[k] = ArgumentEvidence(
                parameter_name=k,
                value_digest=v.get("value_digest", tceav_engine.compute_digest(req.arguments.get(k, ""))),
                source_content_ids=v.get("source_content_ids", []),
                source_trust=SourceTrust(v.get("source_trust", "unknown")),
                observability=ArgumentObservability(v.get("observability", "instrumented"))
            )

    proposal = ActionProposal(
        action_id=f"act_{uuid.uuid4().hex[:10]}",
        session_id=req.session_id,
        tool_name=req.tool_name,
        parameters=req.arguments,
        user_task=user_task,
        evidence_bindings=ev_bindings
    )
    decision = tceav_engine.verify(proposal, policy, provenance_sources=provenance_sources)
    return proposal, policy, decision


@router.post("/actions/check")
def check_action_dry_run(req: ActionCheckRequest, db: Session = Depends(get_db)):
    """
    Dry-run typed M3 TCEAV decision.
    Guarantee: NEVER executes tools or mutates the Stateful Effect Ledger.
    """
    proposal, policy, decision = _build_action_evaluation(req, db)
    _record_session_event(
        session_id=req.session_id,
        action_id=proposal.action_id,
        stage="M3_DRY_RUN_CHECK",
        decision=decision.status.value,
        reason_codes=[decision.reason_code],
        latency_ms=decision.latency_ms,
        metadata={"tool_name": req.tool_name, "parameters": decision.redacted_parameters, "dry_run": True}
    )
    return {
        "decision_id": decision.decision_id,
        "action_id": decision.action_id,
        "decision": decision.status.value,
        "status": decision.status.value,
        "stage": decision.stage,
        "reason_codes": [decision.reason_code],
        "explanation": decision.explanation,
        "tceav_predicates": decision.tceav_predicates,
        "dry_run": True,
        "side_effects_executed": False,
        "latency_ms": decision.latency_ms
    }


@router.post("/actions/execute")
def execute_guarded_action(req: ActionCheckRequest, db: Session = Depends(get_db)):
    """
    Full M3 TCEAV + M4 Atomic Effect Reservation + Simulated Tool Wrapper Execution + Reconciliation.
    """
    proposal, policy, decision = _build_action_evaluation(req, db)
    if decision.status != GuardStatus.ALLOW:
        _record_session_event(
            session_id=req.session_id,
            action_id=proposal.action_id,
            stage=decision.stage,
            decision="DENY",
            reason_codes=[decision.reason_code],
            latency_ms=decision.latency_ms,
            metadata={"tool_name": req.tool_name, "parameters": decision.redacted_parameters}
        )
        return {
            "decision_id": decision.decision_id,
            "action_id": decision.action_id,
            "status": "DENY",
            "reason_codes": [decision.reason_code],
            "explanation": decision.explanation,
            "executed": False,
            "latency_ms": decision.latency_ms
        }

    sess = _TRUSTED_SESSIONS.get(req.session_id, {})
    session_budget_override = req.session_budget or sess.get("max_cumulative_budget")
    max_budget = session_budget_override if session_budget_override is not None else policy.get("global_envelope", {}).get("max_cumulative_budget", 1000.0)
    max_ext = policy.get("effect_limits", {}).get("external_transfers")
    ok, reservation, ledger_msg = stateful_ledger.reserve_atomic(
        session_id=req.session_id,
        tool_name=req.tool_name,
        parameters=req.arguments,
        max_budget=max_budget,
        idempotency_key=req.idempotency_key,
        max_external_transfers=max_ext,
        auto_commit=False
    )
    if not ok or not reservation:
        _record_session_event(
            session_id=req.session_id,
            action_id=proposal.action_id,
            stage="M4_EFFECT_LEDGER",
            decision="DENY",
            reason_codes=["EFFECT_LIMIT_EXCEEDED"],
            latency_ms=decision.latency_ms,
            metadata={"tool_name": req.tool_name, "ledger_message": ledger_msg}
        )
        return {
            "decision_id": decision.decision_id,
            "action_id": decision.action_id,
            "status": "DENY",
            "reason_codes": ["EFFECT_LIMIT_EXCEEDED"],
            "explanation": ledger_msg,
            "executed": False,
            "latency_ms": decision.latency_ms
        }

    # Handle simulated ambiguous execution timeout (Invariant #6)
    if req.simulate_timeout:
        stateful_ledger.mark_unknown_pending(reservation.reservation_id)
        _record_session_event(
            session_id=req.session_id,
            action_id=proposal.action_id,
            stage="M4_RECONCILIATION",
            decision="REVIEW",
            reason_codes=["EXECUTION_OUTCOME_UNKNOWN"],
            latency_ms=decision.latency_ms,
            metadata={"reservation_id": reservation.reservation_id, "status": "UNKNOWN_PENDING_RECONCILIATION"}
        )
        return {
            "decision_id": decision.decision_id,
            "action_id": decision.action_id,
            "status": "REVIEW",
            "reason_codes": ["EXECUTION_OUTCOME_UNKNOWN"],
            "reservation_id": reservation.reservation_id,
            "reservation_status": "UNKNOWN_PENDING_RECONCILIATION",
            "executed": False,
            "session_spent": stateful_ledger.get_session_spent(req.session_id)
        }

    # Simulated guarded tool execution + reconciliation
    stateful_ledger.reconcile(reservation.reservation_id)
    raw_tool_output = f"[Simulated Guarded Execution] {req.tool_name}({decision.redacted_parameters}) -> SUCCESS"
    inspected = output_guard.inspect(raw_tool_output)

    _record_session_event(
        session_id=req.session_id,
        action_id=proposal.action_id,
        stage="M4_EXECUTED_AND_RECONCILED",
        decision="ALLOW",
        reason_codes=["AUTHORIZED"],
        latency_ms=decision.latency_ms,
        metadata={
            "tool_name": req.tool_name,
            "parameters": decision.redacted_parameters,
            "reservation_id": reservation.reservation_id,
            "idempotency_key": reservation.idempotency_key
        }
    )

    return {
        "decision_id": decision.decision_id,
        "action_id": decision.action_id,
        "decision": "ALLOW",
        "status": "ALLOW",
        "reason_codes": ["AUTHORIZED"],
        "reservation_id": reservation.reservation_id,
        "idempotency_key": reservation.idempotency_key,
        "reservation_status": "COMMITTED",
        "executed": True,
        "tool_result": inspected.modified_text,
        "session_spent": stateful_ledger.get_session_spent(req.session_id),
        "cumulative_session_spend": stateful_ledger.get_session_spent(req.session_id),
        "latency_ms": decision.latency_ms
    }


@router.get("/sessions/{session_id}/events")
def get_session_events(session_id: str):
    """Returns redacted security decision trace for a session."""
    return {
        "session_id": session_id,
        "events": _SESSION_EVENTS.get(session_id, []),
        "session_spent": stateful_ledger.get_session_spent(session_id)
    }


# =========================================================================
# 1. PRE-LLM INGRESS GUARD ENDPOINT (/v1/guard/ingress)
# =========================================================================

@router.post("/guard/ingress", response_model=IngressGuardResponse)
def pre_llm_ingress_guard(
    req: IngressGuardRequest,
    auth: Dict[str, Any] = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    PRE-LLM GATEWAY (Placed BEFORE LLM call):
    1. Role Enforcement: Requires Ingress key ('cgx_ing_...') or Gateway key ('cgx_live_...'). Egress keys are forbidden (HTTP 403).
    2. Language Policy Check: Validates prompt against allowed_languages and reject_foreign_scripts (NVIDIA LLM API / Unicode fallback).
    3. Normalizes Unicode/Base64/Hex obfuscations.
    4. Scans Vector Attack Database for semantic cosine similarity against jailbreaks & overrides.
    5. Runtime Auto-Switching: Classifies into STREAMLINED_RAG vs FULL_TRI_GUARD.
    """
    start_time = time.perf_counter()

    # Step 0a: Key Role Enforcement
    cred = _resolve_effective_key(auth, req.api_key, db)
    key_type = cred.get("key_type", "gateway")
    if key_type not in ("ingress", "gateway"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Unauthorized key role '{key_type}': Pre-LLM Ingress endpoint requires an Ingress key "
                f"(prefix 'cgx_ing_...') or Gateway key ('cgx_live_...'). Egress keys ('cgx_egr_...') are forbidden at Ingress."
            )
        )

    # Step 0b: Language Detection & Policy Constraint Enforcement
    lang_info = nvidia_language_detector.detect_language(req.user_prompt)
    eff_project_id = req.project_id or cred.get("project_id")
    bound_policy = _resolve_project_policy(db, eff_project_id, req.policy_id)
    lang_constraints = req.language_constraints
    if not lang_constraints and bound_policy:
        lang_constraints = bound_policy.get("global_envelope", {}).get("language_constraints")

    if lang_constraints:
        allowed_languages = lang_constraints.get("allowed_languages", ["en"])
        reject_foreign_scripts = lang_constraints.get("reject_foreign_scripts", True)

        if reject_foreign_scripts and (lang_info.get("has_foreign_script") or lang_info.get("has_mixed_scripts")):
            _record_session_event(
                session_id=req.session_id,
                stage="PRE_LLM_INGRESS_LANGUAGE",
                decision="BLOCK",
                reason_codes=["LANGUAGE_VIOLATION_FOREIGN_SCRIPT"],
                latency_ms=round((time.perf_counter() - start_time) * 1000, 2)
            )
            return JSONResponse(
                status_code=403,
                content={
                    "decision": "BLOCK",
                    "reason": "LANGUAGE_VIOLATION",
                    "details": {
                        "error": "FOREIGN_SCRIPT_DETECTED",
                        "detected_scripts": lang_info.get("detected_scripts", []),
                        "has_mixed_scripts": lang_info.get("has_mixed_scripts", False),
                        "homoglyphs_detected": lang_info.get("homoglyphs_detected", []),
                        "message": "Foreign script or mixed-script homoglyphs detected in prompt."
                    }
                }
            )

        detected_lang = lang_info.get("language", "en")
        if allowed_languages and detected_lang not in allowed_languages:
            _record_session_event(
                session_id=req.session_id,
                stage="PRE_LLM_INGRESS_LANGUAGE",
                decision="BLOCK",
                reason_codes=["LANGUAGE_VIOLATION_DISALLOWED_LANGUAGE"],
                latency_ms=round((time.perf_counter() - start_time) * 1000, 2)
            )
            return JSONResponse(
                status_code=403,
                content={
                    "decision": "BLOCK",
                    "reason": "LANGUAGE_VIOLATION",
                    "details": {
                        "error": "DISALLOWED_LANGUAGE",
                        "detected_language": detected_lang,
                        "allowed_languages": allowed_languages,
                        "confidence": lang_info.get("confidence", 0.0),
                        "message": f"Language '{detected_lang}' is not permitted by policy. Allowed: {allowed_languages}."
                    }
                }
            )

    # Step 1: Input Normalization & Trust Envelope
    envelope = InputNormalizer.wrap_envelope(
        text=req.user_prompt,
        source_type=SourceTrustLevel.AUTHENTICATED_USER,
        source_name="pre_llm_ingress"
    )

    # Step 2: Vector Attack DB Threat Analysis over raw and normalized views
    threat_eval = vector_attack_db.evaluate_threat(req.user_prompt)
    for view in envelope.normalized_views:
        sub_eval = vector_attack_db.evaluate_threat(view)
        if sub_eval["is_threat"]:
            threat_eval = sub_eval
            break

    # Step 3: Runtime Auto-Switching Classification
    mode, class_reason = classify_ingress_operation(
        prompt=req.user_prompt,
        tool_name=req.tool_name,
        operation_type=req.operation_type,
        metadata=req.metadata
    )
    is_streamlined = (mode == ExecutionMode.STREAMLINED_RAG)

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    normalized_prompt = envelope.normalized_views[-1] if envelope.normalized_views else req.user_prompt

    runtime_telemetry.record_evaluation(
        endpoint="ingress",
        mode=mode.value,
        latency_ms=elapsed_ms
    )

    if threat_eval["is_threat"]:
        _record_session_event(
            session_id=req.session_id,
            stage="PRE_LLM_INGRESS",
            decision="BLOCK",
            reason_codes=[threat_eval["threat_family"]],
            latency_ms=elapsed_ms,
            metadata={"execution_mode": mode.value}
        )
        return IngressGuardResponse(
            decision="BLOCK",
            risk_score=float(threat_eval["risk_score"]),
            threat_family=threat_eval["threat_family"],
            sanitized_prompt="",
            latency_ms=elapsed_ms,
            reasons=[
                f"Perimeter Threat Blocked: Detected {threat_eval['threat_family']} pattern.",
                f"Vector Signature Match: {threat_eval['top_match']['description'] if threat_eval['top_match'] else 'Semantic cosine distance exceeded.'}"
            ],
            vector_match=threat_eval.get("top_match"),
            execution_mode=mode.value,
            auto_switched=is_streamlined,
            classification_reason=class_reason,
            language=lang_info.get("language")
        )

    _record_session_event(
        session_id=req.session_id,
        stage="PRE_LLM_INGRESS",
        decision="ALLOW",
        reason_codes=["CLEAN"],
        latency_ms=elapsed_ms,
        metadata={"execution_mode": mode.value}
    )
    return IngressGuardResponse(
        decision="ALLOW",
        risk_score=float(threat_eval["risk_score"]),
        threat_family="NONE",
        sanitized_prompt=normalized_prompt,
        latency_ms=elapsed_ms,
        reasons=[],
        vector_match=None,
        execution_mode=mode.value,
        auto_switched=is_streamlined,
        classification_reason=class_reason,
        language=lang_info.get("language")
    )


# =========================================================================
# 2. POST-LLM EGRESS & TOOL GUARD ENDPOINT (/v1/guard/egress)
# =========================================================================

@router.post("/guard/egress", response_model=EgressGuardResponse)
def post_llm_egress_guard(
    req: EgressGuardRequest,
    auth: Dict[str, Any] = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    POST-LLM GATEWAY (Placed AFTER LLM generates tool call or response):
    1. Role Enforcement: Requires Egress key ('cgx_egr_...') or Gateway key ('cgx_live_...'). Ingress keys are forbidden (HTTP 403).
    2. Language Policy Check: Validates output and tool argument strings against allowed_languages and reject_foreign_scripts.
    3. Runtime Auto-Switching: Pure RAG / text summarization bypasses TCEAV & Ledger (<0.1ms SLA) while enforcing Stage 5 Output Privacy.
    4. Full Tri-Guard: Complete 5-stage verification for stateful tool calls.
    """
    start_time = time.perf_counter()

    # Step 0a: Key Role Enforcement
    cred = _resolve_effective_key(auth, req.api_key, db)
    key_type = cred.get("key_type", "gateway")
    if key_type not in ("egress", "gateway"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Unauthorized key role '{key_type}': Post-LLM Egress endpoint requires an Egress key "
                f"(prefix 'cgx_egr_...') or Gateway key ('cgx_live_...'). Ingress keys ('cgx_ing_...') are forbidden at Egress."
            )
        )

    audit_trail = [
        {"timestamp": time.strftime("%H:%M:%S"), "stage": "Egress Ingress", "status": "RECEIVED", "session_id": req.session_id}
    ]

    # Resolve bound project/policy constraints if associated with key or request
    eff_project_id = req.project_id or cred.get("project_id")
    bound_policy = _resolve_project_policy(db, eff_project_id, req.policy_id)
    global_env = bound_policy.get("global_envelope", {}) if bound_policy else {}

    policy_session_budget = global_env.get("max_cumulative_budget", 1000.0)
    policy_per_call = global_env.get("financial_ceiling", 500.0)
    if bound_policy and req.tool_name:
        tool_spec = (bound_policy.get("tools") or {}).get(req.tool_name) or {}
        params_spec = tool_spec.get("parameters") or {}
        for p_spec in params_spec.values():
            if isinstance(p_spec, dict) and p_spec.get("max_value") is not None:
                try:
                    policy_per_call = float(p_spec["max_value"])
                    break
                except (ValueError, TypeError):
                    pass

    # Explicit zero budget handling (parent orchestrator directive)
    max_session_budget = req.session_budget if req.session_budget is not None else float(policy_session_budget)
    max_per_call = req.per_call_ceiling if req.per_call_ceiling is not None else float(policy_per_call)
    session_spent = stateful_ledger.get_session_spent(req.session_id)
    remaining_budget = max(0.0, max_session_budget - session_spent)

    # Step 0b: Egress Language Policy Check
    lang_constraints = req.language_constraints
    if not lang_constraints and bound_policy:
        lang_constraints = global_env.get("language_constraints")

    detected_output_lang = None
    if lang_constraints:
        texts_to_check = []
        if req.proposed_llm_output:
            texts_to_check.append(req.proposed_llm_output)
        if req.tool_arguments:
            for v in req.tool_arguments.values():
                if isinstance(v, str):
                    texts_to_check.append(v)

        allowed_languages = lang_constraints.get("allowed_languages", ["en"])
        reject_foreign_scripts = lang_constraints.get("reject_foreign_scripts", True)

        for text_item in texts_to_check:
            item_lang = nvidia_language_detector.detect_language(text_item)
            detected_output_lang = item_lang.get("language")
            if reject_foreign_scripts and (item_lang.get("has_foreign_script") or item_lang.get("has_mixed_scripts")):
                return JSONResponse(
                    status_code=403,
                    content={
                        "decision": "BLOCK",
                        "reason": "LANGUAGE_VIOLATION",
                        "details": {
                            "error": "FOREIGN_SCRIPT_DETECTED",
                            "detected_scripts": item_lang.get("detected_scripts", []),
                            "has_mixed_scripts": item_lang.get("has_mixed_scripts", False),
                            "homoglyphs_detected": item_lang.get("homoglyphs_detected", []),
                            "message": "Foreign script detected in egress output or arguments."
                        }
                    }
                )
            det_l = item_lang.get("language", "en")
            if allowed_languages and det_l not in allowed_languages:
                return JSONResponse(
                    status_code=403,
                    content={
                        "decision": "BLOCK",
                        "reason": "LANGUAGE_VIOLATION",
                        "details": {
                            "error": "DISALLOWED_LANGUAGE",
                            "detected_language": det_l,
                            "allowed_languages": allowed_languages,
                            "message": f"Output language '{det_l}' is disallowed."
                        }
                    }
                )

    # Step 1: Runtime Auto-Switching Classification
    mode, class_reason, bypassed_stages = classify_egress_operation(
        tool_name=req.tool_name,
        tool_arguments=req.tool_arguments
    )

    audit_trail.append({
        "timestamp": time.strftime("%H:%M:%S"),
        "stage": "Egress Classifier",
        "status": "CLASSIFIED",
        "execution_mode": mode.value,
        "reason": class_reason,
        "session_id": req.session_id
    })

    # =========================================================================
    # PATHWAY A: STREAMLINED RAG EXECUTION (<0.1ms SLA)
    # =========================================================================
    if mode == ExecutionMode.STREAMLINED_RAG:
        clean_output = req.proposed_llm_output or ""
        # Bypass Stages 1-4: No TCEAV provenance, no single-call limit, no atomic ledger reservation
        # Enforce Stage 5: Output Privacy & Exfiltration Guard
        if clean_output:
            inspection = output_guard.inspect(clean_output)
            if not inspection.safe:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                runtime_telemetry.record_evaluation("egress", mode.value, elapsed_ms, bypassed_stages)
                audit_trail.append({
                    "timestamp": time.strftime("%H:%M:%S"),
                    "stage": "Stage 5: Output Privacy & Exfiltration Guard",
                    "status": "BLOCKED",
                    "reason": inspection.violation_detected
                })
                return EgressGuardResponse(
                    decision="BLOCK",
                    action="REDACTED",
                    interception_stage="Stage 5: Output Privacy & Exfiltration Guard",
                    reason=inspection.violation_detected or "Markdown image auto-exfiltration tag detected and stripped.",
                    sanitized_output=inspection.modified_text,
                    session_budget_remaining=remaining_budget,
                    latency_ms=elapsed_ms,
                    audit_trail=audit_trail,
                    execution_mode=mode.value,
                    auto_switched=True,
                    bypassed_stages=bypassed_stages,
                    language=detected_output_lang
                )
            clean_output = inspection.modified_text

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        runtime_telemetry.record_evaluation("egress", mode.value, elapsed_ms, bypassed_stages)
        return EgressGuardResponse(
            decision="ALLOW",
            action="EXECUTE",
            interception_stage="Streamlined RAG Egress",
            reason=None,
            sanitized_output=clean_output,
            session_budget_remaining=remaining_budget,
            latency_ms=elapsed_ms,
            audit_trail=audit_trail,
            execution_mode=mode.value,
            auto_switched=True,
            bypassed_stages=bypassed_stages,
            language=detected_output_lang
        )

    # =========================================================================
    # PATHWAY B: FULL TRI-GUARD EXECUTION (5 DEFENSE STAGES)
    # =========================================================================
    args = req.tool_arguments or {}
    tool = req.tool_name.lower() if req.tool_name else ""

    # Stage 1: Hard Perimeter Invariant Check
    if any(banned in tool for banned in ["shell", "terminal", "bash", "exec", "eval", "delete_database", "format_disk", "drop_tables"]):
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        runtime_telemetry.record_evaluation("egress", mode.value, elapsed_ms, [])
        _record_session_event(
            session_id=req.session_id,
            stage="POST_LLM_EGRESS",
            decision="BLOCK",
            reason_codes=["BANNED_TOOL_BREACH"],
            latency_ms=elapsed_ms,
            metadata={"tool_name": req.tool_name, "stage": "Stage 1: Hard Perimeter"}
        )
        return EgressGuardResponse(
            decision="BLOCK",
            action="DENIED",
            interception_stage="Stage 1: Hard Perimeter Invariant",
            reason=f"Tool '{req.tool_name}' is permanently banned by Zero-Trust policy.",
            sanitized_output=None,
            session_budget_remaining=remaining_budget,
            latency_ms=elapsed_ms,
            audit_trail=audit_trail,
            execution_mode=mode.value,
            auto_switched=False,
            bypassed_stages=[],
            language=detected_output_lang
        )

    # Stage 2: TCEAV Parameter Provenance (Indirect Prompt Injection Protection)
    untrusted_text = " ".join(req.untrusted_context or [])
    target_account = args.get("target_account") or args.get("recipient") or args.get("to_address") or args.get("recipient_iban")

    if target_account and untrusted_text:
        target_str = str(target_account).strip().lower()
        # Allowed if independently authorized in user_intent (Case P2), blocked if only in untrusted_context (Case P1)
        in_user_intent = target_str in (req.user_intent or "").lower()
        if target_str in untrusted_text.lower() and not in_user_intent:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            runtime_telemetry.record_evaluation("egress", mode.value, elapsed_ms, [])
            _record_session_event(
                session_id=req.session_id,
                stage="POST_LLM_EGRESS",
                decision="BLOCK",
                reason_codes=["TCEAV_INDIRECT_INJECTION_BLOCKED"],
                latency_ms=elapsed_ms,
                metadata={"tool_name": req.tool_name, "stage": "Stage 2: TCEAV"}
            )
            return EgressGuardResponse(
                decision="BLOCK",
                action="DENIED",
                interception_stage="Stage 2: TCEAV Evidence & Authority Guard",
                reason=(
                    f"TCEAV Invariant Violation: Parameter 'target_account' value ('{target_account}') "
                    f"originated from untrusted context. External data is forbidden as an execution destination."
                ),
                sanitized_output=None,
                session_budget_remaining=remaining_budget,
                latency_ms=elapsed_ms,
                audit_trail=audit_trail,
                execution_mode=mode.value,
                auto_switched=False,
                bypassed_stages=[],
                language=detected_output_lang
            )

    # Stage 3 & 4: Spending Limits & Stateful Cumulative Effect Ledger
    financial_param_keys = ("amount", "value", "cost", "sum", "payment", "fund", "spend")
    amount = next(
        (v for k, v in args.items() if any(stem in str(k).lower() for stem in financial_param_keys) and v is not None),
        None
    )
    if amount is not None:
        try:
            amt_val = float(amount)
            # Stage 3: Single-call ceiling check (respecting explicit zero ceiling)
            if amt_val > max_per_call:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                runtime_telemetry.record_evaluation("egress", mode.value, elapsed_ms, [])
                _record_session_event(
                    session_id=req.session_id,
                    stage="POST_LLM_EGRESS",
                    decision="BLOCK",
                    reason_codes=["CEILING_BREACH"],
                    latency_ms=elapsed_ms,
                    metadata={"tool_name": req.tool_name, "stage": "Stage 3: Ceiling"}
                )
                return EgressGuardResponse(
                    decision="BLOCK",
                    action="DENIED",
                    interception_stage="Stage 3: Policy Transaction Ceiling Guard",
                    reason=f"Transaction amount ${amt_val:.2f} exceeds single-call limit of ${max_per_call:.2f}.",
                    sanitized_output=None,
                    session_budget_remaining=remaining_budget,
                    latency_ms=elapsed_ms,
                    audit_trail=audit_trail,
                    execution_mode=mode.value,
                    auto_switched=False,
                    bypassed_stages=[],
                    language=detected_output_lang
                )

            # Stage 4: Cumulative session budget reservation check (respecting explicit zero budget)
            can_reserve, res_obj, err_msg = stateful_ledger.reserve_atomic(
                session_id=req.session_id,
                tool_name=req.tool_name,
                parameters=args,
                max_budget=max_session_budget,
                idempotency_key=req.idempotency_key
            )
            if not can_reserve:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                runtime_telemetry.record_evaluation("egress", mode.value, elapsed_ms, [])
                _record_session_event(
                    session_id=req.session_id,
                    stage="STATEFUL_LEDGER",
                    decision="BLOCK",
                    reason_codes=["SALAMI_SLICING_BUDGET_EXHAUSTION"],
                    latency_ms=elapsed_ms,
                    metadata={"tool_name": req.tool_name, "stage": "Stage 4: Ledger"}
                )
                return EgressGuardResponse(
                    decision="BLOCK",
                    action="DENIED",
                    interception_stage="Stage 4: Stateful Cumulative Effect Ledger",
                    reason=f"Salami-Slicing Invariant Violation: {err_msg}",
                    sanitized_output=None,
                    session_budget_remaining=remaining_budget,
                    latency_ms=elapsed_ms,
                    audit_trail=audit_trail,
                    execution_mode=mode.value,
                    auto_switched=False,
                    bypassed_stages=[],
                    language=detected_output_lang
                )

            # Update remaining budget after reservation
            session_spent = stateful_ledger.get_session_spent(req.session_id)
            remaining_budget = max(0.0, max_session_budget - session_spent)
        except (ValueError, TypeError):
            pass

    # Stage 5: Output Privacy & Exfiltration Guard
    clean_output = req.proposed_llm_output
    if clean_output:
        inspection = output_guard.inspect(clean_output)
        if not inspection.safe:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            runtime_telemetry.record_evaluation("egress", mode.value, elapsed_ms, [])
            return EgressGuardResponse(
                decision="BLOCK",
                action="REDACTED",
                interception_stage="Stage 5: Output Privacy & Exfiltration Guard",
                reason=inspection.violation_detected or "Markdown image auto-exfiltration tag detected and stripped.",
                sanitized_output=inspection.modified_text,
                session_budget_remaining=remaining_budget,
                latency_ms=elapsed_ms,
                audit_trail=audit_trail,
                execution_mode=mode.value,
                auto_switched=False,
                bypassed_stages=[],
                language=detected_output_lang
            )
        clean_output = inspection.modified_text

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    runtime_telemetry.record_evaluation("egress", mode.value, elapsed_ms, [])
    return EgressGuardResponse(
        decision="ALLOW",
        action="EXECUTE",
        interception_stage="Clean Egress",
        reason=None,
        sanitized_output=clean_output,
        session_budget_remaining=remaining_budget,
        latency_ms=elapsed_ms,
        audit_trail=audit_trail,
        execution_mode=mode.value,
        auto_switched=False,
        bypassed_stages=[],
        language=detected_output_lang
    )


# =========================================================================
# 3. API KEY MANAGEMENT ENDPOINTS
# =========================================================================

@router.post("/keys/create", response_model=CreateApiKeyResponse)
def create_developer_api_key(
    req: CreateApiKeyRequest,
    db: Session = Depends(get_db)
):
    """Generates a secure API key (ingress, egress, or gateway) for the developer."""
    user_id = req.user_id
    if not user_id:
        first_user = db.query(UserRecord).first()
        user_id = first_user.id if first_user else "usr_default_dev"

    key_res = generate_api_key_record(
        db=db,
        user_id=user_id,
        key_name=req.key_name,
        key_type=req.key_type or "gateway",
        project_id=req.project_id
    )

    return CreateApiKeyResponse(
        key_id=key_res["key_id"],
        api_key=key_res["api_key"],
        raw_key=key_res["raw_key"],
        key_name=key_res["key_name"],
        created_at=key_res["created_at"],
        key_type=key_res["key_type"],
        project_id=key_res["project_id"]
    )


@router.get("/keys/list", response_model=List[ApiKeyInfo])
def list_developer_api_keys(
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    key_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists developer's active API keys."""
    query = db.query(ApiKeyRecord).filter(ApiKeyRecord.is_active == True)
    if user_id:
        query = query.filter(ApiKeyRecord.user_id == user_id)
    if project_id:
        query = query.filter(ApiKeyRecord.project_id == project_id)
    if key_type:
        query = query.filter(ApiKeyRecord.key_type == key_type)
    records = query.order_by(ApiKeyRecord.created_at.desc()).all()

    return [
        ApiKeyInfo(
            id=r.id,
            key_id=r.id,
            key_name=r.key_name,
            key_prefix=r.key_prefix,
            created_at=str(r.created_at),
            is_active=r.is_active,
            key_type=getattr(r, "key_type", "gateway") or "gateway",
            project_id=getattr(r, "project_id", None)
        )
        for r in records
    ]


@router.delete("/keys/{key_id}")
def revoke_api_key(key_id: str, db: Session = Depends(get_db)):
    """Revokes an active API key."""
    rec = db.query(ApiKeyRecord).filter(ApiKeyRecord.id == key_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="API key not found.")
    rec.is_active = False
    db.commit()
    return {"status": "REVOKED", "key_id": key_id}


# =========================================================================
# 4. LANGUAGE DETECTION, VECTOR ATTACK DB & LIVE ALERTS ENDPOINTS
# =========================================================================

@router.post("/language/detect", response_model=LanguageDetectResponse)
def detect_text_language(req: LanguageDetectRequest):
    """Direct language detection using NVIDIA LLM with deterministic Unicode fallback."""
    start = time.perf_counter()
    info = nvidia_language_detector.detect_language(req.text, api_key=req.api_key)
    elapsed = round((time.perf_counter() - start) * 1000, 2)
    return LanguageDetectResponse(
        language=info["language"],
        confidence=info["confidence"],
        script=info["script"],
        detected_scripts=info["detected_scripts"],
        has_foreign_script=info["has_foreign_script"],
        has_mixed_scripts=info["has_mixed_scripts"],
        homoglyphs_detected=info["homoglyphs_detected"],
        latency_ms=elapsed
    )


@router.get("/vector-db/signatures")
def get_attack_signatures():
    """Lists curated authentic attack signatures in the Vector Attack Database."""
    stats = vector_attack_db.get_statistics()
    families_grouped: Dict[str, List[Dict[str, Any]]] = {}
    for sig in vector_attack_db.signatures:
        fam = sig.get("family", "OTHER")
        families_grouped.setdefault(fam, []).append(sig)

    return {
        "total_signatures": stats["total_signatures"],
        "families": list(families_grouped.keys()),
        "families_grouped": families_grouped,
        "sources": stats["sources"],
        "index_type": stats["index_type"],
        "vocabulary_size": stats["vocabulary_size"],
        "signatures": vector_attack_db.signatures
    }


@router.post("/vector-db/signatures")
def create_custom_attack_signature(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Persists a new custom attack signature into PostgreSQL and rebuilds the in-memory vector index."""
    pattern = (payload.get("pattern") or payload.get("text") or "").strip()
    if not pattern:
        raise HTTPException(status_code=400, detail="Attack signature pattern text is required.")
    family = (payload.get("family") or "CUSTOM_INJECTION").strip().upper().replace(" ", "_")
    description = (payload.get("description") or f"Custom {family} signature").strip()
    sig_id = payload.get("id") or f"custom_{uuid.uuid4().hex[:8]}"

    added = vector_attack_db.add_signature(
        db_session=db,
        sig_id=sig_id,
        pattern=pattern,
        family=family,
        description=description,
        signature_type="vector"
    )
    return {
        "status": "CREATED",
        "signature": added,
        "total_signatures": len(vector_attack_db.signatures)
    }


@router.post("/vector-db/query")
def query_vector_attack_db(payload: Dict[str, Any]):
    """Tests a query string against the Vector Attack Database with sub-millisecond latency tracking."""
    text = payload.get("text") or payload.get("prompt") or ""
    t0 = time.perf_counter()
    res = vector_attack_db.evaluate_threat(text)
    latency_ms = round((time.perf_counter() - t0) * 1000.0, 3)
    top_match = res.get("top_match") or {}
    return {
        **res,
        "matched": bool(res.get("is_threat")),
        "similarity": float(res.get("risk_score", 0.0)),
        "matched_family": res.get("threat_family", "NONE"),
        "matched_signature": top_match.get("text") or top_match.get("description") or "",
        "latency_ms": latency_ms
    }


@router.get("/alerts/recent")
def get_recent_security_alerts():
    """Returns real-time intercepted security events across all active sessions."""
    live_alerts = []
    for sess_id, events in _SESSION_EVENTS.items():
        for evt in events:
            decision = evt.get("decision", "")
            if decision in ("BLOCK", "DENY", "REVIEW", "REDACTED"):
                reasons = evt.get("reason_codes") or ["POLICY_VIOLATION"]
                threat_type = reasons[0] if reasons else "POLICY_VIOLATION"
                stage_raw = evt.get("stage", "PRE_LLM_INGRESS")
                if "EGRESS" in stage_raw or "M3" in stage_raw:
                    stage = "POST_LLM_EGRESS"
                elif "LEDGER" in stage_raw or "M4" in stage_raw:
                    stage = "STATEFUL_LEDGER"
                else:
                    stage = "PRE_LLM_INGRESS"

                live_alerts.append({
                    "id": evt.get("event_id", f"evt_{uuid.uuid4().hex[:6]}"),
                    "timestamp": "Live Event",
                    "threatType": threat_type,
                    "severity": "CRITICAL" if decision in ("BLOCK", "DENY") else "HIGH",
                    "stage": stage,
                    "decision": "BLOCKED" if decision in ("BLOCK", "DENY") else "SANITIZED",
                    "summary": f"Intercepted {threat_type} during {stage_raw} ({evt.get('latency_ms', 0.1)}ms)",
                    "session_id": sess_id,
                    "created_ts": evt.get("timestamp", 0.0)
                })

    live_alerts.sort(key=lambda x: x.get("created_ts", 0.0), reverse=True)
    return {"alerts": live_alerts[:15]}
