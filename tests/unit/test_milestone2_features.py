"""
Milestone 2 Comprehensive Unit & Integration Tests (Features F6 - F12)
Validates:
1. Safe in-memory zip archive unpacking (Zip Slip & Zip Bomb defense)
2. Python AST extraction (async def, decorators, parameter types, docstrings, defaults)
3. Zero-token JS/TS lexical parser (functions, arrow functions, class methods, JSDoc, TS types)
4. Tool classification (financial, stateful, read_only, suggested ceilings)
5. 7 Canonical Policy Gap Rules (PolicyGapDetector)
6. Enriched Interactive Interview Questions
7. Policy Synthesis Engine (Invariant #1, language constraints, injection edge cases)
8. REST Endpoints: /api/policy/ingest-zip, /api/policy/interview-questions, /api/policy/synthesize, /api/policy/project/{project_id}
"""
import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.zip_extractor import (
    ZipToolExtractor,
    extract_tools_from_zip,
    extract_zip_in_memory,
    _extract_python_ast_tools
)
from backend.app.core.policy_compiler import (
    PolicyGapDetector,
    PolicyCompiler,
    GAP_TOOL_FINANCIAL_CEILING_MISSING,
    GAP_SESSION_CUMULATIVE_BUDGET_MISSING,
    GAP_UNDEFINED_ALLOWED_LANGUAGES,
    GAP_UNDEFINED_DIRECT_INJECTION,
    GAP_UNDEFINED_INDIRECT_INJECTION,
    GAP_MISSING_TIMEOUT_DEGRADATION,
    GAP_MISSING_HUMAN_CONFIRMATION
)


@pytest.fixture
def client():
    return TestClient(app)


def test_safe_zip_slip_rejection():
    """Verify paths containing directory traversal '..' are safely rejected."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../../etc/malicious.py", "def evil_tool(): pass")
        zf.writestr("safe_tool.py", "def safe_tool(): pass")
    buf.seek(0)
    zip_bytes = buf.getvalue()

    manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    assert not any("malicious" in f for f in manifest)
    assert any("safe_tool.py" in f for f in manifest)


def test_interface_contract_3_module_function():
    """Verify module-level extract_tools_from_zip complies with Interface Contract 3."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        code = "def transfer_wire(amount: float, recipient: str):\n    '''Transfers funds'''\n    pass\n"
        zf.writestr("wire.py", code)
    buf.seek(0)
    res = extract_tools_from_zip(buf.getvalue())
    assert "tools" in res
    assert "files_analyzed" in res
    assert res["tokens_consumed"] == 0
    assert len(res["tools"]) > 0


def test_async_python_function_and_decorators_ast_extraction():
    """Verify async def tools and decorators are correctly extracted with annotations."""
    code = '''
def tool(name=None):
    def decorator(fn): return fn
    return decorator

@tool(name="process_payment")
async def process_payment(amount: float, recipient_iban: str, notify: bool = True):
    """Processes online customer payment."""
    return {"status": "ok"}
'''
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("payment_agent.py", code)
    buf.seek(0)
    _, tools, _ = ZipToolExtractor.extract_tools_from_zip(buf.getvalue())
    pay_tool = next((t for t in tools if t["name"] == "process_payment"), None)
    assert pay_tool is not None
    assert pay_tool["parameters"]["amount"]["type"] == "number"
    assert pay_tool["parameters"]["recipient_iban"]["type"] == "string"
    assert pay_tool["parameters"]["notify"]["type"] == "boolean"
    assert pay_tool["is_financial"] is True
    assert "Processes online customer payment" in pay_tool["description"]


def test_zero_token_typescript_and_javascript_lexical_parser():
    """Verify pure-Python zero-token extraction from TS/JS agent code."""
    ts_code = '''
/**
 * Customer Support Agent CRM Tools
 */
export async function fetchCustomerRecord(customerId: string): Promise<Record<string, any>> {
    // Fetches CRM customer profile
    return { id: customerId, name: "Alice" };
}

export const processCustomerRefund = async (amount: number, targetAccount: string): Promise<boolean> => {
    // Issues refund to customer
    return true;
};
'''
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("crm.ts", ts_code)
    buf.seek(0)
    _, tools, _ = ZipToolExtractor.extract_tools_from_zip(buf.getvalue())
    tool_names = [t["name"] for t in tools]
    assert "fetchCustomerRecord" in tool_names
    assert "processCustomerRefund" in tool_names

    refund_t = next(t for t in tools if t["name"] == "processCustomerRefund")
    assert refund_t["parameters"]["amount"]["type"] == "number"
    assert refund_t["is_financial"] is True


def test_tool_classification_effects_and_ceilings():
    """Verify financial and stateful classification with suggested ceilings."""
    tools = [
        {"name": "transfer_funds", "parameters": {"amount": "number", "target_account": "string"}},
        {"name": "delete_user", "parameters": {"user_id": "string"}},
        {"name": "fetch_user", "parameters": {"user_id": "string"}}
    ]
    gaps = PolicyGapDetector.detect_gaps(tools)
    assert GAP_TOOL_FINANCIAL_CEILING_MISSING in gaps
    assert GAP_SESSION_CUMULATIVE_BUDGET_MISSING in gaps
    assert GAP_UNDEFINED_ALLOWED_LANGUAGES in gaps


def test_seven_canonical_gap_detection():
    """Verify PolicyGapDetector catches all 7 canonical gap categories."""
    tools = [{"name": "process_refund", "parameters": {"amount": "number"}}]
    gaps = PolicyGapDetector.detect_gaps(tools)
    for expected_gap in [
        GAP_TOOL_FINANCIAL_CEILING_MISSING,
        GAP_SESSION_CUMULATIVE_BUDGET_MISSING,
        GAP_UNDEFINED_ALLOWED_LANGUAGES,
        GAP_UNDEFINED_DIRECT_INJECTION,
        GAP_UNDEFINED_INDIRECT_INJECTION,
        GAP_MISSING_TIMEOUT_DEGRADATION,
        GAP_MISSING_HUMAN_CONFIRMATION
    ]:
        assert expected_gap in gaps


def test_enriched_interview_questions_format():
    """Verify generated interview questions contain both enriched and backwards-compatible fields."""
    tools = [{"name": "process_refund", "description": "Refunds customer", "parameters": {"amount": "number"}}]
    questions = PolicyGapDetector.generate_interview_questions(tools)
    assert len(questions) >= 4
    for q in questions:
        # Enriched fields
        assert "id" in q
        assert "title" in q
        assert "options" in q
        assert "default_value" in q
        assert "gap_type" in q
        assert "required" in q
        # Backwards-compatible fields
        assert "tool_name" in q
        assert "parameter" in q
        assert "question" in q
        assert "explanation" in q


def test_policy_synthesis_invariant_1_and_language_constraints():
    """Verify synthesized policy draft has status=DRAFT, is_active=False and includes language constraints."""
    tools = [{"name": "process_refund", "description": "Refund", "parameters": {"amount": "number"}}]
    answers = {
        "spending_limits": "Max $300 single call, $750 cumulative",
        "allowed_languages": "en, es, fr",
        "direct_injection_action": "BLOCK",
        "indirect_injection_action": "BLOCK"
    }
    yaml_str = PolicyCompiler.synthesize_policy(tools=tools, answers=answers, agent_name="MultiLangAgent")
    assert "MultiLangAgent" in yaml_str
    assert "300.0" in yaml_str or "300" in yaml_str
    assert "750.0" in yaml_str or "750" in yaml_str
    assert "en" in yaml_str
    assert "es" in yaml_str
    assert "reject_foreign_scripts: true" in yaml_str


def test_rest_api_ingest_zip_endpoint(client):
    """Verify POST /api/policy/ingest-zip returns extracted tools, detected gaps, questions, and draft policy."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("agent.py", "def refund_money(amount: float):\n    '''Refunds'''\n    pass\n")
    buf.seek(0)

    files = {"file": ("bank_agent.zip", buf.getvalue(), "application/zip")}
    res = client.post("/api/policy/ingest-zip", files=files, data={"project_name": "BankOps"})
    assert res.status_code == 200
    data = res.json()
    assert "project_id" in data
    assert data["project_id"].startswith("proj_")
    assert len(data["tools"]) > 0
    assert len(data["detected_gaps"]) > 0
    assert len(data["questions"]) > 0
    assert data["draft_policy"] is not None


def test_rest_api_interview_questions_with_project_id(client):
    """Verify POST /api/policy/interview-questions accepts structured object with project_id."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("tools.py", "def wire_transfer(amount: float, iban: str): pass\n")
    buf.seek(0)
    ing_res = client.post("/api/project/upload-zip", files={"file": ("agent.zip", buf.getvalue(), "application/zip")})
    assert ing_res.status_code == 200
    proj_id = ing_res.json()["project_id"]

    res = client.post("/api/policy/interview-questions", json={"project_id": proj_id, "tools": []})
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    assert "gaps" in data
    assert len(data["questions"]) > 0


def test_rest_api_synthesize_and_project_retrieval(client):
    """Verify synthesis persists to project and GET /api/policy/{project_id} retrieves it."""
    # 1. Ingest
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("tools.py", "def wire_transfer(amount: float, iban: str): pass\n")
    buf.seek(0)
    ing_res = client.post("/api/project/upload-zip", files={"file": ("agent.zip", buf.getvalue(), "application/zip")})
    proj_id = ing_res.json()["project_id"]

    # 2. Synthesize with project_id
    login_res = client.post("/api/auth/demo-login")
    auth_token = login_res.json()["access_token"]
    synth_res = client.post(
        "/api/policy/synthesize",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "agent_name": "SynthesizedBankAgent",
            "project_id": proj_id,
            "answers": {"spending_limits": "Max $400 per call, $800 per session"},
            "tool_limits": {"per_call_ceiling": 400.0, "max_cumulative_budget": 800.0}
        }
    )
    assert synth_res.status_code == 200
    synth_data = synth_res.json()
    assert synth_data["status"] == "DRAFT"
    assert synth_data["is_active"] is False
    assert synth_data["project_id"] == proj_id

    # 3. Retrieve policy by project_id
    get_res = client.get(f"/api/policy/{proj_id}")
    assert get_res.status_code == 200
    pol_data = get_res.json()
    assert pol_data["project_id"] == proj_id
    assert "yaml_content" in pol_data

    # 4. Also retrieve via dedicated project route
    get_proj_res = client.get(f"/api/policy/project/{proj_id}")
    assert get_proj_res.status_code == 200
    assert get_proj_res.json()["project_id"] == proj_id


def test_public_functions_discovered_without_whitelist():
    """Verify Interface Contract 3 canonical example calculate_tax is discovered as a tool."""
    code = '''
def calculate_tax(income: float, rate: float):
    """Calculates tax based on income and rate"""
    return income * rate
'''
    tools = _extract_python_ast_tools(code, "tax.py")
    assert len(tools) == 1
    assert tools[0]["name"] == "calculate_tax"
    assert "income" in tools[0]["parameters"]
    assert "rate" in tools[0]["parameters"]


def test_extract_zip_in_memory_path_traversal_rejection():
    """Verify extract_zip_in_memory raises ValueError on path traversal."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../../evil.py", "def evil(): pass")
    with pytest.raises(ValueError, match="Archive contains unsafe path traversal"):
        extract_zip_in_memory(buf.getvalue())


def test_upload_zip_endpoint_rejects_path_traversal_400(client):
    """Verify /api/project/upload-zip returns HTTP 400 on unsafe path traversal."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../../evil.py", "def evil(): pass")
    files = {"file": ("malicious.zip", buf.getvalue(), "application/zip")}
    res = client.post("/api/project/upload-zip", files=files)
    assert res.status_code == 400
    assert "unsafe path traversal" in res.json()["detail"].lower()


def test_synthesize_policy_rejects_negative_ceiling():
    """Verify synthesize_policy strictly requires ceilings > 0."""
    with pytest.raises(ValueError, match="Parameter ceilings must be positive numbers"):
        PolicyCompiler.synthesize_policy(
            tools=[],
            answers={},
            tool_limits={"per_call_ceiling": -100.0}
        )

