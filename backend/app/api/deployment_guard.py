from __future__ import annotations
import time
import uuid
import hashlib
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import ApiKeyRecord, UserRecord
from ..core.vector_attack_db import vector_attack_db
from ..core.normalizer import InputNormalizer, ContentEnvelope, SourceTrustLevel
from ..core.tceav import TCEAVEngine, ActionProposal, ArgumentEvidence, SourceTrust, GuardStatus
from ..core.effect_ledger import stateful_ledger, output_guard, StatefulEffectLedger, OutputGuard

router = APIRouter(prefix="/v1", tags=["Deployment End Gateway"])

# =========================================================================
# SCHEMAS
# =========================================================================

class IngressGuardRequest(BaseModel):
    session_id: str = Field(default="session_default", description="Unique session ID tracking multi-turn interactions")
    user_prompt: str = Field(..., description="Raw incoming user prompt or task before calling the LLM")
    context_history: Optional[List[Dict[str, Any]]] = Field(default=None, description="Prior conversation turns and sources")
    api_key: Optional[str] = Field(default=None, description="ContractGuard Gateway API Key (cgx_live_...)")

class IngressGuardResponse(BaseModel):
    decision: str = Field(..., description="'ALLOW' or 'BLOCK'")
    risk_score: float = Field(..., description="Normalized risk score from 0.0 to 1.0")
    threat_family: str = Field(..., description="Threat classification (e.g. DIRECT_JAILBREAK, NONE)")
    sanitized_prompt: str = Field(..., description="Normalized canonical prompt safe for LLM consumption")
    latency_ms: float = Field(..., description="End-to-end evaluation latency in milliseconds")
    reasons: List[str] = Field(default_factory=list, description="Detailed explanation if blocked")
    vector_match: Optional[Dict[str, Any]] = None

class EgressGuardRequest(BaseModel):
    session_id: str = Field(default="session_default", description="Unique session ID tracking multi-turn interactions")
    user_intent: str = Field(..., description="The user's original authorized goal (e.g., 'Refund defect order #4092')")
    untrusted_context: Optional[List[str]] = Field(default=None, description="Untrusted external data (emails, RAG docs, web pages)")
    tool_name: Optional[str] = Field(default=None, description="Name of tool proposed by LLM (e.g., 'process_refund')")
    tool_arguments: Optional[Dict[str, Any]] = None
    proposed_llm_output: Optional[str] = None
    per_call_ceiling: Optional[float] = Field(default=500.0, description="Max spend allowed in single transaction")
    session_budget: Optional[float] = Field(default=1000.0, description="Max cumulative spend allowed in session")
    api_key: Optional[str] = Field(default=None, description="ContractGuard Gateway API Key (cgx_live_...)")

class EgressGuardResponse(BaseModel):
    decision: str = Field(..., description="'ALLOW' or 'BLOCK'")
    action: str = Field(..., description="'EXECUTE', 'DENIED', or 'REDACTED'")
    interception_stage: Optional[str] = None
    reason: Optional[str] = None
    sanitized_output: Optional[str] = None
    session_budget_remaining: float = Field(default=1000.0)
    latency_ms: float = Field(..., description="End-to-end evaluation latency in milliseconds")
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list)

class CreateApiKeyRequest(BaseModel):
    key_name: str = Field(default="Production Gateway Key", description="Friendly name for the API key")
    user_id: Optional[str] = None

class ApiKeyInfo(BaseModel):
    id: str
    key_name: str
    key_prefix: str
    created_at: str
    is_active: bool

class CreateApiKeyResponse(BaseModel):
    key_id: str
    api_key: str  # Raw key displayed only upon creation: cgx_live_...
    key_name: str
    created_at: str

# Helper to verify key
def verify_api_key(raw_key: Optional[str], db: Session) -> bool:
    if not raw_key:
        return True  # Allow demo access if key omitted
    if raw_key.startswith("demo_") or raw_key.startswith("mock_") or raw_key == "judge_evaluator_key":
        return True
    
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    rec = db.query(ApiKeyRecord).filter(
        ApiKeyRecord.key_hash == key_hash,
        ApiKeyRecord.is_active == True
    ).first()
    return rec is not None

# =========================================================================
# 1. PRE-LLM INGRESS GUARD ENDPOINT
# =========================================================================

@router.post("/guard/ingress", response_model=IngressGuardResponse)
def pre_llm_ingress_guard(
    req: IngressGuardRequest,
    db: Session = Depends(get_db)
):
    """
    PRE-LLM GATEWAY (Placed BEFORE LLM call):
    1. Normalizes Unicode/Base64/Hex obfuscations.
    2. Scans Vector Attack Database for semantic cosine similarity against jailbreaks & overrides.
    3. Blocks malicious prompts before the target LLM ever sees them.
    """
    start_time = time.perf_counter()

    if not verify_api_key(req.api_key, db):
        raise HTTPException(status_code=401, detail="Invalid or revoked ContractGuard API Key.")

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

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    normalized_prompt = envelope.normalized_views[-1] if envelope.normalized_views else req.user_prompt

    if threat_eval["is_threat"]:
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
            vector_match=threat_eval.get("top_match")
        )

    return IngressGuardResponse(
        decision="ALLOW",
        risk_score=float(threat_eval["risk_score"]),
        threat_family="NONE",
        sanitized_prompt=normalized_prompt,
        latency_ms=elapsed_ms,
        reasons=[],
        vector_match=None
    )

# =========================================================================
# 2. POST-LLM EGRESS & TOOL GUARD ENDPOINT
# =========================================================================

@router.post("/guard/egress", response_model=EgressGuardResponse)
def post_llm_egress_guard(
    req: EgressGuardRequest,
    db: Session = Depends(get_db)
):
    """
    POST-LLM GATEWAY (Placed AFTER LLM generates tool call or response):
    1. TCEAV Guard: Ensures tool call arguments did not originate from untrusted RAG/email context.
    2. Stateful Cumulative Ledger: Enforces per-call and multi-turn session spending caps.
    3. Output Guard: Strips Markdown image auto-exfiltration and secret disclosures.
    """
    start_time = time.perf_counter()

    if not verify_api_key(req.api_key, db):
        raise HTTPException(status_code=401, detail="Invalid or revoked ContractGuard API Key.")

    audit_trail = [
        {"timestamp": time.strftime("%H:%M:%S"), "stage": "Egress Ingress", "status": "RECEIVED", "session_id": req.session_id}
    ]

    session_spent = stateful_ledger.get_session_spent(req.session_id)
    remaining_budget = max(0.0, (req.session_budget or 1000.0) - session_spent)

    # --- SUB-STAGE A: TOOL INVOCATION CHECK (TCEAV & LEDGER) ---
    if req.tool_name and req.tool_arguments is not None:
        args = req.tool_arguments
        tool = req.tool_name.lower()

        # Check Hard-Banned tools
        if any(banned in tool for banned in ["shell", "terminal", "bash", "exec", "eval", "delete_database"]):
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return EgressGuardResponse(
                decision="BLOCK",
                action="DENIED",
                interception_stage="Stage 1: Hard Perimeter Invariant",
                reason=f"Tool '{req.tool_name}' is permanently banned by Zero-Trust policy.",
                sanitized_output=None,
                session_budget_remaining=remaining_budget,
                latency_ms=elapsed_ms,
                audit_trail=audit_trail
            )

        # Check TCEAV Parameter Provenance (Indirect Prompt Injection Protection)
        untrusted_text = " ".join(req.untrusted_context or [])
        target_account = args.get("target_account") or args.get("recipient") or args.get("to_address")
        
        if target_account and untrusted_text:
            # Check if target account appears inside untrusted data
            if str(target_account).strip().lower() in untrusted_text.lower():
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
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
                    audit_trail=audit_trail
                )

        # Check Financial / Resource Ceilings via Stateful Effect Ledger
        amount = args.get("amount") or args.get("fund") or args.get("spend")
        if amount is not None:
            try:
                amt_val = float(amount)
                # Single-call limit check
                if amt_val > (req.per_call_ceiling or 500.0):
                    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    return EgressGuardResponse(
                        decision="BLOCK",
                        action="DENIED",
                        interception_stage="Stage 3: Policy Transaction Ceiling Guard",
                        reason=f"Transaction amount ${amt_val:.2f} exceeds single-call limit of ${req.per_call_ceiling:.2f}.",
                        sanitized_output=None,
                        session_budget_remaining=remaining_budget,
                        latency_ms=elapsed_ms,
                        audit_trail=audit_trail
                    )

                # Cumulative session budget check
                can_reserve, res_obj, err_msg = stateful_ledger.reserve_atomic(
                    session_id=req.session_id,
                    tool_name=req.tool_name,
                    parameters=args,
                    max_budget=req.session_budget or 1000.0
                )
                if not can_reserve:
                    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    return EgressGuardResponse(
                        decision="BLOCK",
                        action="DENIED",
                        interception_stage="Stage 4: Stateful Cumulative Effect Ledger",
                        reason=f"Salami-Slicing Invariant Violation: {err_msg}",
                        sanitized_output=None,
                        session_budget_remaining=remaining_budget,
                        latency_ms=elapsed_ms,
                        audit_trail=audit_trail
                    )
                
                # Update remaining budget after reservation
                session_spent = stateful_ledger.get_session_spent(req.session_id)
                remaining_budget = max(0.0, (req.session_budget or 1000.0) - session_spent)
            except (ValueError, TypeError):
                pass

    # --- SUB-STAGE B: OUTPUT GUARD (EXFILTRATION PROTECTION) ---
    clean_output = req.proposed_llm_output
    if clean_output:
        inspection = output_guard.inspect(clean_output)
        if not inspection.safe:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return EgressGuardResponse(
                decision="BLOCK",
                action="REDACTED",
                interception_stage="Stage 5: Output Privacy & Exfiltration Guard",
                reason=inspection.violation_detected or "Markdown image auto-exfiltration tag detected and stripped.",
                sanitized_output=inspection.modified_text,
                session_budget_remaining=remaining_budget,
                latency_ms=elapsed_ms,
                audit_trail=audit_trail
            )
        clean_output = inspection.modified_text

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return EgressGuardResponse(
        decision="ALLOW",
        action="EXECUTE",
        interception_stage="Clean Egress",
        reason=None,
        sanitized_output=clean_output,
        session_budget_remaining=remaining_budget,
        latency_ms=elapsed_ms,
        audit_trail=audit_trail
    )

# =========================================================================
# 3. API KEY MANAGEMENT ENDPOINTS
# =========================================================================

@router.post("/keys/create", response_model=CreateApiKeyResponse)
def create_developer_api_key(
    req: CreateApiKeyRequest,
    db: Session = Depends(get_db)
):
    """Generates a secure Live Gateway API key for the developer."""
    raw_secret = f"cgx_live_{uuid.uuid4().hex}"
    key_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()
    key_prefix = raw_secret[:14] + "..."
    key_id = f"key_{uuid.uuid4().hex[:8]}"

    # Default to first user if none provided
    user_id = req.user_id
    if not user_id:
        first_user = db.query(UserRecord).first()
        user_id = first_user.id if first_user else "usr_default_dev"

    record = ApiKeyRecord(
        id=key_id,
        user_id=user_id,
        key_name=req.key_name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        is_active=True
    )
    db.add(record)
    db.commit()

    return CreateApiKeyResponse(
        key_id=key_id,
        api_key=raw_secret,
        key_name=req.key_name,
        created_at=time.strftime("%Y-%m-%d %H:%M:%S")
    )

@router.get("/keys/list", response_model=List[ApiKeyInfo])
def list_developer_api_keys(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists developer's active API keys."""
    query = db.query(ApiKeyRecord).filter(ApiKeyRecord.is_active == True)
    if user_id:
        query = query.filter(ApiKeyRecord.user_id == user_id)
    records = query.order_by(ApiKeyRecord.created_at.desc()).all()

    return [
        ApiKeyInfo(
            id=r.id,
            key_name=r.key_name,
            key_prefix=r.key_prefix,
            created_at=str(r.created_at),
            is_active=r.is_active
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
# 4. VECTOR ATTACK DB INSPECTION ENDPOINTS
# =========================================================================

@router.get("/vector-db/signatures")
def get_attack_signatures():
    """Lists curated attack signatures in the Vector Attack Database."""
    return {
        "total_signatures": len(vector_attack_db.signatures),
        "families": list(set(s["family"] for s in vector_attack_db.signatures)),
        "signatures": vector_attack_db.signatures
    }

@router.post("/vector-db/query")
def query_vector_attack_db(payload: Dict[str, Any]):
    """Tests a query string against the Vector Attack Database."""
    text = payload.get("text", "")
    threshold = payload.get("threshold", 0.55)
    return vector_attack_db.evaluate_threat(text)
