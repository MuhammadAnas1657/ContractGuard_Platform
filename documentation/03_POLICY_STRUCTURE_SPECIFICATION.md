# ContractGuard: The Complete Policy Structure Specification (`contracts.yaml`)

> **Project:** ContractGuard Platform  
> **Purpose:** Definitive Technical Specification of the Security Contract Schema  
> **Prepared for:** Academic Journal Reviewers & Hackathon Engineering Evaluation

---

## 1. What is a "Policy Structure" for AI Agents?

In standard generative AI, developers control models using **system prompts** (*"You are a helpful assistant. Do not reveal secrets"*).  
In **Agentic AI** (where the model has tools, API keys, databases, and money-moving capabilities), prompts are completely inadequate because:
1. Prompts are **in-band**: untrusted external text (e.g. an email) mixes directly with the system prompt, causing the LLM to follow the attacker's instructions.
2. Prompts are **non-deterministic**: an LLM might obey a prompt 90% of the time, but fail under slight paraphrasing or adversarial token perturbations.

A **Policy Structure** is an **out-of-band, declarative security contract** that governs the agent's runtime environment. It acts like an operating system kernel or API gateway reference monitor:
- Regardless of what the LLM *thinks* or *decides* to do, the proposed action must pass through the policy engine before the API call is executed.
- If the tool, parameter, or cumulative budget breaches the policy contract, execution is deterministically blocked.

---

## 2. Master Policy Schema Specification

A ContractGuard security policy is serialized as a declarative YAML document (`contracts.yaml`). Below is the complete schema with type annotations and operational semantics:

```yaml
version: "2.0"

agent_metadata:
  agent_name: string                  # Unique identifier for the agent
  version: string                     # Semantic version of the contract
  description: string                 # Human-readable scope and purpose
  author: string                      # Author or synthesized model ID

# =====================================================================
# 1. GLOBAL AUTHORITY ENVELOPE (Session-Wide Invariant Ceilings)
# =====================================================================
global_envelope:
  # Session-wide budget ceiling stopping multi-turn salami-slicing attacks
  max_cumulative_budget: float        # e.g., 1000.00 (Total dollars or units allowed per session)
  
  # Maximum tool calls permitted per user request turn
  max_tool_invocations: integer       # e.g., 30 (Prevents infinite loop DoS attacks)
  
  # External network egress whitelisting
  allowed_domains: list[string]       # e.g., ["*.company.com", "api.stripe.com"]
  
  # Tools hard-banned regardless of user prompt or agent reasoning
  denied_tools: list[string]          # e.g., ["execute_shell", "delete_database", "read_env"]
  
  # Global effect caps
  restricted_effects: list[string]    # e.g., ["system.destructive", "auth.privilege_escalation"]

# =====================================================================
# 2. TOOL-LEVEL CONTRACTS (Per-Tool Invariants & Parameter Authority)
# =====================================================================
tools:
  <tool_name>:
    description: string               # Purpose of the tool
    
    # Canonical semantic classification
    effects: list[string]             # e.g., ["financial.transfer", "data.ingress", "data.egress", "system.exec", "ui.output"]
    
    # Selective verification triggers
    requires_semantic_verification: bool   # If true, invokes Nemotron on Nebius Token Factory
    requires_human_approval: bool          # If true, pauses for 2FA confirmation if threshold met
    
    # Parameter-level source authority rules (Evidence-Binding)
    parameters:
      <parameter_name>:
        param_type: string            # "number" | "string" | "email" | "url" | "regex"
        min_value: float (optional)   # Minimum numeric bound
        max_value: float (optional)   # Maximum numeric bound per individual invocation
        allowed_pattern: regex (opt)  # Regular expression constraint (e.g. "^ACC-[0-9]{5}$")
        allowed_values: list (opt)    # Enum of permitted categorical values
        
        # Who is allowed to provide this parameter value?
        source_authority: list[string]
        # Permitted values:
        #   - "authenticated_user"    # Directly stated by the verified user in the initial prompt
        #   - "verified_internal_db"  # Retrieved from trusted company database
        #   - "system_config"         # Hardcoded in environment / system config
        
        # Which ingress channels are strictly forbidden from instantiating this value?
        untrusted_sources_blocked: list[string]
        # Common untrusted sources:
        #   - "customer_email"        # Incoming email body or ticket
        #   - "web_scrape"            # Scraped external websites
        #   - "document_upload"       # User-uploaded PDFs, DOCX, or external attachments
        #   - "agent_memory"          # Stored conversation memory from prior unauthenticated sessions

# =====================================================================
# 3. TASK INVARIANTS & FINITE STATE MACHINE (Sequencing Rules)
# =====================================================================
task_invariants:
  prohibit_task_switch: bool          # Forbids external tool data from altering original user goal
  
  # State machine: Declares which tool can legally follow a previous tool
  allowed_transitions:
    <prior_tool_name>:
      - <next_allowed_tool_1>
      - <next_allowed_tool_2>
```

---

## 3. Comparative Analysis: How ContractGuard's Policy Compares to Academic Papers

The following table summarizes why existing policy structures in research literature failed and how ContractGuard's structure corrects them:

| Paper / Framework | Policy Representation | Why It Failed / Limitations | ContractGuard Solution |
|---|---|---|---|
| **Progent (UC Berkeley 2025)** | Formal Logic Domain-Specific Language (DSL) evaluated via Z3 SMT Solver. | Requires developers to write complex mathematical predicate calculus. High runtime latency. Lacks multi-turn cumulative budget tracking. | Intuitive declarative YAML. Sub-millisecond deterministic evaluation. Automated synthesis by NVIDIA Nemotron via Nebius. |
| **NeMo Guardrails (NVIDIA 2023)** | Colang (`.co` files) defining conversational dialog trees and user intent rails. | Focuses on dialogue steering and conversational moderation. Does not trace agent tool parameter origins or data provenance. | Bridges NVIDIA's guardrail philosophy into **agentic tool execution**, adding parameter provenance and canonical effect graphs. |
| **ActGov (2024)** | Role-Based Access Control (RBAC) mapping agent roles to allowed tool lists. | Coarse-grained: cannot detect when an attacker uses an *allowed* tool (`refund_money`) with a poisoned argument (`account=0xHACKER`). | Fine-grained **Parameter Evidence-Binding**: Allowed tools can execute, but sensitive parameters cannot derive from untrusted sources. |
| **FIDES (Microsoft 2025)** | Information Flow Control (IFC) dual-label taint tracking at token level. | **Taint Explosion:** Reading one untrusted email marks the entire context as tainted, blocking all subsequent benign actions. | **Parameter-Specific Evidence Binding:** Untrusted text is safely ingested for reading and summarization, but forbidden from feeding sink parameters. |
| **AGATE (2024)** | Dynamic tool capability grants tracked in runtime provenance graphs. | Budgets exist per grant; attackers bypass this by triggering new grants across turns. Graph updates add latency. | **Global Authority Envelope ($E_T$)**: Enforces session-wide ceilings that persist across all grants and multi-turn conversations. |

---

## 4. Production-Ready Policy Templates

### Template 1: Customer Support & Financial Operations Agent

```yaml
version: "2.0"
agent_metadata:
  agent_name: "CustomerSupportBillingAgent"
  version: "1.0.0"
  description: "Processes customer inquiries, order tracking, and authorized billing adjustments."

global_envelope:
  max_cumulative_budget: 1000.00
  max_tool_invocations: 25
  allowed_domains:
    - "*.internal.store.com"
    - "api.stripe.com"
  denied_tools:
    - "execute_shell"
    - "delete_database"
    - "drop_tables"

tools:
  read_customer_ticket:
    description: "Reads incoming support ticket text or customer email"
    effects: ["data.ingress"]
    requires_semantic_verification: false

  lookup_order_database:
    description: "Fetches verified customer order details from internal DB"
    effects: ["data.ingress"]
    requires_semantic_verification: false
    parameters:
      order_id:
        param_type: "string"
        allowed_pattern: "^(ORD-[0-9]{6})$"
        source_authority: ["authenticated_user", "customer_ticket"]

  process_refund:
    description: "Issues a refund to the original payment method"
    effects: ["financial.transfer"]
    requires_semantic_verification: false
    requires_human_approval: false
    parameters:
      amount:
        param_type: "number"
        min_value: 1.00
        max_value: 500.00
        source_authority: ["authenticated_user", "lookup_order_database"]
        untrusted_sources_blocked: ["customer_ticket", "web_scrape"]
      target_account:
        param_type: "string"
        allowed_pattern: "^(ACC-[0-9]{5}|ORIGINAL_PAYMENT_METHOD)$"
        source_authority: ["lookup_order_database"]
        untrusted_sources_blocked: ["customer_ticket"]

  reply_to_user:
    description: "Sends conversational response back to the customer"
    effects: ["ui.output"]
    requires_semantic_verification: true  # Prevents Markdown image exfiltration

task_invariants:
  prohibit_task_switch: true
  allowed_transitions:
    read_customer_ticket:
      - "lookup_order_database"
      - "reply_to_user"
    lookup_order_database:
      - "process_refund"
      - "reply_to_user"
    process_refund:
      - "reply_to_user"
```

---

### Template 2: DevOps & Autonomous Coding Agent

```yaml
version: "2.0"
agent_metadata:
  agent_name: "DevOpsEngineeringAgent"
  version: "1.0.0"
  description: "Inspects GitHub issues, reviews pull requests, and runs approved test suites."

global_envelope:
  max_cumulative_budget: 0.00
  max_tool_invocations: 50
  allowed_domains:
    - "api.github.com"
    - "registry.npmjs.org"
  denied_tools:
    - "rm_rf"
    - "format_disk"
    - "exfiltrate_secrets"

tools:
  read_github_issue:
    description: "Fetches issue comments and user reports"
    effects: ["data.ingress"]
    requires_semantic_verification: false

  run_unit_tests:
    description: "Executes test runner in an isolated container"
    effects: ["system.exec"]
    requires_semantic_verification: true
    parameters:
      test_suite:
        param_type: "string"
        allowed_pattern: "^(unit|integration|lint)$"
        source_authority: ["authenticated_user"]
        untrusted_sources_blocked: ["read_github_issue"]

  merge_pull_request:
    description: "Merges a verified PR branch into main"
    effects: ["code.mutate"]
    requires_semantic_verification: true
    requires_human_approval: true
    parameters:
      pr_number:
        param_type: "number"
        source_authority: ["authenticated_user"]
        untrusted_sources_blocked: ["read_github_issue"]

task_invariants:
  prohibit_task_switch: true
  allowed_transitions:
    read_github_issue:
      - "run_unit_tests"
      - "reply_to_user"
    run_unit_tests:
      - "merge_pull_request"
      - "reply_to_user"
```

---

## 5. Lifecycle of a Policy: Synthesis to Enforcement

```
┌────────────────────────────────────────────────────────┐
│ 1. Codebase Discovery (AST parser detects @tool)       │
│                                                        │
│ 2. Interactive Interview (Nemotron asks constraints)   │
│                                                        │
│ 3. Policy Synthesis (Emits validated contracts.yaml)   │
│                                                        │
│ 4. Cryptographic Hashing (Policy locked against drift) │
│                                                        │
│ 5. Runtime Interceptor (Enforces Invariants in <1 ms)  │
└────────────────────────────────────────────────────────┘
```
