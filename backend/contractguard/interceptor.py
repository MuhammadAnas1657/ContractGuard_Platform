from __future__ import annotations
import time
from typing import Dict, Any, Optional, Callable
from pydantic import BaseModel, Field

from .contracts import SecurityContract
from .provenance import ProvenanceTracker, SourceType
from .ledger import CumulativeEffectLedger
from .client import NebiusTokenFactoryClient

class InterceptionResult(BaseModel):
    allowed: bool
    stage: str
    reason: str
    latency_ms: float
    tool_name: str
    parameters: Dict[str, Any]

class ContractGuardInterceptor:
    """
    Runtime execution guard for LangChain / LangGraph and autonomous LLM agents.
    Enforces Stage 1 (Fast Filter), Stage 2 (Provenance & Ledger), and Stage 3 (Nemotron Verification).
    """

    def __init__(
        self,
        contract: SecurityContract,
        provenance_tracker: Optional[ProvenanceTracker] = None,
        ledger: Optional[CumulativeEffectLedger] = None,
        nebius_client: Optional[NebiusTokenFactoryClient] = None
    ):
        self.contract = contract
        self.provenance = provenance_tracker or ProvenanceTracker()
        self.ledger = ledger or CumulativeEffectLedger(
            max_cumulative_budget=contract.global_envelope.max_cumulative_budget,
            max_invocations=contract.global_envelope.max_tool_invocations
        )
        self.nebius_client = nebius_client or NebiusTokenFactoryClient()
        self.current_user_intent: str = ""

    def set_user_intent(self, intent: str) -> None:
        """Sets the authenticated user's task goal for semantic invariant verification."""
        self.current_user_intent = intent
        self.provenance.tag_user_input(intent)

    def register_untrusted_content(self, text: str, source_name: str) -> None:
        """Registers external text (e.g. email, web page, PDF) before the agent reads it."""
        self.provenance.tag_untrusted_input(text, source_name=source_name)

    def evaluate_tool_call(self, tool_name: str, parameters: Dict[str, Any]) -> InterceptionResult:
        """
        Main gatekeeper: evaluates a proposed tool call through the 3-stage defense.
        """
        start_time = time.perf_counter()

        # -------------------------------------------------------------
        # STAGE 1: Fast Boundary Check (Denied Tools & Basic Integrity)
        # -------------------------------------------------------------
        if tool_name in self.contract.global_envelope.denied_tools:
            elapsed = (time.perf_counter() - start_time) * 1000
            return InterceptionResult(
                allowed=False,
                stage="Stage 1: Fast Boundary Filter",
                reason=f"Tool '{tool_name}' is in the global denied_tools list.",
                latency_ms=elapsed,
                tool_name=tool_name,
                parameters=parameters
            )

        tool_contract = self.contract.tools.get(tool_name)
        effects = tool_contract.effects if tool_contract else ["system.call"]

        # -------------------------------------------------------------
        # STAGE 2: Deterministic Policy & Provenance Guard (Zero Latency)
        # -------------------------------------------------------------
        if tool_contract:
            for param_name, param_val in parameters.items():
                rule = tool_contract.parameters.get(param_name)
                if not rule:
                    continue

                # 2A. Max value check (e.g. transfer limits)
                if rule.max_value is not None:
                    try:
                        num_val = float(param_val)
                        if num_val > rule.max_value:
                            elapsed = (time.perf_counter() - start_time) * 1000
                            return InterceptionResult(
                                allowed=False,
                                stage="Stage 2: Deterministic Schema Guard",
                                reason=f"Parameter '{param_name}' value ({num_val}) exceeds single-call limit of {rule.max_value}.",
                                latency_ms=elapsed,
                                tool_name=tool_name,
                                parameters=parameters
                            )
                    except (ValueError, TypeError):
                        pass

                # 2B. Evidence Binding & Provenance Verification
                # Did this sensitive value come from a forbidden / untrusted source?
                is_authorized, reason = self.provenance.is_authorized_value(
                    value=param_val,
                    allowed_sources=rule.source_authority,
                    forbidden_sources=rule.untrusted_sources_blocked
                )
                if not is_authorized:
                    elapsed = (time.perf_counter() - start_time) * 1000
                    return InterceptionResult(
                        allowed=False,
                        stage="Stage 2: Evidence-Bound Provenance Guard",
                        reason=f"Parameter '{param_name}' authority violation: {reason}",
                        latency_ms=elapsed,
                        tool_name=tool_name,
                        parameters=parameters
                    )

        # 2C. Cumulative Session Ledger (Stops Salami-Slicing)
        ledger_valid, ledger_msg = self.ledger.check_and_record(
            tool_name=tool_name,
            effects=effects,
            parameters=parameters
        )
        if not ledger_valid:
            elapsed = (time.perf_counter() - start_time) * 1000
            return InterceptionResult(
                allowed=False,
                stage="Stage 2: Cumulative Effect Ledger",
                reason=ledger_msg,
                latency_ms=elapsed,
                tool_name=tool_name,
                parameters=parameters
            )

        # -------------------------------------------------------------
        # STAGE 3: Nemotron Semantic Invariant Verifier (High-Risk/Ambiguous)
        # -------------------------------------------------------------
        if tool_contract and tool_contract.requires_semantic_verification:
            is_sem_valid, sem_reason = self.nebius_client.verify_semantic_invariant(
                tool_name=tool_name,
                parameters=parameters,
                user_intent=self.current_user_intent,
                context_preview=f"Calling {tool_name} with parameters {parameters}"
            )
            if not is_sem_valid:
                elapsed = (time.perf_counter() - start_time) * 1000
                return InterceptionResult(
                    allowed=False,
                    stage="Stage 3: Nemotron Semantic Verifier",
                    reason=sem_reason,
                    latency_ms=elapsed,
                    tool_name=tool_name,
                    parameters=parameters
                )

        # Passed all stages
        elapsed = (time.perf_counter() - start_time) * 1000
        return InterceptionResult(
            allowed=True,
            stage="All Stages Passed",
            reason="Tool call complies with Security Contract and Provenance Ledger.",
            latency_ms=elapsed,
            tool_name=tool_name,
            parameters=parameters
        )

    def wrap_tool(self, tool_func: Callable) -> Callable:
        """Decorator to wrap any Python or LangChain tool function automatically."""
        tool_name = getattr(tool_func, "__name__", "unknown_tool")

        def guarded(*args, **kwargs):
            eval_res = self.evaluate_tool_call(tool_name, kwargs)
            if not eval_res.allowed:
                raise PermissionError(f"[ContractGuard Security Block - {eval_res.stage}]: {eval_res.reason}")
            return tool_func(*args, **kwargs)

        return guarded
