"""
ContractGuard-X SDK Client
Provides both high-performance local reference monitoring and REST Gateway integration.
"""
from __future__ import annotations
import os
import time
import requests
from typing import Dict, Any, Optional, Callable
from .models import SecurityContract, InterceptionDecision
from .provenance import ProvenanceTracker
from .ledger import CumulativeEffectLedger

class ContractGuardClient:
    """
    Main SDK client for AI Agent Developers.
    Can operate in:
    1. Standalone in-process mode (sub-millisecond evaluation via SecurityContract)
    2. Cloud/Gateway mode (via ContractGuard-X REST API)
    """

    def __init__(
        self,
        contract: Optional[SecurityContract] = None,
        contract_path: Optional[str] = None,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        user_intent: str = ""
    ):
        if contract:
            self.contract = contract
        elif contract_path and os.path.exists(contract_path):
            self.contract = SecurityContract.from_file(contract_path)
        else:
            self.contract = SecurityContract(agent_name="DefaultGuardedAgent")

        self.base_url = base_url or os.getenv("CONTRACTGUARD_BASE_URL")
        self.api_key = api_key or os.getenv("CONTRACTGUARD_API_KEY", "")
        self.provenance = ProvenanceTracker()
        self.ledger = CumulativeEffectLedger(
            max_cumulative_budget=self.contract.global_envelope.max_cumulative_budget,
            max_invocations=self.contract.global_envelope.max_tool_invocations
        )
        self.user_intent = user_intent
        if user_intent:
            self.provenance.tag_user_input(user_intent)

    def set_user_task(self, task: str) -> None:
        """Sets authenticated user intent."""
        self.user_intent = task
        self.provenance.tag_user_input(task)

    def register_untrusted_content(self, text: str, source_name: str = "external_stream") -> None:
        """Registers untrusted external text (email, document, web scrape) into provenance registry."""
        self.provenance.tag_untrusted_input(text, source_name=source_name)

    def evaluate_action(self, tool_name: str, parameters: Dict[str, Any]) -> InterceptionDecision:
        """
        Evaluates a candidate tool action against Stage 1 (Boundaries), Stage 2 (TCEAV Evidence & Ledger).
        """
        start_time = time.perf_counter()

        # Gateway Mode if base_url is specified
        if self.base_url:
            try:
                resp = requests.post(
                    f"{self.base_url.rstrip('/')}/simulate/run",
                    json={
                        "scenario_id": "indirect_email_injection",
                        "custom_user_goal": self.user_intent,
                        "custom_malicious_payload": str(parameters),
                        "contract_yaml": self.contract.to_yaml()
                    },
                    timeout=5.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    cg_run = data.get("contractguard_run", {})
                    allowed = (cg_run.get("status") == "SAFE")
                    interception = cg_run.get("interception") or {}
                    elapsed = (time.perf_counter() - start_time) * 1000
                    return InterceptionDecision(
                        allowed=allowed,
                        stage=interception.get("stage", "Remote Gateway"),
                        reason=interception.get("reason", cg_run.get("execution_outcome", "")),
                        latency_ms=round(elapsed, 2),
                        tool_name=tool_name,
                        parameters=parameters
                    )
            except Exception:
                pass  # Fallback to local in-process check

        # Local In-Process Evaluation Mode
        # 1. Denied Tools
        if tool_name in self.contract.global_envelope.denied_tools:
            elapsed = (time.perf_counter() - start_time) * 1000
            return InterceptionDecision(
                allowed=False,
                stage="Stage 1: Boundary Perimeter Gateway",
                reason=f"Tool '{tool_name}' is explicitly forbidden in global security envelope.",
                latency_ms=round(elapsed, 3),
                tool_name=tool_name,
                parameters=parameters
            )

        tool_contract = self.contract.tools.get(tool_name)
        effects = tool_contract.effects if tool_contract else ["system.call"]

        # 2. TCEAV Parameter Evidence Verification
        if tool_contract:
            for p_name, p_val in parameters.items():
                rule = tool_contract.parameters.get(p_name)
                if not rule:
                    continue

                # Max value
                if rule.max_value is not None:
                    try:
                        num = float(p_val)
                        if num > rule.max_value:
                            elapsed = (time.perf_counter() - start_time) * 1000
                            return InterceptionDecision(
                                allowed=False,
                                stage="Stage 2: Deterministic Schema Guard",
                                reason=f"Parameter '{p_name}' ({num}) exceeds single-call limit of {rule.max_value}.",
                                latency_ms=round(elapsed, 3),
                                tool_name=tool_name,
                                parameters=parameters
                            )
                    except (ValueError, TypeError):
                        pass

                # Provenance authority
                is_auth, reason = self.provenance.is_authorized_value(
                    value=p_val,
                    allowed_sources=rule.source_authority,
                    forbidden_sources=rule.untrusted_sources_blocked
                )
                if not is_auth:
                    elapsed = (time.perf_counter() - start_time) * 1000
                    return InterceptionDecision(
                        allowed=False,
                        stage="Stage 2: TCEAV Evidence & Authority Guard",
                        reason=f"Parameter '{p_name}' violation: {reason}",
                        latency_ms=round(elapsed, 3),
                        tool_name=tool_name,
                        parameters=parameters
                    )

        # 3. Cumulative Effect Ledger Check
        valid_ledger, ledger_msg = self.ledger.check_and_record(tool_name, effects, parameters)
        if not valid_ledger:
            elapsed = (time.perf_counter() - start_time) * 1000
            return InterceptionDecision(
                allowed=False,
                stage="Stage 2: Cumulative Effect Ledger",
                reason=ledger_msg,
                latency_ms=round(elapsed, 3),
                tool_name=tool_name,
                parameters=parameters
            )

        elapsed = (time.perf_counter() - start_time) * 1000
        return InterceptionDecision(
            allowed=True,
            stage="All Stages Passed",
            reason="Tool call authorized by Security Contract and verified evidence bounds.",
            latency_ms=round(elapsed, 3),
            tool_name=tool_name,
            parameters=parameters
        )

    def guard_tool(self, tool_func: Callable) -> Callable:
        """Function decorator wrapping any tool callable."""
        tool_name = getattr(tool_func, "__name__", "unknown_tool")

        def wrapper(*args, **kwargs):
            decision = self.evaluate_action(tool_name, kwargs)
            if not decision.allowed:
                raise PermissionError(f"[ContractGuard-X Intercepted - {decision.stage}]: {decision.reason}")
            return tool_func(*args, **kwargs)

        return wrapper
