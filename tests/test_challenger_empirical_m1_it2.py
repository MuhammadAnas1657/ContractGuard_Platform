"""
Empirical Adversarial Challenge Suite: Milestone 1 Iteration 2 Gate Verification
Author: teamwork_challenger_m1_it2_1 (Empirical Challenger)
Focus:
  1. Complete resolution of Stage 4 Cumulative Effect Ledger parameter smuggling.
  2. Compound tool names containing stateful verbs always escalate to FULL_TRI_GUARD with zero bypassed stages.
  3. Strict sub-millisecond latency SLA compliance (<0.05ms avg, <0.1ms p99).
"""

import time
import math
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.runtime_classifier import (
    classify_ingress_operation,
    classify_egress_operation,
    contains_stateful_verb,
    ExecutionMode,
    READ_ONLY_TOOLS,
    STATEFUL_VERBS,
    runtime_telemetry
)
from app.core.effect_ledger import (
    stateful_ledger,
    CanonicalEffectType,
)


@pytest.fixture(autouse=True)
def reset_telemetry_and_ledger():
    runtime_telemetry.reset()
    yield
    runtime_telemetry.reset()


@pytest.fixture
def judge_client():
    """Client authenticated with universal evaluator gateway key."""
    return TestClient(app, headers={"X-API-Key": "judge_evaluator_key"})


class TestEmpiricalParameterSmugglingResolution:
    """
    Empirical tests verifying parameter smuggling controls under
    read-only tools, parameter aliases, casing, and value types.
    """

    READ_ONLY_TEST_TOOLS = [
        "summarize",
        "summarize_text",
        "rag_read",
        "query_docs",
        "search_knowledge_base",
        "fetch_faq",
        "read_only_query",
        "lookup_record",
        "view_file",
        "read_article",
        "get_report",
        "fetch_document",
        "search_manual",
        "find_entry",
        "query_index",
        "lookup_user",
        "view_logs",
        "scan_qr",
        "check_status",
        "list_items",
        "summarize_meeting"
    ]

    RESOLVED_FINANCIAL_ALIASES = [
        ("amount", 5.0),
        ("AMOUNT", 5.0),
        ("Amount", 5.0),
        ("aMoUnT", 5.0),
        ("cost", 5.0),
        ("Cost", 5.0),
        ("payment", 5.0),
        ("Payment", 5.0),
        ("fund", 5.0),
        ("FUND", 5.0),
        ("spend", 5.0),
        ("sPeNd", 5.0),
        ("value", 5.0),
        ("Value", 5.0),
        ("VALUE", 5.0),
        ("sum", 5.0),
        ("Sum", 5.0),
        ("SUM", 5.0),
        ("amount", "5.0"),
        ("amount", " 5.0 "),
        ("amount", 5),
        ("cost", 0.01),
    ]

    def test_direct_ledger_extract_delta_on_all_financial_aliases(self):
        """Direct unit assertion: extract_delta extracts FUNDS_TRANSFER across all aliases."""
        for tool in ["summarize", "view_file", "rag_read", "read_article"]:
            for key, val in self.RESOLVED_FINANCIAL_ALIASES:
                ctype, delta = stateful_ledger.extract_delta(tool, {key: val, "other": "test"})
                assert ctype == CanonicalEffectType.FUNDS_TRANSFER, (
                    f"Tool '{tool}' with param '{key}' failed to extract FUNDS_TRANSFER, got {ctype}"
                )
                assert delta == float(val), (
                    f"Tool '{tool}' with param '{key}' failed to extract delta={float(val)}, got {delta}"
                )

    def test_depleted_budget_strictly_blocks_smuggled_amount_and_keys(self, judge_client):
        """
        When session budget is 100% depleted:
        Invocation of read-only tools with smuggled 'amount=5.0' (and known keys) MUST be strictly
        BLOCKED at Stage 4 with decision='BLOCK', action='DENIED', and session_budget_remaining=0.0.
        """
        sess_id = f"depleted_smuggle_{uuid.uuid4().hex[:8]}"
        budget = 50.0

        # 1. Deplete budget completely ($50 / $50)
        deplete_resp = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Initial legitimate transfer to deplete budget",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": budget, "target_account": "VEND-1"},
            "session_budget": budget,
            "per_call_ceiling": budget
        })
        assert deplete_resp.status_code == 200
        d_dep = deplete_resp.json()
        assert d_dep["decision"] == "ALLOW"
        assert d_dep["session_budget_remaining"] == 0.0

        # 2. Verify benign read-only tool is still ALLOWED under STREAMLINED_RAG
        benign_resp = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Read summary of depleted session",
            "tool_name": "summarize",
            "tool_arguments": {"topic": "account_status"},
            "session_budget": budget,
            "per_call_ceiling": budget
        })
        assert benign_resp.status_code == 200
        d_ben = benign_resp.json()
        assert d_ben["decision"] == "ALLOW"
        assert d_ben["execution_mode"] == "STREAMLINED_RAG"
        assert d_ben["auto_switched"] is True
        assert "Stage 4: Stateful Cumulative Effect Ledger" in d_ben["bypassed_stages"]

        # 3. Adversarial matrix: Smuggle financial parameters across various read-only tools
        for tool in self.READ_ONLY_TEST_TOOLS[:6]:
            for param_key, param_val in self.RESOLVED_FINANCIAL_ALIASES[:6]:
                smug_resp = judge_client.post("/v1/guard/egress", json={
                    "session_id": sess_id,
                    "user_intent": f"Adversarial smuggled call via {tool}",
                    "tool_name": tool,
                    "tool_arguments": {"query": "harmless", param_key: param_val},
                    "session_budget": budget,
                    "per_call_ceiling": budget
                })
                assert smug_resp.status_code == 200
                d_smug = smug_resp.json()
                assert d_smug["execution_mode"] == "FULL_TRI_GUARD", (
                    f"Failed to escalate tool '{tool}' with '{param_key}' to FULL_TRI_GUARD"
                )
                assert d_smug["auto_switched"] is False
                assert d_smug["decision"] == "BLOCK", (
                    f"Smuggled spend was ALLOWED on tool '{tool}' with '{param_key}'!"
                )
                assert d_smug["action"] == "DENIED"
                assert "Stage 4" in d_smug["interception_stage"]
                assert "Cumulative Effect Ledger" in d_smug["interception_stage"]
                assert "Cumulative budget limit exceeded" in d_smug["reason"]
                assert d_smug["session_budget_remaining"] == 0.0
                assert d_smug["bypassed_stages"] == []

    def test_gap_in_classifier_keys_allows_value_and_sum_smuggling_bypass(self, judge_client):
        """
        EMPIRICAL CHALLENGER DISCOVERY:
        While effect_ledger.py and deployment_guard.py recognize 'value' and 'sum' as financial keys,
        backend/app/core/runtime_classifier.py omitted 'value' and 'sum' from STATEFUL_ARGUMENT_KEYS
        and STATEFUL_ARG_STEMS.
        As a consequence, when an attacker invokes a read-only tool with 'value=500.0' or 'sum=500.0',
        the runtime classifier treats it as benign and auto-switches to STREAMLINED_RAG,
        COMPLETELY BYPASSING STAGE 4 CUMULATIVE EFFECT LEDGER EVEN ON A 100% DEPLETED BUDGET!
        """
        sess_id = f"gap_sess_{uuid.uuid4().hex[:8]}"
        budget = 50.0

        # Deplete budget to 0.0
        deplete_resp = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Deplete entire budget",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": budget},
            "session_budget": budget
        })
        assert deplete_resp.status_code == 200
        assert deplete_resp.json()["session_budget_remaining"] == 0.0

        # Empirical proof: 'value' bypasses Stage 4
        res_value = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Summarize with smuggled value",
            "tool_name": "summarize",
            "tool_arguments": {"value": 500.0},
            "session_budget": budget
        })
        d_val = res_value.json()
        value_bypassed = (
            d_val["decision"] == "ALLOW"
            and d_val["execution_mode"] == "STREAMLINED_RAG"
            and "Stage 4: Stateful Cumulative Effect Ledger" in d_val["bypassed_stages"]
        )

        # Empirical proof: 'sum' bypasses Stage 4
        res_sum = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Summarize with smuggled sum",
            "tool_name": "summarize",
            "tool_arguments": {"sum": 500.0},
            "session_budget": budget
        })
        d_sum = res_sum.json()
        sum_bypassed = (
            d_sum["decision"] == "ALLOW"
            and d_sum["execution_mode"] == "STREAMLINED_RAG"
            and "Stage 4: Stateful Cumulative Effect Ledger" in d_sum["bypassed_stages"]
        )

        print(f"\n[EMPIRICAL BYPASS OBSERVATION] 'value' bypass: {value_bypassed}, 'sum' bypass: {sum_bypassed}")
        assert value_bypassed is False, "Expected 'value' smuggling to be blocked and NOT bypass Stage 4"
        assert sum_bypassed is False, "Expected 'sum' smuggling to be blocked and NOT bypass Stage 4"
        assert d_val["execution_mode"] == "FULL_TRI_GUARD"
        assert d_val["decision"] == "BLOCK"
        assert d_val["action"] == "DENIED"
        assert "Stage 4" in d_val["interception_stage"]
        assert d_val["session_budget_remaining"] == 0.0
        assert d_val["bypassed_stages"] == []

        assert d_sum["execution_mode"] == "FULL_TRI_GUARD"
        assert d_sum["decision"] == "BLOCK"
        assert d_sum["action"] == "DENIED"
        assert "Stage 4" in d_sum["interception_stage"]
        assert d_sum["session_budget_remaining"] == 0.0
        assert d_sum["bypassed_stages"] == []

    def test_zero_budget_session_strictly_blocks_smuggled_spend(self, judge_client):
        """When session budget ceiling is initialized to 0.0, any smuggled spend > 0 is blocked."""
        sess_id = f"zero_budget_{uuid.uuid4().hex[:8]}"
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Smuggle microspend into zero-budget session",
            "tool_name": "rag_read",
            "tool_arguments": {"doc_id": "doc_123", "amount": 0.01},
            "session_budget": 0.0,
            "per_call_ceiling": 0.0
        })
        assert res.status_code == 200
        d = res.json()
        assert d["decision"] == "BLOCK"
        assert d["action"] == "DENIED"
        assert "exceeds single-call limit" in d["reason"] or "Cumulative budget limit exceeded" in d["reason"]

    def test_negative_and_nan_smuggling_on_read_only_tools(self, judge_client):
        """Negative and NaN amounts smuggled into read-only tools must be blocked."""
        sess_id = f"nan_sess_{uuid.uuid4().hex[:8]}"
        # Negative amount
        res_neg = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Launder budget with negative amount",
            "tool_name": "summarize",
            "tool_arguments": {"amount": -100.0},
            "session_budget": 1000.0
        })
        assert res_neg.status_code == 200
        d_neg = res_neg.json()
        assert d_neg["decision"] == "BLOCK"
        assert "Negative effect deltas are prohibited" in d_neg["reason"]

        # Direct unit test of reserve_atomic with non-finite values (+inf, -inf, nan)
        can_res_inf, _, msg_inf = stateful_ledger.reserve_atomic("sess_inf_unit", "summarize", {"amount": float("inf")}, max_budget=None)
        assert can_res_inf is False
        assert "non-finite or NaN" in msg_inf

        can_res_nan, _, msg_nan = stateful_ledger.reserve_atomic("sess_nan_unit", "summarize", {"amount": float("nan")}, max_budget=None)
        assert can_res_nan is False
        assert "non-finite or NaN" in msg_nan

        # Live endpoint test with string "inf"
        res_inf = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Attempt infinite delta exploit",
            "tool_name": "summarize",
            "tool_arguments": {"amount": "inf"},
            "session_budget": 1000.0
        })
        assert res_inf.status_code == 200
        d_inf = res_inf.json()
        assert d_inf["decision"] == "BLOCK"
        assert d_inf["action"] == "DENIED"


class TestEmpiricalCompoundToolEscalation:
    """
    Empirical tests verifying compound tool names containing stateful verbs
    unconditionally escalate to FULL_TRI_GUARD with zero bypassed stages.
    """

    COMPOUND_TOOLS = [
        # Snake_case with read prefixes
        ("fetch_and_transfer", "transfer"),
        ("read_then_delete", "delete"),
        ("summarize_and_pay", "pay"),
        ("get_and_refund", "refund"),
        ("query_and_modify", "modify"),
        ("view_and_purge", "purge"),
        ("lookup_and_update", "update"),
        ("scan_and_overwrite", "overwrite"),
        ("check_and_exec", "exec"),
        ("list_and_drop", "drop"),
        ("find_and_withdraw", "withdraw"),
        ("read_and_wire", "wire"),
        ("get_and_deposit", "deposit"),
        ("fetch_and_order", "order"),
        ("query_and_patch", "patch"),
        ("lookup_and_mutate", "mutate"),
        ("view_and_rebalance", "rebalance"),
        ("scan_and_disperse", "disperse"),
        ("read_and_command", "command"),
        ("search_and_shell", "shell"),
        # CamelCase
        ("fetchAndTransfer", "transfer"),
        ("readThenDelete", "delete"),
        ("summarizeAndPay", "pay"),
        ("getAndRefund", "refund"),
        ("queryAndModify", "modify"),
        # PascalCase
        ("FetchAndTransfer", "transfer"),
        ("ReadThenDelete", "delete"),
        ("SummarizeAndPay", "pay"),
        # Kebab-case
        ("fetch-and-transfer", "transfer"),
        ("read-then-delete", "delete"),
        ("summarize-and-pay", "pay"),
        # Dot notation
        ("fetch.and.transfer", "transfer"),
        ("read.then.delete", "delete"),
        ("summarize.and.pay", "pay"),
        # Verbs starting token
        ("get_payment_info", "pay"),
        ("read_execution_log", "exec"),
        ("search_wire_transfer", "transfer"),
        ("check_order_status", "order"),
        # Stateful prefix then read
        ("transfer_and_fetch", "transfer"),
        ("delete_then_read", "delete"),
        ("refund_and_summarize", "refund")
    ]

    def test_contains_stateful_verb_oracle(self):
        """Unit test: contains_stateful_verb detects verb in every compound variant."""
        for tool, expected_verb in self.COMPOUND_TOOLS:
            is_stateful, matched_verb = contains_stateful_verb(tool)
            assert is_stateful is True, f"Failed to identify '{tool}' as stateful"
            assert matched_verb != "", f"Matched verb empty for '{tool}'"

    def test_egress_classifier_compound_tools_escalate_with_zero_bypassed(self):
        """Egress classifier: every compound tool escalates to FULL_TRI_GUARD with bypassed_stages=[]."""
        for tool, _ in self.COMPOUND_TOOLS:
            mode, reason, bypassed = classify_egress_operation(tool, {"param": "val"})
            assert mode == ExecutionMode.FULL_TRI_GUARD, f"Tool '{tool}' classified as {mode}, expected FULL_TRI_GUARD"
            assert bypassed == [], f"Tool '{tool}' bypassed stages: {bypassed}"
            assert "stateful action verb" in reason

    def test_ingress_classifier_compound_tools_escalate(self):
        """Ingress classifier: compound tool hints force FULL_TRI_GUARD."""
        for tool, _ in self.COMPOUND_TOOLS:
            mode, reason = classify_ingress_operation(prompt="Benign query", tool_name=tool)
            assert mode == ExecutionMode.FULL_TRI_GUARD, f"Ingress tool '{tool}' got {mode}"
            assert "stateful action verb" in reason

    def test_live_egress_endpoint_compound_tool_escalation(self, judge_client):
        """Live endpoint /v1/guard/egress: compound tools never bypass Tri-Guard stages."""
        for tool, _ in self.COMPOUND_TOOLS[:10]:
            res = judge_client.post("/v1/guard/egress", json={
                "session_id": f"compound_sess_{uuid.uuid4().hex[:6]}",
                "user_intent": "Execute compound operation",
                "tool_name": tool,
                "tool_arguments": {"target": "data"}
            })
            assert res.status_code == 200
            d = res.json()
            assert d["execution_mode"] == "FULL_TRI_GUARD", f"Live endpoint failed to escalate '{tool}'"
            assert d["auto_switched"] is False
            assert d["bypassed_stages"] == []


class TestEmpiricalLatencySLABenchmarks:
    """
    Empirical benchmark tests validating that sub-millisecond latency SLAs
    are rigorously met (<0.05ms average, <0.1ms p99).
    """

    def test_classifier_latency_sla_under_stress(self):
        """
        1,000 iterations of classification across benign, smuggled, and compound tools.
        Must strictly satisfy: mean < 0.05ms (50µs) and p99 < 0.10ms (100µs).
        """
        samples = []
        test_cases = [
            ("summarize", {"topic": "ai"}),
            ("summarize", {"topic": "ai", "amount": 5.0}),
            ("fetch_and_transfer", {"target": "0x123"}),
            ("transfer_funds", {"amount": 50.0}),
            ("view_file", {"path": "/etc/hosts"}),
            ("readThenDelete", {"target": "records"})
        ]

        # Warm-up (100 runs)
        for _ in range(100):
            for t_name, t_args in test_cases:
                classify_egress_operation(t_name, t_args)

        # Timed benchmark: 1,000 iterations
        for _ in range(1000):
            for t_name, t_args in test_cases:
                t0 = time.perf_counter_ns()
                classify_egress_operation(t_name, t_args)
                t1 = time.perf_counter_ns()
                samples.append((t1 - t0) / 1_000_000.0)  # convert ns to ms

        samples.sort()
        count = len(samples)
        avg_ms = sum(samples) / count
        p50_ms = samples[int(count * 0.50)]
        p90_ms = samples[int(count * 0.90)]
        p95_ms = samples[int(count * 0.95)]
        p99_ms = samples[int(count * 0.99)]

        print(
            f"\n[CHALLENGER LATENCY BENCHMARK: {count} runs]\n"
            f"  Mean: {avg_ms:.5f} ms\n"
            f"  p50:  {p50_ms:.5f} ms\n"
            f"  p90:  {p90_ms:.5f} ms\n"
            f"  p95:  {p95_ms:.5f} ms\n"
            f"  p99:  {p99_ms:.5f} ms\n"
        )

        assert avg_ms < 0.05, f"Mean latency {avg_ms:.5f}ms exceeded SLA threshold 0.05ms"
        assert p99_ms < 0.10, f"p99 latency {p99_ms:.5f}ms exceeded SLA threshold 0.10ms"

    def test_live_guard_telemetry_latencies(self, judge_client):
        """Live endpoint telemetry verification across 100 requests."""
        for i in range(100):
            res = judge_client.post("/v1/guard/egress", json={
                "session_id": f"telemetry_sess_{i}",
                "user_intent": "Pure text summarization",
                "tool_name": "summarize",
                "tool_arguments": {"text": "hello world"}
            })
            assert res.status_code == 200

        # Query metrics via /api/metrics/telemetry
        metrics_res = judge_client.get("/api/metrics/telemetry")
        assert metrics_res.status_code == 200
        m = metrics_res.json()
        assert m["target_sla_met"] is True
        assert m["streamlined_avg_latency_ms"] < 0.5
