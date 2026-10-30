"""
ContractGuard Challenger Empirical Test Suite - Milestone 2 Iteration 2
Comprehensive Adversarial Probing & Stress Harness

Target Components:
- backend/app/core/zip_extractor.py
- backend/app/api/policies.py
- backend/app/api/projects.py

Evaluates the 5 remediated areas:
1. Tool Discovery: Whitelist removal (calculate_tax, generate_invoice, process_order, private/decorated functions).
2. Positional-Only Parameters: PEP 570 syntax (sender: str, /, amount: float) parameter capturing and metadata.
3. TypeScript Generic Arrow Functions: Generic type parameters in arrow functions with various constraints.
4. Bracket-Aware Parameter Splitting: Deeply nested types, object literals, string defaults with commas.
5. Zip Slip / Path Traversal & Password Protection: In-memory safety, ValueError raising, and HTTP 400 rejection in API endpoints.
"""
import io
import os
import zipfile
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.zip_extractor import (
    ZipToolExtractor,
    extract_tools_from_zip,
    extract_zip_in_memory,
    _extract_python_ast_tools,
    _extract_js_ts_lexical_tools,
    _split_parameters,
    parse_js_ts_code,
)

client = TestClient(app)


def make_zip(files: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            if isinstance(content, str):
                zf.writestr(name, content)
            else:
                zf.writestr(name, content)
    buf.seek(0)
    return buf.getvalue()


def make_encrypted_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("secret.py", b"def secret_tool(): pass")
    raw = bytearray(buf.getvalue())
    raw[6] = raw[6] | 0x01
    cd_idx = raw.find(b"PK\x01\x02")
    if cd_idx != -1:
        raw[cd_idx + 8] = raw[cd_idx + 8] | 0x01
    return bytes(raw)



# ============================================================================
# Section 1: Tool Discovery Probing (Whitelist Removal)
# ============================================================================

class TestToolDiscoveryProbes:
    """Verifies public tool discovery operates without hardcoded keyword whitelists."""

    def test_canonical_tools_discovered_without_whitelist(self):
        """Probe: calculate_tax, generate_invoice, process_order (previously dropped if not in whitelist)."""
        code = '''
def calculate_tax(income: float, rate: float):
    """Calculates income tax amount."""
    return income * rate

def generate_invoice(client_id: str, items: list):
    """Generates billing invoice for customer."""
    return {"client": client_id, "items": items}

def process_order(order_id: str, quantity: int):
    """Fulfills and dispatches an inventory order."""
    return {"order_id": order_id, "status": "processed"}
'''
        tools = _extract_python_ast_tools(code, "billing.py")
        tool_names = [t["name"] for t in tools]
        assert "calculate_tax" in tool_names, "Defect: calculate_tax was not discovered"
        assert "generate_invoice" in tool_names, "Defect: generate_invoice was not discovered"
        assert "process_order" in tool_names, "Defect: process_order was not discovered"

        tax_tool = next(t for t in tools if t["name"] == "calculate_tax")
        assert "income" in tax_tool["parameters"]
        assert "rate" in tax_tool["parameters"]
        assert tax_tool["parameters"]["income"]["type"] == "number"
        assert tax_tool["parameters"]["rate"]["type"] == "number"

    def test_arbitrary_domain_public_functions_discovered(self):
        """Probe: Public functions across unrelated domains without any financial/system keywords."""
        code = '''
def synthesize_protein_sequence(dna_strand: str, codons: int = 64):
    """Bioinformatics agent tool."""
    pass

def render_vector_graphics(svg_payload: str, dpi: int = 300):
    """Graphics rendering tool."""
    pass

def query_weather_satellite(latitude: float, longitude: float):
    """Geospatial meteorological query tool."""
    pass
'''
        tools = _extract_python_ast_tools(code, "science.py")
        tool_names = [t["name"] for t in tools]
        assert "synthesize_protein_sequence" in tool_names
        assert "render_vector_graphics" in tool_names
        assert "query_weather_satellite" in tool_names

    def test_private_functions_excluded_unless_decorated(self):
        """Probe: Private functions (_helper) should be omitted, but decorated (@tool) private functions included."""
        code = '''
def _private_computation_helper(data: str):
    """Internal helper; not an agent tool."""
    return data.strip()

def tool(fn):
    return fn

@tool
def _decorated_internal_tool(config: str):
    """Decorated internal tool; SHOULD be discovered."""
    return config
'''
        tools = _extract_python_ast_tools(code, "internal.py")
        tool_names = [t["name"] for t in tools]
        assert "_private_computation_helper" not in tool_names, "Defect: Undecorated private helper was incorrectly discovered"
        assert "_decorated_internal_tool" in tool_names, "Defect: Decorated private tool was not discovered"

    def test_class_methods_and_self_handling(self):
        """Probe: Public methods on classes should be discovered without capturing self or cls."""
        code = '''
class WarehouseManager:
    def restock_item(self, sku: str, count: int):
        """Restocks warehouse inventory."""
        pass

    @classmethod
    def get_capacity(cls, facility_id: str):
        """Queries facility warehouse capacity."""
        pass
'''
        tools = _extract_python_ast_tools(code, "warehouse.py")
        tool_names = [t["name"] for t in tools]
        assert "restock_item" in tool_names
        assert "get_capacity" in tool_names

        restock = next(t for t in tools if t["name"] == "restock_item")
        assert "self" not in restock["parameters"]
        assert "sku" in restock["parameters"]
        assert "count" in restock["parameters"]


# ============================================================================
# Section 2: Positional-Only Arguments (PEP 570) Probing
# ============================================================================

class TestPositionalOnlyArgsProbes:
    """Verifies PEP 570 posonlyargs parameter extraction and metadata."""

    def test_positional_only_parameter_capturing(self):
        """Probe: def transfer(sender: str, /, amount: float): captures sender."""
        code = '''
def transfer(sender: str, /, amount: float):
    """Initiates an account transfer."""
    pass
'''
        tools = _extract_python_ast_tools(code, "transfer.py")
        assert len(tools) == 1
        tool = tools[0]
        assert "sender" in tool["parameters"], "Defect: Positional-only parameter 'sender' was dropped"
        assert "amount" in tool["parameters"], "Defect: Parameter 'amount' was dropped"
        assert tool["parameters"]["sender"]["type"] == "string"
        assert tool["parameters"]["amount"]["type"] == "number"

    def test_positional_only_flag_metadata_evaluation(self):
        """
        Probe: Check whether positional_only=True flag is recorded in parameter schema.
        Note: Evaluates whether schema records positional_only flag vs capturing type only.
        """
        code = '''
def transfer(sender: str, /, amount: float):
    """Initiates an account transfer."""
    pass
'''
        tools = _extract_python_ast_tools(code, "transfer.py")
        tool = tools[0]
        sender_param = tool["parameters"]["sender"]
        # Positional-only parameter sender is captured in the parameter map
        assert "type" in sender_param
        # Challenger observation: verify if positional_only boolean flag is set
        has_posonly_flag = sender_param.get("positional_only") is True
        # We record whether the flag is explicitly populated
        print(f"\n[Observation] 'sender' has explicit positional_only=True: {has_posonly_flag}")

    def test_complex_signature_posonly_kwonly_defaults(self):
        """Probe: Combined signature with posonly, standard, kwonly, and defaults."""
        code = '''
def complex_executor(
    pos_req: str,
    pos_def: int = 10,
    /,
    std_req: str = "standard",
    *,
    kw_req: float,
    kw_def: bool = True
):
    """Complex multi-category argument signature."""
    pass
'''
        tools = _extract_python_ast_tools(code, "complex.py")
        assert len(tools) == 1
        params = tools[0]["parameters"]
        expected_params = ["pos_req", "pos_def", "std_req", "kw_req", "kw_def"]
        for p in expected_params:
            assert p in params, f"Defect: Parameter '{p}' missing from extracted signature"


# ============================================================================
# Section 3: TypeScript Generic Arrow Functions Probing
# ============================================================================

class TestTSGenericArrowFunctionsProbes:
    """Verifies regex and lexical scanner extraction of modern TypeScript arrow functions with generics."""

    def test_target_generic_arrow_function_discovery(self):
        """Probe: const fn = async <T, K extends object>(a: T, b: K): Promise<Record<string, any>> => captures fn, a, and b."""
        ts_code = '''
export const fn = async <T, K extends object>(a: T, b: K): Promise<Record<string, any>> => {
    return { a, b };
};
'''
        tools = parse_js_ts_code(ts_code, "generic.ts")
        assert len(tools) == 1, "Defect: TS generic arrow function 'fn' was not discovered"
        tool = tools[0]
        assert tool["name"] == "fn"
        assert "a" in tool["parameters"], "Defect: Parameter 'a' not captured"
        assert "b" in tool["parameters"], "Defect: Parameter 'b' not captured"

    def test_sync_generic_arrow_function(self):
        """Probe: Non-async generic arrow function: const transform = <T, U>(input: T): U => ..."""
        ts_code = '''
export const transform = <T, U>(input: T): U => {
    return input as any;
};
'''
        tools = parse_js_ts_code(ts_code, "transform.ts")
        assert len(tools) == 1, "Defect: Synchronous generic arrow function was not discovered"
        assert tools[0]["name"] == "transform"
        assert "input" in tools[0]["parameters"]

    def test_multiline_generic_arrow_function(self):
        """Probe: Multiline formatted generic type parameters."""
        ts_code = '''
export const orchestrate = async <
    TContext extends Record<string, any>,
    TPayload extends object
>(
    context: TContext,
    payload: TPayload
): Promise<boolean> => {
    return true;
};
'''
        tools = parse_js_ts_code(ts_code, "orch.ts")
        assert len(tools) == 1, "Defect: Multiline generic arrow function was not discovered"
        assert tools[0]["name"] == "orchestrate"
        assert "context" in tools[0]["parameters"]
        assert "payload" in tools[0]["parameters"]

    def test_default_type_parameter_generic_limitation(self):
        """
        Adversarial Probe: Generic type parameters with default assignments:
        const fn = async <T = string, K = number>(a: T, b: K) => ...
        Identifies regex limitation where [^=()]+ rejects '='.
        """
        ts_code = '''
export const fnWithDefaults = async <T = string, K = number>(a: T, b: K): Promise<void> => {
    // Has default type parameters
};
'''
        tools = parse_js_ts_code(ts_code, "defaults.ts")
        # Record whether current arrow_pattern regex matches generic default types
        matched = any(t["name"] == "fnWithDefaults" for t in tools)
        print(f"\n[Observation] Arrow function with default type params '<T = string>' discovered: {matched}")


# ============================================================================
# Section 4: Bracket-Aware Parameter Splitting Probing
# ============================================================================

class TestBracketAwareSplittingProbes:
    """Verifies parameter splitting does not corrupt nested brackets, generics, or object literals."""

    def test_target_object_literal_and_record_type(self):
        """Probe: Verify { timeout: 1000, retry: true } and Record<string, any> do not split into phantom parameters."""
        ts_code = '''
export function configureClient(
    service: string,
    options: Record<string, any> = { timeout: 1000, retry: true },
    retries: number = 3
): void {
}
'''
        tools = parse_js_ts_code(ts_code, "client.ts")
        assert len(tools) == 1
        params = tools[0]["parameters"]
        # Expected real parameters
        assert "service" in params
        assert "options" in params
        assert "retries" in params
        # Invariant: NO phantom parameters
        assert "any>" not in params, "Defect: Phantom parameter 'any>' created from Record<string, any>"
        assert "retry" not in params, "Defect: Phantom parameter 'retry' created from { timeout: 1000, retry: true }"
        assert len(params) == 3, f"Defect: Expected exactly 3 parameters, got: {list(params.keys())}"

    def test_deeply_nested_types_and_comma_in_string_defaults(self):
        """Probe: Deeply nested generics, array types, and string defaults containing commas."""
        ts_code = '''
export const processPipeline = (
    mapping: Map<string, Array<Record<string, number>>>,
    delimiters: string[] = [",", ";", "\\t"],
    greeting: string = "Hello, world!"
): boolean => {
    return true;
};
'''
        tools = parse_js_ts_code(ts_code, "pipeline.ts")
        assert len(tools) == 1
        params = tools[0]["parameters"]
        assert "mapping" in params
        assert "delimiters" in params
        assert "greeting" in params
        assert len(params) == 3, f"Defect: Unexpected phantom parameters: {list(params.keys())}"

    def test_split_parameters_raw_tokenizer_depth_handling(self):
        """Probe: Raw unit tests on _split_parameters with balanced delimiters."""
        s1 = "a: int, b: Record<K, V>, c: { x: 1, y: 2 }"
        parts1 = _split_parameters(s1)
        assert len(parts1) == 3
        assert parts1[0] == "a: int"
        assert parts1[1] == "b: Record<K, V>"
        assert parts1[2] == "c: { x: 1, y: 2 }"

        s2 = "msg: string = 'comma, in, quote', count: number = 5"
        parts2 = _split_parameters(s2)
        assert len(parts2) == 2
        assert parts2[0] == "msg: string = 'comma, in, quote'"
        assert parts2[1] == "count: number = 5"


# ============================================================================
# Section 5: Zip Slip & Path Traversal & Password Protection API Probes
# ============================================================================

class TestZipSlipAndSecurityAPIProbes:
    """Verifies path traversal and encrypted zip archives trigger HTTP 400 Bad Request in API endpoints."""

    def test_upload_zip_rejects_unix_zip_slip_400(self):
        """Probe: POST /api/project/upload-zip with ../../evil.py returns HTTP 400."""
        zip_bytes = make_zip({"../../evil.py": "def evil(): pass", "safe.py": "def safe(): pass"})
        res = client.post(
            "/api/project/upload-zip",
            files={"file": ("malicious.zip", zip_bytes, "application/zip")}
        )
        assert res.status_code == 400, f"Defect: Expected HTTP 400, got {res.status_code}: {res.text}"
        assert "unsafe path traversal" in res.json().get("detail", "").lower()

    def test_ingest_zip_rejects_unix_zip_slip_400(self):
        """Probe: POST /api/policy/ingest-zip with ../../evil.py returns HTTP 400."""
        zip_bytes = make_zip({"../../evil.py": "def evil(): pass", "safe.py": "def safe(): pass"})
        res = client.post(
            "/api/policy/ingest-zip",
            files={"file": ("malicious.zip", zip_bytes, "application/zip")},
            data={"project_name": "AttackProject"}
        )
        assert res.status_code == 400, f"Defect: Expected HTTP 400, got {res.status_code}: {res.text}"
        assert "unsafe path traversal" in res.json().get("detail", "").lower()

    def test_upload_zip_rejects_windows_zip_slip_400(self):
        """Probe: POST /api/project/upload-zip with ..\\..\\evil_win.py returns HTTP 400."""
        zip_bytes = make_zip({"..\\..\\evil_win.py": "def evil(): pass", "safe.py": "def safe(): pass"})
        res = client.post(
            "/api/project/upload-zip",
            files={"file": ("malicious_win.zip", zip_bytes, "application/zip")}
        )
        assert res.status_code == 400, f"Defect: Expected HTTP 400, got {res.status_code}: {res.text}"

    def test_upload_zip_rejects_absolute_path_traversal_400(self):
        """Probe: POST /api/project/upload-zip with /etc/passwd or C:\\evil.py returns HTTP 400."""
        zip_bytes = make_zip({"/etc/passwd": "root:x:0:0:", "safe.py": "def safe(): pass"})
        res = client.post(
            "/api/project/upload-zip",
            files={"file": ("malicious_abs.zip", zip_bytes, "application/zip")}
        )
        assert res.status_code == 400, f"Defect: Expected HTTP 400, got {res.status_code}: {res.text}"

    def test_upload_zip_rejects_encrypted_archive_400(self):
        """Probe: POST /api/project/upload-zip with password-protected archive returns HTTP 400."""
        encrypted_zip = make_encrypted_zip()
        res = client.post(
            "/api/project/upload-zip",
            files={"file": ("protected.zip", encrypted_zip, "application/zip")}
        )
        assert res.status_code == 400, f"Defect: Expected HTTP 400, got {res.status_code}: {res.text}"
        assert "password-protected" in res.json().get("detail", "").lower()

    def test_ingest_zip_rejects_encrypted_archive_400(self):
        """Probe: POST /api/policy/ingest-zip with password-protected archive returns HTTP 400."""
        encrypted_zip = make_encrypted_zip()
        res = client.post(
            "/api/policy/ingest-zip",
            files={"file": ("protected.zip", encrypted_zip, "application/zip")},
            data={"project_name": "ProtectedProject"}
        )
        assert res.status_code == 400, f"Defect: Expected HTTP 400, got {res.status_code}: {res.text}"
        assert "password-protected" in res.json().get("detail", "").lower()

    def test_direct_functions_raise_value_error_on_traversal(self):
        """Probe: Direct calls to extract_zip_in_memory and extract_tools_from_zip raise ValueError."""
        zip_bytes = make_zip({"../../evil.py": "def evil(): pass"})
        with pytest.raises(ValueError, match="unsafe path traversal"):
            extract_zip_in_memory(zip_bytes)

        with pytest.raises(ValueError, match="unsafe path traversal"):
            extract_tools_from_zip(zip_bytes)

    def test_direct_functions_raise_value_error_on_encryption(self):
        """Probe: Direct calls raise ValueError on password-protected archives."""
        encrypted_zip = make_encrypted_zip()
        with pytest.raises(ValueError, match="Password-protected"):
            extract_zip_in_memory(encrypted_zip)

        with pytest.raises(ValueError, match="Password-protected"):
            extract_tools_from_zip(encrypted_zip)

