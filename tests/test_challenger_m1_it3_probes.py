"""
Empirical Adversarial Challenge Suite: Milestone 1 Iteration 3 Probes
Author: teamwork_challenger_m1_it3_1 (Empirical Challenger)

Empirical Objectives:
1. Probe Parameter Smuggling on Read-Only Tools:
   Tools: summarize, search_docs, read_file, rag_query
   Args: {"value": 500.0}, {"sum": 100.0}, {"total_value": 250.0}, {"transfer_sum": 10.0}
   Verify on depleted session (budget_remaining=0.0):
   - Classifier classifies as FULL_TRI_GUARD
   - Routes to Stage 4 Effect Ledger
   - Intercepts with decision="BLOCK", action="DENIED", interception_stage="Stage 4: Stateful Cumulative Effect Ledger"
   - Zero bypasses into STREAMLINED_RAG
2. Probe Non-Finite Floating Point Attacks:
   Directly test reserve_atomic in effect_ledger.py with:
   - delta = float('+inf')
   - delta = float('-inf')
   - delta = float('nan')
   Verify:
   - allowed=False
   - error message: "Invalid effect delta (non-finite or NaN numbers are prohibited)."
   - does not corrupt ledger state
"""

import math
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.runtime_classifier import (
    classify_egress_operation,
    ExecutionMode,
    runtime_telemetry
)
from app.core.effect_ledger import (
    stateful_ledger,
    CanonicalEffectType
)


@pytest.fixture(autouse=True)
def reset_telemetry_and_ledger():
    runtime_telemetry.reset()
    yield
    runtime_telemetry.reset()


@pytest.fixture
def judge_client():
    return TestClient(app, headers={"X-API-Key": "judge_evaluator_key"})


class TestParameterSmugglingReadOnlyTools:
    PROBE_TOOLS = ["summarize", "search_docs", "read_file", "rag_query"]
    EXACT_ARGS = [
        ("value", {"value": 500.0}),
        ("sum", {"sum": 100.0})
    ]
    COMPOUND_ARGS = [
        ("total_value", {"total_value": 250.0}),
        ("transfer_sum", {"transfer_sum": 10.0})
    ]

    def test_classifier_parameter_smuggling_escalation(self):
        """Verify classifier classifies all combinations as FULL_TRI_GUARD with bypassed=[]."""
        all_args = [a for _, a in self.EXACT_ARGS + self.COMPOUND_ARGS]
        for tool in self.PROBE_TOOLS:
            for args in all_args:
                mode, reason, bypassed = classify_egress_operation(tool, args)
                assert mode == ExecutionMode.FULL_TRI_GUARD, (
                    f"Classifier failed for tool='{tool}', args={args}. Got mode={mode}, reason={reason}"
                )
                assert bypassed == [], (
                    f"Bypassed stages not empty for tool='{tool}', args={args}. Got {bypassed}"
                )

    def test_depleted_session_exact_keys_value_and_sum_intercepted(self, judge_client):
        """
        Verify that exact canonical keys ('value', 'sum') smuggled into read-only tools
        are intercepted at Stage 4 on a depleted session (budget_remaining=0.0).
        """
        for tool in self.PROBE_TOOLS:
            for label, args in self.EXACT_ARGS:
                sess_id = f"exact_dep_{uuid.uuid4().hex[:8]}"
                # 1. Deplete budget
                dep = judge_client.post("/v1/guard/egress", json={
                    "session_id": sess_id,
                    "user_intent": "Deplete budget to 0.0",
                    "tool_name": "transfer_funds",
                    "tool_arguments": {"amount": 50.0},
                    "session_budget": 50.0
                })
                assert dep.status_code == 200
                assert dep.json()["session_budget_remaining"] == 0.0

                # 2. Invoke read-only tool with smuggled parameters
                resp = judge_client.post("/v1/guard/egress", json={
                    "session_id": sess_id,
                    "user_intent": f"Probe exact smuggling via {tool}",
                    "tool_name": tool,
                    "tool_arguments": args,
                    "session_budget": 50.0
                })
                assert resp.status_code == 200
                d = resp.json()
                assert d.get("execution_mode") == "FULL_TRI_GUARD"
                assert d.get("decision") == "BLOCK"
                assert d.get("action") == "DENIED"
                assert "Stage 4: Stateful Cumulative Effect Ledger" in d.get("interception_stage", "")
                assert d.get("session_budget_remaining") == 0.0

    def test_depleted_session_compound_keys_total_value_and_transfer_sum_intercepted(self, judge_client):
        """
        EMPIRICAL CHALLENGER PROBE:
        Test whether compound financial argument stems ('total_value', 'transfer_sum')
        on read-only tools route to and are blocked by Stage 4 Effect Ledger.

        Observation:
        runtime_classifier.py detects stem and escalates to FULL_TRI_GUARD.
        HOWEVER, deployment_guard.py:1025 and effect_ledger.py:103 only check exact keys
        ('amount', 'value', 'cost', 'sum', 'payment', 'fund', 'spend').
        Therefore, deployment_guard.py evaluates amount=None, skips Stage 3 & 4 entirely,
        and returns decision='ALLOW', action='EXECUTE', interception_stage='Clean Egress'!
        """
        failures = []
        for tool in self.PROBE_TOOLS:
            for label, args in self.COMPOUND_ARGS:
                sess_id = f"compound_dep_{uuid.uuid4().hex[:8]}"
                # 1. Deplete budget
                dep = judge_client.post("/v1/guard/egress", json={
                    "session_id": sess_id,
                    "user_intent": "Deplete budget to 0.0",
                    "tool_name": "transfer_funds",
                    "tool_arguments": {"amount": 50.0},
                    "session_budget": 50.0
                })
                assert dep.status_code == 200
                assert dep.json()["session_budget_remaining"] == 0.0

                # 2. Invoke read-only tool with compound smuggled parameters
                resp = judge_client.post("/v1/guard/egress", json={
                    "session_id": sess_id,
                    "user_intent": f"Probe compound smuggling via {tool}",
                    "tool_name": tool,
                    "tool_arguments": args,
                    "session_budget": 50.0
                })
                assert resp.status_code == 200
                d = resp.json()

                if d.get("decision") != "BLOCK" or "Stage 4" not in d.get("interception_stage", ""):
                    failures.append(
                        f"VULNERABILITY: tool='{tool}', param='{label}' ({args}) was NOT blocked by Stage 4! "
                        f"Got decision='{d.get('decision')}', action='{d.get('action')}', "
                        f"interception_stage='{d.get('interception_stage')}', execution_mode='{d.get('execution_mode')}'"
                    )

        assert not failures, (
            "Compound financial keys ('total_value', 'transfer_sum') bypassed Stage 4 Cumulative Effect Ledger:\n"
            + "\n".join(failures)
        )


class TestNonFiniteFloatingPointAttacks:
    def test_reserve_atomic_rejects_positive_inf(self):
        """Verify delta = +inf returns allowed=False with expected message and no state corruption."""
        sess_id = f"inf_pos_{uuid.uuid4().hex[:8]}"
        initial_spent = stateful_ledger.get_session_spent(sess_id)
        assert initial_spent == 0.0

        allowed, res, msg = stateful_ledger.reserve_atomic(
            session_id=sess_id,
            tool_name="summarize",
            parameters={"amount": float("+inf")},
            max_budget=1000.0
        )
        assert allowed is False, f"Expected allowed=False for +inf, got {allowed}"
        assert res is None, f"Expected res=None, got {res}"
        assert msg == "Invalid effect delta (non-finite or NaN numbers are prohibited).", (
            f"Unexpected error message: '{msg}'"
        )
        assert stateful_ledger.get_session_spent(sess_id) == 0.0, "Ledger state was corrupted by +inf!"

    def test_reserve_atomic_rejects_negative_inf(self):
        """Verify delta = -inf returns allowed=False with expected message and no state corruption."""
        sess_id = f"inf_neg_{uuid.uuid4().hex[:8]}"
        initial_spent = stateful_ledger.get_session_spent(sess_id)
        assert initial_spent == 0.0

        allowed, res, msg = stateful_ledger.reserve_atomic(
            session_id=sess_id,
            tool_name="summarize",
            parameters={"amount": float("-inf")},
            max_budget=1000.0
        )
        assert allowed is False, f"Expected allowed=False for -inf, got {allowed}"
        assert res is None, f"Expected res=None, got {res}"
        assert msg == "Invalid effect delta (non-finite or NaN numbers are prohibited).", (
            f"Unexpected error message: '{msg}'"
        )
        assert stateful_ledger.get_session_spent(sess_id) == 0.0, "Ledger state was corrupted by -inf!"

    def test_reserve_atomic_rejects_nan(self):
        """Verify delta = nan returns allowed=False with expected message and no state corruption."""
        sess_id = f"nan_{uuid.uuid4().hex[:8]}"
        initial_spent = stateful_ledger.get_session_spent(sess_id)
        assert initial_spent == 0.0

        allowed, res, msg = stateful_ledger.reserve_atomic(
            session_id=sess_id,
            tool_name="summarize",
            parameters={"amount": float("nan")},
            max_budget=1000.0
        )
        assert allowed is False, f"Expected allowed=False for nan, got {allowed}"
        assert res is None, f"Expected res=None, got {res}"
        assert msg == "Invalid effect delta (non-finite or NaN numbers are prohibited).", (
            f"Unexpected error message: '{msg}'"
        )
        assert stateful_ledger.get_session_spent(sess_id) == 0.0, "Ledger state was corrupted by nan!"

    def test_reserve_atomic_direct_delta_call(self):
        """Direct call to reserve_atomic where parameters carry various keys and types."""
        for non_finite in [float("+inf"), float("-inf"), float("nan")]:
            for key in ["amount", "value", "sum", "cost"]:
                sess_id = f"direct_nf_{uuid.uuid4().hex[:8]}"
                allowed, res, msg = stateful_ledger.reserve_atomic(
                    session_id=sess_id,
                    tool_name="transfer_funds",
                    parameters={key: non_finite},
                    max_budget=500.0
                )
                assert allowed is False
                assert res is None
                assert msg == "Invalid effect delta (non-finite or NaN numbers are prohibited)."
                assert stateful_ledger.get_session_spent(sess_id) == 0.0
