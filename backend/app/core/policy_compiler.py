"""
ContractGuard-X Module 1: AI-Assisted Policy Engineering & Static Linter
Compiles natural language security constraints into typed YAML contracts, lints rules,
enforces human-only approval (Invariant #1), and freezes approved versions.
"""
from __future__ import annotations
import yaml
import time
import hashlib
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class LintIssue(BaseModel):
    severity: str  # "ERROR", "WARNING", "INFO"
    rule: str
    message: str
    tool_name: Optional[str] = None
    parameter_name: Optional[str] = None


class PolicyLintResult(BaseModel):
    valid: bool
    issues: List[LintIssue] = Field(default_factory=list)
    suggested_fixes: List[str] = Field(default_factory=list)
    positive_tests: List[Dict[str, Any]] = Field(default_factory=list)
    negative_tests: List[Dict[str, Any]] = Field(default_factory=list)


class SignedPolicyPackage(BaseModel):
    policy_id: str
    version: str
    sha256_signature: str
    approved_by: str
    approved_at: float
    status: str = "APPROVED"
    immutable: bool = True
    is_frozen: bool = True
    contract_yaml: str
    parsed_contract: Dict[str, Any]
    positive_test_fixtures: List[Dict[str, Any]] = Field(default_factory=list)
    negative_test_fixtures: List[Dict[str, Any]] = Field(default_factory=list)


class PolicyCompiler:
    """
    Independent static linter, test fixture generator, and cryptographic signer for ContractGuard Security Contracts.
    Enforces Invariant #1: AI drafts are advisory; explicit developer approval is required for activation;
    approved versions are immutable.
    """

    FORBIDDEN_TOOLS = {"execute_shell", "delete_database", "format_disk", "drop_tables", "eval"}
    _approved_registry: Dict[str, SignedPolicyPackage] = {}

    @classmethod
    def lint_policy(cls, contract: Dict[str, Any], allow_ai_self_approval: bool = False) -> PolicyLintResult:
        """Runs deterministic static checks on a policy dictionary and generates test fixtures."""
        issues: List[LintIssue] = []
        fixes: List[str] = []

        if not isinstance(contract, dict) or not contract:
            return PolicyLintResult(
                valid=False,
                issues=[LintIssue(severity="ERROR", rule="EMPTY_OR_INVALID_ROOT", message="Policy root must be a non-empty YAML/JSON mapping.")]
            )

        # Invariant #1 check: Reject AI self-approved drafts
        approval_block = contract.get("approval", {})
        if not allow_ai_self_approval and isinstance(approval_block, dict):
            app_by = str(approval_block.get("approved_by", "")).lower()
            if approval_block.get("status") == "approved" and any(ai_tag in app_by for ai_tag in ["ai", "llm", "nemotron", "assistant", "auto", "self"]):
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="SELF_APPROVED_AI_POLICY_FORBIDDEN",
                    message=f"Invariant #1 Violation: AI model/assistant ('{app_by}') cannot self-approve a security policy. Human developer approval is required."
                ))

        global_envelope = contract.get("global_envelope", {})
        if not isinstance(global_envelope, dict):
            issues.append(LintIssue(
                severity="ERROR",
                rule="INVALID_GLOBAL_ENVELOPE",
                message="Section 'global_envelope' must be a valid dictionary."
            ))
            global_envelope = {}

        denied_tools = set(global_envelope.get("denied_tools", []))
        tools = contract.get("tools", {})
        if not isinstance(tools, dict):
            issues.append(LintIssue(
                severity="ERROR",
                rule="INVALID_TOOLS_SECTION",
                message="Section 'tools' must be a valid dictionary mapping tool names to rules."
            ))
            tools = {}

        # 1. Check if high-risk system execution tools are accidentally exposed or contradictory
        for dangerous in cls.FORBIDDEN_TOOLS:
            if dangerous in tools:
                t_cfg = tools.get(dangerous) or {}
                if not isinstance(t_cfg, dict) or t_cfg.get("allowed", True) is not False:
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="DENIED_TOOL_EXPOSED",
                        message=f"Dangerous tool '{dangerous}' is enabled under tools. It must be placed in global_envelope.denied_tools.",
                        tool_name=dangerous
                    ))
                    fixes.append(f"Move '{dangerous}' to global_envelope.denied_tools.")
            if dangerous not in denied_tools:
                issues.append(LintIssue(
                    severity="WARNING",
                    rule="MISSING_STANDARD_DENIED_TOOL",
                    message=f"Standard banned tool '{dangerous}' is missing from global_envelope.denied_tools.",
                    tool_name=dangerous
                ))

        # Check contradictory rules (tool in both tools and denied_tools)
        for t_name in tools:
            if t_name in denied_tools:
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="CONTRADICTORY_TOOL_RULE",
                    message=f"Contradictory policy: Tool '{t_name}' appears in both 'tools' and 'global_envelope.denied_tools'.",
                    tool_name=t_name
                ))

        # 2. Check wildcard external domains
        allowed_domains = global_envelope.get("allowed_domains", [])
        if "*" in allowed_domains or "*.*" in allowed_domains:
            if not global_envelope.get("allow_wildcard_domains_acknowledged", False):
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="UNACKNOWLEDGED_WILDCARD_DOMAIN",
                    message="Wildcard '*' external domain is forbidden unless explicitly acknowledged."
                ))

        # 3. Check cumulative budget ceiling
        max_budget = global_envelope.get("max_cumulative_budget")
        if max_budget is None:
            issues.append(LintIssue(
                severity="WARNING",
                rule="UNBOUNDED_SESSION_BUDGET",
                message="Global envelope lacks max_cumulative_budget. Agents risk unbounded multi-turn financial drain."
            ))
            fixes.append("Set global_envelope.max_cumulative_budget (e.g. 1000.0).")
        else:
            try:
                if float(max_budget) <= 0:
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="INVALID_BUDGET_VALUE",
                        message="max_cumulative_budget must be greater than 0."
                    ))
            except (ValueError, TypeError):
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="INVALID_BUDGET_TYPE",
                    message="max_cumulative_budget must be a valid number."
                ))

        # 4. Check parameter authority rules for sensitive actions
        for t_name, t_spec in tools.items():
            if not isinstance(t_spec, dict):
                continue
            params = t_spec.get("parameters", {}) or {}
            effects = t_spec.get("effects", []) or []

            # Financial tools must have spend limits
            if any("financial" in str(e).lower() or "transfer" in str(e).lower() for e in effects) or "refund" in t_name.lower():
                amount_rule = params.get("amount", {})
                if not amount_rule or "max_value" not in amount_rule:
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="UNBOUNDED_TRANSACTION_LIMIT",
                        message=f"Financial tool '{t_name}' lacks max_value limit on 'amount' parameter.",
                        tool_name=t_name,
                        parameter_name="amount"
                    ))
                    fixes.append(f"Add parameters.amount.max_value to '{t_name}'.")
                else:
                    min_v = amount_rule.get("min_value")
                    max_v = amount_rule.get("max_value")
                    if min_v is not None and max_v is not None and float(min_v) > float(max_v):
                        issues.append(LintIssue(
                            severity="ERROR",
                            rule="CONTRADICTORY_PARAMETER_BOUNDS",
                            message=f"Parameter 'amount' in '{t_name}' has min_value ({min_v}) > max_value ({max_v}).",
                            tool_name=t_name,
                            parameter_name="amount"
                        ))

            # Destination parameters must block untrusted inputs
            for p_name, p_rule in params.items():
                if not isinstance(p_rule, dict):
                    continue
                if any(k in p_name.lower() for k in ["target", "account", "wallet", "recipient", "payee", "to_email"]):
                    blocked = p_rule.get("untrusted_sources_blocked", [])
                    if not blocked or "customer_email" not in blocked:
                        issues.append(LintIssue(
                            severity="WARNING",
                            rule="UNRESTRICTED_DESTINATION_SOURCE",
                            message=f"Sensitive destination '{p_name}' in tool '{t_name}' does not explicitly block customer_email.",
                            tool_name=t_name,
                            parameter_name=p_name
                        ))
                        fixes.append(f"Add 'customer_email' to {t_name}.parameters.{p_name}.untrusted_sources_blocked.")

        # Generate curated positive and negative test fixtures
        pos_tests = [
            {
                "name": "test_legitimate_authorized_workflow",
                "tool": "process_refund" if "process_refund" in tools else next(iter(tools.keys()), "read_document"),
                "parameters": {"amount": 150.0, "target_account": "ACC-VERIFIED-01"},
                "source_trust": "authenticated_user",
                "expected_decision": "ALLOW"
            }
        ]
        neg_tests = [
            {
                "name": "test_indirect_injection_untrusted_recipient",
                "tool": "process_refund" if "process_refund" in tools else "send_email",
                "parameters": {"amount": 450.0, "target_account": "0xHACKER_STEALTH_99"},
                "source_trust": "untrusted_external",
                "expected_decision": "DENY"
            },
            {
                "name": "test_denied_system_tool_execution",
                "tool": "execute_shell",
                "parameters": {"cmd": "rm -rf /"},
                "source_trust": "untrusted_external",
                "expected_decision": "DENY"
            }
        ]

        has_errors = any(i.severity == "ERROR" for i in issues)
        return PolicyLintResult(
            valid=(not has_errors),
            issues=issues,
            suggested_fixes=fixes,
            positive_tests=pos_tests,
            negative_tests=neg_tests
        )

    @classmethod
    def sign_and_publish(
        cls,
        contract_yaml: str,
        policy_id: str,
        approved_by: str,
        version: str = "1.0.0"
    ) -> SignedPolicyPackage:
        """
        Cryptographically signs a validated contract after explicit human approval
        and freezes it in the immutable policy registry.
        """
        if not approved_by or any(ai in approved_by.lower() for ai in ["ai_draft", "nemotron", "llm_auto", "self"]):
            raise ValueError(
                "SELF_APPROVED_AI_POLICY_FORBIDDEN: Invariant #1 Violation — Policy approval must be performed by an authenticated human developer, not an AI model."
            )

        # Check if already frozen at this policy_id + version
        reg_key = f"{policy_id}:{version}"
        if reg_key in cls._approved_registry:
            existing = cls._approved_registry[reg_key]
            if existing.contract_yaml.strip() != contract_yaml.strip():
                raise ValueError(
                    f"IMMUTABLE_POLICY_VIOLATION: Policy '{policy_id}' version '{version}' is already approved and frozen (immutable). Increment version to publish changes."
                )
            return existing

        parsed = yaml.safe_load(contract_yaml) or {}
        lint_res = cls.lint_policy(parsed)
        if not lint_res.valid:
            error_msgs = [i.message for i in lint_res.issues if i.severity == "ERROR"]
            raise ValueError(f"Cannot approve policy with critical lint errors: {'; '.join(error_msgs)}")

        # Set server-side trusted approval metadata
        parsed["approval"] = {
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": time.time(),
            "version": version
        }

        # Deterministic SHA256 signature
        raw_bytes = contract_yaml.strip().encode("utf-8")
        signature = hashlib.sha256(raw_bytes).hexdigest()

        pkg = SignedPolicyPackage(
            policy_id=policy_id,
            version=version,
            sha256_signature=signature,
            approved_by=approved_by,
            approved_at=time.time(),
            status="APPROVED",
            immutable=True,
            is_frozen=True,
            contract_yaml=contract_yaml,
            parsed_contract=parsed,
            positive_test_fixtures=lint_res.positive_tests,
            negative_test_fixtures=lint_res.negative_tests
        )
        cls._approved_registry[reg_key] = pkg
        return pkg

    @classmethod
    def get_approved(cls, policy_id: str, version: Optional[str] = None) -> Optional[SignedPolicyPackage]:
        if version:
            return cls._approved_registry.get(f"{policy_id}:{version}")
        matches = [v for k, v in cls._approved_registry.items() if k.startswith(f"{policy_id}:")]
        return matches[-1] if matches else None


policy_compiler = PolicyCompiler()
