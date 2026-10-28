"""
Challenger Adversarial Stress Harness for Milestone 2:
Authentication and Access Control Gating (Requirement R2)

Empirically tests:
1. Strict 401 gating across all protected endpoints with exact error detail.
2. Both /api/v1 and /v1 route prefixes.
3. Negative attack vectors: malformed headers, expired tokens, forged signatures,
   SQL injection in API key, deactivated keys, type confusion in body api_key.
4. Positive pathways: JWT Bearer, X-API-Key header, request body api_key, and DB-created keys.
5. Public endpoint accessibility invariants.
"""
import pytest
import time
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db, SessionLocal
from backend.app.models.db_models import ApiKeyRecord, UserRecord
from backend.app.api.auth import create_access_token, SECRET_KEY, validate_api_key_str

client = TestClient(app)

PROTECTED_401_MESSAGE = "Authentication required: Valid session token or ContractGuard API key must be provided."


# ============================================================================
# 1. 401 Gating Across All Protected Endpoints (Methodology R2)
# ============================================================================

class TestStrict401Gating:
    """Verifies that unauthenticated requests to protected endpoints receive HTTP 401."""

    @pytest.mark.parametrize("path", [
        "/api/v1/guard/ingress",
        "/v1/guard/ingress",
        "/api/v1/guard/egress",
        "/v1/guard/egress",
        "/api/v1/keys/create",
        "/v1/keys/create",
        "/api/v1/sessions",
        "/v1/sessions",
        "/api/v1/content/check",
        "/v1/content/check",
        "/api/v1/actions/check",
        "/v1/actions/check",
        "/api/v1/actions/execute",
        "/v1/actions/execute",
        "/api/v1/vector-db/query",
        "/v1/vector-db/query",
        "/api/simulate/run",
        "/api/policy/synthesize",
        "/api/policy/validate",
        "/api/policy/download-bundle",
    ])
    def test_post_endpoints_unauthenticated_return_401(self, path: str):
        payload = {"user_prompt": "Adversarial probe", "user_intent": "probe", "scenario_id": "indirect_email_injection"}
        resp = client.post(path, json=payload)
        assert resp.status_code == 401, f"Path {path} returned {resp.status_code} instead of 401"
        assert resp.json().get("detail") == PROTECTED_401_MESSAGE

    @pytest.mark.parametrize("path", [
        "/api/v1/keys/list",
        "/v1/keys/list",
        "/api/v1/sessions/sess_test_123/events",
        "/v1/sessions/sess_test_123/events",
        "/api/v1/vector-db/signatures",
        "/v1/vector-db/signatures",
    ])
    def test_get_endpoints_unauthenticated_return_401(self, path: str):
        resp = client.get(path)
        assert resp.status_code == 401, f"Path {path} returned {resp.status_code} instead of 401"
        assert resp.json().get("detail") == PROTECTED_401_MESSAGE

    def test_policy_approve_unauthenticated_returns_401(self):
        resp = client.post("/api/policy/pol_arbitrary/approve", json={"approved": True})
        assert resp.status_code == 401
        assert resp.json().get("detail") == PROTECTED_401_MESSAGE

    def test_key_revoke_unauthenticated_returns_401(self):
        resp = client.delete("/api/v1/keys/key_arbitrary")
        assert resp.status_code == 401
        assert resp.json().get("detail") == PROTECTED_401_MESSAGE


# ============================================================================
# 2. Adversarial & Malformed Auth Payloads (Stress Testing)
# ============================================================================

class TestAdversarialAuthPayloads:
    """Stress tests authentication parser against hostile inputs."""

    def test_empty_bearer_header(self):
        resp = client.post("/api/v1/guard/ingress", headers={"Authorization": "Bearer "}, json={"user_prompt": "test"})
        assert resp.status_code == 401
        assert resp.json().get("detail") == PROTECTED_401_MESSAGE

    def test_bearer_whitespace_only(self):
        resp = client.post("/api/v1/guard/ingress", headers={"Authorization": "Bearer    "}, json={"user_prompt": "test"})
        assert resp.status_code == 401
        assert resp.json().get("detail") == PROTECTED_401_MESSAGE

    def test_bearer_only_without_token(self):
        resp = client.post("/api/v1/guard/ingress", headers={"Authorization": "Bearer"}, json={"user_prompt": "test"})
        assert resp.status_code == 401

    def test_non_bearer_auth_scheme(self):
        resp = client.post("/api/v1/guard/ingress", headers={"Authorization": "Basic dXNlcjpwYXNz"}, json={"user_prompt": "test"})
        assert resp.status_code == 401

    def test_forged_jwt_token(self):
        resp = client.post("/api/v1/guard/ingress", headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.forged_sig"}, json={"user_prompt": "test"})
        assert resp.status_code == 401

    def test_expired_jwt_token(self):
        expired_token = create_access_token({"sub": "usr_test", "role": "judge"}, expires_in_seconds=-3600)
        resp = client.post("/api/v1/guard/ingress", headers={"Authorization": f"Bearer {expired_token}"}, json={"user_prompt": "test"})
        assert resp.status_code == 401

    def test_tampered_jwt_signature(self):
        valid_token = create_access_token({"sub": "usr_test", "role": "judge"}, expires_in_seconds=3600)
        tampered_token = valid_token[:-4] + "dead"
        resp = client.post("/api/v1/guard/ingress", headers={"Authorization": f"Bearer {tampered_token}"}, json={"user_prompt": "test"})
        assert resp.status_code == 401

    def test_sqli_in_x_api_key(self):
        sqli_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE api_keys; --",
            "admin' --",
            "' UNION SELECT * FROM users --"
        ]
        for payload in sqli_payloads:
            resp = client.get("/api/v1/keys/list", headers={"X-API-Key": payload})
            assert resp.status_code == 401, f"SQLi payload '{payload}' bypassed auth!"

    def test_empty_and_whitespace_x_api_key(self):
        for val in ["", "   ", "\t", "\n"]:
            resp = client.get("/api/v1/keys/list", headers={"X-API-Key": val})
            assert resp.status_code == 401

    def test_type_confusion_in_body_api_key(self):
        # Non-string api_key in json body should not crash server or bypass
        malformed_keys = [
            123456,
            True,
            ["demo_evaluator_key"],
            {"key": "demo_evaluator_key"},
            None
        ]
        for k in malformed_keys:
            resp = client.post("/api/v1/guard/ingress", json={"user_prompt": "test", "api_key": k})
            assert resp.status_code == 401, f"Type confusion with {type(k)} bypassed auth!"

    def test_non_json_body_unauthenticated(self):
        resp = client.post("/api/v1/guard/ingress", content=b"invalid plain text raw string", headers={"Content-Type": "text/plain"})
        assert resp.status_code == 401


# ============================================================================
# 3. Positive Auth Pathways (JWT, X-API-Key, Body api_key, DB Keys)
# ============================================================================

class TestPositiveAuthPathways:
    """Verifies that legitimate credentials successfully access protected endpoints."""

    def test_pathway_1_jwt_session_token(self):
        # 1. Login to get JWT
        login_res = client.post("/api/auth/demo-login")
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Access /api/v1 and /v1 guard ingress
        for prefix in ["/api/v1", "/v1"]:
            resp = client.post(f"{prefix}/guard/ingress", headers=headers, json={"user_prompt": "Safe user inquiry"})
            assert resp.status_code == 200
            assert resp.json()["decision"] == "ALLOW"

        # 3. Access keys list
        resp = client.get("/api/v1/keys/list", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

        # 4. Access simulation run
        resp = client.post(
            "/api/simulate/run",
            headers=headers,
            json={"scenario_id": "indirect_email_injection"}
        )
        assert resp.status_code == 200
        assert "unprotected_run" in resp.json()

        # 5. Access policy synthesize
        resp = client.post(
            "/api/policy/synthesize",
            headers=headers,
            json={
                "tools": [{"name": "lookup_user", "description": "finds user", "parameters": {}}],
                "answers": {"intended_use": "user search", "state_boundaries": "read-only", "side_effects": "none"},
                "agent_name": "TestAgent"
            }
        )
        assert resp.status_code == 200
        assert "yaml_content" in resp.json()

    def test_pathway_2_x_api_key_header(self):
        headers = {"X-API-Key": "demo_evaluator_key"}

        # 1. Access guard ingress on both prefixes
        for prefix in ["/api/v1", "/v1"]:
            resp = client.post(f"{prefix}/guard/ingress", headers=headers, json={"user_prompt": "Safe query"})
            assert resp.status_code == 200
            assert resp.json()["decision"] == "ALLOW"

        # 2. Access guard egress on both prefixes
        for prefix in ["/api/v1", "/v1"]:
            resp = client.post(
                f"{prefix}/guard/egress",
                headers=headers,
                json={"user_intent": "Here is safe response", "session_budget": 1000.0}
            )
            assert resp.status_code == 200

        # 3. Access keys list
        resp = client.get("/api/v1/keys/list", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

        # 4. Access simulation run
        resp = client.post("/api/simulate/run", headers=headers, json={"scenario_id": "indirect_email_injection"})
        assert resp.status_code == 200

    def test_pathway_3_body_api_key(self):
        # 1. Guard ingress with body api_key (no auth headers)
        for prefix in ["/api/v1", "/v1"]:
            resp = client.post(
                f"{prefix}/guard/ingress",
                json={"user_prompt": "Safe request", "api_key": "demo_evaluator_key"}
            )
            assert resp.status_code == 200, f"Body api_key failed on {prefix}/guard/ingress"
            assert resp.json()["decision"] == "ALLOW"

        # 2. Guard egress with body api_key
        for prefix in ["/api/v1", "/v1"]:
            resp = client.post(
                f"{prefix}/guard/egress",
                json={"user_intent": "Safe egress", "session_budget": 1000.0, "api_key": "demo_evaluator_key"}
            )
            assert resp.status_code == 200

        # 3. Simulation run with body api_key
        resp = client.post(
            "/api/simulate/run",
            json={"scenario_id": "indirect_email_injection", "api_key": "demo_evaluator_key"}
        )
        assert resp.status_code == 200

        # 4. Policy synthesize with body api_key
        resp = client.post(
            "/api/policy/synthesize",
            json={
                "tools": [{"name": "test_tool", "description": "a tool", "parameters": {}}],
                "answers": {"q": "a"},
                "agent_name": "TestAgentBody",
                "api_key": "demo_evaluator_key"
            }
        )
        assert resp.status_code == 200

    def test_pathway_4_database_api_key_lifecycle(self):
        # 1. Create a new key via POST /api/v1/keys/create
        create_resp = client.post(
            "/api/v1/keys/create",
            headers={"X-API-Key": "demo_evaluator_key"},
            json={"key_name": "Lifecycle Challenge Key"}
        )
        assert create_resp.status_code == 200
        key_data = create_resp.json()
        raw_key = key_data["api_key"]
        key_id = key_data["key_id"]

        # 2. Verify key works via X-API-Key
        r1 = client.get("/api/v1/keys/list", headers={"X-API-Key": raw_key})
        assert r1.status_code == 200

        # 3. Verify key works via Authorization: Bearer
        r2 = client.post("/api/v1/guard/ingress", headers={"Authorization": f"Bearer {raw_key}"}, json={"user_prompt": "test"})
        assert r2.status_code == 200

        # 4. Verify key works via body api_key
        r3 = client.post("/api/v1/guard/ingress", json={"user_prompt": "test", "api_key": raw_key})
        assert r3.status_code == 200

        # 5. Revoke / Delete key via DELETE /api/v1/keys/{key_id}
        del_resp = client.delete(f"/api/v1/keys/{key_id}", headers={"X-API-Key": "demo_evaluator_key"})
        assert del_resp.status_code == 200

        # 6. Verify revoked key is now rejected with 401 across all channels
        r_after_x = client.get("/api/v1/keys/list", headers={"X-API-Key": raw_key})
        assert r_after_x.status_code == 401

        r_after_b = client.post("/api/v1/guard/ingress", headers={"Authorization": f"Bearer {raw_key}"}, json={"user_prompt": "test"})
        assert r_after_b.status_code == 401

        r_after_body = client.post("/api/v1/guard/ingress", json={"user_prompt": "test", "api_key": raw_key})
        assert r_after_body.status_code == 401


# ============================================================================
# 4. Public Endpoints Verification (No Auth Needed)
# ============================================================================

class TestPublicEndpointsIntegrity:
    """Verifies that non-sensitive public discovery & health endpoints remain open."""

    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_ready(self):
        resp = client.get("/ready")
        assert resp.status_code == 200
        assert "ready" in resp.json()

    def test_status(self):
        resp = client.get("/api/status")
        assert resp.status_code == 200

    def test_root(self):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_demo_login(self):
        resp = client.post("/api/auth/demo-login")
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_scenarios_discovery(self):
        resp = client.get("/api/simulate/scenarios")
        assert resp.status_code == 200
        assert "indirect_email_injection" in resp.json()
