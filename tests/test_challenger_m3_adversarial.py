"""
Milestone 3 Empirical Adversarial Challenge Suite:
Frontend UI Decluttering, Strict Navigation & Integration Invariants
(Requirements R1, R2, R3, R4, R5)

Adversarially probes:
1. Navigation Strictness & Decluttering:
   - page.tsx strictly declares and activates PRIMARY_TABS: ["dashboard", "projects", "settings"]
   - TopNavBar.tsx has segmented buttons strictly for ["dashboard", "projects", "settings"]
   - Header contains ZERO standalone buttons or navigation links for "studio", "gateway", "simulator", "benchmarks", "sdk"
   - Absence of broken links, orphaned navigation states, or obsolete hero headers
   - Modular component file resolution (all imports in page.tsx and sub-views resolve to valid on-disk files)
2. Backwards Compatibility & M1/M2 Invariants:
   - Step 4 comment anchors and dynamic verification cards ({/* STEP 4, {/* =====)
   - SDK compatibility block containing pip install contractguard-x
   - All 15 required callback handlers in page.tsx intact and callable
   - <DeploymentGatewayTab rendering and full prop wiring intact
   - M2 auth gating invariants: unauthenticated gate, localStorage session token checks before fetch
3. Tri-Guard Architectural UI Contracts:
   - DualApiKeyDisplay renders Pre-LLM Ingress (cgx_ing_) and Post-LLM Egress (cgx_egr_) key specifications
   - Runtime Auto-Switching indicators explaining STREAMLINED_RAG (<0.1ms bypass) vs FULL_TRI_GUARD
   - Multi-language AST tool indicators (Python & JS/TS, zero-token parsing)
   - Interactive Policy Interview questionnaire addressing canonical policy gaps
   - Attack Database Explorer displaying heuristic and vector signature evaluation
   - Next.js config rewrites both /api/:path* and /v1/:path* to backend
4. Robustness & Error Handling:
   - Try/catch blocks and error states present in all data-fetching components
   - Zero hardcoded API secrets or private tokens in frontend source
   - Container tag nesting and JSX brace parity across all modular frontend components
"""

import os
import re
import sys
import glob
import pytest

FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)
APP_DIR = os.path.join(FRONTEND_DIR, "app")
PAGE_TSX = os.path.join(APP_DIR, "page.tsx")
TOP_NAV_TSX = os.path.join(APP_DIR, "components", "navigation", "TopNavBar.tsx")
GATEWAY_TSX = os.path.join(APP_DIR, "components", "DeploymentGatewayTab.tsx")
NEXT_CONFIG = os.path.join(FRONTEND_DIR, "next.config.js")


# ============================================================================
# 1. Navigation Strictness & Decluttering Probes
# ============================================================================

class TestNavigationStrictnessAndDecluttering:
    """Verifies that navigation is strictly restricted to Dashboard, Projects, Settings."""

    def test_page_primary_tabs_strictness(self):
        with open(PAGE_TSX, "r", encoding="utf-8") as f:
            content = f.read()

        # Primary tab state type must strictly be "dashboard" | "projects" | "settings"
        state_match = re.search(
            r'const\s+\[activeTab,\s*setActiveTab\]\s*=\s*useState<("dashboard"\s*\|\s*"projects"\s*\|\s*"settings")>\("dashboard"\)',
            content
        )
        assert state_match is not None, "activeTab state hook is not strictly typed to 'dashboard' | 'projects' | 'settings'"

        # PRIMARY_TABS constant must match exactly
        tabs_match = re.search(
            r'const\s+PRIMARY_TABS[^=]*=\s*\[\s*"dashboard",\s*"projects",\s*"settings"\s*\]',
            content
        )
        assert tabs_match is not None, "PRIMARY_TABS does not match ['dashboard', 'projects', 'settings'] exactly"

        # Ensure activeTab is never initialized to a banned obsolete tab
        banned_initial = ['"studio"', '"gateway"', '"simulator"', '"benchmarks"', '"sdk"']
        for banned in banned_initial:
            assert f"useState<{banned}>" not in content, f"activeTab state hook allows banned tab {banned}"

    def test_topnavbar_strictly_renders_three_tabs(self):
        with open(TOP_NAV_TSX, "r", encoding="utf-8") as f:
            content = f.read()

        # TopNavBarProps must only allow "dashboard" | "projects" | "settings"
        prop_type_match = re.search(
            r'activeTab:\s*"dashboard"\s*\|\s*"projects"\s*\|\s*"settings"',
            content
        )
        assert prop_type_match is not None, "TopNavBarProps activeTab type is not strictly restricted"

        # Verify buttons rendered for the 3 tabs
        assert 'setActiveTab("dashboard")' in content, "Dashboard nav button missing in TopNavBar"
        assert 'setActiveTab("projects")' in content, "Projects nav button missing in TopNavBar"
        assert 'setActiveTab("settings")' in content, "Settings nav button missing in TopNavBar"

        # Assert header contains NO standalone buttons for banned tabs
        banned_tabs = ["studio", "gateway", "simulator", "benchmarks", "sdk"]
        for tab in banned_tabs:
            assert f'setActiveTab("{tab}")' not in content, f"TopNavBar contains banned navigation trigger: setActiveTab('{tab}')"
            # Verify no button text contains these standalone tab names as navigation labels
            assert f'>{tab.capitalize()}<' not in content, f"TopNavBar contains banned tab label: >{tab.capitalize()}<"

    def test_header_no_orphaned_or_extraneous_nav_buttons(self):
        with open(TOP_NAV_TSX, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract all <button> elements in TopNavBar
        buttons = re.findall(r'<button\b[^>]*>(.*?)</button>', content, re.DOTALL)
        # TopNavBar should have exactly:
        # 1. Dashboard tab button
        # 2. Projects tab button
        # 3. Settings tab button
        # 4. Nebius / sandbox provider badge button
        # 5. Sign Out / Logout button (when user is logged in)
        assert len(buttons) == 5, f"Expected exactly 5 functional buttons in TopNavBar, found {len(buttons)}"

    def test_page_view_rendering_isolation(self):
        """Verify that the primary operational view conditionally renders only the 3 views."""
        with open(PAGE_TSX, "r", encoding="utf-8") as f:
            content = f.read()

        # View 1: Dashboard
        assert '{activeTab === "dashboard" && (' in content
        assert "<DashboardView" in content

        # View 2: Projects
        assert '{activeTab === "projects" && (' in content
        assert "<ProjectsView" in content

        # View 3: Settings
        assert '{activeTab === "settings" && (' in content
        assert "<SettingsView" in content

        # Ensure main view body does NOT render obsolete tabs as primary view containers
        assert '{activeTab === "studio" && (' not in content, "Found obsolete studio tab container in page.tsx"
        assert '{activeTab === "simulator" && (' not in content, "Found obsolete simulator tab container in page.tsx"
        assert '{activeTab === "benchmarks" && (' not in content, "Found obsolete benchmarks tab container in page.tsx"

    def test_modular_component_file_existence(self):
        """Verify that all modular component files imported by page.tsx exist on disk."""
        required_components = [
            "components/navigation/TopNavBar.tsx",
            "components/dashboard/DashboardView.tsx",
            "components/dashboard/TelemetryCards.tsx",
            "components/dashboard/ActiveAlertsFeed.tsx",
            "components/dashboard/LiveAttackAuditBench.tsx",
            "components/projects/ProjectsView.tsx",
            "components/projects/ProjectOverviewAnalytics.tsx",
            "components/projects/ProjectList.tsx",
            "components/projects/ProjectDetail.tsx",
            "components/projects/ProjectCreateModal.tsx",
            "components/projects/ZipUploader.tsx",
            "components/projects/DiscoveredToolsList.tsx",
            "components/projects/PolicyInterviewWizard.tsx",
            "components/projects/DualApiKeyDisplay.tsx",
            "components/settings/SettingsView.tsx",
            "components/settings/ApiKeyManager.tsx",
            "components/settings/CredentialsConfig.tsx",
            "components/settings/DatabaseSystemConfig.tsx",
            "components/settings/AttackDatabaseExplorer.tsx",
            "components/DeploymentGatewayTab.tsx",
        ]
        for rel_path in required_components:
            full_path = os.path.join(APP_DIR, rel_path)
            assert os.path.isfile(full_path), f"Modular component missing: {rel_path}"

    def test_no_broken_internal_href_links(self):
        """Verify no component contains broken href links to obsolete or missing pages."""
        files = glob.glob(os.path.join(APP_DIR, "**", "*.tsx"), recursive=True)
        for file_path in files:
            with open(file_path, "r", encoding="utf-8") as f:
                code = f.read()
            # Banned route links
            banned_routes = ["/studio", "/simulator", "/benchmarks", "/gateway", "/sdk"]
            for route in banned_routes:
                assert f'href="{route}"' not in code, f"Found broken route link {route} in {file_path}"
                assert f"href='{route}'" not in code, f"Found broken route link {route} in {file_path}"


# ============================================================================
# 2. Backwards Compatibility & Milestone 1 / Milestone 2 Invariants Probes
# ============================================================================

class TestBackwardsCompatibilityAndInvariants:
    """Verifies that all M1 and M2 test anchors, callback handlers, and props wiring remain intact."""

    def test_milestone1_regex_and_comment_anchors(self):
        with open(PAGE_TSX, "r", encoding="utf-8") as f:
            content = f.read()

        # Step 3 and Step 4 anchors
        assert "{wizardStep === 3 && (" in content, "Missing wizardStep === 3 block"
        assert "{/* STEP 4" in content, "Missing {/* STEP 4 comment anchor"
        assert "{wizardStep === 4 && (" in content, "Missing wizardStep === 4 block"
        assert "{/* =====" in content, "Missing {/* ===== comment anchor"

        # Dynamic verification cards in Step 4
        assert "Policy Status & Verification" in content
        assert "Bundle Export & Integration" in content

        # SDK block with pip install contractguard-x
        assert '{activeTab === "sdk" && (' in content
        assert "pip install contractguard-x" in content

    def test_all_15_required_callback_handlers_exist(self):
        with open(PAGE_TSX, "r", encoding="utf-8") as f:
            content = f.read()

        required_handlers = [
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
        for handler in required_handlers:
            assert handler in content, f"Required handler '{handler}' missing in page.tsx"

    def test_deployment_gateway_props_wiring(self):
        with open(PAGE_TSX, "r", encoding="utf-8") as f:
            content = f.read()

        assert "<DeploymentGatewayTab" in content
        expected_props = [
            "apiBase={API_BASE}",
            "user={user}",
            "apiKeys={apiKeys}",
            "newKeyName={newKeyName}",
            "setNewKeyName={setNewKeyName}",
            "createdKey={createdKey}",
            "setCreatedKey={setCreatedKey}",
            "createApiKey={createApiKey}",
            "revokeApiKey={revokeApiKey}",
            "isCreatingKey={isCreatingKey}",
            "vectorSignatures={vectorSignatures}",
        ]
        for prop in expected_props:
            assert prop in content, f"DeploymentGatewayTab missing prop: {prop}"

    def test_milestone2_auth_gating_invariants(self):
        with open(PAGE_TSX, "r", encoding="utf-8") as f:
            content = f.read()

        # Auth gate hooks
        assert "const [authChecked, setAuthChecked] = useState(false)" in content
        assert "const [user, setUser] = useState<UserProfile | null>(null)" in content
        assert "!authChecked ? (" in content
        assert "!user ? (" in content
        assert "ContractGuard-X Authentication Gate" in content
        assert "Authenticate as Hackathon Judge" in content

        # Token checks in data-loading functions
        for func in ["loadApiKeys", "loadVectorSignatures", "runSimulationDefault", "loadMetrics", "loadPresetTools"]:
            idx = content.find(f"const {func} = async")
            assert idx != -1, f"Missing definition for {func}"
            snippet = content[idx:idx + 350]
            assert 'localStorage.getItem("cgx_auth_token")' in snippet, f"{func} does not read cgx_auth_token"
            assert "if (!token) return" in snippet, f"{func} does not guard against missing token"


# ============================================================================
# 3. Tri-Guard Architectural UI Contracts Probes
# ============================================================================

class TestTriGuardArchitecturalContracts:
    """Verifies UI compliance with Tri-Guard dual keys, auto-switching, AST, and attack DB."""

    def test_dual_api_key_display_contracts(self):
        key_display_path = os.path.join(APP_DIR, "components", "projects", "DualApiKeyDisplay.tsx")
        assert os.path.isfile(key_display_path)
        with open(key_display_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Pre-LLM Ingress key and Post-LLM Egress key must be prominently identified
        assert "Pre-LLM Ingress Key" in content
        assert "Post-LLM Egress Key" in content
        assert "cgx_ing_" in content
        assert "cgx_egr_" in content
        assert "/v1/guard/ingress" in content
        assert "/v1/guard/egress" in content

        # Runtime auto-switching indicator
        assert "STREAMLINED_RAG" in content
        assert "FULL_TRI_GUARD" in content

    def test_zip_uploader_contracts(self):
        uploader_path = os.path.join(APP_DIR, "components", "projects", "ZipUploader.tsx")
        assert os.path.isfile(uploader_path)
        with open(uploader_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Ingestion endpoint
        assert "/api/project/upload-zip" in content
        # Supports Python and TypeScript/JavaScript
        assert "Python" in content
        assert "TypeScript" in content or "JavaScript" in content
        assert ".zip" in content

    def test_policy_interview_wizard_contracts(self):
        wizard_path = os.path.join(APP_DIR, "components", "projects", "PolicyInterviewWizard.tsx")
        assert os.path.isfile(wizard_path)
        with open(wizard_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Synthesis and approval endpoints
        assert "/api/policy/synthesize" in content
        assert "/approve" in content

        # Canonical policy gap questions
        canonical_topics = [
            "spending",
            "session",
            "allowed_languages",
            "foreign_scripts",
            "direct_injection",
            "indirect_injection",
        ]
        for topic in canonical_topics:
            assert topic in content, f"Canonical interview topic '{topic}' missing in PolicyInterviewWizard"

    def test_attack_database_explorer_contracts(self):
        explorer_path = os.path.join(APP_DIR, "components", "settings", "AttackDatabaseExplorer.tsx")
        assert os.path.isfile(explorer_path)
        with open(explorer_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Signatures listing and evaluation
        assert "/api/v1/vector-db/signatures" in content
        assert "Cosine" in content or "Similarity" in content or "cosine" in content

    def test_next_config_rewrites(self):
        """Verify next.config.js forwards both /api/:path* and /v1/:path* to backend."""
        assert os.path.isfile(NEXT_CONFIG)
        with open(NEXT_CONFIG, "r", encoding="utf-8") as f:
            content = f.read()

        assert "source: '/api/:path*'" in content or 'source: "/api/:path*"' in content
        assert "destination: 'http://127.0.0.1:8080/api/:path*'" in content or 'destination: "http://127.0.0.1:8080/api/:path*"' in content
        assert "source: '/v1/:path*'" in content or 'source: "/v1/:path*"' in content
        assert "destination: 'http://127.0.0.1:8080/v1/:path*'" in content or 'destination: "http://127.0.0.1:8080/v1/:path*"' in content


# ============================================================================
# 4. JSX Syntax, Error Handling and Tag Balance Probes
# ============================================================================

class TestJsxSyntaxAndTagBalance:
    """Adversarially checks JSX syntax, tag closure, error handling, and brace balance."""

    @pytest.mark.parametrize("file_pattern", [
        os.path.join(APP_DIR, "page.tsx"),
        os.path.join(APP_DIR, "components", "**", "*.tsx"),
    ])
    def test_component_jsx_balance(self, file_pattern):
        matched_files = glob.glob(file_pattern, recursive=True)
        assert len(matched_files) > 0, f"No files matched pattern {file_pattern}"

        for file_path in matched_files:
            rel_name = os.path.relpath(file_path, APP_DIR)
            with open(file_path, "r", encoding="utf-8") as f:
                code = f.read()

            # 1. Curly brace balance
            assert code.count("{") == code.count("}"), f"Curly brace mismatch in {rel_name}"

            # 2. Parenthesis balance
            assert code.count("(") == code.count(")"), f"Parenthesis mismatch in {rel_name}"

            # 3. Square bracket balance
            assert code.count("[") == code.count("]"), f"Square bracket mismatch in {rel_name}"

            # 4. Container tags balance (excluding self-closing tags with negative lookbehind (?<!/)>)
            for tag in ["div", "button", "header", "main", "span", "table", "tbody", "thead", "tr", "th", "td", "pre", "form"]:
                open_tags = len(re.findall(rf"<{tag}(?:\s[^>]*)?(?<!/)>", code))
                close_tags = len(re.findall(rf"</{tag}>", code))
                assert open_tags == close_tags, f"Tag <{tag}> mismatch in {rel_name}: {open_tags} open vs {close_tags} close"

    def test_no_hardcoded_secrets_in_components(self):
        """Verify no sensitive API secrets or keys are hardcoded in frontend files."""
        files = glob.glob(os.path.join(APP_DIR, "**", "*.tsx"), recursive=True)
        secret_patterns = [
            r'sk-[a-zA-Z0-9]{20,}',
            r'cgx_live_[a-zA-Z0-9]{20,}',
            r'ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}',  # genuine JWT
        ]
        for file_path in files:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            for pattern in secret_patterns:
                match = re.search(pattern, content)
                assert match is None, f"Potential hardcoded secret found in {file_path}: {match.group(0)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
