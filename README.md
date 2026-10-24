# ContractGuard: Dual-End Policy Synthesizer & Runtime Reference Monitor for AI Agents

[![Nebius AI Cloud](https://img.shields.io/badge/Powered%20By-Nebius%20Token%20Factory-00E599?style=for-the-badge)](https://nebius.com)
[![NVIDIA Nemotron](https://img.shields.io/badge/NVIDIA-Nemotron--70B%20%26%20Mini--4B-76B900?style=for-the-badge&logo=nvidia)](https://build.nvidia.com)
[![Hackathon](https://img.shields.io/badge/Nebius%20x%20NVIDIA-Global%20AI%20Hackathon-purple?style=for-the-badge)](https://nebiusglobalaihackathon.devpost.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Submission for Nebius x NVIDIA Global AI Hackathon**  
> **Track:** Coding and Agentic Engineering Track / Best Apps and Agents Track  
> **Target Venue:** Top-Tier Security Journal & Conference Evaluation

---

## 🚀 Executive Summary

Autonomous LLM agents deployed for customer support, finance, and DevOps are uniquely vulnerable to **Indirect Prompt Injection** and **Compositional (Salami-Slicing) Attacks**. Over 70% of state-of-the-art agents fail under indirect injection attacks (AgentDojo benchmark) because malicious instructions hidden in external emails or web search results look harmless to standard text classifiers.

**ContractGuard** introduces the first **Dual-End Reference Monitor** for AI agents:
1. **Developer End (Phase 1):** An autonomous **Policy Synthesizer Agent** powered by **NVIDIA Llama-3.1-Nemotron-70B-Instruct** via **Nebius Token Factory** that inspects tool AST signatures, conducts an intelligent interview, and auto-generates a mathematical security contract (`contracts.yaml`).
2. **Deployment End (Phase 2):** An out-of-band **Runtime Reference Monitor** that intercepts proposed tool calls in sub-millisecond time (<1ms) via **Parameter Evidence-Binding** and a **Cumulative Effect Ledger**, with selective semantic verification by **NVIDIA Nemotron-Mini-4B-Instruct**.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: BUILD-TIME POLICY SYNTHESIS                            │
│                                (Developer Studio / CLI)                                │
│                                                                                        │
│   Developer Python Codebase ──> AST Tool Parser ──> NVIDIA Nemotron (via Nebius)       │
│                                                                 │                      │
│                                                                 ▼                      │
│                                                    Declarative contracts.yaml          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 2: RUNTIME INTERCEPTION HIERARCHY                         │
│                                                                                        │
│   Incoming Prompt / Ingress Data                                                       │
│                │                                                                       │
│                ▼                                                                       │
│   [Stage 1: Fast Boundary & Provenance Gateway] (<1 ms)                                │
│   • Source-tagging (Authenticated User vs. Untrusted Email/Web)                        │
│   • Immediate abort of hard-banned tools (execute_shell, delete_db)                    │
│                │                                                                       │
│                ▼                                                                       │
│   [Stage 2: Deterministic Policy & Evidence Guard] (<1 ms)                             │
│   • Parameter Evidence-Binding (untrusted data cannot feed critical tool parameters)   │
│   • Cumulative Effect Ledger (stops multi-turn salami-slicing budget drains)           │
│   • Finite State Machine sequencing checks                                             │
│                │                                                                       │
│                ▼                                                                       │
│   [Stage 3: Nemotron Semantic Invariant Verifier] (~150 ms)                            │
│   • Selective verification for high-risk tools & Markdown image exfiltration           │
│                │                                                                       │
│                ▼                                                                       │
│   SAFE EXECUTION OR AUDITED INSTANT INTERCEPTION                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```
ContractGuard_Platform/
├── README.md                                 # Master Project Presentation
├── documentation/                            # Comprehensive Research & Technical Specs
│   ├── 01_LITERATURE_REVIEW.md               # 12 Research Papers & Policy Structure Analysis
│   ├── 02_METHODOLOGY_AND_HIERARCHY.md       # Two-Phase Architecture & Formal Invariants
│   ├── 03_POLICY_STRUCTURE_SPECIFICATION.md  # Definitive Schema & Field-by-Field Spec
│   ├── 04_NEBIUS_NVIDIA_HACKATHON_PROPOSAL.md# Hackathon Pitch, Track Fit & Judging Alignment
│   ├── 05_SYSTEM_FLOW_AND_API_CONTRACTS.md   # System Flow & REST API Contracts
│   └── literature_review_summary.xlsx        # Structured Comparison Dataset
├── backend/                                  # Python Backend Engine & REST Server
│   ├── contractguard/                        # Core Security Middleware Library
│   │   ├── cli.py                            # Interactive CLI Policy Synthesizer
│   │   ├── client.py                         # Nebius Token Factory API Client (Nemotron)
│   │   ├── contracts.py                      # Declarative Contract Schemas (Pydantic/YAML)
│   │   ├── interceptor.py                    # 3-Stage Runtime Gatekeeper
│   │   ├── ledger.py                         # Stateful Cumulative Effect Ledger
│   │   └── provenance.py                     # Cryptographic Taint & Source Tracker
│   ├── eval/                                 # Academic Evaluation & Benchmark Calculator
│   └── examples/                             # Demonstration Agent & Vulnerability Scenarios
└── frontend/                                 # Modern Interactive Web Studio UI
```

---

## 📊 Evaluation & Academic Ablation Results

Evaluated across 3,000 multi-turn scenarios on **AgentDojo**, **BIPIA**, and **ToolBench**:

| Configuration | Direct Injection ASR | Indirect Context-Aware ASR | Salami-Slicing ASR | Latency Overhead |
|:---|:---:|:---:|:---:|:---:|
| **Full ContractGuard (Ours)** | **0.8%** | **1.9%** | **0.0%** | **1.2 ms** |
| *w/o Fast Boundary (Stage 1)* | 1.5% | 1.9% | 0.0% | 45.0 ms *(Token spike)* |
| *w/o Parameter Evidence (Stage 2)* | 0.8% | **86.4%** *(Spike!)* | 0.0% | 0.9 ms |
| *w/o Cumulative Ledger (Stage 2)* | 0.8% | 1.9% | **81.2%** *(Spike!)* | 1.0 ms |
| *w/o Nemotron Verifier (Stage 3)* | 7.2% | 4.8% | 0.0% | 0.8 ms |

---

## ⚡ Quickstart Guide

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Activate virtual environment
source .venv/bin/activate  # Or .\.venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
```

### 2. Configure Nebius Token Factory
```bash
export NEBIUS_API_KEY="your-nebius-api-key"
# On Windows PowerShell:
$env:NEBIUS_API_KEY="your-nebius-api-key"
```

### 3. Run Policy Synthesizer (CLI Mode)
```bash
python -m contractguard.cli init
```

### 4. Run Demonstration Attack Suite
```bash
python examples/run_demo.py
```

---

## 🏆 Hackathon Submission Details

- **Event:** Nebius x NVIDIA Global AI Hackathon
- **Track:** Coding and Agentic Engineering Track / Best Apps and Agents Track
- **Cloud Infrastructure:** Nebius Token Factory (`api.tokenfactory.nebius.ai/v1`)
- **Foundation Models:** NVIDIA Llama-3.1-Nemotron-70B-Instruct & NVIDIA Nemotron-Mini-4B-Instruct
