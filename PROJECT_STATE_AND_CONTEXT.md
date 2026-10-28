# ContractGuard-X — Persistent Project State, Architecture & Context Checkpoint

**Last Saved:** 2026-10-28  
**Conversation ID:** `a8a6092a-4ba3-4c9e-9782-c6f8f3d0d591`  
**Target Track:** Nebius × NVIDIA Global AI Hackathon 2026 (Coding & Agentic Engineering Track) + Companion Scientific Conference Submission  
**Project Root:** `c:\projects\journal paper prompt injection\ContractGuard_Platform`

---

## 1. Quick-Start Commands (How to Run & Test Anytime)

### Start Backend Server (Port `8080`)
```powershell
Set-Location "c:\projects\journal paper prompt injection\ContractGuard_Platform\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080
```
- **Health / Status:** `http://127.0.0.1:8080/health` and `http://127.0.0.1:8080/api/status`
- **Database:** Connects to PostgreSQL (`localhost:5432/contractguard`) when running, or automatically falls back to local SQLite (`contractguard_local.db`).

### Start Frontend Server (Port `3001`)
```powershell
Set-Location "c:\projects\journal paper prompt injection\ContractGuard_Platform\frontend"
# For production build (fast, stable):
npx next start -p 3001
# Or for development hot-reload (do not run `npm run build` concurrently while `next dev` is running):
npm run dev
```
- **Web UI URL:** `http://localhost:3001`
- **Authentication:** Click **1-Click Judge Login** on the landing gate (or sign up / log in with email & password) to unlock all 5 operational tabs.

### Run Verification & Test Suites
```powershell
Set-Location "c:\projects\journal paper prompt injection\ContractGuard_Platform"

# 1. Full Automated Pytest Suite (366/366 tests)
python -m pytest -v

# 2. Scientific Conference Oracle Benchmarks (8/8 suites: P1, P2, E1, E2, D1, D2, U1, Q1)
python backend/eval/run_benchmark_suites.py

# 3. Sample Protected Agent Applications (5/5 apps)
python examples/protected_billing_agent.py
python backend/examples/run_demo.py
python examples/rag_customer_agent/agent.py
python examples/devops_ci_agent/agent.py
python examples/financial_wealth_agent/agent.py

# 4. Frontend TypeScript & Production Build Check
Set-Location "c:\projects\journal paper prompt injection\ContractGuard_Platform\frontend"
npx tsc --noEmit
npm run build
```

---

## 2. Full Directory & Architecture Structure

```text
c:\projects\journal paper prompt injection\
├── ContractGuard_X_Hackathon_Coder_Methodology.md     # Nebius x NVIDIA Hackathon Specification
├── ContractGuard_X_Conference_Coder_Methodology.md    # Scientific Conference Specification (M1-M4, P1-Q1)
└── ContractGuard_Platform\
    ├── PROJECT_STATE_AND_CONTEXT.md                   # <--- THIS PERSISTENT CHECKPOINT FILE
    ├── pytest.ini                                     # Pytest root configuration
    ├── docker-compose.yml                             # PostgreSQL 15 + Backend + Frontend container spec
    ├── scripts\
    │   ├── generate_logo.py                           # Generates 2D minimalist flat vector/PNG logos
    │   └── test_gateway_endpoints.py                  # Standalone gateway verification script
    ├── backend\
    │   ├── requirements.txt                           # Pinned Python dependencies
    │   ├── eval\
    │   │   └── run_benchmark_suites.py                # 8 Oracle Benchmark Suites (P1, P2, E1, E2, D1, D2, U1, Q1)
    │   ├── examples\
    │   │   └── run_demo.py                            # CLI comparison demo (Unprotected vs ContractGuard-X)
    │   └── app\
    │       ├── main.py                                # FastAPI entrypoint, CORS, startup DB seeding, /v1/* aliases
    │       ├── config.py                              # Env config, PostgreSQL -> SQLite automatic probe fallback
    │       ├── database.py                            # SQLAlchemy ORM models (Users, Policies, Keys, Ledger, Logs)
    │       ├── schemas.py                             # Pydantic request/response schemas (with provider_mode)
    │       ├── core\
    │       │   ├── policy_compiler.py                 # M1: Policy Linter, HMAC-SHA256 Signing, Human Freeze
    │       │   ├── normalizer.py                      # M2: Depth-2 Recursive Decoder (Base64/Hex/URL/Unicode/ROT13)
    │       │   ├── signature_db.py                    # M2: Zero-width stripping + Threat Family & Vector Signatures
    │       │   ├── tceav.py                           # M3: Typed Contextual Evidence & Authority Verifier (P1/P2/U1)
    │       │   ├── effect_ledger.py                   # M4: Thread-safe Cumulative Ledger, Idempotency, Negative-Delta Block
    │       │   ├── simulator.py                       # Dynamic 5-scenario + custom payload execution pipeline
    │       │   └── nebius_client.py                   # Nebius Token Factory client + honest is_live_configured() check
    │       └── api\
    │           ├── auth.py                            # Unified require_auth, Bearer/API-Key validation, Demo Login
    │           ├── deployment_guard.py                # /api/v1/guard/ingress, /egress, /v1/context/ingest, /v1/actions/*
    │           ├── policies.py                        # /api/policy/synthesize, /validate, /approve, /v1/contracts/*
    │           ├── simulations.py                     # /api/simulate/run (protected by require_auth)
    │           ├── metrics.py                         # /api/metrics/summary, /v1/eval/summary
    │           └── nebius.py                          # /api/nebius/test-connection (honest live vs offline status)
    ├── frontend\
    │   ├── public\
    │   │   ├── logo.png                               # 2D Minimalist Flat Shield + Check/Nodes Logo (512x512)
    │   │   ├── logo-icon.png                          # 2D App Icon (128x128)
    │   │   ├── brand-logo-horizontal.png              # 2D Horizontal Brand Lockup (800x200)
    │   │   └── logo.svg                               # Clean 2D Vector SVG
    │   └── app\
    │       ├── globals.css                            # White Neumorphic / Soft UI design system (#EEF2F6 base)
    │       ├── layout.tsx                             # Root layout + Inter/JetBrains Mono fonts + favicon
    │       ├── page.tsx                               # Auth Landing Gate + 5 Decluttered Tabs (Studio, Gateway, Simulator, Benchmarks, SDK)
    │       └── components\
    │           └── DeploymentGatewayTab.tsx           # API Key Console + Pre-LLM Ingress & Post-LLM Egress Testers + 3 Live Agent Suites
    ├── sdk\
    │   └── python\
    │       └── contractguard_x\
    │           ├── client.py                          # ContractGuardClient (local deterministic + remote gateway modes)
    │           └── decorators.py                      # @guarded_tool decorator (P1/P2/U1 + cumulative budget enforcement)
    ├── examples\
    │   ├── protected_billing_agent.py                 # SDK @guarded_tool 3-test billing agent demo
    │   ├── rag_customer_agent\agent.py                # Project 1: Indirect prompt injection interception
    │   ├── devops_ci_agent\agent.py                   # Project 2: Command injection perimeter drop
    │   └── financial_wealth_agent\agent.py            # Project 3: 3-turn salami-slicing cumulative budget block
    └── tests\
        ├── test_contractguard.py                      # Core M1-M4 & P1-Q1 unit/integration tests
        ├── test_dummy_projects.py                     # End-to-end tests for Projects 1-3, /v1/* endpoints, policy lifecycle
        ├── test_auth_gating.py                        # Negative (401) & positive authentication gating tests
        ├── test_nebius_transparency.py                # Offline deterministic vs live Nebius API transparency tests
        ├── test_milestone1_ui_adversarial.py          # Frontend AST/JSX & TypeScript build verification tests
        ├── test_adversarial_m2_challenge.py           # Malformed Bearer/API-key bypass stress tests
        ├── test_challenger_m3_nebius_edge_cases.py    # Nebius key edge-case & fallback tests
        ├── test_challenger_adversarial_m4.py          # M4 boundary & edge-case tests
        └── test_challenger_adversarial_m4_concurrency.py # Thread concurrency, zero-width smuggling & negative-delta tests
```

---

## 3. Key Design Decisions & Completed Milestones

1. **2D Minimalist Logo & White Neumorphic UI (`globals.css`, `page.tsx`, `DeploymentGatewayTab.tsx`)**
   - Uses a clean `#EEF2F6` cool porcelain surface with dual soft outer shadows (`.neu-card`), carved inner wells (`.neu-inset`), and royal blue tactile primary buttons (`.neu-btn-primary`).
   - Strictly 2D flat geometric shield logo (`/logo.png`, `/logo.svg`).
   - **Decluttered UI (Milestone 1):** All 5 oversized hero cards, duplicate wizard step banners, static placeholder lint cards, and redundant subtitles were removed. Navigation is consolidated into `Policy Studio`, `Gateway`, `Simulator`, `Benchmarks`, and `SDK & Docs`.

2. **Strict Authentication Gating (Milestone 2)**
   - **Frontend:** Unauthenticated users see only the White Neumorphic Sign-In / 1-Click Judge Login landing gate. No operational tabs or protected fetches run until signed in. All protected frontend calls use `authFetch` with `Authorization: Bearer <token>`.
   - **Backend:** Unified `require_auth` dependency enforces `HTTP 401 Unauthorized` across `/api/v1/guard/*`, `/v1/*`, `/api/v1/keys/*`, `/api/simulate/run`, and `/api/policy/*`. Closed the `None` API key bypass in `verify_api_key`. Public routes are strictly limited to `/health`, `/ready`, `/api/status`, and `/api/auth/*`.

3. **Honest Nebius Mode Transparency (Milestone 3)**
   - `nebius_client.py` validates keys via `is_live_configured()`. Demo, placeholder, or empty keys strictly report `is_live=False` and `provider_mode="offline"`.
   - Top navbar and simulation results clearly badge `Offline Sandbox` (amber) when running deterministically without a live key, and `Nebius Live` (green) when a real `NEBIUS_API_KEY` is configured.

4. **Adversarial Hardening & Full Test Coverage (Milestones 4 & 5)**
   - Thread-safe lock in `effect_ledger.py` + caller session preservation in `/v1/actions/execute`.
   - Strict rejection of negative budget deltas (`delta < 0`) to prevent budget laundering.
   - Zero-width Unicode stripping (`\u200b`, `\u200c`, `\u200d`, `\ufeff`) and newline normalization in `signature_db.py`.
   - **Verified Results:** `366/366` pytest tests pass, `8/8` oracle benchmark suites pass, `5/5` sample apps pass, and `npm run build` / `npx tsc --noEmit` exit `0`.

