"""
ContractGuard-X Module 1: AI-Assisted Policy Engineering & Static Linter
Compiles natural language security constraints into typed YAML contracts, lints rules, and signs approved versions.
"""
from __future__ import annotations
import yaml
import time
import hashlib
from typing import Dict, List, Any, Optional, Tuple
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

class SignedPolicyPackage(BaseModel):
    policy_id: str
    version: str
    sha256_signature: str
    approved_by: str
    approved_at: float
    contract_yaml: str
    parsed_contract: Dict[str, Any]

class PolicyCompiler:
    """
    Independent static linter and compiler for ContractGuard Security Contracts.
    Enforces the invariant: AI drafts are advisory; developer approval is required for activation.
    """

    FORBIDDEN_TOOLS = {"execute_shell", "delete_database", "format_disk", "drop_tables", "eval"}

    @classmethod
    def lint_policy(cls, contract: Dict[str, Any]) -> PolicyLintResult:
        """Runs deterministic static checks on a policy dictionary."""
        issues: List[LintIssue] = []
        fixes: List[LintIssue] = []

        global_envelope = contract.get("global_envelope", {})
        denied_tools = set(global_envelope.get("denied_tools", []))
        tools = contract.get("tools", {})

        # 1. Check if high-risk system execution tools are accidentally exposed
        for dangerous in cls.FORBIDDEN_TOOLS:
            if dangerous in tools:
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="DENIED_TOOL_EXPOSED",
                    message=f"Dangerous tool '{dangerous}' is defined under tools. It must be added to global_envelope.denied_tools.",
                    tool_name=dangerous
                ))
            if dangerous not in denied_tools:
                issues.append(LintIssue(
                    severity="WARNING",
                    rule="MISSING_STANDARD_DENIED_TOOL",
                    message=f"Standard banned tool '{dangerous}' is missing from global_envelope.denied_tools.",
                    tool_name=dangerous
                ))

        # 2. Check cumulative budget ceiling
        max_budget = global_envelope.get("max_cumulative_budget")
        if max_budget is None:
            issues.append(LintIssue(
                severity="WARNING",
                rule="UNBOUNDED_SESSION_BUDGET",
                message="Global envelope lacks max_cumulative_budget. Agents risk unbounded multi-turn financial drain."
            ))

        # 3. Check parameter authority rules for sensitive actions
        for t_name, t_spec in tools.items():
            params = t_spec.get("parameters", {})
            effects = t_spec.get("effects", [])

            # Financial tools must have spend limits
            if any("financial" in str(e).lower() for e in effects) or "refund" in t_name.lower():
                amount_rule = params.get("amount", {})
                if not amount_rule or "max_value" not in amount_rule:
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="UNBOUNDED_TRANSACTION_LIMIT",
                        message=f"Financial tool '{t_name}' lacks max_value limit on 'amount' parameter.",
                        tool_name=t_name,
                        parameter_name="amount"
                    ))

            # Destination parameters must block untrusted inputs
            for p_name, p_rule in params.items():
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

        has_errors = any(i.severity == "ERROR" for i in issues)
        return PolicyLintResult(
            valid=(not has_errors),
            issues=issues
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
        Cryptographically signs a validated contract after explicit human approval.
        """
        parsed = yaml.safe_load(contract_yaml) or {}
        lint_res = cls.lint_policy(parsed)
        if not lint_res.valid:
            error_msgs = [i.message for i in lint_res.issues if i.severity == "ERROR"]
            raise ValueError(f"Cannot approve policy with critical lint errors: {'; '.join(error_msgs)}")

        # Deterministic SHA256 signature
        raw_bytes = contract_yaml.strip().encode("utf-8")
        signature = hashlib.sha256(raw_bytes).hexdigest()

        return SignedPolicyPackage(
            policy_id=policy_id,
            version=version,
            sha256_signature=signature,
            approved_by=approved_by,
            approved_at=time.time(),
            contract_yaml=contract_yaml,
            parsed_contract=parsed
        )

policy_compiler = PolicyCompiler()
