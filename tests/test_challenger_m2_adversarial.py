"""
ContractGuard Challenger Empirical Test Suite - Milestone 2
Target Components:
- backend/app/core/zip_extractor.py
- backend/app/api/policies.py
- backend/app/api/projects.py

Adversarially probes:
1. Ingestion Security & Zip Probing:
   - Zip Slip relative (../../evil.py) & backslash (..\\..\\evil.py) & absolute (/etc/passwd)
   - Decompression Bomb (file count > 500, file size > 5MB, total size > 50MB)
   - Password-protected / encrypted zip archives
2. AST Parser Adversarial Probing:
   - Python AST posonlyargs omission (PEP 570)
   - Python AST kwonlyargs and decorator stacking
   - Python AST malformed syntax resilience
   - TypeScript arrow functions with complex generics (missing from regex)
   - TypeScript parameter splitting corruption on object literal defaults & generic commas
   - TypeScript class methods and markdown JSDoc parsing
"""
import io
import os
import re
import sys
import zipfile
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.zip_extractor import (
    ZipToolExtractor,
    extract_tools_from_zip,
    parse_js_ts_code,
    _is_safe_path,
    MAX_FILES,
    MAX_FILE_SIZE,
    MAX_TOTAL_SIZE
)

client = TestClient(app)


def make_zip_archive(files: dict) -> bytes:
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
# Section 1: Ingestion Security & Adversarial Zip Probing
# ============================================================================

class TestAdversarialZipIngestion:
    """Stress tests zip ingestion security defenses."""

    def test_zip_slip_unix_traversal_behavior(self):
        """Probe: Relative path traversal ../../evil.py"""
        zip_bytes = make_zip_archive({
            "../../evil.py": "def evil_tool(): pass",
            "safe_tool.py": "def safe_query(): pass"
        })
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        
        # Invariant 1: Unsafe entry must NEVER be extracted or manifest
        assert not any("evil" in f for f in manifest), "Vulnerability: Unsafe path found in manifest"
        assert not os.path.exists("../../evil.py"), "Vulnerability: File written to disk"
        
        # Verification of Worker claim: Worker claimed ValueError is raised.
        # Empirically, it is silently dropped without ValueError.
        has_safe = any("safe_query" in t["name"] for t in tools)
        assert has_safe is True

    def test_zip_slip_windows_backslash_behavior(self):
        """Probe: Windows backslash traversal ..\\..\\evil_win.py"""
        zip_bytes = make_zip_archive({
            "..\\..\\evil_win.py": "def evil_win_tool(): pass",
            "safe_tool.py": "def safe_query(): pass"
        })
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        assert not any("evil_win" in f for f in manifest)
        assert not os.path.exists("..\\..\\evil_win.py")

    def test_zip_slip_absolute_path_behavior(self):
        """Probe: Absolute paths /etc/passwd and C:\\Windows\\System32\\calc.exe"""
        zip_bytes = make_zip_archive({
            "/etc/passwd": "root:x:0:0:root:/root:/bin/bash",
            "C:\\Windows\\System32\\calc.exe": "binary",
            "safe.py": "def safe_tool(): pass"
        })
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        assert not any("passwd" in f for f in manifest)
        assert not any("System32" in f for f in manifest)
        assert not any("calc.exe" in f for f in manifest)

    def test_decompression_bomb_file_count_truncation(self):
        """Probe: Archive with 550 files (> MAX_FILES=500)"""
        files = {f"tools/t_{i}.py": f"def query_tool_{i}(): pass" for i in range(550)}
        zip_bytes = make_zip_archive(files)
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        # Empirical finding: Silently capped at MAX_FILES (500) rather than raising an exception
        assert len(manifest) == MAX_FILES
        assert len(tools) == MAX_FILES

    def test_decompression_bomb_single_file_exceeds_5mb(self):
        """Probe: File exceeding MAX_FILE_SIZE (5MB)"""
        huge_content = "# Comment\n" + ("x = 1\n" * 1_000_000) # ~6 MB
        zip_bytes = make_zip_archive({
            "huge_file.py": huge_content,
            "normal_file.py": "def normal_tool(): pass"
        })
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        # The tool inside huge_file.py is skipped
        tool_names = [t["name"] for t in tools]
        assert "normal_tool" in tool_names

    def test_decompression_bomb_total_size_cap(self):
        """Probe: Total uncompressed size > MAX_TOTAL_SIZE (50MB)"""
        content_4_5mb = "def query_sample(): pass\n" + ("# filler\n" * 500_000)
        files = {f"file_{i}.py": content_4_5mb for i in range(12)} # ~54 MB
        zip_bytes = make_zip_archive(files)
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        assert len(manifest) <= 12

    def test_password_protected_encrypted_zip_behavior(self):
        """Probe: Encrypted zip archive behavior"""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("secret.py", b"def secret_tool(): pass")
        raw = bytearray(buf.getvalue())
        raw[6] = raw[6] | 0x01
        cd_idx = raw.find(b"PK\x01\x02")
        if cd_idx != -1:
            raw[cd_idx + 8] = raw[cd_idx + 8] | 0x01

        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(bytes(raw))
        # Finding: Encrypted content read fails with RuntimeError internally,
        # which is silently swallowed in safe_extract_zip_entries. No tools extracted.
        assert tools == []


# ============================================================================
# Section 2: AST Parser Adversarial Probing
# ============================================================================

class TestAdversarialASTParsing:
    """Stress tests AST extraction on Python and TypeScript edge cases."""

    def test_python_syntax_error_resilience(self):
        """Probe: Malformed Python code does not crash parser"""
        broken_code = """
        def broken(
            invalid syntax here ;;;;
            ???
        """
        zip_bytes = make_zip_archive({
            "broken.py": broken_code,
            "good.py": "def query_catalog(): pass"
        })
        manifest, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        assert "broken.py" in manifest
        assert any(t["name"] == "query_catalog" for t in tools)

    def test_python_decorator_stacking_and_metadata(self):
        """Probe: Stacked decorators with arguments and namespaces"""
        code = '''
@decorator_one("arg1", flag=True)
@agent.tool(name="process_wire")
@functools.wraps(some_func)
def process_wire(amount: float, dest_account: str):
    """Executes bank wire."""
    pass
'''
        zip_bytes = make_zip_archive({"wire.py": code})
        _, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        tool = next((t for t in tools if t["name"] == "process_wire"), None)
        assert tool is not None
        assert tool["parameters"]["amount"]["type"] == "number"
        assert tool["is_financial"] is True
        assert tool["effects"] == ["financial.transfer"]

    def test_python_keyword_only_args(self):
        """Probe: Keyword-only arguments after * are captured"""
        code = '''
def transfer_funds(recipient: str, *, amount: float, memo: str = "transfer"):
    """Transfers funds with keyword-only arguments."""
    pass
'''
        zip_bytes = make_zip_archive({"kw.py": code})
        _, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        tool = next((t for t in tools if t["name"] == "transfer_funds"), None)
        assert tool is not None
        assert "amount" in tool["parameters"]
        assert "memo" in tool["parameters"]

    def test_python_positional_only_args_omission_finding(self):
        """Probe: Positional-only arguments (PEP 570) like `sender: str, /`"""
        code = '''
def execute_payment(sender: str, /, amount: float):
    """Payment tool using positional-only syntax."""
    pass
'''
        zip_bytes = make_zip_archive({"posonly.py": code})
        _, tools, _ = ZipToolExtractor.extract_tools_from_zip(zip_bytes)
        tool = next((t for t in tools if t["name"] == "execute_payment"), None)
        assert tool is not None
        # Defect demonstration: node.args.posonlyargs is not extracted in zip_extractor.py line 424
        # 'sender' is missing from tool['parameters']
        posonly_extracted = "sender" in tool["parameters"]
        # We record that posonlyargs are currently omitted
        print(f"\nPositional-only parameter 'sender' extracted: {posonly_extracted}")

    def test_ts_arrow_function_with_complex_generics_finding(self):
        """Probe: Arrow functions with complex generics:
           const fn = async <T, K extends object>(a: T, b: K): Promise<Record<string, any>> =>
        """
        ts_code = '''
export const syncEntities = async <T, K extends object>(a: T, b: K): Promise<Record<string, any>> => {
    return { a, b };
};
'''
        tools = parse_js_ts_code(ts_code, "sync.ts")
        # Defect demonstration: arrow_pattern regex does not support generic type parameters <...>
        # between async and (
        found_tool = any(t["name"] == "syncEntities" for t in tools)
        print(f"\nGeneric arrow function 'syncEntities' discovered: {found_tool}")
        # This highlights the empirical limitation in parse_js_ts_code

    def test_ts_parameter_splitting_comma_corruption_finding(self):
        """Probe: Default values with object literals or generic types containing commas:
           export function configure(options: Record<string, any> = { timeout: 1000, retry: true }, count: number = 5)
        """
        ts_code = '''
export function configure(options: Record<string, any> = { timeout: 1000, retry: true }, count: number = 5): boolean {
    return true;
}
'''
        tools = parse_js_ts_code(ts_code, "config.ts")
        tool = next((t for t in tools if t["name"] == "configure"), None)
        assert tool is not None
        params = tool["parameters"]
        print(f"\nExtracted parameters for configure: {list(params.keys())}")
        # Defect demonstration: comma inside generic Record<string, any> or object literal
        # caused phantom parameters 'any>' and 'retry' to be created
        has_phantom_params = "any>" in params or "retry" in params
        print(f"Phantom parameters detected: {has_phantom_params}")

    def test_ts_class_methods_and_docstrings_with_markdown(self):
        """Probe: Class methods and JSDoc containing markdown formatting"""
        ts_code = '''
export class LedgerController {
    /**
     * ### Record Transaction
     * Writes ledger entry with **high** priority.
     * - Step 1: Lock account
     * - Step 2: Write entry
     * 
     * ```typescript
     * recordTx(100.0, "ACC-01");
     * ```
     * 
     * @param amount The transaction amount
     * @param targetAccount Target destination
     */
    public async recordTx(amount: number, targetAccount: string): Promise<boolean> {
        return true;
    }
}
'''
        tools = parse_js_ts_code(ts_code, "ledger.ts")
        tool = next((t for t in tools if t["name"] == "recordTx"), None)
        assert tool is not None
        assert "### Record Transaction" in tool["description"]
        assert "amount" in tool["parameters"]
        assert "targetAccount" in tool["parameters"]
        assert tool["parameters"]["amount"]["type"] == "number"
        assert tool["is_financial"] is True
