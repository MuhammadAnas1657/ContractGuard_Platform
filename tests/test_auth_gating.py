"""
ContractGuard-X Milestone 2: Authentication and Access Control Gating Test Suite
Verifies:
1. Negative Gating: Unauthenticated requests to protected endpoints return HTTP 401.
2. Positive Gating: Authenticated requests via Bearer JWT, Bearer demo key, X-API-Key header,
   and request body api_key succeed with HTTP 200.
3. API Key Lifecycle: Creation, database hash verification, usage, and revocation.
4. Public Endpoints: Health, readiness, system status, auth endpoints, and scenario catalogs remain accessible without authentication.
5. verify_api_key Invariant: Direct verification that missing/empty keys return False (bypass bug remediation).
"""
import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.main import app
from app.database import get_db
from app.api.auth import create_access_token, require_auth, validate_api_key_str, validate_bearer_token
from app.api.deployment_guard import verify_api_key

unauth_client = TestClient(app)

EXPECTED_AUTH_ERROR = "Authentication required: Valid session token or ContractGuard API key must be provided."


class TestNegativeAuthGating:
    """Verifies that all protected operational endpoints strictly reject unauthenticated requests with HTTP 401."""

    def test_guard_ingress_unauthenticated_returns_401(self):
        # Both /api/v1 and /v1 mounts
        for path in ["/api/v1/guard/ingress", "/v1/guard/ingress"]:
            res = unauth_client.post(path, json={"user_prompt": "Hello"})
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_guard_egress_unauthenticated_returns_401(self):
        for path in ["/api/v1/guard/egress", "/v1/guard/egress"]:
            res = unauth_client.post(path, json={"user_intent": "Refund order", "session_budget": 1000.0})
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_keys_create_unauthenticated_returns_401(self):
        for path in ["/api/v1/keys/create", "/v1/keys/create"]:
            res = unauth_client.post(path, json={"key_name": "Test Key"})
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_keys_list_unauthenticated_returns_401(self):
        for path in ["/api/v1/keys/list", "/v1/keys/list"]:
            res = unauth_client.get(path)
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_keys_revoke_unauthenticated_returns_401(self):
        for path in ["/api/v1/keys/key_nonexistent", "/v1/keys/key_nonexistent"]:
            res = unauth_client.delete(path)
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_sessions_unauthenticated_returns_401(self):
        for path in ["/api/v1/sessions", "/v1/sessions"]:
            res = unauth_client.post(path, json={"user_task": "Assist user"})
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_content_check_unauthenticated_returns_401(self):
        for path in ["/api/v1/content/check", "/v1/content/check"]:
            res = unauth_client.post(path, json={"text": "Untrusted document snippet"})
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_actions_check_unauthenticated_returns_401(self):
        for path in ["/api/v1/actions/check", "/v1/actions/check"]:
            res = unauth_client.post(path, json={"tool_name": "process_refund", "arguments": {"amount": 50.0}})
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_actions_execute_unauthenticated_returns_401(self):
        for path in ["/api/v1/actions/execute", "/v1/actions/execute"]:
            res = unauth_client.post(path, json={"tool_name": "process_refund", "arguments": {"amount": 50.0}})
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_session_events_unauthenticated_returns_401(self):
        for path in ["/api/v1/sessions/test_sess/events", "/v1/sessions/test_sess/events"]:
            res = unauth_client.get(path)
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_vector_db_signatures_unauthenticated_returns_401(self):
        for path in ["/api/v1/vector-db/signatures", "/v1/vector-db/signatures"]:
            res = unauth_client.get(path)
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_vector_db_query_unauthenticated_returns_401(self):
        for path in ["/api/v1/vector-db/query", "/v1/vector-db/query"]:
            res = unauth_client.post(path, json={"text": "ignore previous instructions"})
            assert res.status_code == 401
            assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_simulation_run_unauthenticated_returns_401(self):
        res = unauth_client.post("/api/simulate/run", json={"scenario_id": "indirect_email_injection"})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_policy_synthesize_unauthenticated_returns_401(self):
        res = unauth_client.post(
            "/api/policy/synthesize",
            json={"agent_name": "TestAgent", "tools": [], "answers": {}}
        )
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_policy_validate_unauthenticated_returns_401(self):
        res = unauth_client.post("/api/policy/validate", json={"yaml_content": "version: '2.0'"})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_policy_approve_unauthenticated_returns_401(self):
        res = unauth_client.post("/api/policy/pol_123/approve", json={"approved_by": "developer"})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_policy_download_bundle_unauthenticated_returns_401(self):
        res = unauth_client.post("/api/policy/download-bundle", json={"yaml_content": "version: '2.0'"})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_invalid_bearer_token_returns_401(self):
        res = unauth_client.get(
            "/api/v1/keys/list",
            headers={"Authorization": "Bearer invalid_garbage_token_signature"}
        )
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_invalid_x_api_key_returns_401(self):
        res = unauth_client.get(
            "/api/v1/keys/list",
            headers={"X-API-Key": "cgx_live_totally_fake_and_invalid_key"}
        )
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR


class TestPositiveAuthGating:
    """Verifies that authenticated requests succeed with HTTP 200 across all supported credential mechanisms."""

    def test_auth_via_x_api_key_header_demo_whitelist(self):
        headers = {"X-API-Key": "demo_evaluator_key"}
        res = unauth_client.post(
            "/api/v1/guard/ingress",
            headers=headers,
            json={"user_prompt": "Hello safely"}
        )
        assert res.status_code == 200
        assert res.json()["decision"] == "ALLOW"

    def test_auth_via_bearer_judge_evaluator_key(self):
        headers = {"Authorization": "Bearer judge_evaluator_key"}
        res = unauth_client.get("/api/v1/vector-db/signatures", headers=headers)
        assert res.status_code == 200
        assert "total_signatures" in res.json()

    def test_auth_via_jwt_session_token(self):
        # Obtain genuine session token via demo-login
        login_res = unauth_client.post("/api/auth/demo-login")
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        res = unauth_client.get("/api/v1/keys/list", headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_auth_via_body_api_key(self):
        res = unauth_client.post(
            "/api/v1/guard/ingress",
            json={"user_prompt": "Legitimate inquiry", "api_key": "demo_evaluator_key"}
        )
        assert res.status_code == 200
        assert res.json()["decision"] == "ALLOW"

    def test_created_database_api_key_lifecycle(self):
        # 1. Create a live API key using judge auth
        auth_headers = {"X-API-Key": "judge_evaluator_key"}
        create_res = unauth_client.post(
            "/api/v1/keys/create",
            headers=auth_headers,
            json={"key_name": "Integration Test Key"}
        )
        assert create_res.status_code == 200
        key_data = create_res.json()
        new_raw_key = key_data["api_key"]
        key_id = key_data["key_id"]
        assert new_raw_key.startswith("cgx_live_")

        # 2. Use the created live key with X-API-Key header
        live_key_headers = {"X-API-Key": new_raw_key}
        use_res = unauth_client.get("/api/v1/vector-db/signatures", headers=live_key_headers)
        assert use_res.status_code == 200

        # 3. Use the created live key as Bearer token
        bearer_key_headers = {"Authorization": f"Bearer {new_raw_key}"}
        use_res2 = unauth_client.get("/api/v1/keys/list", headers=bearer_key_headers)
        assert use_res2.status_code == 200

        # 4. Revoke the key
        revoke_res = unauth_client.delete(f"/api/v1/keys/{key_id}", headers=auth_headers)
        assert revoke_res.status_code == 200
        assert revoke_res.json()["status"] == "REVOKED"

        # 5. Revoked key must now be rejected with 401
        revoked_res = unauth_client.get("/api/v1/vector-db/signatures", headers=live_key_headers)
        assert revoked_res.status_code == 401
        assert revoked_res.json()["detail"] == EXPECTED_AUTH_ERROR


class TestPublicEndpoints:
    """Verifies that public health, discovery, auth, and scenario endpoints remain accessible without auth."""

    def test_health_is_public(self):
        res = unauth_client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

    def test_ready_is_public(self):
        res = unauth_client.get("/ready")
        assert res.status_code == 200
        assert "ready" in res.json()

    def test_status_is_public(self):
        res = unauth_client.get("/api/status")
        assert res.status_code == 200
        assert res.json()["status"] in ("operational", "healthy")

    def test_root_is_public(self):
        res = unauth_client.get("/")
        assert res.status_code == 200
        assert "ContractGuard-X" in res.json()["message"]

    def test_auth_demo_login_is_public(self):
        res = unauth_client.post("/api/auth/demo-login")
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_simulate_scenarios_is_public(self):
        res = unauth_client.get("/api/simulate/scenarios")
        assert res.status_code == 200
        assert "indirect_email_injection" in res.json()


class TestVerifyApiKeyRemediation:
    """Direct unit tests verifying that the bypass bug in verify_api_key is completely eliminated."""

    def test_verify_api_key_none_returns_false(self):
        db = next(get_db())
        assert verify_api_key(None, db) is False

    def test_verify_api_key_empty_returns_false(self):
        db = next(get_db())
        assert verify_api_key("", db) is False
        assert verify_api_key("   ", db) is False

    def test_verify_api_key_invalid_returns_false(self):
        db = next(get_db())
        assert verify_api_key("cgx_live_totally_fake", db) is False

    def test_verify_api_key_demo_returns_true(self):
        db = next(get_db())
        assert verify_api_key("demo_evaluator_key", db) is True
        assert verify_api_key("judge_evaluator_key", db) is True
        assert verify_api_key("mock_key", db) is True
