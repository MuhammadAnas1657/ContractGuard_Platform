"""
ContractGuard-X Module 3: Task-Conditioned Evidence & Authority Verification (TCEAV)
Formal reference monitor verifying:
  authorized = A (Authority) AND P (Parameter-Purpose Admissibility) AND E (Evidence Lineage) AND S (Task Scope)
"""
from __future__ import annotations
import time
import hashlib
from enum import Enum
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class GuardStatus(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    REVIEW = "REVIEW"


class SourceTrust(str, Enum):
    AUTHENTICATED_USER = "authenticated_user"
    APPROVED_DEVELOPER = "approved_developer"
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
    purpose: str = "data_value"
    allowed_purposes: List[str] = Field(default_factory=lambda: ["read_data", "summarization", "data_value"])
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
    tceav_predicates: Dict[str, bool] = Field(
        default_factory=lambda: {"authority": True, "purpose": True, "evidence": True, "scope": True}
    )
    canonical_effects: List[str] = Field(default_factory=list)
    redacted_parameters: Dict[str, Any] = Field(default_factory=dict)


class TCEAVEngine:
    """
    Task-Conditioned Evidence & Authority Verification (TCEAV)
    Evaluates:
      Admissible(x, p, T, C, Π) = schema_valid(x, p) ∧ evidence_sufficient(x, p, Π, C) ∧ purpose_permitted(p, T, C)
      LocalAllow(a) = Authority(A) ∧ Purpose(P) ∧ Evidence(E) ∧ Scope(S)
    """

    SENSITIVE_DESTINATION_PARAMS = {
        "target", "target_account", "account", "wallet", "recipient",
        "recipient_iban", "payee", "to_address", "to_email", "url", "webhook_url", "cmd", "command"
    }
    READ_ONLY_TOOLS = {
        "read_document", "summarize_text", "summarize_document", "reply_to_user",
        "read_customer_email", "lookup_customer_db", "fetch_bank_statement", "read_github_issue"
    }

    @staticmethod
    def compute_digest(value: Any) -> str:
        """Computes deterministic SHA256 digest of argument value for secure lineage tracking."""
        val_str = str(value).strip().lower()
        return hashlib.sha256(val_str.encode("utf-8")).hexdigest()[:16]

    @classmethod
    def infer_parameter_purpose(cls, tool_name: str, param_name: str, effects: List[str]) -> str:
        """Determines the semantic purpose p of parameter x in tool_name."""
        p_low = param_name.lower()
        t_low = tool_name.lower()
        if t_low in cls.READ_ONLY_TOOLS and p_low not in {"to_email", "webhook_url"}:
            return "summarization" if "summar" in t_low or "reply" in t_low else "read_data"
        if any(k in p_low for k in ["cmd", "command", "script", "shell"]):
            return "command_execution"
        if any(k in p_low for k in ["target", "account", "wallet", "payee", "iban"]):
            return "fund_recipient"
        if any(k in p_low for k in ["recipient", "to_email", "to_address", "url", "webhook", "destination"]):
            return "destination_address"
        if any("financial" in str(e).lower() or "transfer" in str(e).lower() for e in effects) and p_low in {"amount", "value", "sum"}:
            return "financial_amount"
        return "data_value"

    def verify(
        self,
        proposal: ActionProposal,
        policy: Dict[str, Any],
        provenance_sources: Optional[List[Dict[str, Any]]] = None
    ) -> GuardDecision:
        """
        Executes TCEAV verification on an action proposal:
        authorized = A AND P AND E AND S
        """
        start_time = time.perf_counter()
        tool_name = proposal.tool_name
        params = proposal.parameters or {}
        user_task_lower = (proposal.user_task or "").lower()

        # Redact sensitive parameters for audit (Invariant #9)
        redacted_params: Dict[str, Any] = {}
        for k, v in params.items():
            if any(term in k.lower() for term in ["key", "token", "password", "secret", "cvv", "auth"]):
                redacted_params[k] = "[REDACTED_SECRET]"
            elif any(term in str(v) for term in ["SEC_", "sk-", "ghp_"]):
                redacted_params[k] = "[REDACTED_PAYLOAD]"
            else:
                redacted_params[k] = v

        # -------------------------------------------------------------
        # PREDICATE A: Authority (Global Denied Tools & Policy Tool Allowlist)
        # -------------------------------------------------------------
        global_envelope = policy.get("global_envelope", {})
        denied_tools = set(global_envelope.get("denied_tools", ["delete_database", "execute_shell", "format_disk", "drop_tables"]))
        if tool_name in denied_tools:
            elapsed = (time.perf_counter() - start_time) * 1000
            return GuardDecision(
                decision_id=f"dec_{int(time.time()*1000)}",
                action_id=proposal.action_id,
                status=GuardStatus.DENY,
                stage="Stage 1: Boundary Perimeter Gateway (Authority A)",
                reason_code="HARD_DENIED_TOOL",
                explanation=f"Tool '{tool_name}' is permanently forbidden by global security envelope.",
                latency_ms=round(elapsed, 3),
                tceav_predicates={"authority": False, "purpose": True, "evidence": True, "scope": False},
                redacted_parameters=redacted_params
            )

        tools_dict = policy.get("tools", {})
        tool_spec = tools_dict.get(tool_name)
        if isinstance(tool_spec, dict) and tool_spec.get("allowed") is False:
            elapsed = (time.perf_counter() - start_time) * 1000
            return GuardDecision(
                decision_id=f"dec_{int(time.time()*1000)}",
                action_id=proposal.action_id,
                status=GuardStatus.DENY,
                stage="Stage 2: Policy Authorization (Authority A)",
                reason_code="TOOL_NOT_PERMITTED",
                explanation=f"Tool '{tool_name}' is explicitly marked allowed=false in active security policy.",
                latency_ms=round(elapsed, 3),
                tceav_predicates={"authority": False, "purpose": True, "evidence": True, "scope": False},
                redacted_parameters=redacted_params
            )

        if not tool_spec and tool_name not in self.READ_ONLY_TOOLS and tool_name not in ["process_refund", "transfer_funds"]:
            elapsed = (time.perf_counter() - start_time) * 1000
            return GuardDecision(
                decision_id=f"dec_{int(time.time()*1000)}",
                action_id=proposal.action_id,
                status=GuardStatus.DENY,
                stage="Stage 2: Policy Authorization (Authority A)",
                reason_code="TOOL_NOT_PERMITTED",
                explanation=f"Tool '{tool_name}' is not authorized in active security policy.",
                latency_ms=round(elapsed, 3),
                tceav_predicates={"authority": False, "purpose": True, "evidence": True, "scope": False},
                redacted_parameters=redacted_params
            )

        effects = (tool_spec.get("effects", []) if isinstance(tool_spec, dict) else []) or (
            ["read_data"] if tool_name in self.READ_ONLY_TOOLS else ["system.call"]
        )
        if isinstance(tool_spec, dict) and "effect" in tool_spec and tool_spec["effect"] not in effects:
            effects.append(tool_spec["effect"])

        # -------------------------------------------------------------
        # PREDICATES S, P, E: Scope, Parameter-Purpose Admissibility, & Evidence
        # -------------------------------------------------------------
        param_rules = (tool_spec.get("parameters", {}) if isinstance(tool_spec, dict) else {}) or {}
        unknown_prov_rule = policy.get("unknown_provenance_rule", "allow_if_not_untrusted")

        for param_name, param_val in params.items():
            rule = param_rules.get(param_name, {})
            val_str = str(param_val).strip()
            purpose = self.infer_parameter_purpose(tool_name, param_name, effects)

            # S1. Single-call numerical boundaries (Scope S)
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
                            stage="Stage 2: Deterministic Schema Guard (Scope S)",
                            reason_code="PARAMETER_LIMIT_EXCEEDED",
                            explanation=f"Parameter '{param_name}' ({num_val}) exceeds single-call limit of {max_val}.",
                            latency_ms=round(elapsed, 3),
                            tceav_predicates={"authority": True, "purpose": True, "evidence": True, "scope": False},
                            canonical_effects=effects,
                            redacted_parameters=redacted_params
                        )
                except (ValueError, TypeError):
                    pass

            # S2. Allowed domains check (Scope S)
            allowed_domains = rule.get("allowed_domains")
            if allowed_domains and ("@" in val_str or "://" in val_str):
                domain_part = val_str.split("@")[-1].lower() if "@" in val_str else val_str.split("://")[-1].split("/")[0].lower()
                domain_ok = any(
                    d.lower().lstrip("*.") in domain_part
                    for d in allowed_domains
                )
                if not domain_ok:
                    elapsed = (time.perf_counter() - start_time) * 1000
                    return GuardDecision(
                        decision_id=f"dec_{int(time.time()*1000)}",
                        action_id=proposal.action_id,
                        status=GuardStatus.DENY,
                        stage="Stage 2: Domain Scope Guard (Scope S)",
                        reason_code="DOMAIN_NOT_AUTHORIZED",
                        explanation=f"Destination domain '{domain_part}' is outside allowed policy domains {allowed_domains}.",
                        latency_ms=round(elapsed, 3),
                        tceav_predicates={"authority": True, "purpose": False, "evidence": True, "scope": False},
                        canonical_effects=effects,
                        redacted_parameters=redacted_params
                    )

            # P & E: Parameter-Purpose Admissibility & Provenance Lineage
            # Key scientific mechanism:
            # If purpose is read_data or summarization (e.g. summarizing an email containing attacker@example.com),
            # external untrusted text IS admissible!
            if purpose in {"read_data", "summarization"}:
                continue

            is_sensitive_dest = (
                purpose in {"fund_recipient", "destination_address", "command_execution"}
                or param_name.lower() in self.SENSITIVE_DESTINATION_PARAMS
                or any(term in param_name.lower() for term in ["target", "account", "wallet", "recipient", "payee", "to_address", "url"])
            )

            # Check if explicitly authorized in the authenticated user's task (Case P2: Authorized recipient control)
            explicitly_in_user_task = (len(val_str) > 3 and val_str.lower() in user_task_lower)

            # Check provenance sources
            untrusted_sources = rule.get(
                "untrusted_sources_blocked",
                ["customer_email", "untrusted_external", "external_untrusted", "web_content", "ticket_comment", "web_scrape"]
            )
            injected_from_untrusted = False
            trusted_evidence_found = explicitly_in_user_task
            violating_source = ""
            observability = ArgumentObservability.INSTRUMENTED

            if provenance_sources:
                for src in provenance_sources:
                    content = str(src.get("content", "")).lower()
                    if len(val_str) > 3 and val_str.lower() in content:
                        src_type = str(src.get("source_type", "")).lower()
                        src_name = str(src.get("source_name", src.get("source_id", ""))).lower()
                        if src_type in {"authenticated_user", "internal_db", "approved_developer", "verified_customer_profile"}:
                            trusted_evidence_found = True
                        elif (
                            src_type in {"untrusted_external", "external_untrusted", "customer_email", "tool_result"}
                            or any(u.lower() in src_name or u.lower() in src_type for u in untrusted_sources)
                        ):
                            injected_from_untrusted = True
                            violating_source = f"{src_type} ({src_name or 'external'})"

            # Check explicit evidence binding attached to proposal
            if param_name in proposal.evidence_bindings:
                ev = proposal.evidence_bindings[param_name]
                observability = ev.observability
                if ev.source_trust in {SourceTrust.AUTHENTICATED_USER, SourceTrust.INTERNAL_DB, SourceTrust.APPROVED_DEVELOPER}:
                    trusted_evidence_found = True
                elif ev.source_trust == SourceTrust.UNTRUSTED_EXTERNAL:
                    injected_from_untrusted = True
                    violating_source = f"untrusted_external ({','.join(ev.source_content_ids)})"
                elif ev.source_trust == SourceTrust.UNKNOWN:
                    observability = ArgumentObservability.UNKNOWN

            # Case P1 vs P2:
            # If value came from untrusted external source AND was NOT independently authorized by the authenticated user task:
            if is_sensitive_dest and injected_from_untrusted and not trusted_evidence_found:
                elapsed = (time.perf_counter() - start_time) * 1000
                return GuardDecision(
                    decision_id=f"dec_{int(time.time()*1000)}",
                    action_id=proposal.action_id,
                    status=GuardStatus.DENY,
                    stage="Stage 2: TCEAV Evidence & Authority Guard (Purpose P & Evidence E)",
                    reason_code="DESTINATION_NOT_AUTHORIZED",
                    explanation=(
                        f"TCEAV Invariant Violation: Parameter '{param_name}' (purpose='{purpose}', value='{val_str}') "
                        f"originated from lower-trust source: {violating_source or 'untrusted_external'}. "
                        f"External text is admissible as data to summarize, but forbidden as an authorized execution destination."
                    ),
                    latency_ms=round(elapsed, 3),
                    tceav_predicates={"authority": True, "purpose": False, "evidence": False, "scope": True},
                    canonical_effects=effects,
                    redacted_parameters=redacted_params
                )

            # Case U1: Unknown provenance on sensitive destination when policy enforces unknown_provenance_rule
            if is_sensitive_dest and not trusted_evidence_found:
                if observability == ArgumentObservability.UNKNOWN or unknown_prov_rule in {"review_or_deny_sensitive", "deny_unknown", "fail_closed"}:
                    elapsed = (time.perf_counter() - start_time) * 1000
                    return GuardDecision(
                        decision_id=f"dec_{int(time.time()*1000)}",
                        action_id=proposal.action_id,
                        status=GuardStatus.DENY,
                        stage="Stage 2: TCEAV Unknown Lineage Guard (Evidence E)",
                        reason_code="UNKNOWN_PROVENANCE_SENSITIVE_ACTION",
                        explanation=(
                            f"TCEAV Lineage Failure: Sensitive parameter '{param_name}' ('{val_str}') has unverified/unknown provenance "
                            f"and is not bound to any authenticated user task or trusted database record."
                        ),
                        latency_ms=round(elapsed, 3),
                        tceav_predicates={"authority": True, "purpose": True, "evidence": False, "scope": True},
                        canonical_effects=effects,
                        redacted_parameters=redacted_params
                    )

        # All TCEAV checks (A, P, E, S) passed
        elapsed = (time.perf_counter() - start_time) * 1000
        return GuardDecision(
            decision_id=f"dec_{int(time.time()*1000)}",
            action_id=proposal.action_id,
            status=GuardStatus.ALLOW,
            stage="All Stages Passed (A ∧ P ∧ E ∧ S Verified)",
            reason_code="AUTHORIZED",
            explanation="Action complies with task authority, typed parameter-purpose admissibility, and provenance bounds.",
            latency_ms=round(elapsed, 3),
            tceav_predicates={"authority": True, "purpose": True, "evidence": True, "scope": True},
            canonical_effects=effects,
            redacted_parameters=redacted_params
        )


tceav_engine = TCEAVEngine()
