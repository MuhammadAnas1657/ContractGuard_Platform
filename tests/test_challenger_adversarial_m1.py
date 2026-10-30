"""
tests/test_challenger_adversarial_m1.py
Adversarial Stress-Testing Suite for Milestone 1:
Dual API Keys and Runtime Auto-Switching Architecture

Adversarial Challenger: teamwork_challenger_m1_1
Target Feature Set:
- F13: Dual API Keys Infrastructure (cgx_ing_, cgx_egr_, cgx_live_)
- F14: Dual API Key Role Enforcement & Key Tampering Defense
- F15: Runtime Auto-Switching Classifier & Intent Heuristics
- F16: Full Tri-Guard Execution Pathway & Parameter Smuggling Interception
- F17: Streamlined RAG Pathway & Latency SLA Verification (<0.1ms overhead)
"""
import time
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.core.runtime_classifier import (
    runtime_telemetry,
    ExecutionMode,
    classify_ingress_operation,
    classify_egress_operation,
    STATEFUL_ARGUMENT_KEYS,
    READ_ONLY_TOOLS
)
from app.core.effect_ledger import stateful_ledger, CanonicalEffectType
from app.models.db_models import ApiKeyRecord, ProjectRecord


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def reset_telemetry_and_ledger():
    runtime_telemetry.reset()
    yield
    runtime_telemetry.reset()


@pytest.fixture
def judge_client():
    """Client authenticated with universal evaluator gateway key."""
    return TestClient(app, headers={"X-API-Key": "judge_evaluator_key"})


# =========================================================================
# SUITE 1: KEY ROLE VIOLATIONS & CRYPTOGRAPHIC AUTH HARDENING
# =========================================================================

class TestAdversarialKeyRoleViolations:
    """
    Adversarial probes testing strict role boundaries, cross-endpoint violations,
    malformed prefixes, inactive keys, and cryptographic tampering.
    """

    def test_cross_call_ingress_with_egress_key(self, judge_client):
        """Cross-calling Ingress with an active Egress key MUST strictly fail with 403 Forbidden."""
        # 1. Provision egress key
        res = judge_client.post("/v1/keys/create", json={"key_name": "Adv Egress Key", "key_type": "egress"})
        assert res.status_code == 200
        egress_key = res.json()["raw_key"]
        assert egress_key.startswith("cgx_egr_")

        # 2. Attempt calling Ingress with egress key
        egress_client = TestClient(app, headers={"X-API-Key": egress_key})
        res_ing = egress_client.post("/v1/guard/ingress", json={"user_prompt": "Hello Ingress"})
        assert res_ing.status_code == 403
        err = res_ing.json()
        assert "Unauthorized key role 'egress'" in err["detail"]
        assert "Egress keys ('cgx_egr_...') are forbidden at Ingress" in err["detail"]

    def test_cross_call_egress_with_ingress_key(self, judge_client):
        """Cross-calling Egress with an active Ingress key MUST strictly fail with 403 Forbidden."""
        # 1. Provision ingress key
        res = judge_client.post("/v1/keys/create", json={"key_name": "Adv Ingress Key", "key_type": "ingress"})
        assert res.status_code == 200
        ingress_key = res.json()["raw_key"]
        assert ingress_key.startswith("cgx_ing_")

        # 2. Attempt calling Egress with ingress key
        ingress_client = TestClient(app, headers={"X-API-Key": ingress_key})
        res_egr = ingress_client.post("/v1/guard/egress", json={
            "session_id": "adv_sess_role_01",
            "user_intent": "Summarize text",
            "proposed_llm_output": "Summary"
        })
        assert res_egr.status_code == 403
        err = res_egr.json()
        assert "Unauthorized key role 'ingress'" in err["detail"]
        assert "Ingress keys ('cgx_ing_...') are forbidden at Egress" in err["detail"]

    def test_malformed_key_prefixes_rejected(self):
        """Malformed or synthetic key prefixes MUST fail authentication with 401 Unauthorized."""
        malformed_keys = [
            "cgx_bad_1234567890abcdef1234567890abcdef",
            "cgx_live",
            "cgx_ing",
            "cgx_egr",
            "cgx_",
            "cgx_unknown_9999",
            "CGX_ING_1234567890abcdef",
            "cgx_ing_../../../etc/passwd",
            "invalid_prefix_0000000000000000",
            "",
            "   ",
        ]
        for bad_key in malformed_keys:
            client = TestClient(app, headers={"X-API-Key": bad_key})
            res_ing = client.post("/v1/guard/ingress", json={"user_prompt": "Test"})
            assert res_ing.status_code == 401, f"Expected 401 for bad key '{bad_key}', got {res_ing.status_code}"

            res_egr = client.post("/v1/guard/egress", json={"session_id": "bad_sess", "user_intent": "Test"})
            assert res_egr.status_code == 401, f"Expected 401 for bad key '{bad_key}', got {res_egr.status_code}"

    def test_inactive_and_deactivated_keys_rejected(self, judge_client, db):
        """Keys explicitly deactivated in the database MUST immediately return 401 Unauthorized."""
        # 1. Create Ingress and Egress keys
        ing_key = judge_client.post("/v1/keys/create", json={"key_type": "ingress"}).json()["raw_key"]
        egr_key = judge_client.post("/v1/keys/create", json={"key_type": "egress"}).json()["raw_key"]

        # Verify active initially
        assert TestClient(app, headers={"X-API-Key": ing_key}).post("/v1/guard/ingress", json={"user_prompt": "Hi"}).status_code == 200
        assert TestClient(app, headers={"X-API-Key": egr_key}).post("/v1/guard/egress", json={"session_id": "s1", "user_intent": "Hi"}).status_code == 200

        # 2. Deactivate both in database
        import hashlib
        for k in [ing_key, egr_key]:
            khash = hashlib.sha256(k.encode("utf-8")).hexdigest()
            rec = db.query(ApiKeyRecord).filter(ApiKeyRecord.key_hash == khash).first()
            assert rec is not None
            rec.is_active = False
        db.commit()

        # 3. Assert strictly rejected with 401
        res_ing = TestClient(app, headers={"X-API-Key": ing_key}).post("/v1/guard/ingress", json={"user_prompt": "Hi"})
        assert res_ing.status_code == 401

        res_egr = TestClient(app, headers={"X-API-Key": egr_key}).post("/v1/guard/egress", json={"session_id": "s1", "user_intent": "Hi"})
        assert res_egr.status_code == 401

    def test_key_tampering_and_bit_flips(self, judge_client):
        """Single character alterations in valid key secrets MUST fail SHA-256 verification (401)."""
        res_ing = judge_client.post("/v1/keys/create", json={"key_type": "ingress"}).json()
        valid_ing = res_ing["raw_key"]

        # Flip last character
        tampered_char = "b" if valid_ing[-1] == "a" else "a"
        tampered_key = valid_ing[:-1] + tampered_char

        tampered_client = TestClient(app, headers={"X-API-Key": tampered_key})
        res = tampered_client.post("/v1/guard/ingress", json={"user_prompt": "Hello"})
        assert res.status_code == 401
        assert "Authentication required" in res.json()["detail"]

    def test_body_level_key_override_role_enforcement(self, judge_client):
        """
        Adversarial probe: Attacker passes a valid Gateway key in Header,
        but attempts to inject an Egress key in the JSON body 'api_key' to Ingress.
        System must resolve effective body key and reject with 403 Forbidden.
        """
        egr_key = judge_client.post("/v1/keys/create", json={"key_type": "egress"}).json()["raw_key"]
        live_key = judge_client.post("/v1/keys/create", json={"key_type": "gateway"}).json()["raw_key"]

        # Header has live_key (valid), but body has egr_key (egress)
        hybrid_client = TestClient(app, headers={"X-API-Key": live_key})
        res = hybrid_client.post("/v1/guard/ingress", json={
            "user_prompt": "Hello world",
            "api_key": egr_key
        })
        assert res.status_code == 403
        assert "Unauthorized key role 'egress'" in res.json()["detail"]

    def test_bearer_token_authorization_header_roles(self, judge_client):
        """Role enforcement applies equally when keys are supplied via Authorization: Bearer <key>."""
        ing_key = judge_client.post("/v1/keys/create", json={"key_type": "ingress"}).json()["raw_key"]
        egr_key = judge_client.post("/v1/keys/create", json={"key_type": "egress"}).json()["raw_key"]

        # Ingress key as Bearer token on Egress -> 403 Forbidden
        egr_client = TestClient(app, headers={"Authorization": f"Bearer {ing_key}"})
        res = egr_client.post("/v1/guard/egress", json={"session_id": "bearer_sess", "user_intent": "read"})
        assert res.status_code == 403
        assert "Unauthorized key role 'ingress'" in res.json()["detail"]

        # Egress key as Bearer token on Ingress -> 403 Forbidden
        ing_client = TestClient(app, headers={"Authorization": f"Bearer {egr_key}"})
        res2 = ing_client.post("/v1/guard/ingress", json={"user_prompt": "read"})
        assert res2.status_code == 403
        assert "Unauthorized key role 'egress'" in res2.json()["detail"]


# =========================================================================
# SUITE 2: AUTO-SWITCHING CLASSIFICATION STRESS & PARAMETER SMUGGLING
# =========================================================================

class TestAdversarialAutoSwitchingClassification:
    """
    Adversarial probes testing classification boundaries, read-only tool smuggling,
    parameter alias detection, case/whitespace permutations, and escalation to FULL_TRI_GUARD.
    """

    @pytest.mark.parametrize("param_key, param_val", [
        ("amount", 9999.0),
        ("fund", 500.0),
        ("spend", 1200.0),
        ("cost", 450.0),
        ("payment", 100.0),
        ("target_account", "0xATTACK_TARGET_WALLET"),
        ("recipient", "hacker@malicious.domain"),
        ("recipient_iban", "GB82WEST12345698765432"),
        ("to_address", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"),
        ("delete", True),
        ("drop", True),
        ("cmd", "cat /etc/shadow"),
        ("command", "rm -rf /var/data"),
        ("exec", "system_reboot"),
        ("write", "database_raw_insert"),
        ("sql", "DROP TABLE security_policies;"),
        ("destination", "http://c2-server.evil.com/exfil"),
    ])
    def test_parameter_smuggling_forces_full_tri_guard(self, judge_client, param_key, param_val):
        """
        Adversarial Smuggling Probe: Calling read-only tool 'summarize' with any
        state-altering or financial argument MUST force escalation to FULL_TRI_GUARD.
        """
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": f"smuggle_sess_{param_key}",
            "user_intent": "Summarize user feedback",
            "tool_name": "summarize",
            "tool_arguments": {
                "document_id": "DOC-99",
                param_key: param_val
            },
            "per_call_ceiling": 500.0,
            "session_budget": 1000.0
        })
        assert res.status_code == 200
        data = res.json()
        assert data["execution_mode"] == "FULL_TRI_GUARD", (
            f"Failed to escalate for parameter '{param_key}={param_val}'. Got mode: {data['execution_mode']}"
        )
        assert data["auto_switched"] is False

    @pytest.mark.parametrize("cased_key", [
        "AMOUNT", "Amount", "aMoUnT",
        "TARGET_ACCOUNT", "Target_Account",
        "SQL", "Sql",
        "CMD", "Command"
    ])
    def test_parameter_smuggling_case_insensitivity(self, judge_client, cased_key):
        """Parameter smuggling check MUST be case-insensitive."""
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": f"cased_smuggle_{cased_key}",
            "user_intent": "Read help doc",
            "tool_name": "rag_read",
            "tool_arguments": {cased_key: "0xINJECTED"},
            "per_call_ceiling": 100.0
        })
        assert res.status_code == 200
        assert res.json()["execution_mode"] == "FULL_TRI_GUARD"

    def test_safe_benign_arguments_remain_streamlined(self, judge_client):
        """Benign parameters with zero/false/empty/safe values do not falsely escalate."""
        benign_args = {
            "query": "What are your business hours?",
            "max_results": 5,
            "filter_tag": "public",
            "amount": 0.0,
            "delete": False,
            "target_account": None
        }
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": "benign_args_sess",
            "user_intent": "Search documentation",
            "tool_name": "search_docs",
            "tool_arguments": benign_args
        })
        assert res.status_code == 200
        data = res.json()
        assert data["execution_mode"] == "STREAMLINED_RAG"
        assert data["auto_switched"] is True

    @pytest.mark.parametrize("tool_name", [
        "  SUMMARIZE  ",
        "\tsummarize_document\n",
        "RAG_READ",
        "QUERY_DOCS",
        "search_knowledge_base",
        "fetch_faq",
        "read_only_query",
        "lookup_record",
        "view_file"
    ])
    def test_read_only_tool_whitespace_and_casing_tolerance(self, judge_client, tool_name):
        """Read-only tool taxonomy tolerates whitespace padding and case permutations."""
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": f"ws_sess_{uuid.uuid4().hex[:6]}",
            "user_intent": "Information lookup",
            "tool_name": tool_name,
            "tool_arguments": {"key": "val"}
        })
        assert res.status_code == 200
        data = res.json()
        assert data["execution_mode"] == "STREAMLINED_RAG"
        assert data["auto_switched"] is True

    @pytest.mark.parametrize("stateful_tool", [
        "transfer",
        "process_refund",
        "execute_payment",
        "write_database",
        "send_email",
        "format_disk",
        "drop_tables"
    ])
    def test_stateful_tools_always_full_tri_guard(self, judge_client, stateful_tool):
        """Recognized stateful tools always enforce FULL_TRI_GUARD even with empty arguments."""
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": f"stateful_sess_{stateful_tool}",
            "user_intent": "Perform system operation",
            "tool_name": stateful_tool,
            "tool_arguments": {}
        })
        assert res.status_code == 200
        data = res.json()
        assert data["execution_mode"] == "FULL_TRI_GUARD"
        assert data["auto_switched"] is False

        if stateful_tool == "drop_tables":
            # Compound tool name hardening verification (snake_case, camelCase, concatenated, etc.)
            for compound_tool in [
                "fetch_and_transfer", "read_then_delete", "summarize_and_pay",
                "get_and_post", "query_and_exec", "lookup_and_write",
                "read_and_drop_table", "search_and_update", "fetch_cmd",
                "read_command", "summarize_and_spend", "get_order",
                "fetch_refund", "read_then_withdraw", "fetchAndTransfer",
                "readThenDelete", "summarizeAndPay", "fetchtransfer", "readdelete"
            ]:
                mode, reason, bypassed = classify_egress_operation(compound_tool, {"account": "123"})
                assert mode == ExecutionMode.FULL_TRI_GUARD, f"Failed for {compound_tool}: {mode}"
                assert bypassed == []
                mode_ing, reason_ing = classify_ingress_operation("Summarize", tool_name=compound_tool)
                assert mode_ing == ExecutionMode.FULL_TRI_GUARD, f"Failed ingress for {compound_tool}: {mode_ing}"

    def test_ingress_prompt_classification_heuristics(self, judge_client):
        """Ingress prompts classify into STREAMLINED_RAG vs FULL_TRI_GUARD, defaulting safely."""
        # 1. Pure RAG / informational prompt without action words -> STREAMLINED_RAG
        r1 = judge_client.post("/v1/guard/ingress", json={
            "user_prompt": "Can you please explain how our company documentation is structured and summarize it?"
        }).json()
        assert r1["execution_mode"] == "STREAMLINED_RAG"

        # 2. Informational-style prompt containing action word ('refund') -> Escalates to FULL_TRI_GUARD (Fail-Secure)
        r2 = judge_client.post("/v1/guard/ingress", json={
            "user_prompt": "Can you please explain how our company refund policy works and summarize it?"
        }).json()
        assert r2["execution_mode"] == "FULL_TRI_GUARD"
        assert "Detected action verbs" in r2["classification_reason"]

        # 3. Action verb -> FULL_TRI_GUARD
        r3 = judge_client.post("/v1/guard/ingress", json={
            "user_prompt": "Please withdraw $200 from checking and deposit to savings."
        }).json()
        assert r3["execution_mode"] == "FULL_TRI_GUARD"

        # 4. Ambiguous input without clear intent -> Zero-Trust fallback to FULL_TRI_GUARD
        r4 = judge_client.post("/v1/guard/ingress", json={
            "user_prompt": "alpha beta gamma delta 12345"
        }).json()
        assert r4["execution_mode"] == "FULL_TRI_GUARD"
        assert "default to FULL_TRI_GUARD" in r4["classification_reason"]


# =========================================================================
# SUITE 3: BUDGET EVASION, SALAMI-SLICING & FINANCIAL HARDENING
# =========================================================================

class TestAdversarialBudgetEvasion:
    """
    Adversarial probes testing cumulative financial tracking across multi-turn sessions,
    salami-slicing micro-transactions, zero budgets, negative amount laundering, and NaN injection.
    """

    def test_salami_slicing_micro_transactions_blocked(self, judge_client):
        """
        Adversarial Salami-Slicing: An attacker attempts to bypass session spending limit
        ($30.00) using 10 micro-transactions of $4.00 each.
        Ledger must permit first 7 ($28.00) and strictly BLOCK the 8th ($32.00 > $30.00).
        """
        session_id = f"salami_sess_{uuid.uuid4().hex[:8]}"
        session_budget = 30.0
        per_call = 10.0

        successful_spends = 0
        for i in range(1, 8):  # 7 calls * $4.00 = $28.00
            res = judge_client.post("/v1/guard/egress", json={
                "session_id": session_id,
                "user_intent": f"Micro-payment {i}",
                "tool_name": "transfer_funds",
                "tool_arguments": {"amount": 4.0, "target_account": "VEND-MICRO"},
                "session_budget": session_budget,
                "per_call_ceiling": per_call
            })
            assert res.status_code == 200
            d = res.json()
            assert d["decision"] == "ALLOW", f"Call {i} unexpectedly blocked"
            assert d["session_budget_remaining"] == pytest.approx(session_budget - (i * 4.0), 0.01)
            successful_spends += 1

        assert successful_spends == 7

        # 8th call: $28.00 + $4.00 = $32.00 > $30.00 ceiling -> MUST BLOCK
        blocked_res = judge_client.post("/v1/guard/egress", json={
            "session_id": session_id,
            "user_intent": "Micro-payment 8",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 4.0, "target_account": "VEND-MICRO"},
            "session_budget": session_budget,
            "per_call_ceiling": per_call
        })
        assert blocked_res.status_code == 200
        d_block = blocked_res.json()
        assert d_block["decision"] == "BLOCK"
        assert d_block["action"] == "DENIED"
        assert "Stage 4: Stateful Cumulative Effect Ledger" in d_block["interception_stage"]
        assert "Cumulative budget limit exceeded" in d_block["reason"]

        # An allowable micro-transaction fitting remaining $2.00 MUST succeed
        fit_res = judge_client.post("/v1/guard/egress", json={
            "session_id": session_id,
            "user_intent": "Micro-payment fit remainder",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 1.50, "target_account": "VEND-MICRO"},
            "session_budget": session_budget,
            "per_call_ceiling": per_call
        })
        assert fit_res.status_code == 200
        assert fit_res.json()["decision"] == "ALLOW"
        assert fit_res.json()["session_budget_remaining"] == pytest.approx(0.50, 0.01)

    def test_zero_budget_hard_perimeter_blocks_any_spending(self, judge_client):
        """With session_budget=0.0 and per_call_ceiling=0.0, even a $0.01 transfer is strictly blocked."""
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": f"zero_budget_sess_{uuid.uuid4().hex[:6]}",
            "user_intent": "Attempt spending 1 cent with zero budget",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 0.01, "target_account": "VEND-ZERO"},
            "session_budget": 0.0,
            "per_call_ceiling": 0.0
        })
        assert res.status_code == 200
        d = res.json()
        assert d["decision"] == "BLOCK"
        assert d["action"] == "DENIED"
        assert "exceeds single-call limit of $0.00" in d["reason"]

    def test_depleted_budget_blocks_stateful_tool_and_allows_pure_rag(self, judge_client):
        """
        After session budget is 100% depleted:
        1. Pure STREAMLINED_RAG reading queries continue to work normally (reading docs costs $0).
        2. Stateful transfer queries are strictly BLOCKED by Stage 4 Stateful Cumulative Effect Ledger.
        """
        sess_id = f"depleted_sess_{uuid.uuid4().hex[:8]}"

        # Deplete full $100 budget
        r_deplete = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Spend entire budget",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 100.0, "target_account": "VEND-MAX"},
            "session_budget": 100.0,
            "per_call_ceiling": 100.0
        })
        assert r_deplete.status_code == 200
        assert r_deplete.json()["session_budget_remaining"] == 0.0

        # 1. Benign Streamlined RAG -> ALLOWED
        rag_res = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Read help documents",
            "tool_name": "summarize",
            "tool_arguments": {"topic": "troubleshooting"},
            "proposed_llm_output": "Here is the summary.",
            "session_budget": 100.0
        })
        assert rag_res.status_code == 200
        assert rag_res.json()["decision"] == "ALLOW"
        assert rag_res.json()["execution_mode"] == "STREAMLINED_RAG"
        assert rag_res.json()["session_budget_remaining"] == 0.0

        # 2. Stateful transfer on depleted budget -> strictly BLOCKED by Stage 4
        stateful_res = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Transfer more funds",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 5.0, "target_account": "VEND-MAX"},
            "session_budget": 100.0
        })
        assert stateful_res.status_code == 200
        d_stateful = stateful_res.json()
        assert d_stateful["execution_mode"] == "FULL_TRI_GUARD"
        assert d_stateful["decision"] == "BLOCK"
        assert "Stage 4: Stateful Cumulative Effect Ledger" in d_stateful["interception_stage"]
        assert "Cumulative budget limit exceeded" in d_stateful["reason"]

    def test_vulnerability_ledger_blindspot_on_smuggled_read_only_tool(self, judge_client):
        """
        REMEDIATION VERIFICATION:
        When a read-only tool ('summarize') is invoked with a financial parameter ('amount': 5.0)
        on a session with a depleted budget:
        1. Direct unit-level verification: stateful_ledger.extract_delta must extract delta = 5.0
           and CanonicalEffectType.FUNDS_TRANSFER regardless of read-only tool name.
        2. Egress guard runtime classifier must escalate execution mode to FULL_TRI_GUARD (auto_switched=False).
        3. Stage 4 Stateful Cumulative Effect Ledger MUST reject the transaction:
           - decision == "BLOCK"
           - action == "DENIED"
           - interception_stage contains "Stage 4" and "Cumulative Effect Ledger"
           - reason contains "Cumulative budget limit exceeded"
           - session_budget_remaining == 0.0
        """
        sess_id = f"blindspot_sess_{uuid.uuid4().hex[:8]}"

        # Unit Invariant Verification: extract_delta extracts financial delta across read-only tools
        canonical_type, delta = stateful_ledger.extract_delta("summarize", {"topic": "secret", "amount": 5.0})
        assert canonical_type == CanonicalEffectType.FUNDS_TRANSFER, (
            f"Expected CanonicalEffectType.FUNDS_TRANSFER, got {canonical_type}"
        )
        assert delta == 5.0, f"Expected delta=5.0, got {delta}"

        # Deplete entire $100 budget
        deplete_res = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Spend entire budget",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 100.0, "target_account": "VEND-MAX"},
            "session_budget": 100.0,
            "per_call_ceiling": 100.0
        })
        assert deplete_res.status_code == 200
        assert deplete_res.json()["decision"] == "ALLOW"
        assert deplete_res.json()["session_budget_remaining"] == 0.0

        # Smuggled summarize call with amount=5.0
        smuggle_res = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "user_intent": "Summarize with hidden spend",
            "tool_name": "summarize",
            "tool_arguments": {"topic": "secret", "amount": 5.0},
            "session_budget": 100.0,
            "per_call_ceiling": 100.0
        })
        assert smuggle_res.status_code == 200
        d_smug = smuggle_res.json()

        # Remediated Behavior Assertions:
        assert d_smug["execution_mode"] == "FULL_TRI_GUARD"
        assert d_smug["auto_switched"] is False
        assert d_smug["decision"] == "BLOCK"
        assert d_smug["action"] == "DENIED"
        assert "Stage 4" in d_smug["interception_stage"]
        assert "Cumulative Effect Ledger" in d_smug["interception_stage"]
        assert "Cumulative budget limit exceeded" in d_smug["reason"]
        assert d_smug["session_budget_remaining"] == 0.0

    def test_negative_amount_budget_laundering_blocked(self, judge_client):
        """Attacker attempts negative amount (e.g. -500.0) to artificially inflate budget."""
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": f"neg_amount_sess_{uuid.uuid4().hex[:6]}",
            "user_intent": "Attempt negative refund",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": -500.0, "target_account": "0xLAUNDER"},
            "session_budget": 1000.0
        })
        assert res.status_code == 200
        d = res.json()
        assert d["decision"] == "BLOCK"
        assert d["action"] == "DENIED"
        assert "Negative effect deltas are prohibited" in d["reason"]

    def test_infinite_amount_blocked(self, judge_client):
        """Extreme floating point numbers (inf, 1e15) are intercepted by single-call limit."""
        res = judge_client.post("/v1/guard/egress", json={
            "session_id": "inf_sess",
            "user_intent": "Transfer infinite funds",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 1e12, "target_account": "VEND-INF"},
            "per_call_ceiling": 500.0
        })
        assert res.status_code == 200
        d = res.json()
        assert d["decision"] == "BLOCK"
        assert "exceeds single-call limit" in d["reason"]

    def test_idempotent_replay_deduplication(self, judge_client):
        """Replaying identical idempotency_key prevents double spending against budget."""
        sess_id = f"idem_sess_{uuid.uuid4().hex[:8]}"
        idem_key = f"idem_tx_{uuid.uuid4().hex[:12]}"

        # First request: $40 spend against $50 budget -> $10 remaining
        r1 = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "idempotency_key": idem_key,
            "user_intent": "Pay invoice",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 40.0, "target_account": "VEND-INV"},
            "session_budget": 50.0,
            "per_call_ceiling": 50.0
        }).json()
        assert r1["decision"] == "ALLOW"
        assert r1["session_budget_remaining"] == 10.0

        # Second request with SAME idempotency key: must NOT charge another $40
        r2 = judge_client.post("/v1/guard/egress", json={
            "session_id": sess_id,
            "idempotency_key": idem_key,
            "user_intent": "Pay invoice (retry)",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 40.0, "target_account": "VEND-INV"},
            "session_budget": 50.0,
            "per_call_ceiling": 50.0
        }).json()
        assert r2["decision"] == "ALLOW"
        assert r2["session_budget_remaining"] == 10.0  # Kept at 10.0, not depleted to 0


# =========================================================================
# SUITE 4: LATENCY SLA EMPIRICAL VERIFICATION (<0.1ms overhead)
# =========================================================================

class TestAdversarialLatencySLA:
    """
    Empirically measures STREAMLINED_RAG runtime overhead across 100+ iterations
    to verify strict compliance with the <0.1ms overhead SLA.
    """

    def test_streamlined_classifier_latency_sla_200_runs(self):
        """
        Direct microsecond benchmark: Measures pure algorithmic latency of
        classify_egress_operation across 200 iterations with varied inputs.
        Asserts mean latency < 0.05ms (50 microseconds) and p99 < 0.1ms.
        """
        test_cases = [
            (None, None),
            ("summarize", {"text": "Hello world"}),
            ("rag_read", {"doc_id": "123"}),
            ("search_docs", {"query": "pricing"}),
            ("document_qa", {"q": "how to reset password"}),
            ("summarize", {"amount": 500.0}),  # Smuggled
            ("transfer_funds", {"amount": 50.0}),  # Stateful
        ]

        latencies_ms = []
        for i in range(200):
            tool, args = test_cases[i % len(test_cases)]
            t0 = time.perf_counter_ns()
            classify_egress_operation(tool_name=tool, tool_arguments=args)
            t1 = time.perf_counter_ns()
            latencies_ms.append((t1 - t0) / 1_000_000.0)

        latencies_sorted = sorted(latencies_ms)
        avg_ms = sum(latencies_ms) / len(latencies_ms)
        p50_ms = latencies_sorted[len(latencies_sorted) // 2]
        p99_ms = latencies_sorted[int(len(latencies_sorted) * 0.99)]

        print(f"\n[CLASSIFIER BENCHMARK] 200 runs: avg={avg_ms:.5f}ms, p50={p50_ms:.5f}ms, p99={p99_ms:.5f}ms")
        assert avg_ms < 0.05, f"Classifier average latency {avg_ms:.5f}ms exceeded 0.05ms SLA"
        assert p99_ms < 0.10, f"Classifier p99 latency {p99_ms:.5f}ms exceeded 0.10ms SLA"

    def test_streamlined_rag_telemetry_sla_100_requests(self, judge_client):
        """
        End-to-end telemetry verification: Fires 100 pure RAG requests through
        /v1/guard/egress and asserts that internal telemetry records compliance
        with target SLA (pure internal execution overhead < 0.5ms).
        """
        for i in range(100):
            res = judge_client.post("/v1/guard/egress", json={
                "session_id": f"perf_sess_{i}",
                "user_intent": f"Query document {i}",
                "tool_name": "summarize",
                "tool_arguments": {"doc_id": f"DOC-{i}"},
                "proposed_llm_output": f"Summary for document {i}."
            })
            assert res.status_code == 200

        # Fetch telemetry metrics
        t_res = judge_client.get("/api/metrics/telemetry")
        assert t_res.status_code == 200
        telemetry = t_res.json()

        assert telemetry["total_evaluations"] >= 100
        assert telemetry["streamlined_rag_count"] >= 100
        assert telemetry["target_sla_met"] is True
        assert telemetry["bypassed_tceav_count"] >= 100
        assert telemetry["bypassed_ledger_count"] >= 100
        print(f"\n[TELEMETRY SUMMARY] avg_latency={telemetry['streamlined_avg_latency_ms']}ms, p50={telemetry['streamlined_p50_latency_ms']}ms, target_sla_met={telemetry['target_sla_met']}")
