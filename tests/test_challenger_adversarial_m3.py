"""
Challenger Adversarial Stress Suite for Milestone 3:
Hackathon Compliance, Nebius Transparency & Blocker Remediation (Requirement R4)

Empirically tests and stress-tests:
1. NebiusTokenFactoryService key classification across boundary conditions:
   - Empty strings, whitespaces (spaces, tabs, newlines), None
   - All case-permutations of placeholders: replace_me, mock, test, demo,
     judge_evaluator_key, offline, sandbox, none, null
   - Prefixes: mock_*, demo_* across upper/lower/mixed casing
   - Whitespace padded variants
   - Legitimate-looking tokens
2. Connection testing under simulated failures:
   - 401 Unauthorized, ConnectionError, ReadTimeout, client init failure
   - Invariant: under NO failure or offline scenario can `is_live` be True
3. Invariant consistency across /ready and /api/status under adversarial env configurations
4. Endpoint POST /api/nebius/test-connection adversarial payloads:
   - null, missing, empty, whitespace, placeholder, SQL injection, unicode, oversized
5. Simulator transparency:
   - Provider mode strictly reporting "offline_deterministic_sandbox" unless genuine live call succeeded
"""
import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.nebius_client import NebiusTokenFactoryService, nebius_service

client = TestClient(app)


def get_auth_headers():
    res = client.post("/api/auth/demo-login")
    assert res.status_code == 200
    token = res.json().get("access_token") or res.json().get("token")
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# 1. Adversarial Key Classification
# ============================================================================

class TestAdversarialKeyClassification:
    """Stress tests boundary conditions and edge cases in is_live_configured()."""

    @pytest.fixture
    def service(self):
        return NebiusTokenFactoryService()

    @pytest.mark.parametrize("empty_val", [
        "",
        " ",
        "   ",
        "\t",
        "\n",
        "\r\n",
        " \t \n \r ",
        None
    ])
    def test_empty_and_whitespace_keys_strictly_false(self, service, empty_val):
        assert service.is_live_configured(empty_val) is False

    @pytest.mark.parametrize("placeholder", [
        "replace_me",
        "REPLACE_ME",
        "Replace_Me",
        "RePlAcE_mE",
        "your_nebius_token_factory_api_key_here",
        "YOUR_NEBIUS_TOKEN_FACTORY_API_KEY_HERE",
        "mock",
        "MOCK",
        "Mock",
        "test",
        "TEST",
        "Test",
        "demo",
        "DEMO",
        "Demo",
        "judge_evaluator_key",
        "JUDGE_EVALUATOR_KEY",
        "Judge_Evaluator_Key",
        "offline",
        "OFFLINE",
        "Offline",
        "sandbox",
        "SANDBOX",
        "Sandbox",
        "none",
        "NONE",
        "None",
        "null",
        "NULL",
        "Null"
    ])
    def test_case_insensitive_placeholders_strictly_false(self, service, placeholder):
        assert service.is_live_configured(placeholder) is False

    @pytest.mark.parametrize("padded_placeholder", [
        " replace_me ",
        "\treplace_me\n",
        "  mock  ",
        "   DEMO   ",
        " judge_evaluator_key ",
        "  offline  ",
        " sandbox "
    ])
    def test_whitespace_padded_placeholders_strictly_false(self, service, padded_placeholder):
        assert service.is_live_configured(padded_placeholder) is False

    @pytest.mark.parametrize("prefixed_key", [
        "mock_123",
        "MOCK_123",
        "Mock_Token",
        "mock_evaluator_key",
        "demo_judge",
        "DEMO_JUDGE",
        "Demo_User_Key",
        "demo_live_token"
    ])
    def test_prefixed_placeholders_strictly_false(self, service, prefixed_key):
        assert service.is_live_configured(prefixed_key) is False

    @pytest.mark.parametrize("genuine_key", [
        "nbf-live-token-778899",
        "neb-secret-443322",
        "sk-live-production-token",
        "valid_corporate_api_key_123"
    ])
    def test_genuine_keys_evaluate_true(self, service, genuine_key):
        assert service.is_live_configured(genuine_key) is True


# ============================================================================
# 2. Connection Testing Under Adversarial Failure Invariants
# ============================================================================

class TestAdversarialConnectionTesting:
    """Ensures is_live is never True under network/auth failure scenarios."""

    @pytest.fixture
    def service(self):
        return NebiusTokenFactoryService()

    @pytest.mark.parametrize("placeholder_key", [
        "",
        "   ",
        "replace_me",
        "REPLACE_ME",
        "mock",
        "demo",
        "mock_judge",
        "demo_evaluator",
        "judge_evaluator_key",
        "offline",
        "sandbox",
        None
    ])
    def test_placeholder_returns_valid_offline_mode(self, service, placeholder_key):
        res = service.test_connection(placeholder_key)
        assert res["valid"] is True
        assert res["is_live"] is False
        assert res["mode"] == "offline"
        assert "Offline deterministic sandbox" in res["message"]
        assert len(res["available_models"]) >= 2

    @pytest.mark.parametrize("exception_class, error_msg", [
        (Exception, "401 Unauthorized: Invalid API key"),
        (ConnectionError, "Max retries exceeded with url: https://api.tokenfactory.nebius.ai"),
        (TimeoutError, "The read operation timed out"),
        (RuntimeError, "Model nvidia/llama-3.1-nemotron-70b-instruct not accessible")
    ])
    def test_live_key_network_or_auth_failure_never_returns_is_live(self, service, exception_class, error_msg):
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = exception_class(error_msg)

        with patch.object(service, "_get_client", return_value=mock_client):
            res = service.test_connection("nbf-failing-cloud-token")
            assert res["valid"] is False
            assert res["is_live"] is False
            assert res["mode"] == "error"
            assert error_msg in res["message"]
            assert res["available_models"] == []

    def test_openai_client_import_or_init_failure_handled(self, service):
        with patch.object(service, "_get_client", return_value=None):
            with patch.object(service, "is_live_configured", return_value=True):
                res = service.test_connection("nbf-token-causing-none-client")
                assert res["valid"] is False
                assert res["is_live"] is False
                assert res["mode"] == "error"
                assert "Failed to initialize OpenAI client" in res["message"]


# ============================================================================
# 3. Environment Variable Invariants Across Status Endpoints
# ============================================================================

class TestStatusEndpointsAdversarialEnvironments:
    """Verifies /ready and /api/status transparently reflect environment configuration."""

    @pytest.mark.parametrize("env_key, expected_live, expected_mode", [
        ("", False, "offline"),
        ("   ", False, "offline"),
        ("replace_me", False, "offline"),
        ("REPLACE_ME", False, "offline"),
        ("mock_evaluator", False, "offline"),
        ("demo", False, "offline"),
        ("null", False, "offline"),
        ("none", False, "offline"),
        ("sandbox", False, "offline"),
        ("nbf-live-enterprise-key-12345", True, "live")
    ])
    def test_status_endpoints_reflect_env_config(self, monkeypatch, env_key, expected_live, expected_mode):
        monkeypatch.setenv("NEBIUS_API_KEY", env_key)

        # 1. Test /ready
        ready_res = client.get("/ready")
        assert ready_res.status_code == 200
        ready_data = ready_res.json()
        assert ready_data["nebius_provider"]["live_api_key_configured"] == expected_live
        assert ready_data["nebius_provider"]["provider_mode"] == expected_mode

        # 2. Test /api/status
        status_res = client.get("/api/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["service"] == "ContractGuard-X"
        assert status_data["nebius_live"] == expected_live
        assert status_data["provider_mode"] == expected_mode
        assert status_data["nebius_cloud"]["connected"] == expected_live
        assert status_data["nebius_cloud"]["is_live"] == expected_live
        assert status_data["nebius_cloud"]["provider_mode"] == expected_mode


# ============================================================================
# 4. HTTP POST /api/nebius/test-connection Adversarial Payloads
# ============================================================================

class TestHttpTestConnectionAdversarialPayloads:
    """Stress tests POST /api/nebius/test-connection with malformed / adversarial inputs."""

    @pytest.mark.parametrize("payload, expected_valid, expected_live, expected_mode", [
        ({}, True, False, "offline"),
        ({"api_key": None}, True, False, "offline"),
        ({"api_key": ""}, True, False, "offline"),
        ({"api_key": "   "}, True, False, "offline"),
        ({"api_key": "replace_me"}, True, False, "offline"),
        ({"api_key": "REPLACE_ME"}, True, False, "offline"),
        ({"api_key": "mock_judge"}, True, False, "offline"),
        ({"api_key": "demo_evaluator"}, True, False, "offline"),
        ({"api_key": "judge_evaluator_key"}, True, False, "offline"),
        ({"api_key": "offline"}, True, False, "offline"),
        ({"api_key": "sandbox"}, True, False, "offline"),
        ({"api_key": "null"}, True, False, "offline"),
        ({"api_key": "none"}, True, False, "offline"),
    ])
    def test_post_test_connection_placeholders_and_empties(self, payload, expected_valid, expected_live, expected_mode):
        resp = client.post("/api/nebius/test-connection", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] == expected_valid
        assert data["is_live"] == expected_live
        assert data["mode"] == expected_mode
        assert "Offline deterministic sandbox" in data["message"]

    def test_post_test_connection_adversarial_injection_key(self):
        # Even with SQL injection string, client should treat as non-placeholder string,
        # fail authentication against real/mocked cloud, and NEVER return is_live=True
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("401 Unauthorized")

        with patch.object(nebius_service, "_get_client", return_value=mock_client):
            payload = {"api_key": "'; DROP TABLE api_keys; --"}
            resp = client.post("/api/nebius/test-connection", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["valid"] is False
            assert data["is_live"] is False
            assert data["mode"] == "error"

    def test_post_test_connection_unicode_key(self):
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("401 Invalid Token")

        with patch.object(nebius_service, "_get_client", return_value=mock_client):
            payload = {"api_key": "🔑_test_key_🚀"}
            resp = client.post("/api/nebius/test-connection", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["valid"] is False
            assert data["is_live"] is False
            assert data["mode"] == "error"

    def test_post_test_connection_oversized_key(self):
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("400 Bad Request: Key too large")

        with patch.object(nebius_service, "_get_client", return_value=mock_client):
            payload = {"api_key": "A" * 8000}
            resp = client.post("/api/nebius/test-connection", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["valid"] is False
            assert data["is_live"] is False
            assert data["mode"] == "error"


# ============================================================================
# 5. Simulator Provider Mode Invariants
# ============================================================================

class TestSimulatorProviderModeInvariants:
    """Verifies that simulator exposes accurate provider_mode on outcome cards."""

    @pytest.mark.parametrize("key_val", [
        None,
        "",
        "replace_me",
        "mock_judge",
        "demo_user",
        "judge_evaluator_key",
        "offline"
    ])
    def test_simulator_offline_keys_strictly_report_offline_sandbox(self, key_val):
        headers = get_auth_headers()
        payload = {
            "scenario_id": "indirect_email_injection",
            "api_key": key_val
        }
        resp = client.post("/api/simulate/run", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()

        assert data["provider_mode"] == "offline_deterministic_sandbox"
        assert data["unprotected_run"]["provider_mode"] == "offline_deterministic_sandbox"
        assert data["contractguard_run"]["provider_mode"] == "offline_deterministic_sandbox"

    def test_simulator_live_key_failure_falls_back_to_offline_sandbox(self):
        headers = get_auth_headers()
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("Nebius Cloud Unavailable (503)")

        with patch.object(nebius_service, "_get_client", return_value=mock_client):
            payload = {
                "scenario_id": "indirect_email_injection",
                "api_key": "nbf-live-token-that-fails"
            }
            resp = client.post("/api/simulate/run", json=payload, headers=headers)
            assert resp.status_code == 200
            data = resp.json()

            # Must fall back to deterministic sandbox safely without crashing
            assert data["provider_mode"] == "offline_deterministic_sandbox"
            assert data["unprotected_run"]["status"] == "BREACHED"
            assert data["contractguard_run"]["status"] == "BLOCKED"


# ============================================================================
# 6. Policy Synthesis Offline Determinism & Transparency
# ============================================================================

class TestPolicySynthesisOfflineDeterminism:
    """Verifies policy synthesis produces valid contracts even when offline."""

    def test_synthesize_offline_generates_valid_yaml(self):
        headers = get_auth_headers()
        payload = {
            "agent_name": "BillingAgent",
            "tools": [
                {
                    "name": "process_refund",
                    "description": "Refund items",
                    "parameters": {"amount": "number", "target_account": "string"}
                }
            ],
            "answers": {
                "q_single_ceiling": "450.00",
                "q_cumulative_budget": "900.00",
                "q_denied_tools": "execute_shell, delete_database"
            },
            "api_key": "mock_judge"
        }
        resp = client.post("/api/policy/synthesize", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "version:" in data["yaml_content"]
        assert "agent_name: BillingAgent" in data["yaml_content"] or "BillingAgent" in data["yaml_content"]
        assert data["status"] == "DRAFT"
        assert data["is_active"] is False
