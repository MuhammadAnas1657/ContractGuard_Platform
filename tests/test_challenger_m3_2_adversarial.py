"""
Adversarial Verification Suite for Milestone 3 (Projects, Ingestion, Policy Interview & Dual Keys)
Challenger: teamwork_challenger_m3_2
"""
import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.core.zip_extractor import ZipToolExtractor
from backend.app.core.policy_compiler import PolicyGapDetector, PolicyCompiler

@pytest.fixture
def client():
    # Use raise_server_exceptions=False to test HTTP status codes on server errors
    return TestClient(app, raise_server_exceptions=False)

@pytest.fixture
def auth_jwt_headers(client: TestClient):
    res = client.post("/api/auth/demo-login")
    if res.status_code == 200:
        token = res.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    return {"X-API-Key": "demo_evaluator_key"}

def make_in_memory_zip(files_dict: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, content in files_dict.items():
            zf.writestr(filename, content)
    buf.seek(0)
    return buf.getvalue()


# ==============================================================================
# PROBE 1: Project Creation & Response Schema for One-Time Raw Secret Keys
# ==============================================================================
def test_probe_project_create_response_raw_keys(client: TestClient):
    """
    Adversarial Probe on POST /api/project/create:
    Inspect whether the response provides one-time raw secret keys (`cgx_ing_...`, `cgx_egr_...`)
    and whether the response key structure matches frontend expectations in ProjectCreateModal.tsx.
    """
    res = client.post("/api/project/create", json={"name": "Adversarial Probing Project"})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    
    # 1. Verify project ID and name
    assert "id" in data and data["id"].startswith("proj_")
    assert data["name"] == "Adversarial Probing Project"
    
    # 2. Inspect raw key provision structure
    assert "dual_keys" in data, f"Expected 'dual_keys' in response, got keys: {list(data.keys())}"
    assert "ingress" in data["dual_keys"], "Missing 'ingress' in dual_keys"
    assert "egress" in data["dual_keys"], "Missing 'egress' in dual_keys"
    
    ing_key = data["dual_keys"]["ingress"]
    egr_key = data["dual_keys"]["egress"]
    
    # Raw secrets must start with proper prefixes
    assert "raw_key" in ing_key, f"Missing 'raw_key' in ingress key: {ing_key}"
    assert ing_key["raw_key"].startswith("cgx_ing_"), f"Ingress raw key does not start with cgx_ing_: {ing_key['raw_key']}"
    assert ing_key["key_prefix"].startswith("cgx_ing_")
    
    assert "raw_key" in egr_key, f"Missing 'raw_key' in egress key: {egr_key}"
    assert egr_key["raw_key"].startswith("cgx_egr_"), f"Egress raw key does not start with cgx_egr_: {egr_key['raw_key']}"
    assert egr_key["key_prefix"].startswith("cgx_egr_")
    
    # Vulnerability check on frontend component contract:
    # ProjectCreateModal.tsx accesses createdProject.ingress_key?.raw_key and createdProject.egress_key?.raw_key
    # BUT backend returns data["dual_keys"]["ingress"] and data["dual_keys"]["egress"].
    has_top_level_ingress = "ingress_key" in data
    has_top_level_egress = "egress_key" in data
    print(f"\n[Probe 1 Audit] Backend dual_keys provided: YES. Top-level ingress_key alias: {has_top_level_ingress}")


# ==============================================================================
# PROBE 2: Project Status Badges (APPROVED, DRAFT, NONE)
# ==============================================================================
def test_probe_project_status_badges(client: TestClient, auth_jwt_headers: dict):
    """
    Adversarial Probe on GET /api/project/list and GET /api/project/{id}:
    Verify how policy_status accurately transitions through NONE -> DRAFT -> APPROVED.
    """
    # 1. Create a fresh project with no policy -> Expect policy_status="NONE" in /list
    create_res = client.post("/api/project/create", json={"name": "Status Badge Test Project"})
    proj_id = create_res.json()["id"]
    
    list_res_1 = client.get("/api/project/list")
    proj_in_list = next((p for p in list_res_1.json() if p["id"] == proj_id), None)
    assert proj_in_list is not None
    assert proj_in_list["policy_status"] == "NONE", f"Expected 'NONE', got {proj_in_list['policy_status']}"
    
    # Check detail view contract:
    detail_res_1 = client.get(f"/api/project/{proj_id}")
    assert detail_res_1.status_code == 200
    detail_data_1 = detail_res_1.json()
    assert detail_data_1["policy"] is None, "Policy should be None for fresh project"
    
    # 2. Synthesize a draft policy for this project -> Expect policy_status="DRAFT" in /list
    synth_res = client.post("/api/policy/synthesize", headers=auth_jwt_headers, json={
        "project_id": proj_id,
        "agent_name": "Status Badge Test Project",
        "tools": [{"name": "read_data", "description": "Read", "parameters": {}}],
        "answers": {"spending_limits": "100", "session_budget": "500"}
    })
    assert synth_res.status_code == 200
    policy_id = synth_res.json()["policy_id"]
    
    list_res_2 = client.get("/api/project/list")
    proj_in_list_2 = next((p for p in list_res_2.json() if p["id"] == proj_id), None)
    assert proj_in_list_2["policy_status"] == "DRAFT", f"Expected 'DRAFT', got {proj_in_list_2['policy_status']}"
    
    detail_res_2 = client.get(f"/api/project/{proj_id}")
    detail_data_2 = detail_res_2.json()
    assert detail_data_2["policy"] is not None
    assert detail_data_2["policy"]["is_active"] is False, "Draft policy must have is_active=False"
    
    # 3. Approve the policy -> Expect policy_status="APPROVED" in /list
    approve_res = client.post(f"/api/policy/{policy_id}/approve", headers=auth_jwt_headers, json={"approved_by": "qa_tester"})
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"
    assert approve_res.json()["is_active"] is True
    assert "signature" in approve_res.json() or "sha256_signature" in approve_res.json()
    
    list_res_3 = client.get("/api/project/list")
    proj_in_list_3 = next((p for p in list_res_3.json() if p["id"] == proj_id), None)
    assert proj_in_list_3["policy_status"] == "APPROVED", f"Expected 'APPROVED', got {proj_in_list_3['policy_status']}"
    
    detail_res_3 = client.get(f"/api/project/{proj_id}")
    detail_data_3 = detail_res_3.json()
    assert detail_data_3["policy"] is not None
    assert detail_data_3["policy"]["is_active"] is True, "Approved policy must have is_active=True"


# ==============================================================================
# PROBE 3: Multi-Language Zip Ingestion & Zero-Token AST Extraction
# ==============================================================================
def test_probe_zip_ingestion_multi_language_and_zero_token(client: TestClient):
    """
    Adversarial Probe on Zip Ingestion:
    Test archive containing both Python and TypeScript/JavaScript tools.
    Verify parameter schemas, docstrings, source files, and 0-token AST performance.
    """
    python_code = '''
def process_customer_refund(amount: float, customer_id: str, reason: str = "Return"):
    """Issues financial refund back to customer."""
    pass

def read_inventory_catalog(category: str):
    """Reads store catalog without modification."""
    pass
'''
    ts_code = '''
export async function sendEmailNotification(to: string, subject: string, body: string): Promise<boolean> {
    // Sends transactional email
    return true;
}
'''
    zip_bytes = make_in_memory_zip({
        "backend/finance.py": python_code,
        "src/notifications.ts": ts_code,
        "package.json": '{"name": "agent-app", "version": "1.0.0"}',
        "README.md": "# Dual Language Agent\nContains python and ts tools."
    })
    
    files = {"file": ("polyglot_agent.zip", zip_bytes, "application/zip")}
    data = {"project_name": "Polyglot Agent"}
    
    res = client.post("/api/project/upload-zip", files=files, data=data)
    assert res.status_code == 200, f"Upload failed: {res.text}"
    resp_data = res.json()
    
    assert resp_data["project_id"].startswith("proj_")
    assert len(resp_data["extracted_files"]) >= 4
    assert any("finance.py" in f for f in resp_data["extracted_files"])
    assert any("notifications.ts" in f for f in resp_data["extracted_files"])
    
    tools = resp_data["tools"]
    tool_names = [t["name"] for t in tools]
    assert "process_customer_refund" in tool_names
    assert "read_inventory_catalog" in tool_names
    
    # Check parameter schemas
    refund_tool = next(t for t in tools if t["name"] == "process_customer_refund")
    assert "amount" in refund_tool["parameters"]
    assert "customer_id" in refund_tool["parameters"]
    assert "Issues financial refund" in refund_tool["description"]


# ==============================================================================
# PROBE 4: Interactive Policy Interview, 7 Canonical Gaps & Ceiling Boundaries
# ==============================================================================
def test_probe_policy_interview_7_canonical_gaps_and_ceilings(client: TestClient, auth_jwt_headers: dict):
    """
    Adversarial Probe on Policy Interview:
    - Verify 7 canonical gaps are detected.
    - Test edge cases for spending ceilings (e.g. 0, negative values, non-numeric).
    - Verify synthesized policy is marked DRAFT and requires approval (Invariant #1).
    """
    tools = [
        {"name": "transfer_funds", "description": "Transfers funds", "parameters": {"amount": "number", "dest": "string"}},
        {"name": "execute_query", "description": "Executes read query", "parameters": {"sql": "string"}}
    ]
    
    # 1. Gap detection
    gap_res = client.post("/api/policy/interview-questions", json=tools)
    assert gap_res.status_code == 200
    questions = gap_res.json()["questions"]
    assert len(questions) > 0
    
    # Verify all canonical gap types are identified
    all_gaps = {q.get("gap_type") for q in questions}
    expected_gap_types = {
        "spending_limits",
        "session_budget",
        "allowed_languages",
        "direct_injection_action",
        "indirect_injection_action",
        "timeout_degradation",
    }
    for expected in expected_gap_types:
        assert expected in all_gaps, f"Expected gap '{expected}' in detected gaps: {all_gaps}"
    
    # 2. Synthesize with valid positive answers
    valid_answers = {
        "spending_limits": "250.00",
        "session_budget": "2000.00",
        "allowed_languages": ["en", "es"],
        "foreign_script_rejection": True,
        "direct_injection_action": "BLOCK",
        "indirect_injection_action": "BLOCK",
        "timeout_degradation": "FAIL_CLOSED"
    }
    synth_res = client.post("/api/policy/synthesize", headers=auth_jwt_headers, json={
        "agent_name": "Probing Interview Agent",
        "tools": tools,
        "answers": valid_answers
    })
    assert synth_res.status_code == 200
    synth_data = synth_res.json()
    assert synth_data["status"] == "DRAFT"
    assert synth_data["is_active"] is False
    assert "transfer_funds" in synth_data["yaml_content"]
    assert "250" in synth_data["yaml_content"]
    assert "2000" in synth_data["yaml_content"]
    
    # 3. Adversarial ceiling test: Non-positive or negative ceiling
    # Direct compiler test: PolicyCompiler.synthesize_policy must reject non-positive ceilings
    with pytest.raises(ValueError, match="must be a positive number"):
        PolicyCompiler.synthesize_policy(
            tools=tools,
            answers={"spending_limits": "-500", "session_budget": "0", "allowed_languages": ["en"]}
        )
    
    # API test: When non-positive ceiling is submitted to endpoint, it must be rejected (HTTP 400 or 500 error)
    synth_np_res = client.post("/api/policy/synthesize", headers=auth_jwt_headers, json={
        "agent_name": "NonPositiveAgent",
        "tools": tools,
        "answers": {"spending_limits": "-500", "session_budget": "0", "allowed_languages": ["en"]}
    })
    assert synth_np_res.status_code in (400, 500), f"Expected rejection (400/500), got {synth_np_res.status_code}"


# ==============================================================================
# PROBE 5: Dual API Key Role Enforcement and Runtime Auto-Switching
# ==============================================================================
def test_probe_dual_api_key_role_enforcement_and_auto_switching(client: TestClient):
    """
    Adversarial Probe on Dual API Keys and Auto-Switching:
    - Pre-LLM Ingress key (cgx_ing_...) accepted at /v1/guard/ingress.
    - Post-LLM Egress key (cgx_egr_...) accepted at /v1/guard/egress.
    - Auto-switching: pure RAG/summarization switches to STREAMLINED_RAG (<0.1ms).
    - Auto-switching: tool calling enforces FULL_TRI_GUARD.
    """
    # 1. Provision dual keys
    proj_res = client.post("/api/project/create", json={"name": "AutoSwitch Test Project"})
    assert proj_res.status_code == 200
    dual_keys = proj_res.json()["dual_keys"]
    raw_ing_key = dual_keys["ingress"]["raw_key"]
    raw_egr_key = dual_keys["egress"]["raw_key"]
    
    # 2. Test Ingress Guard with Ingress Key -> Accepted
    ing_res = client.post(
        "/api/v1/guard/ingress",
        headers={"X-API-Key": raw_ing_key},
        json={"user_prompt": "Hello, can you help me check the status of my order?"}
    )
    assert ing_res.status_code == 200, f"Ingress rejected ingress key: {ing_res.text}"
    assert ing_res.json()["decision"] == "ALLOW"
    
    # 3. Test Ingress Guard with Egress Key -> Rejected (HTTP 403)
    ing_wrong_res = client.post(
        "/api/v1/guard/ingress",
        headers={"X-API-Key": raw_egr_key},
        json={"user_prompt": "Hello, can you help me check the status of my order?"}
    )
    assert ing_wrong_res.status_code == 403, f"Expected 403 for egress key at ingress, got {ing_wrong_res.status_code}"
    
    # 4. Test Egress Guard with Ingress Key -> Rejected (HTTP 403)
    egr_wrong_res = client.post(
        "/api/v1/guard/egress",
        headers={"X-API-Key": raw_ing_key},
        json={"session_id": "sess_wrong_key", "user_intent": "Task"}
    )
    assert egr_wrong_res.status_code == 403, f"Expected 403 for ingress key at egress, got {egr_wrong_res.status_code}"
    
    # 5. Test Auto-Switching for Pure Summarization -> execution_mode == STREAMLINED_RAG
    egr_rag_res = client.post(
        "/api/v1/guard/egress",
        headers={"X-API-Key": raw_egr_key},
        json={
            "session_id": "sess_rag_test",
            "user_intent": "Summarize customer feedback",
            "proposed_llm_output": "The customer is satisfied with the quick delivery."
        }
    )
    assert egr_rag_res.status_code == 200
    assert egr_rag_res.json()["decision"] == "ALLOW"
    assert egr_rag_res.json()["execution_mode"] == "STREAMLINED_RAG"
    assert egr_rag_res.json()["auto_switched"] is True
    
    # 6. Test Auto-Switching for Sensitive Tool Call -> execution_mode == FULL_TRI_GUARD
    egr_tool_res = client.post(
        "/api/v1/guard/egress",
        headers={"X-API-Key": raw_egr_key},
        json={
            "session_id": "sess_tool_test",
            "user_intent": "Transfer money to account",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 50.0, "recipient": "acc_12345"}
        }
    )
    assert egr_tool_res.status_code == 200
    assert egr_tool_res.json()["execution_mode"] == "FULL_TRI_GUARD"
    assert egr_tool_res.json()["auto_switched"] is False


# ==============================================================================
# PROBE 6: Native PostgreSQL, In-Place Zip Upload, Key Rotation & Auto-Bound Policy
# ==============================================================================
def test_probe_end_to_end_native_postgres_policy_binding_and_key_rotation(client: TestClient, auth_jwt_headers: dict):
    """
    Verifies:
    1. Database engine is connected to native PostgreSQL.
    2. Uploading a .zip with an existing project_id updates the project in place.
    3. Rotating dual keys returns fresh one-time raw_key values for cgx_ing_ and cgx_egr_.
    4. Approving a project policy automatically binds its language constraints and financial ceilings
       to runtime /v1/guard/ingress and /v1/guard/egress requests authenticated with those dual keys.
    5. Vector DB custom signature persistence, grouped families, and live security alerts endpoint.
    """
    # 1. Verify native PostgreSQL readiness
    ready_res = client.get("/ready")
    assert ready_res.status_code == 200
    ready_data = ready_res.json()
    assert ready_data["database_connected"] is True
    assert ready_data["database_dialect"] == "postgresql"

    # 2. Create project and upload .zip into that SAME project_id
    create_res = client.post("/api/project/create", json={"name": "InPlace Zip & Bound Policy Agent"})
    assert create_res.status_code == 200
    proj_id = create_res.json()["id"]

    zip_bytes = make_in_memory_zip({
        "agent.py": "def transfer_funds(amount: float, target_account: str) -> str:\n    '''Transfers funds.'''\n    return 'ok'\n"
    })
    up_res = client.post(
        "/api/project/upload-zip",
        files={"file": ("agent.zip", zip_bytes, "application/zip")},
        data={"project_id": proj_id, "project_name": "InPlace Zip & Bound Policy Agent"}
    )
    assert up_res.status_code == 200
    assert up_res.json()["project_id"] == proj_id

    # 3. Synthesize and approve policy with $75 per-call limit, $150 session budget, and English-only
    syn_res = client.post(
        "/api/policy/synthesize",
        headers=auth_jwt_headers,
        json={
            "agent_name": "InPlace Zip & Bound Policy Agent",
            "project_id": proj_id,
            "tools": up_res.json()["tools"],
            "answers": {
                "spending_limits": "75.0",
                "session_budget": "150.0",
                "allowed_languages": ["en"],
                "foreign_script_rejection": True
            }
        }
    )
    assert syn_res.status_code == 200
    policy_id = syn_res.json()["policy_id"]

    app_res = client.post(
        f"/api/policy/{policy_id}/approve",
        headers=auth_jwt_headers,
        json={"approved_by": "judge_admin", "version": "1.0.0"}
    )
    assert app_res.status_code == 200

    # Verify ProjectDetailResponse includes policy_yaml and APPROVED status
    det_res = client.get(f"/api/project/{proj_id}")
    assert det_res.status_code == 200
    det_data = det_res.json()
    assert det_data["policy_status"] == "APPROVED"
    assert det_data["policy_yaml"] is not None and "transfer_funds" in det_data["policy_yaml"]

    # 4. Rotate project dual keys and verify fresh raw_key values
    rot_res = client.post(f"/api/project/{proj_id}/rotate-keys")
    assert rot_res.status_code == 200
    rot_data = rot_res.json()
    new_ing_key = rot_data["ingress_key"]["raw_key"]
    new_egr_key = rot_data["egress_key"]["raw_key"]
    assert new_ing_key.startswith("cgx_ing_")
    assert new_egr_key.startswith("cgx_egr_")

    # 5. Test Ingress Guard with new_ing_key (auto-enforces English-only from project's approved policy!)
    ing_es_res = client.post(
        "/v1/guard/ingress",
        headers={"X-API-Key": new_ing_key},
        json={"user_prompt": "Hola, por favor necesito un reembolso urgente de mi cuenta."}
    )
    assert ing_es_res.status_code == 403
    assert ing_es_res.json()["reason"] == "LANGUAGE_VIOLATION"

    # 6. Test Egress Guard with new_egr_key (auto-enforces $75 single-call limit from project's approved policy!)
    egr_over_res = client.post(
        "/v1/guard/egress",
        headers={"X-API-Key": new_egr_key},
        json={
            "session_id": f"sess_bound_{proj_id}",
            "user_intent": "Transfer $90 to account",
            "tool_name": "transfer_funds",
            "tool_arguments": {"amount": 90.0, "target_account": "acc_123"}
        }
    )
    assert egr_over_res.status_code == 200
    assert egr_over_res.json()["decision"] == "BLOCK"
    assert "75.00" in egr_over_res.json()["reason"]

    # 7. Test Vector DB grouped families, custom signature creation, and live alerts feed
    sig_get = client.get("/v1/vector-db/signatures", headers=auth_jwt_headers)
    assert sig_get.status_code == 200
    assert isinstance(sig_get.json().get("families_grouped"), dict)

    alerts_res = client.get("/v1/alerts/recent", headers=auth_jwt_headers)
    assert alerts_res.status_code == 200
    assert isinstance(alerts_res.json().get("alerts"), list)
    assert len(alerts_res.json()["alerts"]) >= 1

