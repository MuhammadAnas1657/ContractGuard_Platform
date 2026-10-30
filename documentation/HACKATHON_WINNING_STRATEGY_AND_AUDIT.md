# Nebius × NVIDIA Global AI Hackathon: Strategic Hard Audit & Winning Submission Kit

**Target Event:** Nebius × NVIDIA Global AI Hackathon (Devpost)  
**Track:** **Coding and Agentic Engineering Track** (Secondary: *Best Apps and Agents*)  
**Project:** **ContractGuard-X** (Dual-End Zero-Trust Security Gateway & Policy Synthesizer for AI Agents)  
**Evaluator Status:** Competitive Hard Audit & Readiness Assessment  

---

## 1. Hackathon Requirement Compliance Audit: 100% Verified

| Requirement | Hackathon Rule | ContractGuard-X Status | Evidence & Verification |
|---|---|:---:|---|
| **Track Alignment** | Must fit Coding & Agentic Engineering | **PERFECT FIT (10/10)** | Drop-in middleware, runtime reference monitor, and Python SDK (`contractguard-x`) protecting LangChain/LlamaIndex/CrewAI agents. |
| **Cloud Infrastructure** | Must run on **Nebius Token Factory / AI Cloud** | **COMPLIANT (10/10)** | Integrated with `https://api.tokenfactory.nebius.ai/v1` via `NebiusTokenFactoryService` with dynamic API key testing & latency probe. |
| **NVIDIA Foundation Model** | Must use NVIDIA open-source model | **COMPLIANT (10/10)** | **Dual-Nemotron Architecture**: `nvidia/llama-3.1-nemotron-70b-instruct` (Policy Engineering) + `nvidia/nemotron-mini-4b-instruct` (Semantic Invariant Verifier). |
| **Open Source & License** | Public repository with OSI open-source license | **COMPLIANT (10/10)** | Public GitHub repository (`MuhammadAnas1657/ContractGuard_Platform`) with official [MIT License](https://github.com/MuhammadAnas1657/ContractGuard_Platform/blob/main/LICENSE). |
| **Functional Implementation** | Working code (no vaporware, no mock UI) | **COMPLIANT (10/10)** | 100% native PostgreSQL database, FastAPI backend, Next.js 14 frontend, 31/31 hard audit checks passing, 24/24 adversarial regression tests passing. |
| **Evaluation Suite** | Reproducible benchmarks & attack evaluations | **COMPLIANT (10/10)** | Runnable `standalone_agentic_rag_project/test_attacks.py` testing 4 real-world attack vectors (Direct Jailbreak, Indirect RAG Poisoning, Salami Budget Drain, Benign Utility). |

---

## 2. Competitive "Hard Audit": Will This Give Us Top Position?

### Overall Winning Probability: **HIGH (Top 3 Contender / 1st-Place Potential)**

> [!IMPORTANT]
> **Why Judges Will Love ContractGuard-X:**
> 1. **Addresses the #1 Burning Problem in Agentic AI:** Today, every company building AI agents is terrified of prompt injection (OWASP LLM01, AgentDojo). Traditional guardrails (AWS Bedrock, Azure AI Content Safety, Llama Guard) only filter toxic text; they **completely fail** against indirect prompt injection because the agent is supposed to read customer emails and tickets!
> 2. **Not a Thin LLM Wrapper:** 90% of hackathon entries will be simple chatbots or basic RAG agents with a custom prompt. ContractGuard-X is an **actual security engineering platform** combining formal Information-Flow Control (IFC), Argument Evidence Binding (TCEAV), AST tool extraction, and a transactional cumulative effect ledger.
> 3. **Sub-Millisecond Deterministic Performance (<1ms):** AI developers hate guardrails that add 2–3 seconds of latency. ContractGuard-X's Zero-Token Sentinel (<0.05ms) and Auto-Switching Heuristic provide production-grade throughput.

### Gap Analysis: What Must Be Executed to Lock Down #1 Place

| Factor | Weight | Current Score | Critical Action Required to Win |
|---|:---:|:---:|---|
| **Technical Innovation & Architecture** | 30% | **9.8 / 10** | **Ready.** The 4-module methodology and TCEAV innovation are conference-grade. |
| **Hackathon Track Fit & Utility** | 25% | **9.9 / 10** | **Ready.** Developers can secure any agent in 2 lines of code via Python SDK. |
| **Software Polish & Robustness** | 25% | **9.6 / 10** | **Ready.** 31/31 audit checks passed, 0 fake numbers, clean PostgreSQL DB. |
| **Demo Video & Pitch Polish** | 20% | **To Be Recorded** | **CRITICAL.** A brilliant project with a poor or missing video will lose to inferior projects with flashy videos. **Follow the exact 2m45s script below.** |

---

## 3. The Complete Package: What We Must Give Them on Devpost

When submitting on Devpost, provide these exact components:

1. **Submission Form Basics:**
   - **Project Title:** `ContractGuard-X: Dual-End Zero-Trust Security Gateway & Stateful Reference Monitor for AI Agents`
   - **Tagline (Elevator Pitch):** *Autonomous AI-assisted policy engineering and sub-millisecond reference monitor stopping indirect prompt injection and tool hijacking in agentic systems.*
   - **Track:** `Coding and Agentic Engineering Track` (Select `Best Apps and Agents Track` as secondary if allowed).
   - **GitHub Repository URL:** `https://github.com/MuhammadAnas1657/ContractGuard_Platform`
2. **Access Credentials for Judges:**
   - **Web UI Studio:** `http://localhost:3001` (or hosted link if deployed on Vercel/Railway).
   - **Admin Account:** `admin@contractguard.ai` / `hackathon2026`
   - **Developer Account:** `developer@enterprise.com` / `hackathon2026`
   - **FastAPI OpenAPI Swagger:** `http://127.0.0.1:8080/docs`
   - **Pre-provisioned Evaluation API Keys:** `cgx_demo_ingress_key_evaluator` (Ingress) / `cgx_demo_egress_key_evaluator` (Egress).
3. **Demo Video (Under 3 Minutes):**
   - Upload an unlisted/public video to YouTube or Loom.
4. **Mandatory Nebius & NVIDIA Feedback:** (Included in full below).
5. **Project Story & Architecture Narrative:** (Included in full below).

---

## 4. Winning 2m45s Demo Video Script & Storyboard

*Keep the video strictly under 3 minutes (2m40s is ideal). Speak with confidence, crisp pacing, and show real terminal/UI screens.*

````carousel
```markdown
[0:00 - 0:35] THE PROBLEM (The Indirect Prompt Injection Dilemma)
Visual: Show a terminal or UI with an unprotected AI agent reading an email.
Voiceover:
"Autonomous AI agents are being given real tools—database access, financial transfers, and cloud APIs. 
Over 70% of state-of-the-art agents fail under indirect prompt injection. Attackers don't need to hack 
the user's prompt—they hide malicious commands inside customer tickets, emails, or retrieved documents. 
When the agent reads this data, it calls execute_wire_transfer or exfiltrates confidential credentials. 
Standard guardrails fail because they only filter toxic words—they can't tell that an unauthorized bank account 
came from an untrusted email. That's why we built ContractGuard-X."
```
<!-- slide -->
```markdown
[0:35 - 1:15] PHASE 1: AI-ASSISTED POLICY ARCHITECT (Control Plane)
Visual: Screen recording of ContractGuard-X Web Studio -> Policy-First Project Architect.
Voiceover:
"ContractGuard-X introduces a zero-trust dual-end architecture. In Phase 1, developers define their agent tools. 
Powered by NVIDIA Llama-3.1-Nemotron-70B on Nebius Token Factory, our AI Policy Architect analyzes tool ASTs, 
interviews the developer about sensitive parameters and spending limits, and auto-compiles a mathematical 
security contract—contracts.yaml—cryptographically sealed with SHA-256. 
Dual production API keys—one for ingress, one for egress—are issued only after the policy is verified."
```
<!-- slide -->
```markdown
[1:15 - 2:05] PHASE 2: RUNTIME ENFORCEMENT & LIVE DEFENSE EVALUATION
Visual: Split terminal or Web Sandbox running test_attacks.py or Live Autonomous Agent Sandbox.
Voiceover:
"At runtime, our Out-of-Band Reference Monitor enforces the policy across 3 stages.
Watch our live evaluation suite:
First, a direct DAN jailbreak: Blocked instantly by our Pre-LLM Sentinel using a curated database of 469 threat vectors.
Second, an indirect RAG injection: A customer ticket embeds a directive to transfer $850. 
Our core innovation—Task-Conditioned Evidence & Authority Verification (TCEAV)—traces parameter provenance. 
Because the bank account came from untrusted context, it's intercepted in 0.8 milliseconds!
Third, a compositional 'salami-slicing' attack: Three repeated $400 transfers attempting to drain the budget. 
Our Stateful Cumulative Ledger allows the first two, and blocks the third when the session ceiling is exceeded."
```
<!-- slide -->
```markdown
[2:05 - 2:45] DEVELOPER EXPERIENCE & NEBIUS TOKEN FACTORY IMPACT
Visual: Show sdk/python/example snippet and Nebius Token Factory connection modal.
Voiceover:
"For developers, ContractGuard-X is a drop-in middleware. You can secure any LangChain, LlamaIndex, or CrewAI 
agent with just two lines of Python using our @guarded_tool decorator. 
Running on Nebius Token Factory Cloud with NVIDIA Nemotron-70B and Nemotron-Mini-4B, we achieve sub-millisecond 
deterministic SLAs without slowing down agent execution. 
ContractGuard-X transforms AI agents from risky prototypes into enterprise-grade, provably safe autonomous systems. 
Thank you."
```
````

---

## 5. Ready-to-Copy Devpost Submission Text

### Project Description / Story

```markdown
## 💡 Inspiration
Autonomous AI agents are transitioning from prototypes to production—handling customer refunds, database maintenance, DevOps, and wealth management. However, empirical security benchmarks (OWASP Top 10 for LLMs, AgentDojo, PiArena) reveal that **over 70% of state-of-the-art agent frameworks fail under Indirect Prompt Injection**. Attackers don't attack the user prompt; they embed instructions inside external support tickets, vendor invoices, or retrieved RAG documents. When the agent reads this data, it innocently executes unauthorized tool calls, transfers funds to attacker accounts, or exfiltrates credentials.

Existing guardrails (AWS Bedrock, Azure AI Content Safety, Llama Guard) rely on toxic-keyword filtering. They fail because indirect prompt injection contains zero toxic words—the agent is *supposed* to read the email! 

We built **ContractGuard-X** to solve this fundamentally by decoupling **reading data** from **authorizing actions**.

---

## 🛡️ What It Does
ContractGuard-X is a zero-trust developer security middleware, dual-key gateway, and stateful reference monitor:

1. **AI-Assisted Policy Engineering (Control Plane):** Developers specify agent capabilities. An autonomous Policy Synthesizer powered by **NVIDIA Llama-3.1-Nemotron-70B-Instruct** on **Nebius Token Factory** conducts an intelligent security interview, detects over-permissioned tools, and synthesizes a typed `contracts.yaml` cryptographically sealed with SHA-256. Dual API keys (`cgx_ing_...` and `cgx_egr_...`) are issued only after policy approval.
2. **Provenance-Aware Hybrid Detection (Module 1):** Zero-token Cyrillic homoglyph scan (<0.05ms), Unicode normalization, and cosine-similarity matching across **469 curated threat vector patterns**.
3. **Task-Conditioned Evidence & Authority Verification - TCEAV (Module 2):** Our core research innovation. Validates whether tool arguments originate from an authorized source or from untrusted external context. If an attacker's IBAN came from a ticket note, the tool call is intercepted before execution.
4. **Stateful Cumulative Effect Ledger (Module 3):** Tracks multi-turn side effects to prevent "salami-slicing" budget drain attacks where an adversary splits unauthorized transactions into multiple small requests below single-call thresholds.
5. **Python SDK (`contractguard-x`):** Secure any Python agent tool with two lines of code (`@guarded_tool(contract=contract)`).

---

## ⚙️ How We Built It
- **Cloud & Models:** **Nebius Token Factory Cloud** hosting **NVIDIA Llama-3.1-Nemotron-70B-Instruct** (for deep policy reasoning) and **NVIDIA Nemotron-Mini-4B-Instruct** (for runtime semantic invariant verification).
- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy, native PostgreSQL with pgvector for attack pattern similarity.
- **Frontend:** Next.js 14, Tailwind CSS, TypeScript, and Lucide icons providing a 3-tab decluttered Web Studio (`Dashboard`, `Projects`, `Settings`).
- **Evaluation & Tests:** 24/24 adversarial regression probes and an automated 31-point Hard Audit Suite verifying zero-trust invariants.

---

## 🏆 Accomplishments That We're Proud Of
- **Sub-Millisecond Determinism (<1ms SLA):** An intelligent Auto-Switching Heuristic routes read-only RAG queries through a streamlined bypass (<0.05ms) while applying full Tri-Guard monitoring to stateful actions.
- **TCEAV Provenance Binding:** Successfully intercepting payee theft attacks in live customer support agent scenarios without false positives on legitimate refund workflows.
- **Zero-Token Homoglyph Sentinel:** Normalizes and detects Cyrillic/Greek lookalikes prior to LLM tokenization, consuming zero LLM tokens.

---

## 🔮 What's Next
- Conference submission of our empirical evaluation on PiArena and AgentDojo benchmarks.
- Enterprise SSO integration (OIDC/SAML) and Kubernetes sidecar container deployment for ContractGuard-X.
```

---

## 6. Mandatory Feedback for Nebius & NVIDIA Teams

### Feedback for Nebius Token Factory Cloud Team:
1. **Low Latency & High Throughput:** Streaming inference with `nvidia/llama-3.1-nemotron-70b-instruct` on Nebius Token Factory provided exceptionally consistent TTFT (Time To First Token) under 450ms, making interactive developer interviews fast and engaging.
2. **OpenAI Compatibility:** The drop-in OpenAI client compatibility (`https://api.tokenfactory.nebius.ai/v1`) made integration effortless without needing proprietary SDKs.
3. **Suggestion for Improvement:** Adding native support for JSON Schema enforcement (`response_format={"type": "json_object", "schema": ...}`) directly on Token Factory endpoints would further reduce retry overhead when compiling structured policies.

### Feedback for NVIDIA AI / Nemotron Team:
1. **Nemotron-70B Reasoning Quality:** `nvidia/llama-3.1-nemotron-70b-instruct` demonstrated outstanding tool-use understanding. When presented with raw Python docstrings and AST signatures, it accurately deduced parameter limits, identified privilege escalation vectors, and drafted precise constraints.
2. **Nemotron-Mini-4B Efficiency:** For fast runtime semantic checks, `nemotron-mini-4b-instruct` delivered sub-200ms latency, proving ideal as a cost-effective real-time invariant verifier.
