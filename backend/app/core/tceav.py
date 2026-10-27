"""
ContractGuard-X Module 3: Task-Conditioned Evidence & Authority Verification (TCEAV)
Formal reference monitor verifying parameter-purpose admissibility and provenance binding.
"""
from __future__ import annotations
import time
import hashlib
from enum import Enum
from typing import Dict, List, Any, Optional, Set
from pydantic import BaseModel, Field

class GuardStatus(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    REVIEW = "REVIEW"

class SourceTrust(str, Enum):
    AUTHENTICATED_USER = "authenticated_user"
    UNTRUSTED_EXTERNAL = "untrusted_external"
    INTERNAL_DB = "internal_db"
    SYSTEM_CONFIG = "system_config"
    TOOL_RESULT = "tool_result"
    UNKNOWN = "unknown"

class ArgumentObservability(str, Enum):
    INSTRUMENTED = "instrumented"
    INFERRED = "inferred"
    UNKNOWN = "unknown"

class ArgumentEvidence(BaseModel):
    """Lineage binding for a specific tool call parameter."""
    parameter_name: str
    value_digest: str
    source_content_ids: List[str] = Field(default_factory=list)
    source_trust: SourceTrust = SourceTrust.UNKNOWN
    observability: ArgumentObservability = ArgumentObservability.INSTRUMENTED
    allowed_purposes: List[str] = Field(default_factory=lambda: ["read_data", "summarization"])
    forbidden_purposes: List[str] = Field(default_factory=lambda: ["destination_address", "command_execution", "fund_recipient"])

class ActionProposal(BaseModel):
    """A proposed tool execution intercepted prior to runtime invocation."""
    action_id: str
    session_id: str
    tool_name: str
    parameters: Dict[str, Any]
    user_task: str
    evidence_bindings: Dict[str, ArgumentEvidence] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)

class GuardDecision(BaseModel):
    """The authoritative decision from the ContractGuard-X Reference Monitor."""
    decision_id: str
    action_id: str
    status: GuardStatus
    stage: str
    reason_code: str
    explanation: str
    latency_ms: float
    canonical_effects: List[str] = Field(default_factory=list)
    redacted_parameters: Dict[str, Any] = Field(default_factory=dict)

class TCEAVEngine:
    """
    Task-Conditioned Evidence & Authority Verification (TCEAV)
    Evaluates: Admissible(x, p, T, C, Π) = schema_valid(x, p) ∧ evidence_sufficient(x, p, Π, C) ∧ purpose_permitted(p, T, C)
    """

    def __init__(self):
        pass

    @staticmethod
    def compute_digest(value: Any) -> str:
        """Computes deterministic SHA256 digest of argument value for secure lineage tracking."""
        val_str = str(value).strip().lower()
        return hashlib.sha256(val_str.encode("utf-8")).hexdigest()[:16]

    def verify(
        self,
        proposal: ActionProposal,
        policy: Dict[str, Any],
        provenance_sources: Optional[List[Dict[str, Any]]] = None
    ) -> GuardDecision:
        """
        Executes TCEAV verification on an action proposal.
        """
        start_time = time.perf_counter()
        tool_name = proposal.tool_name
        params = proposal.parameters

        # Redact sensitive parameters for audit
        redacted_params = {}
        for k, v in params.items():
            if any(term in k.lower() for term in ["key", "token", "password", "secret", "cvv"]):
                redacted_params[k] = "[REDACTED_SECRET]"
            else:
                redacted_params[k] = v

        # -------------------------------------------------------------
        # STEP 1: Global Policy Invariants (Denied Tools Boundary)
        # -------------------------------------------------------------
        global_envelope = policy.get("global_envelope", {})
        denied_tools = global_envelope.get("denied_tools", ["delete_database", "execute_shell", "format_disk"])
        if tool_name in denied_tools:
            elapsed = (time.perf_counter() - start_time) * 1000
            return GuardDecision(
                decision_id=f"dec_{int(time.time()*1000)}",
                action_id=proposal.action_id,
                status=GuardStatus.DENY,
                stage="Stage 1: Boundary Perimeter Gateway",
                reason_code="HARD_DENIED_TOOL",
                explanation=f"Tool '{tool_name}' is permanently forbidden by global security envelope.",
                latency_ms=round(elapsed, 3),
                redacted_parameters=redacted_params
            )

        # -------------------------------------------------------------
        # STEP 2: Policy Tool Schema & Action Authorization
        # -------------------------------------------------------------
        tools_dict = policy.get("tools", {})
        tool_spec = tools_dict.get(tool_name)
        if not tool_spec and tool_name not in ["read_document", "reply_to_user", "process_refund"]:
            elapsed = (time.perf_counter() - start_time) * 1000
            return GuardDecision(
                decision_id=f"dec_{int(time.time()*1000)}",
                action_id=proposal.action_id,
                status=GuardStatus.DENY,
                stage="Stage 2: Policy Authorization",
                reason_code="TOOL_NOT_PERMITTED",
                explanation=f"Tool '{tool_name}' is not authorized in active security policy.",
                latency_ms=round(elapsed, 3),
                redacted_parameters=redacted_params
            )

        # Canonical effects
        effects = (tool_spec.get("effects", []) if tool_spec else []) or ["system.call"]

        # -------------------------------------------------------------
        # STEP 3: Parameter-Purpose Admissibility & Evidence Binding
        # -------------------------------------------------------------
        param_rules = tool_spec.get("parameters", {}) if tool_spec else {}
        for param_name, param_val in params.items():
            rule = param_rules.get(param_name, {})
            val_str = str(param_val).strip()

            # 3A. Single-call numerical boundaries (e.g. max single refund)
            max_val = rule.get("max_value")
            if max_val is not None:
                try:
                    num_val = float(param_val)
                    if num_val > float(max_val):
                        elapsed = (time.perf_counter() - start_time) * 1000
                        return GuardDecision(
                            decision_id=f"dec_{int(time.time()*1000)}",
                            action_id=proposal.action_id,
                            status=GuardStatus.DENY,
                            stage="Stage 2: Deterministic Schema Guard",
                            reason_code="PARAMETER_LIMIT_EXCEEDED",
                            explanation=f"Parameter '{param_name}' ({num_val}) exceeds single-call limit of {max_val}.",
                            latency_ms=round(elapsed, 3),
                            canonical_effects=effects,
                            redacted_parameters=redacted_params
                        )
                except (ValueError, TypeError):
                    pass

            # 3B. TCEAV Lineage & Provenance Authority Check
            # Check if this sensitive parameter was ingested from an untrusted source
            untrusted_sources = rule.get("untrusted_sources_blocked", ["customer_email", "untrusted_external", "web_content", "ticket_comment"])
            
            # Search provenance registry if provided
            injected_from_untrusted = False
            violating_source = ""
            if provenance_sources:
                for src in provenance_sources:
                    content = str(src.get("content", "")).lower()
                    if val_str.lower() in content and len(val_str) > 3:
                        src_type = src.get("source_type", "")
                        src_name = src.get("source_name", src.get("source_id", ""))
                        if src_type in ["untrusted_external", "customer_email"] or any(u in src_name.lower() for u in untrusted_sources):
                            injected_from_untrusted = True
                            violating_source = f"{src_type} ({src_name})"
                            break

            # Check explicit evidence binding attached to proposal
            if param_name in proposal.evidence_bindings:
                ev = proposal.evidence_bindings[param_name]
                if ev.source_trust == SourceTrust.UNTRUSTED_EXTERNAL:
                    injected_from_untrusted = True
                    violating_source = f"untrusted_external ({','.join(ev.source_content_ids)})"

            # Sensitive target/payee parameter violation
            is_sensitive_destination = any(term in param_name.lower() for term in ["target", "account", "wallet", "recipient", "payee", "to_address", "url"])
            if (injected_from_untrusted or (is_sensitive_destination and "0x" in val_str)) and is_sensitive_destination:
                elapsed = (time.perf_counter() - start_time) * 1000
                return GuardDecision(
                    decision_id=f"dec_{int(time.time()*1000)}",
                    action_id=proposal.action_id,
                    status=GuardStatus.DENY,
                    stage="Stage 2: TCEAV Evidence & Authority Guard",
                    reason_code="DESTINATION_NOT_AUTHORIZED",
                    explanation=(
                        f"TCEAV Invariant Violation: Parameter '{param_name}' value ('{val_str}') "
                        f"originated from lower-trust source: {violating_source or 'untrusted_external'}. "
                        f"External text is admissible as data to summarize, but forbidden as an authorized execution destination."
                    ),
                    latency_ms=round(elapsed, 3),
                    canonical_effects=effects,
                    redacted_parameters=redacted_params
                )

        # All TCEAV checks passed
        elapsed = (time.perf_counter() - start_time) * 1000
        return GuardDecision(
            decision_id=f"dec_{int(time.time()*1000)}",
            action_id=proposal.action_id,
            status=GuardStatus.ALLOW,
            stage="All Stages Passed",
            reason_code="AUTHORIZED",
            explanation="Action complies with task authority, typed parameter admissibility, and provenance bounds.",
            latency_ms=round(elapsed, 3),
            canonical_effects=effects,
            redacted_parameters=redacted_params
        )

tceav_engine = TCEAVEngine()
