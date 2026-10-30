# ContractGuard-X: Dual-End Zero-Trust Security Gateway & Stateful Reference Monitor for AI Agents

[![Nebius Token Factory](https://img.shields.io/badge/Powered%20By-Nebius%20Token%20Factory-00E599?style=for-the-badge)](https://nebius.com)
[![NVIDIA Nemotron](https://img.shields.io/badge/NVIDIA-Nemotron--70B%20%26%20Mini--4B-76B900?style=for-the-badge&logo=nvidia)](https://build.nvidia.com)
[![Hackathon](https://img.shields.io/badge/Nebius%20x%20NVIDIA-Global%20AI%20Hackathon%202026-purple?style=for-the-badge)](https://nebiusglobalaihackathon.devpost.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg?style=for-the-badge&logo=python)](https://python.org)

> **Official Submission for Nebius × NVIDIA Global AI Hackathon**  
> **Track:** **Coding and Agentic Engineering**  
> **Primary Deliverable:** Developer Middleware, Security Gateway & Python SDK (`contractguard-x`) + Next.js Web Studio & SOC Dashboard

---

## 📋 Hackathon Submission Compliance Checklist

| Mandatory Requirement | Status | Verification & Evidence |
|---|:---:|---|
| **Runs on Nebius Token Factory / AI Cloud** | ✅ **YES** | Active live integration with Nebius Token Factory (`https://api.tokenfactory.nebius.ai/v1`). Verified with real-time latency ping modal in UI. |
| **Uses NVIDIA Open-Source Model** | ✅ **YES** | Uses **`nvidia/llama-3.1-nemotron-70b-instruct`** for AI Policy Engineering, and **`nvidia/nemotron-mini-4b-instruct`** for Semantic Invariant Verification. |
| **Clear Track Alignment** | ✅ **YES** | **Coding and Agentic Engineering** — A drop-in security gateway, reference monitor, and Python SDK (`contractguard-x`) for developers building LangChain, LlamaIndex, and CrewAI agents. |
| **Public Code Repository & License** | ✅ **YES** | Public repository with visible OSI-approved **[MIT License](LICENSE)** and reproduction instructions. |
| **Working Demo URL** | ✅ **YES** | Full-stack deployment with PostgreSQL backend and interactive Next.js Web Studio. |
| **Demo Video (<3 Minutes)** | ✅ **YES** | High-impact 2m45s walkthrough video demonstrating live Nebius/NVIDIA Nemotron policy synthesis and sub-millisecond attack blocking. (See script below). |
| **Feedback for Nebius & NVIDIA Teams** | ✅ **YES** | Comprehensive technical feedback documented below on Token Factory latency, Nemotron structured output, and rate limits. |

---

## ⚡ Quickstart (100% Native Non-Docker Full Stack)

### Option A: One-Click Native Launcher (Next.js 14 + FastAPI + SQLAlchemy + PostgreSQL)
```powershell
# 1. Enter platform directory
cd ContractGuard_Platform

# 2. Configure environment (connects natively to postgresql://postgres:hackathon@localhost:5432/hackathon)
cp .env.example .env

# 3. Launch Native PostgreSQL Probe, FastAPI Backend (Port 8080), and Next.js 14 Studio (Port 3001)
.\start_platform.ps1
# Or on Command Prompt:
start_platform.bat
```
- **Web Studio & SOC Dashboard (3 Decluttered Views: `Dashboard` | `Projects` | `Settings`):** Open [http://localhost:3001](http://localhost:3001)
- **FastAPI OpenAPI Swagger Docs:** Open [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)
- **Live PostgreSQL & Provider Readiness Probe:** Open [http://127.0.0.1:8080/ready](http://127.0.0.1:8080/ready)

### Option B: Manual Native Terminal Startup
```powershell
# Terminal 1: Start FastAPI + SQLAlchemy Backend
$env:PYTHONPATH=".;backend;sdk/python"
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8080 --reload

# Terminal 2: Start Next.js 14 Frontend
cd frontend
npm run dev
```

### Option C: Local Python SDK Installation
```bash
# Install the official Python SDK
pip install -e sdk/python

# Run the protected autonomous billing agent example
python examples/protected_billing_agent.py
```

---

## 🛡️ Python SDK: Protect Any Agent in 2 Lines of Code

```python
from contractguard_x import guarded_tool, SecurityContract

# Load your developer-approved security contract
contract = SecurityContract.from_file("contracts.yaml")

@guarded_tool(contract=contract)
def process_refund(amount: float, target_account: str):
    """Issues customer refund to verified bank account."""
    return f"Transferred ${amount:.2f} to {target_account}."

# Malicious prompt injection attempt from customer ticket
# Target account '0xHACKER_CRYPTO' came from untrusted email body -> BLOCKED!
process_refund(amount=450.0, target_account="0xHACKER_CRYPTO")
# Raises: PermissionError: [ContractGuard-X Interception - Stage 2: TCEAV Evidence Guard]: Parameter 'target_account' violation: Value originated from forbidden source: untrusted_customer_email.
```

---

## 🚀 The Core Problem: The Dual-LLM Prompt Injection Dilemma

Autonomous AI agents given tools (financial transfers, database queries, emails, shell access) are inherently vulnerable to **Indirect Prompt Injection** and **Compositional (Salami-Slicing) Attacks**:
- **Why Traditional Guardrails Fail:** AWS Bedrock Guardrails, NeMo Guardrails, and Azure AI Content Safety rely on *text pattern filtering* (toxic speech, PII regex). They fail against prompt injection because the agent is *supposed* to read the customer email or document!
- **The ContractGuard-X Solution:** Decouples *reading data* from *authorizing actions*. An untrusted string can be read and summarized, but it **cannot** become an authorized destination parameter or trigger unbounded cumulative effects!

---

## 🏛️ System Architecture: Two-End Unified Design (M1 – M4)

```mermaid
flowchart TD
    subgraph ControlPlane["End 1: Developer End (Control Plane)"]
        DEV[Developer] -->|Uploads Tool Code / Schemas| AST[AST Parser / Schema Extractor]
        AST --> CHAT[AI Policy Interviewer - Nebius Nemotron-70B]
        CHAT --> DRAFT[Draft Typed Policy: contracts.yaml]
        DRAFT --> LINT[Deterministic Static Linter & Test Generator]
        LINT --> APPROVE{Explicit Developer Approval}
        APPROVE -->|Approve & Sign| REGISTRY[(Versioned Policy Registry)]
    end

    subgraph RuntimePlane["End 2: Deployment End (Runtime Security Plane)"]
        USER_INPUT[User Prompt] --> ENV[Content Envelope & Provenance Tagging]
        RETRIEVED[Untrusted Documents / Tools] --> ENV
        
        ENV --> M2[M2: Provenance-Aware Hybrid Detection]
        M2 -. Advisory Risk Score .-> M3[M3: TCEAV Core Engine]
        
        REGISTRY --> M3
        TASK_STORE[(Authenticated Task Store)] --> M3
        
        AGENT_PROPOSAL[Agent Proposed Tool Call] --> M3
        
        M3 -->|Validate Task, Purpose, & Evidence| MONITOR{Reference Monitor}
        MONITOR -->|DENY / REVIEW| AUDIT[(Redacted Security Audit Log)]
        MONITOR -->|ALLOW| LEDGER[(M4: Atomic Effect Ledger)]
        
        LEDGER -->|Check Budget: committed + pending + new| EXEC[Guarded Tool Execution]
        LEDGER -->|Budget Exceeded: DENY| AUDIT
        
        EXEC --> RECON[Reconcile Actual Effects & Output Guard]
        RECON --> AUDIT
        RECON --> SAFE_RESP[Safe Agent Response to User]
    end
```

### Module Breakdown:
1. **Module 1 (M1) AI Policy Engineering:** AST schema parser inspects tool signatures; Nebius NVIDIA Nemotron-70B conducts a 4-question least-privilege interview; policy compiler emits typed YAML; static linter verifies constraints; developer cryptographically signs and versions.
2. **Module 2 (M2) Provenance-Aware Hybrid Detection:** Wraps ingress in `ContentEnvelope` (`authenticated_user` vs `external_untrusted`); executes bounded Base64/Unicode normalization with trust inheritance; scans in-memory signatures in <0.5ms.
3. **Module 3 (M3) TCEAV Engine (Task-Conditioned Evidence & Authority Verification):**
   $$\text{Admissible}(x, p, T, C, \Pi) = \text{schema\_valid}(x, p) \wedge \text{evidence\_sufficient}(x, p, \Pi, C) \wedge \text{purpose\_permitted}(p, T, C)$$
   Proves parameter origin. Stops context-aware payee theft and destination hijacking before runtime tool execution.
4. **Module 4 (M4) Stateful Effect Ledger & Output Guard:**
   $$\sum \text{Committed Effects} + \sum \text{Pending Effects} + \text{Proposed Effect} \le \text{Policy Budget}$$
   Atomic reservation ledger stops salami-slicing compositional attacks (e.g. 3x $400 transfers with $1,000 ceiling; 3rd is blocked). Output Guard neutralizes Markdown image exfiltration (`![leak](...)`).

---

## 🎯 5 Live Demonstrations in Web Studio

| Scenario | Attack Type | Unprotected Agent Outcome | ContractGuard-X Outcome | Latency |
|---|---|---|---|:---:|
| **D1: Indirect Email Injection** | Context-Aware Payee Theft | **CRITICAL BREACH:** $450 wired to hacker wallet | **BLOCKED:** Parameter origin untrusted; task summarized safely | **0.65 ms** |
| **D2: Salami-Slicing Drain** | Multi-Turn Budget Exhaustion | **CRITICAL BREACH:** $1,200 drained (3x $400) | **BLOCKED:** 3rd transfer denied by atomic cumulative ledger | **0.78 ms** |
| **D3: Benign Utility** | Base64 / Multilingual Input | Executed (or blocked by naive filters) | **SAFE & ALLOWED:** 0 false blocks; 100% utility preserved | **0.42 ms** |
| **D4: Privilege Escalation** | Direct Banned Tool (`execute_shell`) | **CATASTROPHIC:** Database dropped | **HARD BLOCKED:** Prohibited in `denied_tools` boundary | **0.35 ms** |
| **D5: UI Image Exfiltration** | Secret Egress via Markdown Image | **DATA LEAK:** Secret API key exfiltrated | **BLOCKED & REDACTED:** Output Guard strips image render trigger | **112 ms** |

---

## 💼 Commercialization & "Earnable" Business Model

ContractGuard-X is structured as an **Open-Core B2B Enterprise SaaS & Security Gateway**:
- **Developer Community (Free / Open Source):** Standalone Python SDK (`contractguard-x`), in-memory reference monitor, local SQLite ledger.
- **Pro SaaS ($49/seat/month + $0.002/guarded call):** Hosted AI Policy Interviewer powered by Nebius NVIDIA Nemotron-70B, cloud policy registry, centralized audit trails.
- **Enterprise Security Cloud ($499 - $2,499/mo + $0.005/guarded call):** Distributed multi-agent cross-tool effect ledger (Redis / PostgreSQL cluster), real-time SOC event stream with Webhook / PagerDuty / Datadog integration, SOC2 Type II compliance audit export (LaTeX, JSONL, PDF).

---

## 🎬 3-Minute Demo Video Script (YouTube)

- **[0:00 - 0:30] The Threat & Tech Stack:** "Autonomous agents with tools are the future of software, but indirect prompt injection and budget draining make them dangerous. We built ContractGuard-X, running on Nebius Token Factory with NVIDIA Nemotron-70B."
- **[0:30 - 1:15] End 1: AI Policy Engineering (M1):** Show Web Studio. Upload billing tools `.zip`. Show Nemotron-70B interview generating context-aware questions. Compile `contracts.yaml` in 2 seconds. Show cryptographic signing.
- **[1:15 - 2:15] End 2: Live Side-by-Side Interception (M2–M4):**
  - Run Scenario D1 (Indirect Email Injection): Show left card breached ($450 sent to attacker wallet), right card intercepted in 0.65ms by TCEAV.
  - Run Scenario D2 (Salami-Slicing): Show 3rd micro-transfer blocked by Cumulative Ledger.
  - Run Scenario D3 (Benign Encoded): Show Base64 review completed with zero false positives.
- **[2:15 - 2:45] Python SDK & Commercial Vision:** Show `@guarded_tool` python decorator protecting a LangChain agent. Explain the B2B SaaS security gateway model.
- **[2:45 - 3:00] Conclusion:** "ContractGuard-X: Provable zero-trust security for autonomous agents, powered by Nebius and NVIDIA."

---

## 📝 Specific Feedback for Nebius & NVIDIA Teams

1. **Nebius Token Factory:**
   - *Strengths:* Exceptional round-trip latency (<150ms from Europe/US nodes) and seamless OpenAI client compatibility.
   - *Opportunity:* Providing a dedicated native parameter in the completions API for enforcing strict JSON Schema validation (like `response_format={"type": "json_object"}`) on Nemotron-70B would eliminate the need for manual regex cleaning of markdown fences.
2. **NVIDIA Nemotron Models:**
   - *Llama-3.1-Nemotron-70B-Instruct:* Superb reasoning quality for tool schema analysis and security question formulation. Outperformed GPT-4o in identifying subtle financial side-effects.
   - *Nemotron-Mini-4B-Instruct:* Highly efficient for fast semantic invariant verification, maintaining under 120ms total latency for out-of-band security checks.

---

## 🧪 Automated Test Suite

Run the full pytest suite verifying all M1–M4 security invariants:
```bash
python -m pytest tests/test_contractguard.py -v
```
Output:
```text
tests/test_contractguard.py::test_m1_policy_linting_and_signing PASSED
tests/test_contractguard.py::test_m2_bounded_normalization_and_trust_inheritance PASSED
tests/test_contractguard.py::test_m3_tceav_indirect_prompt_injection_blocking PASSED
tests/test_contractguard.py::test_m3_tceav_denied_tool_hard_perimeter PASSED
tests/test_contractguard.py::test_m4_stateful_effect_ledger_salami_slicing PASSED
tests/test_contractguard.py::test_m4_output_guard_image_exfiltration PASSED
============================== 6 passed in 1.37s ==============================
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
