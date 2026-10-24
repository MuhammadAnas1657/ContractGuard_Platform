# ContractGuard Platform: Master Task & Subtask Execution Tracker

> **Project:** ContractGuard Platform  
> **Status:** Active Execution  
> **Target:** Nebius x NVIDIA Global AI Hackathon & Top-Tier Academic Journal Submission

---

## Task Breakdown & Verification Matrix

### [Milestone 1] Database & ORM Setup (PostgreSQL)
- [ ] **Task 1.1: PostgreSQL Connection Configuration**
  - **Subtask 1.1.1:** Configure `backend/app/config.py` with `postgresql://postgres:hackathon@localhost:5432/hackathon`.
  - **Subtask 1.1.2:** Verify connection pooling and schema initialization in `backend/app/database.py`.
  - **Verification:** Run python connectivity probe to confirm active connection.
- [ ] **Task 1.2: Database Tables & Models Creation**
  - **Subtask 1.2.1:** Create `ProjectRecord` table (stores uploaded zip projects and extracted tool definitions).
  - **Subtask 1.2.2:** Create `PolicyRecord` table (stores synthesized `contracts.yaml` and active flags).
  - **Subtask 1.2.3:** Create `SimulationRunRecord` table (stores multi-turn side-by-side run history and audit trails).
  - **Subtask 1.2.4:** Create `AttackSignatureRecord` table (indexes known jailbreak patterns).
  - **Verification:** Verify tables created in PostgreSQL via SQLAlchemy metadata.
- [ ] **Task 1.3: Seed Known Attack Signatures**
  - **Subtask 1.3.1:** Seed precompiled regex/hash patterns for System Overrides, DAN jailbreaks, SQL/Shell commands, and Base64 obfuscation into PostgreSQL.
  - **Verification:** Query `attack_signatures` row count via backend route.

---

### [Milestone 2] Backend Engine & Zero-Placeholder Services
- [ ] **Task 2.1: In-Memory Fast Attack Signature Database (<0.5ms)**
  - **Subtask 2.1.1:** Compile regex patterns in `backend/app/core/signature_db.py`.
  - **Subtask 2.1.2:** Integrate Stage 1 perimeter lookup returning signature metadata.
  - **Verification:** Unit test with known injection strings confirming sub-millisecond execution.
- [ ] **Task 2.2: Zero-Trust Zip Archive Ingestion & AST Parser**
  - **Subtask 2.2.1:** Implement memory/temp sandboxed zip unzipping in `backend/app/core/zip_extractor.py`.
  - **Subtask 2.2.2:** Parse Python AST for `@tool` decorators, function names, parameter types, and docstrings.
  - **Subtask 2.2.3:** Provide pre-built agent archetype templates (Customer Billing, DevOps, Financial).
  - **Verification:** Test zip upload with sample python tools.
- [ ] **Task 2.3: Nebius Token Factory Cloud Client (NVIDIA Nemotron)**
  - **Subtask 2.3.1:** Implement `test_connection(api_key)` testing live Nebius Token Factory latency.
  - **Subtask 2.3.2:** Implement Nemotron-70B security interview question generation.
  - **Subtask 2.3.3:** Implement Nemotron-70B `contracts.yaml` policy compiler.
  - **Subtask 2.3.4:** Implement Nemotron-Mini-4B semantic invariant verifier.
  - **Verification:** Test `/api/nebius/test-connection` endpoint with test key.
- [ ] **Task 2.4: Side-by-Side Attack Simulator Engine**
  - **Subtask 2.4.1:** Multi-turn simulation for Indirect Email Injection (Context-Aware Payee Theft).
  - **Subtask 2.4.2:** Multi-turn simulation for Salami-Slicing Drain (3x $400 transfers).
  - **Subtask 2.4.3:** Simulation for Direct System Jailbreak (`delete_database`).
  - **Subtask 2.4.4:** Simulation for Markdown UI Image Exfiltration (`![leak](...)`).
  - **Verification:** Run `/api/simulate/run` for all 4 scenarios; verify left card = BREACH, right card = BLOCKED.

---

### [Milestone 3] Frontend Web Studio (Next.js + Tailwind CSS)
- [ ] **Task 3.1: Ultra-Sleek Glassmorphism Theme & Motion Styling**
  - **Subtask 3.1.1:** Configure Tailwind CSS with frosted glass panels, backdrop blur (`backdrop-blur-xl`), and translucent borders.
  - **Subtask 3.1.2:** Implement glowing emerald (`#10B981`), violet (`#8B5CF6`), and cyan (`#06B6D4`) shadow cards.
  - **Subtask 3.1.3:** Add CSS keyframe micro-animations: beacon pulses, card hover glows, and smooth tab transitions.
  - **Verification:** Visual check in browser subagent.
- [ ] **Task 3.2: Developer Studio (Phase 1 Ingestion & Synthesis)**
  - **Subtask 3.2.1:** Drag-and-drop `.zip` upload box with animated status feedback.
  - **Subtask 3.2.2:** Discovered tools inspector with argument chips.
  - **Subtask 3.2.3:** Interactive Nemotron security interview chatbot with quick-fill suggested answers.
  - **Subtask 3.2.4:** Synthesized YAML viewer with syntax formatting and one-click download.
  - **Verification:** End-to-end test in browser from tool selection to policy synthesis.
- [ ] **Task 3.3: Live Attack Simulator (Phase 2 Interceptor)**
  - **Subtask 3.3.1:** Scenario selector cards for all 4 attack vectors.
  - **Subtask 3.3.2:** Editable task goal and untrusted ingress payload fields.
  - **Subtask 3.3.3:** Side-by-side animated cards: Unprotected Agent (Critical Breach) vs. ContractGuard Protected Agent (Intercepted & Safe).
  - **Subtask 3.3.4:** Stage breakdown, sub-millisecond latency gauge, and step-by-step audit trace.
  - **Verification:** Verify live execution in browser subagent.
- [ ] **Task 3.4: Academic Benchmarks & Industry Audit Matrix**
  - **Subtask 3.4.1:** KPI metric cards with Wilson Score 95% Confidence Intervals.
  - **Subtask 3.4.2:** Industry comparison matrix vs. Amazon Bedrock Guardrails, NVIDIA NeMo Guardrails, Azure AI Content Safety.
  - **Subtask 3.4.3:** Multi-layer ablation table proving layer independence.
  - **Subtask 3.4.4:** One-click **"Export LaTeX Table"** button.
  - **Verification:** Click copy button and verify clipboard output.
- [ ] **Task 3.5: Nebius API Key Configuration Modal**
  - **Subtask 3.5.1:** Modal for entering user `NEBIUS_API_KEY`.
  - **Subtask 3.5.2:** Live "Test Connection" button displaying real-time ping and model status.
  - **Verification:** Test modal opening, key entry, and test response in browser.

---

### [Milestone 4] Git Repository & GitHub Initialization
- [ ] **Task 4.1: Production .gitignore**
  - **Subtask 4.1.1:** Create `.gitignore` ignoring `node_modules`, `.next`, `__pycache__`, `.venv`, `.env`, `*.db`, `*.pyc`.
- [ ] **Task 4.2: Local Git Repository Initialization**
  - **Subtask 4.2.1:** Run `git init -b main` in `ContractGuard_Platform/`.
  - **Subtask 4.2.2:** Stage all documentation, backend, and frontend files.
  - **Subtask 4.2.3:** Create initial production commit: `feat: initial release of ContractGuard Platform for Nebius x NVIDIA Hackathon`.
  - **Subtask 4.2.4:** Provide instructions for adding GitHub remote and pushing.
  - **Verification:** Run `git log -1` to confirm clean commit history.

---

### [Milestone 5] End-to-End Validation & Walkthrough
- [ ] **Task 5.1: Automated API Suite Verification**
  - **Subtask 5.1.1:** Test all 7 REST API endpoints via automated script.
- [ ] **Task 5.2: Browser Subagent Visual & Functional Verification**
  - **Subtask 5.2.1:** Record full browser session across all 3 tabs.
  - **Subtask 5.2.2:** Save final video and high-resolution screenshots.
- [ ] **Task 5.3: Walkthrough Artifact Generation**
  - **Subtask 5.3.1:** Generate `walkthrough.md` with embedded screenshots, architecture summary, and GitHub push guide.
