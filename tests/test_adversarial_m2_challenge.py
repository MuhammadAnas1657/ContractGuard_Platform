"""
Empirical Adversarial Challenge Suite: Milestone 2 Authentication & Gating
Tests boundary conditions, tamper resistance, bypass vectors, and token lifecycle.
"""
import sys
import os
import time
import base64
import json
import hmac
import hashlib
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.main import app
from app.database import get_db
from app.api.auth import SECRET_KEY, create_access_token, decode_access_token
from app.api.deployment_guard import verify_api_key

client = TestClient(app)

EXPECTED_AUTH_ERROR = "Authentication required: Valid session token or ContractGuard API key must be provided."


class TestAdversarialBypassAttempts:
    """Stress tests adversarial header, body, and token manipulations."""

    @pytest.mark.parametrize("bad_header", [
        "",
        " ",
        "Bearer",
        "Bearer ",
        "Bearer    ",
        "Bearer null",
        "Bearer undefined",
        "Basic dXNlcjpwYXNz",
        "Token xyz",
        "Bearer fake.token.here",
    ])
    def test_malformed_bearer_tokens_strictly_fail(self, bad_header):
        res = client.get("/api/v1/keys/list", headers={"Authorization": bad_header})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    @pytest.mark.parametrize("bad_key", [
        "",
        " ",
        "   ",
        "\t\n",
        "null",
        "undefined",
        "false",
        "0",
        "cgx_live_nonexistent_key_1234567890",
        "judge_evaluator", # missing _key
        "evaluator_key",
        "demo", # missing _ suffix
        "mock", # missing _ suffix
    ])
    def test_malformed_x_api_keys_strictly_fail(self, bad_key):
        res = client.get("/api/v1/vector-db/signatures", headers={"X-API-Key": bad_key})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    @pytest.mark.parametrize("bad_body_key", [
        None,
        "",
        "   ",
        False,
        12345,
        ["demo_evaluator_key"],
        {"key": "demo_evaluator_key"},
        "invalid_key_string"
    ])
    def test_malformed_body_api_keys_strictly_fail(self, bad_body_key):
        res = client.post(
            "/api/v1/guard/ingress",
            json={"user_prompt": "hello", "api_key": bad_body_key}
        )
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_case_insensitive_header_variations(self):
        # Header casing should be handled properly
        res1 = client.get("/api/v1/keys/list", headers={"x-api-key": "demo_evaluator_key"})
        assert res1.status_code == 200

        res2 = client.get("/api/v1/keys/list", headers={"X-Api-Key": "demo_evaluator_key"})
        assert res2.status_code == 200

        res3 = client.get("/api/v1/keys/list", headers={"AUTHORIZATION": "Bearer demo_evaluator_key"})
        assert res3.status_code == 200

    def test_tampered_jwt_signature_rejected(self):
        # Create valid token then mutate 1 character of signature
        login_res = client.post("/api/auth/demo-login")
        token = login_res.json()["access_token"]
        payload_part, sig_part = token.split(".")
        tampered_sig = ("0" if sig_part[0] != "0" else "1") + sig_part[1:]
        tampered_token = f"{payload_part}.{tampered_sig}"

        res = client.get("/api/v1/keys/list", headers={"Authorization": f"Bearer {tampered_token}"})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_tampered_jwt_payload_rejected(self):
        # Create token with modified payload
        fake_payload = {"sub": "usr_fake_admin", "email": "fake@evil.com", "role": "admin", "exp": time.time() + 3600}
        raw_json = json.dumps(fake_payload).encode("utf-8")
        encoded_payload = base64.urlsafe_b64encode(raw_json).decode("utf-8").rstrip("=")
        # Sign with wrong key
        wrong_sig = hmac.new(b"wrong_secret_key", encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        forged_token = f"{encoded_payload}.{wrong_sig}"

        res = client.get("/api/v1/keys/list", headers={"Authorization": f"Bearer {forged_token}"})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR

    def test_expired_jwt_token_rejected(self):
        # Create token with exp in the past
        expired_token = create_access_token({"sub": "usr_test", "role": "developer"}, expires_in_seconds=-3600)
        res = client.get("/api/v1/keys/list", headers={"Authorization": f"Bearer {expired_token}"})
        assert res.status_code == 401
        assert res.json()["detail"] == EXPECTED_AUTH_ERROR


class TestFullJudgeLoginAndUnlockLifecycle:
    """Stress tests the complete 1-Click Judge Login flow and immediate unlocking of gated endpoints."""

    def test_judge_login_issues_valid_session_and_unlocks_all_modules(self):
        # Step 1: 1-Click Judge Login
        login_res = client.post("/api/auth/demo-login")
        assert login_res.status_code == 200
        data = login_res.json()
        assert data["email"] == "judge@nebius-nvidia-hackathon.ai"
        assert data["role"] == "judge"
        token = data["access_token"]
        assert token and len(token) > 20

        auth_headers = {"Authorization": f"Bearer {token}"}

        # Step 2: GET /api/auth/me returns judge profile
        me_res = client.get("/api/auth/me", headers=auth_headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "judge@nebius-nvidia-hackathon.ai"
        assert me_data["role"] == "judge"

        # Step 3: Unlocks Keys API
        keys_res = client.get("/api/v1/keys/list", headers=auth_headers)
        assert keys_res.status_code == 200

        # Step 4: Unlocks Ingress Guard
        ingress_res = client.post(
            "/api/v1/guard/ingress",
            headers=auth_headers,
            json={"user_prompt": "Verify portfolio risk limits"}
        )
        assert ingress_res.status_code == 200
        assert ingress_res.json()["decision"] == "ALLOW"

        # Step 5: Unlocks Egress Guard
        egress_res = client.post(
            "/api/v1/guard/egress",
            headers=auth_headers,
            json={
                "user_intent": "Check balance",
                "tool_name": "check_balance",
                "tool_arguments": {"account_id": "acc_001"}
            }
        )
        assert egress_res.status_code == 200
        assert egress_res.json()["decision"] == "ALLOW"

        # Step 6: Unlocks Vector DB Signatures
        sig_res = client.get("/api/v1/vector-db/signatures", headers=auth_headers)
        assert sig_res.status_code == 200

        # Step 7: Unlocks Simulations
        sim_res = client.post(
            "/api/simulate/run",
            headers=auth_headers,
            json={"scenario_id": "indirect_email_injection"}
        )
        assert sim_res.status_code == 200
        assert "contractguard_run" in sim_res.json()

        # Step 8: Unlocks Policy Synthesis
        synth_res = client.post(
            "/api/policy/synthesize",
            headers=auth_headers,
            json={"agent_name": "JudgeGuardedAgent", "tools": [], "answers": {}}
        )
        assert synth_res.status_code == 200

        # Step 9: Unlocks Policy Validation
        val_res = client.post(
            "/api/policy/validate",
            headers=auth_headers,
            json={"yaml_content": "version: '2.0'\nglobal_envelope: {}\ntools: []\n"}
        )
        assert val_res.status_code == 200

        # Step 10: Unlocks Policy Download Bundle
        dl_res = client.post(
            "/api/policy/download-bundle",
            headers=auth_headers,
            json={"yaml_content": "version: '2.0'", "agent_name": "JudgeGuardedAgent"}
        )
        assert dl_res.status_code == 200
        assert dl_res.headers["content-type"] == "application/zip"


class TestFrontendGatingLogicVerification:
    """Empirically analyzes the frontend JSX structure to guarantee gating and token attachment."""

    def test_frontend_page_renders_gate_when_unauthenticated(self):
        page_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "app", "page.tsx")
        with open(page_path, "r", encoding="utf-8") as f:
            code = f.read()

        # 1. State hooks check
        assert "const [authChecked, setAuthChecked] = useState(false)" in code
        assert "const [user, setUser] = useState<UserProfile | null>(null)" in code

        # 2. Operational views are gated behind !user ? <AuthGate> : <OperationalTabs>
        assert "!authChecked ? (" in code
        assert "!user ? (" in code
        assert "ContractGuard-X Authentication Gate" in code
        assert "Authenticate as Hackathon Judge" in code

        # 3. 1-Click Judge Login triggers handleDemoLogin
        assert "handleDemoLogin" in code
        assert "api/auth/demo-login" in code

        # 4. Background calls are gated
        assert "if (authenticatedUser)" in code
        assert "loadPresetTools" in code
        assert "loadMetrics" in code
        assert "runSimulationDefault" in code
        assert "loadApiKeys" in code
        assert "loadVectorSignatures" in code

        # 5. Functions check token before executing
        for func_name in ["loadApiKeys", "loadVectorSignatures", "runSimulationDefault", "loadMetrics", "loadPresetTools"]:
            func_idx = code.find(f"const {func_name} = async")
            assert func_idx != -1, f"Missing {func_name}"
            chunk = code[func_idx:func_idx + 300]
            assert "localStorage.getItem(\"cgx_auth_token\")" in chunk
            assert "if (!token) return" in chunk

    def test_frontend_gateway_component_attaches_tokens(self):
        comp_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "app", "components", "DeploymentGatewayTab.tsx")
        with open(comp_path, "r", encoding="utf-8") as f:
            code = f.read()

        # getGatewayAuthHeaders attaches Authorization and X-API-Key
        assert "const getGatewayAuthHeaders = ()" in code
        assert "headers[\"Authorization\"] = `Bearer ${token}`" in code
        assert "headers[\"X-API-Key\"]" in code

        # testPreLlmGateway, testPostLlmGateway, runDummyProject use getGatewayAuthHeaders()
        assert "headers: getGatewayAuthHeaders()" in code
        assert code.count("headers: getGatewayAuthHeaders()") >= 2
        assert "const headers = getGatewayAuthHeaders()" in code
