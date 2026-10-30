"""
Challenger M2 Empirical Probe Harness
Adversarially probes:
1. Zip Ingestion Security (Zip Slip, Zip Bombs, Encrypted Archives, File writes)
2. AST Parser Edge Cases (Python posonlyargs, kwonlyargs, syntax errors, decorators,
   TypeScript generics, object literal defaults, class methods, JSDoc markdown)
"""
import io
import os
import sys
import ast
import zipfile
import pytest

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.app.core.zip_extractor import (
    ZipToolExtractor,
    extract_tools_from_zip,
    parse_js_ts_code,
    _is_safe_path
)


def create_zip(files: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            if isinstance(content, str):
                zf.writestr(name, content)
            else:
                zf.writestr(name, content)
    buf.seek(0)
    return buf.getvalue()


# ============================================================================
# Category 1: Zip Ingestion Security Probes
# ============================================================================

def test_probe_1_1_zip_slip_unix_traversal():
    """Probe 1.1: Relative path traversal ../../evil.py"""
    zip_bytes = create_zip({
        "../../evil.py": "def evil_tool(): pass",
        "legit.py": "def legit_tool(): pass"
    })
    
    # Check what extract_tools_from_zip does
    # Does it raise ValueError("Archive contains unsafe path traversal") as claimed?
    raised_value_error = False
    try:
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    except ValueError as e:
        raised_value_error = True
        err_msg = str(e)
    
    print(f"\n[Probe 1.1] Unix Zip Slip: raised_value_error={raised_value_error}")
    if not raised_value_error:
        print(f"[Probe 1.1] Instead returned manifest={manifest}, tools={[t['name'] for t in tools]}")
    
    # Invariant: evil.py must NOT be in manifest and must NOT be written to disk
    assert not any("evil" in f for f in manifest)
    assert not os.path.exists("../../evil.py")
    return {
        "raised_value_error": raised_value_error,
        "manifest": manifest,
        "disk_write": os.path.exists("../../evil.py")
    }


def test_probe_1_2_zip_slip_windows_backslash():
    """Probe 1.2: Windows backslash traversal ..\\..\\evil.py"""
    zip_bytes = create_zip({
        "..\\..\\evil_win.py": "def evil_win_tool(): pass",
        "legit.py": "def legit_tool(): pass"
    })
    
    raised_value_error = False
    try:
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    except ValueError as e:
        raised_value_error = True
        err_msg = str(e)
        
    print(f"\n[Probe 1.2] Windows Zip Slip: raised_value_error={raised_value_error}")
    if not raised_value_error:
        print(f"[Probe 1.2] Instead returned manifest={manifest}, tools={[t['name'] for t in tools]}")
        
    assert not any("evil_win" in f for f in manifest)
    assert not os.path.exists("..\\..\\evil_win.py")
    return {
        "raised_value_error": raised_value_error,
        "manifest": manifest,
        "disk_write": os.path.exists("..\\..\\evil_win.py")
    }


def test_probe_1_3_zip_slip_absolute_path():
    """Probe 1.3: Absolute path traversal /etc/passwd and C:\\Windows\\System32\\calc.exe"""
    zip_bytes = create_zip({
        "/etc/passwd": "root:x:0:0:root:/root:/bin/bash",
        "C:\\Windows\\System32\\calc.exe": "binary",
        "safe.py": "def safe_query(): pass"
    })
    
    raised_value_error = False
    try:
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    except ValueError as e:
        raised_value_error = True
        err_msg = str(e)

    print(f"\n[Probe 1.3] Absolute Path Traversal: raised_value_error={raised_value_error}")
    if not raised_value_error:
        print(f"[Probe 1.3] Instead returned manifest={manifest}")
        
    assert not any("passwd" in f for f in manifest)
    assert not any("System32" in f for f in manifest)
    return {
        "raised_value_error": raised_value_error,
        "manifest": manifest
    }


def test_probe_1_4_zip_bomb_file_count_exhaustion():
    """Probe 1.4: Zip archive containing > 500 files (550 small python files)"""
    files = {f"dir/file_{i}.py": f"def query_item_{i}(): pass" for i in range(550)}
    zip_bytes = create_zip(files)
    
    raised_value_error = False
    try:
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    except ValueError as e:
        raised_value_error = True
        err_msg = str(e)

    print(f"\n[Probe 1.4] >500 Files Zip Bomb: raised_value_error={raised_value_error}, manifest_len={len(manifest)}, tools_len={len(tools)}")
    return {
        "raised_value_error": raised_value_error,
        "manifest_count": len(manifest),
        "tools_count": len(tools)
    }


def test_probe_1_5_zip_bomb_single_file_exceeds_5mb():
    """Probe 1.5: Archive containing a single file > 5MB"""
    # 6MB python file
    large_content = "# Comment\n" + ("x = 1\n" * 1_000_000)
    print(f"\nCreated 6MB content size: {len(large_content)} bytes")
    zip_bytes = create_zip({
        "large_file.py": large_content,
        "small_file.py": "def safe_tool(): pass"
    })
    
    raised_value_error = False
    try:
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    except ValueError as e:
        raised_value_error = True

    print(f"[Probe 1.5] >5MB Single File: raised_value_error={raised_value_error}, manifest={manifest}, tools={[t['name'] for t in tools]}")
    return {
        "raised_value_error": raised_value_error,
        "manifest": manifest,
        "tools": [t['name'] for t in tools]
    }


def test_probe_1_6_zip_bomb_total_uncompressed_exceeds_50mb():
    """Probe 1.6: Archive with total uncompressed size > 50MB (12 files * 4.5MB = 54MB)"""
    files = {}
    content_4_5mb = "def query_sample(): pass\n" + ("# filler\n" * 500_000)
    for i in range(12):
        files[f"file_{i}.py"] = content_4_5mb
        
    zip_bytes = create_zip(files)
    raised_value_error = False
    try:
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    except ValueError as e:
        raised_value_error = True

    print(f"\n[Probe 1.6] >50MB Total Size: raised_value_error={raised_value_error}, manifest_len={len(manifest)}")
    return {
        "raised_value_error": raised_value_error,
        "manifest_len": len(manifest)
    }


def test_probe_1_7_encrypted_password_protected_zip():
    """Probe 1.7: Password-protected zip archive"""
    # Create password-protected zip file using zipfile with setpassword / encryption
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.setpassword(b"secret123")
        # In standard library zipfile, writing encrypted files requires zf._open or third-party,
        # but let's test with encrypted flag bit 0x1 in flag_bits
        zinfo = zipfile.ZipInfo("secret.py")
        zinfo.flag_bits |= 0x1  # Flag 0x1 indicates encryption
        zf.writestr(zinfo, b"def secret_tool(): pass")
    buf.seek(0)
    zip_bytes = buf.getvalue()
    
    raised_value_error = False
    error_type = None
    error_msg = None
    try:
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        if isinstance(e, ValueError):
            raised_value_error = True

    print(f"\n[Probe 1.7] Encrypted Zip: raised_value_error={raised_value_error}, error_type={error_type}, error_msg={error_msg}")
    if not error_type:
        print(f"[Probe 1.7] Returned gracefully: manifest={manifest}, tools={tools}")
    return {
        "raised_value_error": raised_value_error,
        "error_type": error_type,
        "error_msg": error_msg,
        "manifest": manifest if not error_type else []
    }


# ============================================================================
# Category 2: AST Parser Adversarial Probes
# ============================================================================

def test_probe_2_1_malformed_python_syntax_errors():
    """Probe 2.1: Python file with unparseable syntax errors"""
    malformed_codes = [
        "def broken(: pass",
        "def ((((())): pass",
        "for while if else return",
        "''' unclosed triple quote",
        "import @@@@@",
    ]
    for i, code in enumerate(malformed_codes):
        zip_bytes = create_zip({
            f"malformed_{i}.py": code,
            "valid.py": "def valid_tool(): pass"
        })
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        assert "valid_tool" in [t["name"] for t in tools]
    print("\n[Probe 2.1] Malformed Python syntax handled gracefully without crashes.")


def test_probe_2_2_python_positional_only_and_keyword_only():
    """Probe 2.2: Python 3.8+ positional-only (/) and keyword-only (*) args"""
    code = '''
def transfer_complex(sender: str, /, amount: float, *, memo: str = "payment", fee: float = 1.5):
    """Executes a financial transfer with pos-only and kw-only arguments."""
    pass
'''
    zip_bytes = create_zip({"transfer.py": code})
    manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    tool = next((t for t in tools if t["name"] == "transfer_complex"), None)
    print(f"\n[Probe 2.2] transfer_complex tool: {tool}")
    if tool:
        params = tool["parameters"]
        print(f"[Probe 2.2] Extracted parameters: {list(params.keys())}")
        print(f"[Probe 2.2] 'sender' in params (positional-only): {'sender' in params}")
        print(f"[Probe 2.2] 'amount' in params: {'amount' in params}")
        print(f"[Probe 2.2] 'memo' in params (keyword-only): {'memo' in params}")
        print(f"[Probe 2.2] 'fee' in params (keyword-only): {'fee' in params}")
    return tool


def test_probe_2_3_python_decorator_stacking():
    """Probe 2.3: Nested/Stacked decorators with arguments and metadata"""
    code = '''
def custom_wrapper(tag: str):
    def dec(fn): return fn
    return dec

def role_required(role: str):
    def dec(fn): return fn
    return dec

@custom_wrapper("security")
@role_required("admin")
@tool_registry.action(name="execute_wire", rate_limit=5)
def wire_action(amount: float, dest_iban: str):
    """Executes bank wire under nested decorators."""
    pass
'''
    zip_bytes = create_zip({"wire.py": code})
    manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
    tool = next((t for t in tools if t["name"] == "wire_action"), None)
    print(f"\n[Probe 2.3] Stacked decorators extracted tool: {tool is not None}")
    if tool:
        print(f"[Probe 2.3] Parameters: {tool['parameters']}")
        print(f"[Probe 2.3] Effects: {tool['effects']}")
    return tool


def test_probe_2_4_ts_arrow_function_with_complex_generics():
    """Probe 2.4: Arrow function with complex generics:
       const fn = async <T, K extends object>(a: T, b: K): Promise<Record<string, any>> =>
    """
    ts_code = '''
/**
 * Generic sync tool
 * @param a Entity A
 * @param b Entity B
 */
export const syncEntities = async <T, K extends object>(a: T, b: K): Promise<Record<string, any>> => {
    return { a, b };
};
'''
    tools = parse_js_ts_code(ts_code, "sync.ts")
    print(f"\n[Probe 2.4] Complex Generic Arrow Function: discovered_tools={tools}")
    tool = next((t for t in tools if t["name"] == "syncEntities"), None)
    print(f"[Probe 2.4] Found 'syncEntities': {tool is not None}")
    if tool:
        print(f"[Probe 2.4] Parameters: {tool['parameters']}")
    return tool


def test_probe_2_5_js_ts_default_values_with_object_literals():
    """Probe 2.5: Default parameter values containing object literals with commas:
       function configureAgent(name: string, options: Record<string, any> = { timeout: 1000, retry: true }, count: number = 5)
    """
    ts_code = '''
/**
 * Configures the agent
 */
export function configureAgent(name: string, options: Record<string, any> = { timeout: 1000, retry: true }, count: number = 5): boolean {
    return true;
}
'''
    tools = parse_js_ts_code(ts_code, "config.ts")
    print(f"\n[Probe 2.5] Object Literal Default Values: discovered_tools={tools}")
    tool = next((t for t in tools if t["name"] == "configureAgent"), None)
    if tool:
        print(f"[Probe 2.5] Parameters: {tool['parameters']}")
    return tool


def test_probe_2_6_ts_class_methods_and_docstrings_with_markdown():
    """Probe 2.6: Class methods with visibility modifiers and JSDoc with markdown"""
    ts_code = '''
export class FinancialController {
    /**
     * ### Process Refund
     * Issues customer reimbursement according to SLA.
     * - Checks daily limits
     * - Dispatches refund transaction
     * 
     * ```typescript
     * controller.processRefund(45.0, "ACC-9981");
     * ```
     * 
     * @param amount The numeric refund amount in USD
     * @param targetAccount Customer destination account IBAN
     */
    public async processRefund(amount: number, targetAccount: string): Promise<{ success: boolean }> {
        return { success: true };
    }

    /**
     * Internal audit helper
     */
    private calculateChecksum(data: string): string {
        return "hash";
    }
}
'''
    tools = parse_js_ts_code(ts_code, "controller.ts")
    print(f"\n[Probe 2.6] Class methods: discovered {[t['name'] for t in tools]}")
    refund_tool = next((t for t in tools if t["name"] == "processRefund"), None)
    if refund_tool:
        print(f"[Probe 2.6] 'processRefund' description: {refund_tool['description']}")
        print(f"[Probe 2.6] 'processRefund' parameters: {refund_tool['parameters']}")
        print(f"[Probe 2.6] 'processRefund' is_financial: {refund_tool['is_financial']}")
        print(f"[Probe 2.6] 'processRefund' effects: {refund_tool['effects']}")
    return tools


if __name__ == "__main__":
    print("=== RUNNING EMPIRICAL PROBES ===")
    test_probe_1_1_zip_slip_unix_traversal()
    test_probe_1_2_zip_slip_windows_backslash()
    test_probe_1_3_zip_slip_absolute_path()
    test_probe_1_4_zip_bomb_file_count_exhaustion()
    test_probe_1_5_zip_bomb_single_file_exceeds_5mb()
    test_probe_1_6_zip_bomb_total_uncompressed_exceeds_50mb()
    test_probe_1_7_encrypted_password_protected_zip()
    test_probe_2_1_malformed_python_syntax_errors()
    test_probe_2_2_python_positional_only_and_keyword_only()
    test_probe_2_3_python_decorator_stacking()
    test_probe_2_4_ts_arrow_function_with_complex_generics()
    test_probe_2_5_js_ts_default_values_with_object_literals()
    test_probe_2_6_ts_class_methods_and_docstrings_with_markdown()
    print("=== EMPIRICAL PROBES COMPLETE ===")
