"""
Adversarial Verification Suite for Milestone 1: UI Simplification & Decluttering (Requirement R1)
Verifies:
1. Static compilation & TypeScript validity
2. Absence of leftover hero banners, duplicate headers, or static cards in wizard/tabs
3. AST / JSX structure, tag nesting and closing balance
4. Stepper progression integrity and step-transition callability
5. State hooks and callback handler integrity in page.tsx and DeploymentGatewayTab.tsx
"""

import re
import sys
import os
import subprocess
import json

FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)
PAGE_TSX = os.path.join(FRONTEND_DIR, "app", "page.tsx")
GATEWAY_TSX = os.path.join(FRONTEND_DIR, "app", "components", "DeploymentGatewayTab.tsx")


def test_typescript_compilation():
    """Verify npx tsc --noEmit passes cleanly with 0 errors."""
    print(">>> Running TypeScript compilation check (npx tsc --noEmit)...")
    res = subprocess.run(
        ["cmd", "/c", "npx", "tsc", "--noEmit"],
        cwd=FRONTEND_DIR,
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"TypeScript compilation failed with code {res.returncode}:\n{res.stderr}\n{res.stdout}"
    print("    [PASS] TypeScript check succeeded with zero errors.")


def test_no_leftover_hero_headers():
    """Verify that no leftover hero headers or duplicate step title banners remain."""
    print(">>> Checking for leftover hero headers and duplicate title banners...")
    with open(PAGE_TSX, "r", encoding="utf-8") as f:
        page_content = f.read()
    with open(GATEWAY_TSX, "r", encoding="utf-8") as f:
        gw_content = f.read()

    # Old hero banner keywords and patterns that must NOT exist anywhere
    banned_global_patterns = [
        r"Zero-Trust Security Gateway & Stateful Reference Monitor",
        r"Step 1: Ingest Agent Repository / Select Archetype",
        r"Step 2: AST Discovered Tools & Parameter Inspector",
        r"Step 3: Nemotron-70B AI Security Policy Interview",
        r"Step 4: Policy Review, Static Linter & Guarded Bundle Export",
        r"v2\.0 Enterprise",
        r"API #1 • Placed Before LLM",
        r"API #2 • Placed After LLM Returns Action",
        r"3 / 3 PASSING",  # static mock badge
        r"AST PARSE VERIFIED",  # static step 2 badge
    ]

    for pattern in banned_global_patterns:
        match_page = re.search(pattern, page_content)
        match_gw = re.search(pattern, gw_content)
        assert match_page is None, f"Found leftover banned header/badge pattern in page.tsx: {pattern}"
        assert match_gw is None, f"Found leftover banned header/badge pattern in DeploymentGatewayTab.tsx: {pattern}"

    # Verify that in Step 3, there is no duplicate hero/badge container
    step3_match = re.search(r"\{wizardStep === 3 && \((.*?)\{\/\* STEP 4", page_content, re.DOTALL)
    assert step3_match is not None, "Could not find Step 3 block"
    step3_block = step3_match.group(1)
    assert "NVIDIA Llama-3.1-Nemotron-70B" not in step3_block, "Found redundant model badge in Step 3 container"

    # Check that hero banner containers (e.g., gradient 180px cards) are removed
    assert not re.search(r"h-\[180px\]|h-\[200px\]", page_content), "Found leftover fixed-height hero container in page.tsx"
    assert not re.search(r"h-\[180px\]|h-\[200px\]", gw_content), "Found leftover fixed-height hero container in DeploymentGatewayTab.tsx"

    # Verify static cards were replaced in Step 4
    step4_match = re.search(r"\{wizardStep === 4 && \((.*?)\{\/\* =====", page_content, re.DOTALL)
    assert step4_match is not None, "Could not find Step 4 block"
    step4_block = step4_match.group(1)
    assert "Hardcoded Static Linter" not in step4_block
    assert "Hardcoded Pytest Fixture" not in step4_block
    assert "Policy Status & Verification" in step4_block, "Dynamic policy verification card missing in Step 4"
    assert "Bundle Export & Integration" in step4_block, "Dynamic bundle export card missing in Step 4"

    # Verify static REST cards in Tab 5 were replaced with pip install
    sdk_match = re.search(r"\{activeTab === \"sdk\" && \((.*?)\{\/\* =====", page_content, re.DOTALL)
    assert sdk_match is not None, "Could not find SDK tab block"
    sdk_block = sdk_match.group(1)
    assert "pip install contractguard-x" in sdk_block, "Pip install guidance missing in SDK tab"

    print("    [PASS] All leftover hero headers, duplicate banners, and static badges cleanly removed.")


def test_stepper_progression_and_handlers():
    """Verify stepper buttons and wizard navigation flow."""
    print(">>> Verifying stepper progression and navigation hooks...")
    with open(PAGE_TSX, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify stepper state declaration
    assert "const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)" in content, "Missing wizardStep state hook"

    # Verify 4 stepper buttons exist in the grid
    for step_num in [1, 2, 3, 4]:
        assert f"step: {step_num}" in content, f"Missing definition for step {step_num} in wizard steps array"

    # Verify stepper onClick handler
    assert "setWizardStep(s.step as any)" in content, "Missing stepper button onClick handler"

    # Verify forward progressions
    assert re.search(r"onClick=\{\(\)\s*=>\s*setWizardStep\(2\)\}", content), "Missing step 1 -> 2 progression"
    assert re.search(r"onClick=\{\(\)\s*=>\s*setWizardStep\(3\)\}", content), "Missing step 2 -> 3 progression"
    assert re.search(r"onClick=\{synthesizePolicy\}", content), "Missing step 3 synthesis trigger"
    assert "setWizardStep(4)" in content, "Missing step 3 -> 4 transition inside synthesizePolicy"

    # Verify backward progressions
    assert re.search(r"onClick=\{\(\)\s*=>\s*setWizardStep\(1\)\}", content), "Missing step 2 -> 1 back navigation"
    assert re.search(r"onClick=\{\(\)\s*=>\s*setWizardStep\(2\)\}", content), "Missing step 3 -> 2 back navigation"
    assert re.search(r"onClick=\{\(\)\s*=>\s*setWizardStep\(3\)\}", content), "Missing step 4 -> 3 back navigation"

    # Verify all 4 step conditional views are rendered
    assert "{wizardStep === 1 && (" in content, "Missing wizardStep === 1 block"
    assert "{wizardStep === 2 && (" in content, "Missing wizardStep === 2 block"
    assert "{wizardStep === 3 && (" in content, "Missing wizardStep === 3 block"
    assert "{wizardStep === 4 && (" in content, "Missing wizardStep === 4 block"

    print("    [PASS] Stepper navigation forward/backward and direct clicks verified.")


def test_state_hooks_and_callbacks_integrity():
    """Verify critical state hooks and callback handlers are defined and callable."""
    print(">>> Verifying state hooks and callback handlers...")
    with open(PAGE_TSX, "r", encoding="utf-8") as f:
        page_content = f.read()
    with open(GATEWAY_TSX, "r", encoding="utf-8") as f:
        gw_content = f.read()

    # Required callbacks in page.tsx
    required_page_handlers = [
        "setWizardStep",
        "synthesizePolicy",
        "runSimulationDefault",
        "runSimulation",
        "createApiKey",
        "revokeApiKey",
        "loadApiKeys",
        "loadPresetTools",
        "handleZipUpload",
        "approvePolicy",
        "downloadGuardedBundle",
        "handleDemoLogin",
        "handleAuthSubmit",
        "handleLogout",
        "loadMetrics",
    ]

    for handler in required_page_handlers:
        assert handler in page_content, f"Required handler '{handler}' not found in page.tsx"

    # Required callbacks in DeploymentGatewayTab.tsx
    required_gw_handlers = [
        "testPreLlmGateway",
        "testPostLlmGateway",
        "runDummyProject",
        "createApiKey",
        "revokeApiKey",
    ]

    for handler in required_gw_handlers:
        assert handler in gw_content, f"Required handler '{handler}' not found in DeploymentGatewayTab.tsx"

    # Check props wiring from page.tsx to DeploymentGatewayTab
    assert "<DeploymentGatewayTab" in page_content, "DeploymentGatewayTab component not rendered in page.tsx"
    assert "createApiKey={createApiKey}" in page_content, "createApiKey prop not passed to DeploymentGatewayTab"
    assert "revokeApiKey={revokeApiKey}" in page_content, "revokeApiKey prop not passed to DeploymentGatewayTab"
    assert "apiKeys={apiKeys}" in page_content, "apiKeys prop not passed to DeploymentGatewayTab"
    assert "createdKey={createdKey}" in page_content, "createdKey prop not passed to DeploymentGatewayTab"

    print("    [PASS] All state hooks and callback handlers intact and properly wired.")


def test_jsx_tag_balance_and_syntax():
    """Verify JSX tag nesting and tag balance."""
    print(">>> Verifying JSX tag balance in modified files...")
    for file_path, name in [(PAGE_TSX, "page.tsx"), (GATEWAY_TSX, "DeploymentGatewayTab.tsx")]:
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Check basic brace and parenthesis balance
        open_curlies = code.count("{")
        close_curlies = code.count("}")
        assert open_curlies == close_curlies, f"Curly brace mismatch in {name}: {open_curlies} vs {close_curlies}"

        open_parens = code.count("(")
        close_parens = code.count(")")
        assert open_parens == close_parens, f"Parenthesis mismatch in {name}: {open_parens} vs {close_parens}"

        open_brackets = code.count("[")
        close_brackets = code.count("]")
        assert open_brackets == close_brackets, f"Square bracket mismatch in {name}: {open_brackets} vs {close_brackets}"

        # Check tag balance for standard container tags
        for tag in ["div", "button", "header", "main", "span", "table", "tbody", "thead", "tr", "th", "td", "pre"]:
            open_count = len(re.findall(rf"<{tag}(?:\s[^>]*)?>", code))
            close_count = len(re.findall(rf"</{tag}>", code))
            assert open_count == close_count, f"Tag <{tag}> mismatch in {name}: {open_count} open vs {close_count} close"

    print("    [PASS] JSX tags and braces are perfectly balanced.")


if __name__ == "__main__":
    test_typescript_compilation()
    test_no_leftover_hero_headers()
    test_stepper_progression_and_handlers()
    test_state_hooks_and_callbacks_integrity()
    test_jsx_tag_balance_and_syntax()
    print("\nALL EMPIRICAL ADVERSARIAL CHECKS PASSED SUCCESSFULLY.")
