"""
ContractGuard-X TriGuard v2 Dual-Engine Integration Bridge
Integrates the authentic TriGuard v2 Research Kit (Capability Microkernel, Provenance Taint Tracker, Intent Verifier)
with ContractGuard-X's sub-millisecond Zero-Token Sentinel & Vector Attack DB.
"""
from __future__ import annotations
import time
from typing import Dict, Any, Optional, List

from .triguard_v2.capabilities import CapabilityMicrokernel
from .triguard_v2.provenance import ProvenanceTracker, TrustLevel
from .triguard_v2.intent_verifier import IntentConsistencyVerifier, Decision
from .triguard_v2.dispatcher import ToolDispatcher
from .triguard_v2.clarification import ClarificationManager


class TriGuardResearchEngine:
    """
    Bridge wrapper coordinating Tier 1, Tier 2, and Tier 3 research defenses.
    """
    def __init__(self):
        self.kernel = CapabilityMicrokernel()
        self.tracker = ProvenanceTracker(strip_adversarial_patterns=True)
        self.verifier = IntentConsistencyVerifier(kernel=self.kernel)
        self.clarification = ClarificationManager()
        self.dispatcher = ToolDispatcher(
            kernel=self.kernel,
            verifier=self.verifier,
            clarification_mgr=self.clarification,
            enable_tier1=True,
            enable_tier3=True,
            enable_clarification=True
        )

        # Register additional enterprise project tools into Tier 1 catalog
        self.kernel.tool_registry.update({
            "process_refund": "execute",
            "execute_wire_transfer": "execute",
            "lookup_order": "read",
            "lookup_order_status": "read",
            "get_portfolio_balance": "read",
            "query_market_depth": "read",
            "audit_ledger_records": "read",
            "send_customer_email": "send",
            "rotate_secrets": "modify",
            "restart_container": "execute",
            "apply_firewall_rule": "execute"
        })

    def evaluate_ingress(
        self,
        user_prompt: str,
        session_id: str = "sess_ingress"
    ) -> Dict[str, Any]:
        """
        Runs Tier 1 capability token issuance and Tier 2 provenance/homoglyph scan on inbound prompt.
        """
        start = time.perf_counter()

        # Tier 1 Token
        token = self.kernel.generate_capability_token(
            user_instruction=user_prompt,
            session_id=session_id,
            ttl_seconds=300
        )

        # Tier 2 Provenance and sanitization
        chunk = self.tracker.tag_context(
            content=user_prompt,
            source_id="user_instruction",
            trust_level=TrustLevel.TRUSTED_USER
        )

        elapsed = round((time.perf_counter() - start) * 1000, 3)

        adversarial_found = chunk.injections_neutralized > 0

        decision = "BLOCK" if adversarial_found else "ALLOW"

        return {
            "decision": decision,
            "latency_ms": elapsed,
            "tier1_capability_token": {
                "token_id": token.get("token_id"),
                "allowed_scopes": token.get("allowed_scopes", []),
                "is_valid": token.get("is_valid", True),
                "expires_at": token.get("expires_at")
            },
            "tier2_provenance": {
                "is_tainted": chunk.is_tainted,
                "injections_neutralized": chunk.injections_neutralized,
                "adversarial_patterns": chunk.removed_patterns,
                "sanitized_length": len(chunk.text)
            },
            "engine": "TriGuard_v2_Research_Kit"
        }

    def evaluate_egress(
        self,
        user_intent: str,
        untrusted_context: Optional[List[str]] = None,
        tool_name: Optional[str] = None,
        tool_arguments: Optional[Dict[str, Any]] = None,
        session_id: str = "sess_egress"
    ) -> Dict[str, Any]:
        """
        Runs Tier 3 Intent-Consistency Verifier & Pre-Execution Action Gating on proposed tool call.
        """
        start = time.perf_counter()

        # Generate active token for intent
        token = self.kernel.generate_capability_token(
            user_instruction=user_intent,
            session_id=session_id,
            ttl_seconds=300
        )

        tool = tool_name or "process_refund"
        args = tool_arguments or {}

        # Gated action check
        gate_res = self.dispatcher.gate_action(
            tool_name=tool,
            tool_args=args,
            token=token,
            session_id=session_id,
            user_instruction=user_intent
        )

        elapsed = round((time.perf_counter() - start) * 1000, 3)

        decision_str = "ALLOW" if gate_res.decision == Decision.ALLOW else "BLOCK"

        return {
            "decision": decision_str,
            "gate_decision": gate_res.decision.value,
            "reason": gate_res.reason,
            "latency_ms": elapsed,
            "tier3_verifier": {
                "allowed_scopes": token.get("allowed_scopes", []),
                "gated_tool": tool,
                "action_consistent": gate_res.decision == Decision.ALLOW
            },
            "engine": "TriGuard_v2_Research_Kit"
        }


# Singleton instance
triguard_research_engine = TriGuardResearchEngine()
