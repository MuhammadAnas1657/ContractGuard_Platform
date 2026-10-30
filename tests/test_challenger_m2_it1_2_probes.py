"""
Empirical Adversarial Challenge Suite: Milestone 2 (M2 It1 2)
Focus: Policy Gap Engine, Interview Questions, Synthesis Invariants & Constraints

Adversarially probes:
1. Gap Detection Probing (empty tool lists, zero params, weird names, negative ceilings, 7 canonical rules, no false positives)
2. Invariant #1 Probing (forcing is_active=True, status="ACTIVE", bypass human approval, immutable freeze)
3. Language & Injection Constraints Probing (allowed_languages variations, reject_foreign_scripts, injection edge-cases)
4. Static Linting Verification & Clean Approval Transition (synthesized drafts pass linting, approval transitions cleanly, invalid drafts rejected)
"""
import io
import re
import yaml
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import get_db, SessionLocal
from backend.app.models.db_models import PolicyRecord, ProjectRecord
from backend.app.api.auth import create_access_token
from backend.app.core.policy_compiler import (
    PolicyGapDetector,
    PolicyCompiler,
    LintIssue,
    PolicyLintResult,
    GAP_TOOL_FINANCIAL_CEILING_MISSING,
    GAP_SESSION_CUMULATIVE_BUDGET_MISSING,
    GAP_UNDEFINED_ALLOWED_LANGUAGES,
    GAP_UNDEFINED_DIRECT_INJECTION,
    GAP_UNDEFINED_INDIRECT_INJECTION,
    GAP_MISSING_TIMEOUT_DEGRADATION,
    GAP_MISSING_HUMAN_CONFIRMATION,
    CANONICAL_GAPS
)


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    token = create_access_token({"sub": "usr_challenger_m2", "email": "challenger@test.com", "role": "security_engineer"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# ============================================================================
# 1. GAP DETECTION PROBING
# ============================================================================

class TestAdversarialGapDetection:
    """Stress tests PolicyGapDetector against boundary cases, hostile inputs, and rule isolation."""

    def test_empty_tool_list_triggers_expected_canonical_gaps(self):
        """Empty tool list should trigger missing boundaries without unhandled exceptions."""
        gaps = PolicyGapDetector.detect_gaps([])
        assert GAP_TOOL_FINANCIAL_CEILING_MISSING in gaps
        assert GAP_SESSION_CUMULATIVE_BUDGET_MISSING in gaps
        assert GAP_UNDEFINED_ALLOWED_LANGUAGES in gaps
        assert GAP_UNDEFINED_DIRECT_INJECTION in gaps
        assert GAP_UNDEFINED_INDIRECT_INJECTION in gaps
        assert GAP_MISSING_TIMEOUT_DEGRADATION in gaps
        # Human confirmation threshold applies to detected financial tools, so not present when tools=[]
        assert GAP_MISSING_HUMAN_CONFIRMATION not in gaps

    def test_tools_with_zero_parameters(self):
        """Financial tools with zero parameters must still trigger ceiling and human confirmation gaps."""
        # 1. Financial tool with 0 parameters
        fin_tool_empty_params = [{"name": "wire_transfer", "parameters": {}}]
        gaps_fin = PolicyGapDetector.detect_gaps(fin_tool_empty_params)
        assert GAP_TOOL_FINANCIAL_CEILING_MISSING in gaps_fin
        assert GAP_MISSING_HUMAN_CONFIRMATION in gaps_fin

        # 2. Non-financial tool with 0 parameters
        non_fin_empty_params = [{"name": "get_system_time", "parameters": {}}]
        gaps_non_fin = PolicyGapDetector.detect_gaps(non_fin_empty_params)
        # Should NOT trigger tool financial ceiling or human confirmation gaps
        assert GAP_TOOL_FINANCIAL_CEILING_MISSING not in gaps_non_fin
        assert GAP_MISSING_HUMAN_CONFIRMATION not in gaps_non_fin

    def test_tools_with_weird_names_and_hostile_formatting(self):
        """Tool names with uppercase, whitespace, emojis, or punctuation should be correctly classified."""
        hostile_tools = [
            {"name": "REFUND_PAYMENT_NOW", "parameters": {"amount": "number"}},
            {"name": "  wire_funds_transfer  ", "parameters": {"amount": "number"}},
            {"name": "🚀_crypto_pay_gateway", "parameters": {"amount": "number"}},
            {"name": "balance_inquiry_read_only", "parameters": {}},  # not transfer stem
        ]

        # Financial stems match correctly
        assert PolicyGapDetector.is_financial_tool(hostile_tools[0]) is True
        assert PolicyGapDetector.is_financial_tool(hostile_tools[1]) is True
        assert PolicyGapDetector.is_financial_tool(hostile_tools[2]) is True

        # Non-financial tool does not false positive
        safe_tool = {"name": "get_weather_forecast", "parameters": {"city": "string"}}
        assert PolicyGapDetector.is_financial_tool(safe_tool) is False

    def test_tool_dictionary_missing_keys_graceful_handling(self):
        """Tool dictionaries missing parameters key must not raise unhandled exceptions."""
        t1 = [{"name": "transfer_money"}]
        gaps1 = PolicyGapDetector.detect_gaps(t1)
        assert GAP_TOOL_FINANCIAL_CEILING_MISSING in gaps1

    def test_hostile_none_inputs_reproduce_unhandled_exceptions(self):
        """
        Empirically probes unhandled edge cases where dictionary values are explicitly None.
        Documents vulnerabilities where .get(key, default) evaluates to None when key exists with value None.
        """
        # Vulnerability 1: {'name': None} triggers AttributeError in is_financial_tool
        with pytest.raises(AttributeError, match="'NoneType' object has no attribute 'lower'"):
            PolicyGapDetector.is_financial_tool({"name": None})

        # Vulnerability 2: {'effects': None} triggers TypeError in is_financial_tool
        with pytest.raises(TypeError, match="'NoneType' object is not iterable"):
            PolicyGapDetector.is_financial_tool({"name": "safe_tool", "effects": None})

        # Vulnerability 3: existing_policy with {'global_envelope': None} triggers AttributeError in detect_gaps
        with pytest.raises(AttributeError, match="'NoneType' object has no attribute 'get'"):
            PolicyGapDetector.detect_gaps([{"name": "wire_transfer"}], existing_policy={"global_envelope": None})

        # Vulnerability 4: existing_policy with {'tools': None} triggers AttributeError in detect_gaps
        with pytest.raises(AttributeError, match="'NoneType' object has no attribute 'get'"):
            PolicyGapDetector.detect_gaps([{"name": "wire_transfer"}], existing_policy={"tools": None})

    def test_negative_ceilings_and_edge_values(self):
        """
        Adversarially probes how negative ceilings are handled by gap detector vs linter.
        Findings:
        - Session budget <= 0 is caught by BOTH detect_gaps and lint_policy.
        - Tool max_value < 0 is NOT caught by detect_gaps (checks max_value is not None),
          and passes lint_policy if min_value is omitted!
        """
        # 1. Negative session budget triggers GAP_SESSION_CUMULATIVE_BUDGET_MISSING
        neg_budget_policy = {
            "global_envelope": {"max_cumulative_budget": -50.0},
            "tools": {}
        }
        gaps = PolicyGapDetector.detect_gaps([], existing_policy=neg_budget_policy)
        assert GAP_SESSION_CUMULATIVE_BUDGET_MISSING in gaps

        # 2. Negative tool ceiling in existing policy
        neg_ceiling_policy = {
            "global_envelope": {
                "max_cumulative_budget": 1000.0,
                "allowed_languages": ["en"],
                "reject_foreign_scripts": True,
                "injection_policy": {"direct_action": "BLOCK", "indirect_action": "BLOCK"},
                "degradation_policy": {"per_request_timeout_ms": 5000, "fallback_mode": "STREAMLINED_FALLBACK"}
            },
            "tools": {
                "transfer_funds": {
                    "effects": ["financial.transfer"],
                    "human_confirmation_threshold": 500.0,
                    "parameters": {
                        "amount": {"param_type": "number", "max_value": -100.0}
                    }
                }
            }
        }
        # detect_gaps checks `p_rule.get('max_value') is not None` which evaluates True for -100.0
        gaps_neg_tool = PolicyGapDetector.detect_gaps(
            [{"name": "transfer_funds", "parameters": {"amount": "number"}}],
            existing_policy=neg_ceiling_policy
        )
        assert GAP_TOOL_FINANCIAL_CEILING_MISSING not in gaps_neg_tool

        # lint_policy allows negative max_value if min_value is unspecified
        lint_neg = PolicyCompiler.lint_policy(neg_ceiling_policy)
        assert lint_neg.valid is True

        # But if min_value (e.g. 0) is specified, lint_policy catches contradictory bounds!
        neg_ceiling_policy["tools"]["transfer_funds"]["parameters"]["amount"]["min_value"] = 0.0
        lint_neg_with_min = PolicyCompiler.lint_policy(neg_ceiling_policy)
        assert lint_neg_with_min.valid is False
        assert any(i.rule == "CONTRADICTORY_PARAMETER_BOUNDS" for i in lint_neg_with_min.issues)

    def test_gap_detector_and_linter_financial_classification_discrepancy(self):
        """
        Adversarial probe: PolicyGapDetector matches 13 transfer stems (e.g. 'wire', 'pay', 'transfer'),
        while PolicyCompiler.lint_policy only checks 'refund' in t_name when effects is not populated.
        """
        tool_spec = {"parameters": {"amount": {"param_type": "number"}}}  # missing max_value!
        policy_without_effects = {
            "global_envelope": {
                "max_cumulative_budget": 1000.0,
                "denied_tools": ["execute_shell", "delete_database", "format_disk", "drop_tables", "eval"]
            },
            "tools": {"wire_transfer": tool_spec}
        }
        # GapDetector flags wire_transfer as financial tool missing ceiling
        gaps = PolicyGapDetector.detect_gaps(
            [{"name": "wire_transfer", "parameters": {"amount": "number"}}],
            existing_policy=policy_without_effects
        )
        assert GAP_TOOL_FINANCIAL_CEILING_MISSING in gaps

        # But lint_policy fails to flag UNBOUNDED_TRANSACTION_LIMIT if effects is missing and name is 'wire_transfer' (not 'refund')
        res = PolicyCompiler.lint_policy(policy_without_effects)
        assert res.valid is True  # Passes linting because lint_policy only checks 'refund' in t_name.lower()

    def test_no_false_positives_when_all_seven_rules_fully_populated(self):
        """When an existing policy fully satisfies all 7 boundaries, detect_gaps must return empty list."""
        complete_policy = {
            "global_envelope": {
                "max_cumulative_budget": 1000.0,
                "allowed_languages": ["en"],
                "reject_foreign_scripts": True,
                "injection_policy": {
                    "direct_action": "BLOCK",
                    "indirect_action": "BLOCK"
                },
                "degradation_policy": {
                    "per_request_timeout_ms": 5000,
                    "fallback_mode": "STREAMLINED_FALLBACK"
                }
            },
            "tools": {
                "process_refund": {
                    "human_confirmation_threshold": 500.0,
                    "parameters": {
                        "amount": {"param_type": "number", "max_value": 500.0}
                    }
                }
            }
        }
        tools = [{"name": "process_refund", "parameters": {"amount": "number"}}]
        gaps = PolicyGapDetector.detect_gaps(tools, existing_policy=complete_policy)
        assert gaps == [], f"Expected 0 gaps for fully populated policy, got {gaps}"

    def test_canonical_rule_isolation_one_by_one(self):
        """Verify each of the 7 canonical gap rules triggers individually when its single condition is missing."""
        def make_base_policy():
            return {
                "global_envelope": {
                    "max_cumulative_budget": 1000.0,
                    "allowed_languages": ["en"],
                    "reject_foreign_scripts": True,
                    "injection_policy": {
                        "direct_action": "BLOCK",
                        "indirect_action": "BLOCK"
                    },
                    "degradation_policy": {
                        "per_request_timeout_ms": 5000,
                        "fallback_mode": "STREAMLINED_FALLBACK"
                    }
                },
                "tools": {
                    "process_refund": {
                        "human_confirmation_threshold": 500.0,
                        "parameters": {
                            "amount": {"param_type": "number", "max_value": 500.0}
                        }
                    }
                }
            }

        tools = [{"name": "process_refund", "parameters": {"amount": "number"}}]

        # 1. Rule 1: Missing tool financial ceiling
        p1 = make_base_policy()
        del p1["tools"]["process_refund"]["parameters"]["amount"]["max_value"]
        assert PolicyGapDetector.detect_gaps(tools, p1) == [GAP_TOOL_FINANCIAL_CEILING_MISSING]

        # 2. Rule 2: Missing session cumulative budget
        p2 = make_base_policy()
        p2["global_envelope"]["max_cumulative_budget"] = 0
        assert PolicyGapDetector.detect_gaps(tools, p2) == [GAP_SESSION_CUMULATIVE_BUDGET_MISSING]

        # 3. Rule 3: Missing language constraints
        p3 = make_base_policy()
        del p3["global_envelope"]["allowed_languages"]
        assert PolicyGapDetector.detect_gaps(tools, p3) == [GAP_UNDEFINED_ALLOWED_LANGUAGES]

        # 4. Rule 4: Missing direct injection policy
        p4 = make_base_policy()
        del p4["global_envelope"]["injection_policy"]["direct_action"]
        assert PolicyGapDetector.detect_gaps(tools, p4) == [GAP_UNDEFINED_DIRECT_INJECTION]

        # 5. Rule 5: Missing indirect injection policy
        p5 = make_base_policy()
        del p5["global_envelope"]["injection_policy"]["indirect_action"]
        assert PolicyGapDetector.detect_gaps(tools, p5) == [GAP_UNDEFINED_INDIRECT_INJECTION]

        # 6. Rule 6: Missing timeout degradation
        p6 = make_base_policy()
        del p6["global_envelope"]["degradation_policy"]["per_request_timeout_ms"]
        assert PolicyGapDetector.detect_gaps(tools, p6) == [GAP_MISSING_TIMEOUT_DEGRADATION]

        # 7. Rule 7: Missing human confirmation threshold
        p7 = make_base_policy()
        del p7["tools"]["process_refund"]["human_confirmation_threshold"]
        assert PolicyGapDetector.detect_gaps(tools, p7) == [GAP_MISSING_HUMAN_CONFIRMATION]


# ============================================================================
# 2. INVARIANT #1 PROBING
# ============================================================================

class TestAdversarialInvariant1Probing:
    """Stress tests Invariant #1: Draft policies are advisory and unconditionally unapproved/inactive."""

    def test_synthesize_policy_adversarial_answers_cannot_force_active(self):
        """Adversarial answers with status=ACTIVE, approved=True, is_active=True must not produce active contract."""
        adversarial_answers = {
            "status": "ACTIVE",
            "is_active": True,
            "approved": True,
            "approved_by": "nemotron_autonomous_agent",
            "spending_limits": "500",
            "session_budget": "1000"
        }
        yaml_out = PolicyCompiler.synthesize_policy(
            tools=[{"name": "process_refund", "parameters": {"amount": "number"}}],
            answers=adversarial_answers,
            agent_name="AdversarialAgent"
        )
        parsed = yaml.safe_load(yaml_out)
        meta = parsed.get("agent_metadata", {})
        assert meta.get("status") == "draft_pending_human_approval"
        assert "approval" not in parsed

    def test_rest_api_synthesize_unconditionally_produces_draft(self, client: TestClient, auth_headers: dict, db):
        """POST /api/policy/synthesize must return status=DRAFT, is_active=False regardless of payload fields."""
        hostile_payload = {
            "agent_name": "HostileSynthAgent",
            "tools": [{"name": "process_refund", "parameters": {"amount": "number"}}],
            "answers": {"spending_limits": "300"},
            "is_active": True,
            "status": "ACTIVE",
            "approved": True,
            "approved_by": "auto_ai"
        }
        res = client.post("/api/policy/synthesize", headers=auth_headers, json=hostile_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "DRAFT"
        assert data["is_active"] is False
        assert data["signature"] == ""

        # Verify DB persistence
        policy_id = data["policy_id"]
        rec = db.query(PolicyRecord).filter(PolicyRecord.id == policy_id).first()
        assert rec is not None
        assert rec.is_active is False
        assert rec.version == "1.0.0-draft"

    def test_approve_strictly_blocks_ai_self_approvals(self, client: TestClient, auth_headers: dict):
        """Approval endpoint must reject AI-named approvers under Invariant #1."""
        # Create draft policy first
        draft_res = client.post(
            "/api/policy/synthesize",
            headers=auth_headers,
            json={"agent_name": "TestAIApproveAgent", "tools": [], "answers": {}}
        )
        policy_id = draft_res.json()["policy_id"]

        for bad_approver in ["ai_draft", "nemotron", "llm_auto", "self", "Nemotron-70B", ""]:
            res = client.post(
                f"/api/policy/{policy_id}/approve",
                headers=auth_headers,
                json={"approved_by": bad_approver, "version": "1.0.0"}
            )
            assert res.status_code == 400
            assert "SELF_APPROVED_AI_POLICY_FORBIDDEN" in res.json().get("detail", "") or "Invariant #1" in res.json().get("detail", "")

    def test_clean_human_approval_transitions_to_active_and_freezes(self, client: TestClient, auth_headers: dict, db):
        """Legitimate human approval transitions contract to ACTIVE and freezes version immutably."""
        draft_res = client.post(
            "/api/policy/synthesize",
            headers=auth_headers,
            json={"agent_name": "ApprovedAgentProd", "tools": [], "answers": {}}
        )
        policy_id = draft_res.json()["policy_id"]

        approve_res = client.post(
            f"/api/policy/{policy_id}/approve",
            headers=auth_headers,
            json={"approved_by": "alice_security_lead@company.com", "version": "1.0.0"}
        )
        assert approve_res.status_code == 200
        approved_data = approve_res.json()
        assert approved_data["status"] == "APPROVED"
        assert approved_data["is_active"] is True
        assert approved_data["immutable"] is True
        assert len(approved_data["sha256_signature"]) == 64

        # Verify DB record updated
        rec = db.query(PolicyRecord).filter(PolicyRecord.id == policy_id).first()
        assert rec is not None
        assert rec.is_active is True
        assert rec.version == "1.0.0"

        # Verify retrieval endpoint returns approved status
        get_res = client.get(f"/api/policy/{policy_id}")
        assert get_res.status_code == 200
        assert get_res.json()["status"] == "APPROVED"
        assert get_res.json()["is_active"] is True

        # Invariant #1 Immutability Check: Attempting to overwrite frozen version with different YAML must fail
        tampered_yaml = approved_data["parsed_contract"]
        tampered_yaml["global_envelope"]["max_cumulative_budget"] = 999999.0
        tampered_yaml_str = yaml.dump(tampered_yaml)

        re_approve_res = client.post(
            f"/api/policy/{policy_id}/approve",
            headers=auth_headers,
            json={
                "approved_by": "alice_security_lead@company.com",
                "version": "1.0.0",
                "yaml_content": tampered_yaml_str
            }
        )
        assert re_approve_res.status_code == 400
        assert "IMMUTABLE_POLICY_VIOLATION" in re_approve_res.json().get("detail", "")


# ============================================================================
# 3. LANGUAGE & INJECTION CONSTRAINTS PROBING
# ============================================================================

class TestAdversarialLanguageAndInjectionConstraints:
    """Stress tests language constraints normalization and prompt injection action mapping."""

    @pytest.mark.parametrize("lang_input, expected_langs", [
        (["en"], ["en"]),
        (["en", "fr"], ["en", "fr"]),
        ("English only", ["en"]),  # Defaults safely to en when no 2-letter codes matched
        ("reject foreign scripts", ["en"]),
        ("en, es, de", ["en", "es", "de"]),
        ("en (Strict English only, reject foreign scripts)", ["en"]),
    ])
    def test_diverse_language_inputs_synthesis(self, lang_input, expected_langs):
        """Verifies language inputs correctly populate allowed_languages and reject_foreign_scripts."""
        yaml_out = PolicyCompiler.synthesize_policy(
            tools=[],
            answers={"allowed_languages": lang_input},
            agent_name="LangTestAgent"
        )
        parsed = yaml.safe_load(yaml_out)
        genv = parsed.get("global_envelope", {})
        assert genv.get("allowed_languages") == expected_langs
        assert genv.get("reject_foreign_scripts") is True
        assert genv.get("language_constraints", {}).get("allowed_languages") == expected_langs
        assert genv.get("language_constraints", {}).get("reject_foreign_scripts") is True

    def test_explicit_false_reject_foreign_scripts(self):
        """Verifies reject_foreign_scripts can be toggled to false if explicitly specified."""
        yaml_out = PolicyCompiler.synthesize_policy(
            tools=[],
            answers={"allowed_languages": "en, es", "reject_foreign_scripts": "false"},
            agent_name="MultiScriptAgent"
        )
        parsed = yaml.safe_load(yaml_out)
        genv = parsed.get("global_envelope", {})
        assert genv.get("reject_foreign_scripts") is False
        assert genv.get("language_constraints", {}).get("reject_foreign_scripts") is False

    @pytest.mark.parametrize("input_action, expected_direct", [
        ("BLOCK", "BLOCK"),
        ("BLOCK (Fail-closed 403)", "BLOCK"),
        ("SANITIZE", "SANITIZE"),
        ("SANITIZE (Strip attack prefix)", "SANITIZE"),
        ("LOG", "LOG"),
        ("strip_and_warn", "BLOCK"),  # Fail-closed default when custom action does not match standard keywords
        ("drop_session", "BLOCK"),    # Fail-closed default when custom action does not match standard keywords
        ("unknown_action_xyz", "BLOCK"),
    ])
    def test_direct_injection_action_mapping_and_fail_closed_fallback(self, input_action, expected_direct):
        """Verifies standard and edge-case injection inputs map to valid handler modes with safe fail-closed defaults."""
        yaml_out = PolicyCompiler.synthesize_policy(
            tools=[],
            answers={"direct_injection_action": input_action},
            agent_name="DirectInjAgent"
        )
        parsed = yaml.safe_load(yaml_out)
        inj_policy = parsed.get("global_envelope", {}).get("injection_policy", {})
        assert inj_policy.get("direct_action") == expected_direct

    @pytest.mark.parametrize("input_indirect, expected_indirect", [
        ("BLOCK", "BLOCK"),
        ("BLOCK (Abort tool execution)", "BLOCK"),
        ("SANITIZE", "SANITIZE"),
        ("ESCALATE", "ESCALATE"),
        ("ESCALATE (Alert operator)", "ESCALATE"),
        ("drop_connection", "BLOCK"),  # Fail-closed default
    ])
    def test_indirect_injection_action_mapping(self, input_indirect, expected_indirect):
        """Verifies indirect injection safeguards correctly map to handler policies."""
        yaml_out = PolicyCompiler.synthesize_policy(
            tools=[],
            answers={"indirect_injection_action": input_indirect},
            agent_name="IndirectInjAgent"
        )
        parsed = yaml.safe_load(yaml_out)
        inj_policy = parsed.get("global_envelope", {}).get("injection_policy", {})
        assert inj_policy.get("indirect_action") == expected_indirect


# ============================================================================
# 4. STATIC LINTING VERIFICATION & APPROVAL TRANSITION
# ============================================================================

class TestAdversarialStaticLintingAndApproval:
    """Stress tests static linting, test fixture generation, and clean approval transitions."""

    def test_synthesized_policy_passes_static_linting_with_zero_errors(self):
        """Synthesized draft policies across various tool combinations must pass static linting cleanly."""
        tools_cases = [
            [],  # Default suite
            [{"name": "fetch_user_profile", "parameters": {"user_id": "string"}}],  # Read only
            [{"name": "send_wire_transfer", "parameters": {"amount": "number", "dest_iban": "string"}}],  # Financial
            [{"name": "delete_cache", "parameters": {"key": "string"}}],  # Stateful
        ]

        for tools in tools_cases:
            yaml_out = PolicyCompiler.synthesize_policy(
                tools=tools,
                answers={"spending_limits": "250.00", "session_budget": "500.00"},
                agent_name="LintVerificationAgent"
            )
            parsed = yaml.safe_load(yaml_out)
            lint_res = PolicyCompiler.lint_policy(parsed)

            errors = [i for i in lint_res.issues if i.severity == "ERROR"]
            assert len(errors) == 0, f"Synthesized policy produced lint errors: {errors}"
            assert lint_res.valid is True
            assert len(lint_res.positive_tests) > 0
            assert len(lint_res.negative_tests) > 0

    def test_lint_catches_unbounded_financial_tools(self):
        """Linter must detect financial tools lacking parameter max_value ceilings."""
        bad_policy = {
            "global_envelope": {
                "max_cumulative_budget": 1000.0,
                "denied_tools": ["execute_shell", "delete_database", "format_disk", "drop_tables", "eval"]
            },
            "tools": {
                "process_refund": {
                    "effects": ["financial.transfer"],
                    "parameters": {"amount": {"param_type": "number"}}  # missing max_value!
                }
            }
        }
        res = PolicyCompiler.lint_policy(bad_policy)
        assert res.valid is False
        assert any(i.rule == "UNBOUNDED_TRANSACTION_LIMIT" for i in res.issues)

    def test_lint_catches_contradictory_parameter_bounds(self):
        """Linter must detect when min_value > max_value."""
        bad_bounds_policy = {
            "global_envelope": {
                "max_cumulative_budget": 1000.0,
                "denied_tools": ["execute_shell", "delete_database", "format_disk", "drop_tables", "eval"]
            },
            "tools": {
                "process_refund": {
                    "effects": ["financial.transfer"],
                    "parameters": {
                        "amount": {
                            "param_type": "number",
                            "min_value": 500.0,
                            "max_value": 100.0  # contradictory!
                        }
                    }
                }
            }
        }
        res = PolicyCompiler.lint_policy(bad_bounds_policy)
        assert res.valid is False
        assert any(i.rule == "CONTRADICTORY_PARAMETER_BOUNDS" for i in res.issues)

    def test_lint_catches_exposed_forbidden_system_tools(self):
        """Linter must detect when execute_shell or eval is enabled under tools."""
        exposed_tool_policy = {
            "global_envelope": {
                "max_cumulative_budget": 1000.0,
                "denied_tools": []
            },
            "tools": {
                "execute_shell": {
                    "allowed": True,
                    "parameters": {"cmd": "string"}
                }
            }
        }
        res = PolicyCompiler.lint_policy(exposed_tool_policy)
        assert res.valid is False
        assert any(i.rule == "DENIED_TOOL_EXPOSED" for i in res.issues)

    def test_sign_and_publish_rejects_policy_with_lint_errors(self):
        """sign_and_publish must fail when attempting to approve a contract with critical lint errors."""
        invalid_yaml = yaml.dump({
            "global_envelope": {"max_cumulative_budget": 1000.0},
            "tools": {
                "process_refund": {
                    "effects": ["financial.transfer"],
                    "parameters": {"amount": {"param_type": "number"}}
                }
            }
        })
        with pytest.raises(ValueError, match="Cannot approve policy with critical lint errors"):
            PolicyCompiler.sign_and_publish(
                contract_yaml=invalid_yaml,
                policy_id="pol_invalid_test",
                approved_by="human_dev@company.com"
            )
