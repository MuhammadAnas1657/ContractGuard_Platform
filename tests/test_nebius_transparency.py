import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import os

from backend.app.main import app
from backend.app.core.nebius_client import NebiusTokenFactoryService, nebius_service
from backend.app.core.simulator import agent_simulator


client = TestClient(app)


def get_auth_headers():
    res = client.post("/api/auth/demo-login")
    assert res.status_code == 200
    token = res.json().get("access_token") or res.json().get("token")
    return {"Authorization": f"Bearer {token}"}


class TestNebiusClientTransparency:
    """Validates core logic of NebiusTokenFactoryService live vs offline mode."""

    def test_is_live_configured_clean_false_on_empty_and_placeholders(self):
        service = NebiusTokenFactoryService()
        placeholders = [
            "",
            "   ",
            "replace_me",
            "REPLACE_ME",
            "Replace_Me",
            "your_nebius_token_factory_api_key_here",
            "mock",
            "test",
            "demo",
            "judge_evaluator_key",
            "offline",
            "sandbox",
            "none",
            "null",
            "demo_evaluator_123",
            "mock_key_999",
            "DEMO_TOKEN",
            "MOCK_KEY"
        ]
        for key in placeholders:
            assert service.is_live_configured(key) is False, f"Expected False for placeholder '{key}'"

    def test_is_live_configured_true_on_genuine_key(self):
        service = NebiusTokenFactoryService()
        valid_keys = [
            "neb-live-secret-token-xyz",
            "nbf-abcdef1234567890",
            "live_production_key_44321",
            "sk-ant-live-token"
        ]
        for key in valid_keys:
            assert service.is_live_configured(key) is True, f"Expected True for live key '{key}'"

    def test_is_live_configured_default_env(self, monkeypatch):
        service = NebiusTokenFactoryService()
        # When env var is empty or placeholder
        monkeypatch.setenv("NEBIUS_API_KEY", "")
        assert service.is_live_configured() is False
        assert service.is_live_configured(None) is False

        monkeypatch.setenv("NEBIUS_API_KEY", "replace_me")
        assert service.is_live_configured() is False
        assert service.is_live_configured(None) is False

        # When env var is a genuine key
        monkeypatch.setenv("NEBIUS_API_KEY", "nbf-real-cloud-token-998877")
        assert service.is_live_configured() is True
        assert service.is_live_configured(None) is True

    def test_test_connection_offline_deterministic_sandbox_keys(self):
        service = NebiusTokenFactoryService()
        offline_keys = [None, "", "   ", "replace_me", "mock", "demo", "judge_evaluator_key", "demo_judge"]
        for key in offline_keys:
            res = service.test_connection(key)
            assert isinstance(res, dict)
            assert res["valid"] is True
            assert res["is_live"] is False
            assert res["mode"] == "offline"
            assert "Offline deterministic sandbox active" in res["message"]
            assert res["latency_ms"] >= 0.0
            assert len(res["available_models"]) >= 2

    def test_test_connection_live_key_success(self):
        service = NebiusTokenFactoryService()
        mock_openai = MagicMock()
        mock_chat = MagicMock()
        mock_openai.chat.completions.create.return_value = MagicMock()

        with patch.object(service, "_get_client", return_value=mock_openai):
            res = service.test_connection("nbf-live-test-token-12345")
            assert res["valid"] is True
            assert res["is_live"] is True
            assert res["mode"] == "live"
            assert "Connected to Live Nebius Token Factory Cloud" in res["message"]
            assert res["latency_ms"] >= 0.0
            assert len(res["available_models"]) >= 2

    def test_test_connection_live_key_failure(self):
        service = NebiusTokenFactoryService()
        mock_openai = MagicMock()
        mock_openai.chat.completions.create.side_effect = Exception("401 Unauthorized: Invalid Nebius API Key")

        with patch.object(service, "_get_client", return_value=mock_openai):
            res = service.test_connection("nbf-failing-token-xyz")
            assert res["valid"] is False
            assert res["is_live"] is False
            assert res["mode"] == "error"
            assert "401 Unauthorized" in res["message"]
            assert res["available_models"] == []

    def test_test_connection_live_key_client_init_none(self):
        service = NebiusTokenFactoryService()
        with patch.object(service, "_get_client", return_value=None):
            with patch.object(service, "is_live_configured", return_value=True):
                res = service.test_connection("nbf-key-that-cannot-init-client")
                assert res["valid"] is False
                assert res["is_live"] is False
                assert res["mode"] == "error"
                assert "Failed to initialize OpenAI client" in res["message"]


class TestStatusAndReadinessEndpoints:
    """Validates /ready and /api/status transparency contracts."""

    def test_api_status_transparency_fields(self):
        resp = client.get("/api/status")
        assert resp.status_code == 200
        data = resp.json()

        assert data["service"] == "ContractGuard-X"
        assert data["status"] == "operational"
        assert "nebius_live" in data
        assert isinstance(data["nebius_live"], bool)
        assert data["provider_mode"] in ("live", "offline")

        # Nested cloud provider transparency
        assert "nebius_cloud" in data
        cloud = data["nebius_cloud"]
        assert cloud["connected"] == data["nebius_live"]
        assert cloud["is_live"] == data["nebius_live"]
        assert cloud["provider_mode"] == data["provider_mode"]
        assert "base_url" in cloud
        assert "synthesis_model" in cloud
        assert "verifier_model" in cloud

    def test_ready_transparency_fields(self):
        resp = client.get("/ready")
        assert resp.status_code == 200
        data = resp.json()

        assert data["status"] in ("ready", "degraded")
        assert "nebius_provider" in data
        provider = data["nebius_provider"]
        assert "live_api_key_configured" in provider
        assert isinstance(provider["live_api_key_configured"], bool)
        assert provider["provider_mode"] in ("live", "offline")
        assert provider["live_api_key_configured"] == (provider["provider_mode"] == "live")


class TestNebiusApiRouterEndpoint:
    """Validates POST /api/nebius/test-connection behavior."""

    def test_post_test_connection_offline_key(self):
        resp = client.post("/api/nebius/test-connection", json={"api_key": "mock_judge_token"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert data["is_live"] is False
        assert data["mode"] == "offline"
        assert "Offline deterministic sandbox" in data["message"]

    def test_post_test_connection_empty_key(self):
        resp = client.post("/api/nebius/test-connection", json={"api_key": ""})
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert data["is_live"] is False
        assert data["mode"] == "offline"

    def test_post_test_connection_live_key_mocked(self):
        mock_openai = MagicMock()
        mock_openai.chat.completions.create.return_value = MagicMock()

        with patch.object(nebius_service, "_get_client", return_value=mock_openai):
            resp = client.post("/api/nebius/test-connection", json={"api_key": "nbf-live-evaluator-1234"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["valid"] is True
            assert data["is_live"] is True
            assert data["mode"] == "live"
            assert "Connected to Live Nebius Token Factory Cloud" in data["message"]


class TestSimulatorTransparency:
    """Validates that simulator exposes provider_mode on outcome cards."""

    def test_simulation_run_offline_mode(self):
        headers = get_auth_headers()
        payload = {
            "scenario_id": "indirect_email_injection",
            "api_key": "mock_judge"
        }
        resp = client.post("/api/simulate/run", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()

        assert data["provider_mode"] == "offline_deterministic_sandbox"
        assert data["unprotected_run"]["provider_mode"] == "offline_deterministic_sandbox"
        assert data["contractguard_run"]["provider_mode"] == "offline_deterministic_sandbox"

    def test_simulation_run_live_mode_mocked(self):
        headers = get_auth_headers()
        mock_openai = MagicMock()
        mock_res = MagicMock()
        mock_res.choices = [MagicMock(message=MagicMock(content='{"tool_name": "process_refund", "parameters": {"amount": 450.0, "target_account": "0xHACKER"}, "multi_turn_count": 1}'))]
        mock_openai.chat.completions.create.return_value = mock_res

        with patch.object(nebius_service, "_get_client", return_value=mock_openai):
            payload = {
                "scenario_id": "indirect_email_injection",
                "api_key": "nbf-genuine-token-xyz"
            }
            resp = client.post("/api/simulate/run", json=payload, headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data["provider_mode"] == "live_nebius_token_factory"
            assert data["unprotected_run"]["provider_mode"] == "live_nebius_token_factory"
            assert data["contractguard_run"]["provider_mode"] == "live_nebius_token_factory"
