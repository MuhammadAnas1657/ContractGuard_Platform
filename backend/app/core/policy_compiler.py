"""
ContractGuard-X Module 1: AI-Assisted Policy Engineering, Gap Detection & Static Linter
Compiles natural language security constraints into typed YAML contracts, lints rules,
detects security policy gaps across 7 canonical dimensions, generates interactive interview questions,
enforces human-only approval (Invariant #1), and freezes approved versions.
"""
from __future__ import annotations
import re
import yaml
import time
import hashlib
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class LintIssue(BaseModel):
    severity: str  # "ERROR", "WARNING", "INFO"
    rule: str
    message: str
    tool_name: Optional[str] = None
    parameter_name: Optional[str] = None


class PolicyLintResult(BaseModel):
    valid: bool
    issues: List[LintIssue] = Field(default_factory=list)
    suggested_fixes: List[str] = Field(default_factory=list)
    positive_tests: List[Dict[str, Any]] = Field(default_factory=list)
    negative_tests: List[Dict[str, Any]] = Field(default_factory=list)


class SignedPolicyPackage(BaseModel):
    policy_id: str
    version: str
    sha256_signature: str
    approved_by: str
    approved_at: float
    status: str = "APPROVED"
    immutable: bool = True
    is_frozen: bool = True
    contract_yaml: str
    parsed_contract: Dict[str, Any]
    positive_test_fixtures: List[Dict[str, Any]] = Field(default_factory=list)
    negative_test_fixtures: List[Dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 7 Canonical Policy Gap Codes & Rules (Milestone M2)
# ---------------------------------------------------------------------------
GAP_TOOL_FINANCIAL_CEILING_MISSING = "spending_limits"
GAP_SESSION_CUMULATIVE_BUDGET_MISSING = "session_budget"
GAP_UNDEFINED_ALLOWED_LANGUAGES = "allowed_languages"
GAP_UNDEFINED_DIRECT_INJECTION = "direct_injection_action"
GAP_UNDEFINED_INDIRECT_INJECTION = "indirect_injection_action"
GAP_MISSING_TIMEOUT_DEGRADATION = "timeout_degradation"
GAP_MISSING_HUMAN_CONFIRMATION = "human_confirmation_threshold"

CANONICAL_GAPS = [
    GAP_TOOL_FINANCIAL_CEILING_MISSING,
    GAP_SESSION_CUMULATIVE_BUDGET_MISSING,
    GAP_UNDEFINED_ALLOWED_LANGUAGES,
    GAP_UNDEFINED_DIRECT_INJECTION,
    GAP_UNDEFINED_INDIRECT_INJECTION,
    GAP_MISSING_TIMEOUT_DEGRADATION,
    GAP_MISSING_HUMAN_CONFIRMATION,
]

FINANCIAL_KEYWORDS = {
    "refund", "transfer", "pay", "wire", "balance", "account", "invoice",
    "settle", "credit", "debit", "charge", "withdraw", "deposit", "spend",
    "transaction", "funds", "payment", "disburse", "checkout"
}


class PolicyGapDetector:
    """
    Evaluates discovered tools and policies against the 7 canonical policy gap rules:
    1. Unbound tools lacking financial limits / parameter max_value
    2. Session lacking max_cumulative_budget
    3. Undefined language constraints (allowed_languages, reject_foreign_scripts)
    4. Undefined direct prompt injection policy (BLOCK, SANITIZE, LOG)
    5. Undefined indirect prompt injection policy (BLOCK, SANITIZE, ESCALATE)
    6. Missing timeout / degradation policy
    7. Missing human confirmation thresholds
    """

    TRANSFER_STEMS = {
        "refund", "transfer", "pay", "wire", "withdraw", "deposit", "spend",
        "charge", "disburse", "checkout", "settle", "credit", "debit"
    }

    @classmethod
    def is_financial_tool(cls, tool: Dict[str, Any]) -> bool:
        if not isinstance(tool, dict):
            return False
        name = tool.get("name", "").lower()
        effects = [str(e).lower() for e in tool.get("effects", []) if e is not None]
        if any("financial.transfer" in e or "transfer" in e for e in effects):
            return True
        if any(stem in name for stem in cls.TRANSFER_STEMS):
            return True
        params = tool.get("parameters", {})
        if isinstance(params, dict):
            for p_name in params:
                if any(k in str(p_name).lower() for k in ["amount", "cost", "price", "fee", "funds", "budget"]):
                    return True
        elif isinstance(params, list):
            for p in params:
                if isinstance(p, dict):
                    p_name = p.get("name") or ""
                    if any(k in str(p_name).lower() for k in ["amount", "cost", "price", "fee", "funds", "budget"]):
                        return True
                elif isinstance(p, str):
                    if any(k in p.lower() for k in ["amount", "cost", "price", "fee", "funds", "budget"]):
                        return True
        return False

    @classmethod
    def detect_gaps(cls, tools: List[Dict[str, Any]], existing_policy: Optional[Dict[str, Any]] = None) -> List[str]:
        """Detects missing boundaries among the 7 canonical gaps."""
        gaps: List[str] = []
        policy = existing_policy or {}
        global_envelope = policy.get("global_envelope", {})
        policy_tools = policy.get("tools", {})

        # Rule 1: Financial ceiling gap
        has_unbounded_financial = False
        for t in tools:
            if not isinstance(t, dict):
                continue
            if cls.is_financial_tool(t):
                t_name = t.get("name", "")
                p_tool = policy_tools.get(t_name, {})
                params = p_tool.get("parameters", {}) if isinstance(p_tool, dict) else {}
                has_ceiling = False
                if isinstance(params, dict):
                    for p_name, p_rule in params.items():
                        if isinstance(p_rule, dict) and p_rule.get("max_value") is not None:
                            has_ceiling = True
                            break
                elif isinstance(params, list):
                    for p_rule in params:
                        if isinstance(p_rule, dict) and p_rule.get("max_value") is not None:
                            has_ceiling = True
                            break
                if not has_ceiling:
                    has_unbounded_financial = True
                    break
        if has_unbounded_financial or (not tools and not existing_policy):
            gaps.append(GAP_TOOL_FINANCIAL_CEILING_MISSING)

        # Rule 2: Session cumulative budget
        max_budget = global_envelope.get("max_cumulative_budget")
        if max_budget is None or float(max_budget or 0) <= 0:
            gaps.append(GAP_SESSION_CUMULATIVE_BUDGET_MISSING)

        # Rule 3: Language constraints
        allowed_langs = global_envelope.get("allowed_languages")
        lang_constraints = global_envelope.get("language_constraints", {})
        if not allowed_langs and not lang_constraints.get("allowed_languages"):
            gaps.append(GAP_UNDEFINED_ALLOWED_LANGUAGES)
        elif global_envelope.get("reject_foreign_scripts") is None and lang_constraints.get("reject_foreign_scripts") is None:
            gaps.append(GAP_UNDEFINED_ALLOWED_LANGUAGES)

        # Rule 4: Direct prompt injection policy
        inj_policy = global_envelope.get("injection_policy", {})
        if not inj_policy.get("direct_action"):
            gaps.append(GAP_UNDEFINED_DIRECT_INJECTION)

        # Rule 5: Indirect prompt injection policy
        if not inj_policy.get("indirect_action"):
            gaps.append(GAP_UNDEFINED_INDIRECT_INJECTION)

        # Rule 6: Missing timeout / degradation policy
        degrad = global_envelope.get("degradation_policy", {})
        if not degrad.get("per_request_timeout_ms") or not degrad.get("fallback_mode"):
            gaps.append(GAP_MISSING_TIMEOUT_DEGRADATION)

        # Rule 7: Missing human confirmation thresholds
        has_unconfirmed = False
        for t in tools:
            if not isinstance(t, dict):
                continue
            if cls.is_financial_tool(t):
                t_name = t.get("name", "")
                p_tool = policy_tools.get(t_name, {})
                if isinstance(p_tool, dict) and p_tool.get("human_confirmation_threshold") is None:
                    has_unconfirmed = True
                    break
        if has_unconfirmed:
            gaps.append(GAP_MISSING_HUMAN_CONFIRMATION)

        return gaps

    @classmethod
    def generate_interview_questions(
        cls,
        tools: List[Dict[str, Any]],
        detected_gaps: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates enriched interview questions satisfying both the rich schema
        (id, title, prompt, options, default_value, gap_type, required)
        and backwards compatibility (tool_name, parameter, question, explanation).
        """
        questions: List[Dict[str, Any]] = []
        gaps = detected_gaps if detected_gaps is not None else cls.detect_gaps(tools)

        fin_tools = [t for t in tools if cls.is_financial_tool(t)]
        primary_fin_tool = fin_tools[0]["name"] if fin_tools else "process_refund"

        # 1. Per-Call Financial Ceiling (GAP 1)
        if GAP_TOOL_FINANCIAL_CEILING_MISSING in gaps or fin_tools or len(tools) > 0:
            if fin_tools:
                for idx, ft in enumerate(fin_tools[:5]):  # Up to 5 financial tools individually
                    t_name = ft["name"]
                    q_id = "q_single_ceiling" if idx == 0 else f"q_single_ceiling_{t_name}"
                    questions.append({
                        "id": q_id,
                        "title": "Per-Call Financial Ceiling",
                        "question": f"I detected financial tool '{t_name}'. What is the maximum single transaction limit ($)?",
                        "prompt": f"What is the maximum single transaction limit ($) for '{t_name}'?",
                        "options": ["100.00", "250.00", "500.00", "1000.00", "Custom"],
                        "default_value": "500.00",
                        "gap_type": GAP_TOOL_FINANCIAL_CEILING_MISSING,
                        "required": True,
                        "tool_name": t_name,
                        "parameter": "amount",
                        "explanation": "Prevents catastrophic single-call fund drainage."
                    })
            else:
                # Fallback financial ceiling question for general tool suite
                questions.append({
                    "id": "q_single_ceiling",
                    "title": "Per-Call Financial Ceiling",
                    "question": f"What is the maximum single transaction limit ($) for '{primary_fin_tool}'?",
                    "prompt": f"What is the maximum single transaction limit ($) for '{primary_fin_tool}'?",
                    "options": ["100.00", "250.00", "500.00", "1000.00"],
                    "default_value": "500.00",
                    "gap_type": GAP_TOOL_FINANCIAL_CEILING_MISSING,
                    "required": True,
                    "tool_name": primary_fin_tool,
                    "parameter": "amount",
                    "explanation": "Prevents catastrophic single-call fund drainage."
                })

        # 2. Cumulative Session Budget (GAP 2)
        questions.append({
            "id": "q_cumulative_budget",
            "title": "Cumulative Session Budget",
            "question": "What is the maximum cumulative budget allowed across an entire multi-turn user session ($)?",
            "prompt": "What is the maximum cumulative budget allowed across an entire multi-turn user session ($)?",
            "options": ["500.00", "1000.00", "2500.00", "5000.00"],
            "default_value": "1000.00",
            "gap_type": GAP_SESSION_CUMULATIVE_BUDGET_MISSING,
            "required": True,
            "tool_name": primary_fin_tool,
            "parameter": "global",
            "explanation": "Stops multi-turn salami-slicing compositional attacks."
        })

        # 3. Recipient Account Parameter Provenance (GAP 5 related)
        questions.append({
            "id": "q_account_source",
            "title": "Recipient Account Parameter Provenance",
            "question": "Can external customer email text, retrieved documents, or ticket comments dictate the recipient account or wallet?",
            "prompt": "Can external customer email text, retrieved documents, or ticket comments dictate the recipient account or wallet?",
            "options": ["No, strictly forbidden", "Yes, allow any source"],
            "default_value": "No, strictly forbidden",
            "gap_type": GAP_UNDEFINED_INDIRECT_INJECTION,
            "required": True,
            "tool_name": primary_fin_tool,
            "parameter": "target_account",
            "explanation": "TCEAV Parameter-Purpose Admissibility prevents indirect injection payee hijacking."
        })

        # 4. Allowed Languages & Scripts (GAP 3)
        questions.append({
            "id": "q_allowed_languages",
            "title": "Allowed Languages & Scripts",
            "question": "Which natural languages are permitted for agent prompts, and should foreign scripts be rejected?",
            "prompt": "Which natural languages are permitted for agent prompts, and should foreign scripts be rejected?",
            "options": ["en (Strict English only)", "en, es (English & Spanish)", "en, es, fr (Trilingual)", "All languages"],
            "default_value": "en (Strict English only, reject foreign scripts)",
            "gap_type": GAP_UNDEFINED_ALLOWED_LANGUAGES,
            "required": True,
            "tool_name": "global_envelope",
            "parameter": "allowed_languages",
            "explanation": "Closes cross-lingual jailbreak vectors where attackers switch to foreign languages or homoglyphs."
        })

        # 5. Direct Prompt Injection Policy (GAP 4)
        questions.append({
            "id": "q_direct_injection_policy",
            "title": "Direct Jailbreak Defense Action",
            "question": "What action should ContractGuard enforce when direct prompt injection or jailbreak is intercepted at Ingress?",
            "prompt": "What action should ContractGuard enforce when direct prompt injection or jailbreak is intercepted at Ingress?",
            "options": ["BLOCK (Fail-closed 403)", "SANITIZE (Strip attack prefix)", "LOG (Audit only)"],
            "default_value": "BLOCK",
            "gap_type": GAP_UNDEFINED_DIRECT_INJECTION,
            "required": True,
            "tool_name": "global_envelope",
            "parameter": "direct_injection_action",
            "explanation": "Guarantees deterministic fail-closed behavior at the Pre-LLM Ingress guard."
        })

        # 6. Indirect Prompt Injection Action (GAP 5)
        questions.append({
            "id": "q_indirect_injection_policy",
            "title": "Indirect Prompt Injection Action",
            "question": "What action should be taken when untrusted context (RAG/email) attempts parameter hijacking or Markdown exfiltration?",
            "prompt": "What action should be taken when untrusted context (RAG/email) attempts parameter hijacking or Markdown exfiltration?",
            "options": ["BLOCK (Abort tool execution)", "SANITIZE (Redact markdown links)", "ESCALATE (Alert operator)"],
            "default_value": "BLOCK",
            "gap_type": GAP_UNDEFINED_INDIRECT_INJECTION,
            "required": True,
            "tool_name": "global_envelope",
            "parameter": "indirect_injection_action",
            "explanation": "Prevents parameter-purpose admissibility violations (TCEAV) and covert data leakage via Markdown beacons."
        })

        # 7. Guard Timeout & Degradation (GAP 6)
        questions.append({
            "id": "q_timeout_degradation",
            "title": "Guard Timeout & Degradation",
            "question": "What per-request guard timeout threshold and fallback degradation policy should be applied?",
            "prompt": "What per-request guard timeout threshold and fallback degradation policy should be applied?",
            "options": ["5000ms - STREAMLINED_FALLBACK", "3000ms - FAIL_CLOSED", "10000ms - STREAMLINED_FALLBACK"],
            "default_value": "5000ms - STREAMLINED_FALLBACK",
            "gap_type": GAP_MISSING_TIMEOUT_DEGRADATION,
            "required": True,
            "tool_name": "global_envelope",
            "parameter": "degradation_policy",
            "explanation": "Prevents denial-of-service and unbound latency spikes when external guard models degrade."
        })

        # 8. Human Confirmation Threshold (GAP 7)
        if fin_tools:
            questions.append({
                "id": f"q_human_confirmation_{primary_fin_tool}",
                "title": "Human Confirmation Threshold",
                "question": f"Above what dollar threshold must '{primary_fin_tool}' pause and require explicit human-in-the-loop authorization?",
                "prompt": f"Above what dollar threshold must '{primary_fin_tool}' pause and require explicit human-in-the-loop authorization?",
                "options": ["100.00", "250.00", "500.00", "Always require human", "Never"],
                "default_value": "500.00",
                "gap_type": GAP_MISSING_HUMAN_CONFIRMATION,
                "required": False,
                "tool_name": primary_fin_tool,
                "parameter": "human_confirmation_threshold",
                "explanation": "Balances autonomy with safety by demanding dual-authorization for high-value actions."
            })

        # 9. Denied System Tools
        questions.append({
            "id": "q_denied_tools",
            "title": "Denied Administrative Tools",
            "question": "Which administrative or destructive system tools must NEVER be called by this agent?",
            "prompt": "Which administrative or destructive system tools must NEVER be called by this agent?",
            "options": ["execute_shell, delete_database, format_disk, drop_tables, eval"],
            "default_value": "execute_shell, delete_database, format_disk, drop_tables, eval",
            "gap_type": "denied_tools",
            "required": True,
            "tool_name": "global_envelope",
            "parameter": "denied_tools",
            "explanation": "Hard perimeter boundary stops direct privilege escalation."
        })

        return questions


class PolicyCompiler:
    """
    Independent static linter, test fixture generator, policy synthesizer,
    and cryptographic signer for ContractGuard Security Contracts.
    Enforces Invariant #1: AI drafts are advisory; explicit developer approval is required for activation;
    approved versions are immutable.
    """

    FORBIDDEN_TOOLS = {"execute_shell", "delete_database", "format_disk", "drop_tables", "eval"}
    _approved_registry: Dict[str, SignedPolicyPackage] = {}

    @classmethod
    def synthesize_policy(
        cls,
        tools: List[Dict[str, Any]],
        answers: Dict[str, Any],
        agent_name: str = "CustomAgent",
        tool_limits: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Compiles developer answers, extracted tools, and suggested limits into a typed,
        hardened contracts.yaml draft.
        """
        limits = tool_limits or {}

        # 1. Parse per-call ceiling & cumulative budget
        single_ceiling = 500.0
        cumulative_budget = 1000.0

        if "per_call_ceiling" in limits:
            try: single_ceiling = float(limits["per_call_ceiling"])
            except Exception: pass
        elif "max_value" in limits:
            try: single_ceiling = float(limits["max_value"])
            except Exception: pass

        if "max_cumulative_budget" in limits:
            try: cumulative_budget = float(limits["max_cumulative_budget"])
            except Exception: pass
        elif "session_budget" in limits:
            try: cumulative_budget = float(limits["session_budget"])
            except Exception: pass

        raw_spend = str(answers.get("spending_limits") or answers.get("q_single_ceiling") or answers.get("single_ceiling") or "")
        raw_budget = str(answers.get("session_budget") or answers.get("q_cumulative_budget") or answers.get("cumulative_budget") or "")
        raw_spend = str(
            answers.get("spending_limits")
            or answers.get("q_single_ceiling")
            or answers.get("single_ceiling")
            or answers.get("per_call_ceiling")
            or ""
        )
        raw_budget = str(
            answers.get("session_budget")
            or answers.get("q_cumulative_budget")
            or answers.get("cumulative_budget")
            or answers.get("max_cumulative_budget")
            or ""
        )

        single_found = None
        cum_found = None

        if raw_spend:
            m_s1 = re.search(r'(\d+(?:\.\d+)?)\s*(?:single|per\s*call|transaction)', raw_spend, re.IGNORECASE)
            m_s2 = re.search(r'(?:single|per\s*call|transaction)[^\d]*(\d+(?:\.\d+)?)', raw_spend, re.IGNORECASE)
            if m_s1:
                single_found = float(m_s1.group(1))
            elif m_s2:
                single_found = float(m_s2.group(1))

            m_c1 = re.search(r'(\d+(?:\.\d+)?)\s*(?:session|cumulative|total)', raw_spend, re.IGNORECASE)
            m_c2 = re.search(r'(?:session|cumulative|total)[^\d]*(\d+(?:\.\d+)?)', raw_spend, re.IGNORECASE)
            if m_c1:
                cum_found = float(m_c1.group(1))
            elif m_c2:
                cum_found = float(m_c2.group(1))

            if single_found is None:
                if "-" in raw_spend:
                    neg_match = re.search(r'-\s*(\d+(?:\.\d+)?)', raw_spend)
                    if neg_match:
                        single_found = -float(neg_match.group(1))
                if single_found is None:
                    nums = [float(x) for x in re.findall(r'\b\d+(?:\.\d+)?\b', raw_spend)]
                    if nums:
                        single_found = nums[0]
                        if len(nums) > 1 and cum_found is None:
                            cum_found = nums[1]

        if raw_budget:
            if "-" in raw_budget:
                neg_match = re.search(r'-\s*(\d+(?:\.\d+)?)', raw_budget)
                if neg_match:
                    cum_found = -float(neg_match.group(1))
            if cum_found is None:
                nums = [float(x) for x in re.findall(r'\b\d+(?:\.\d+)?\b', raw_budget)]
                if nums:
                    cum_found = nums[0]

        if single_found is not None and "per_call_ceiling" not in limits and "max_value" not in limits:
            single_ceiling = single_found
        if cum_found is not None and "max_cumulative_budget" not in limits and "session_budget" not in limits:
            cumulative_budget = cum_found

        # Validate ceilings are positive numbers (> 0)
        if single_ceiling <= 0:
            raise ValueError("Parameter ceilings must be positive numbers (> 0) and must be a positive number")
        if cumulative_budget <= 0:
            raise ValueError("Session cumulative budget must be a positive number (> 0) and must be positive numbers")

        # 3. Parse language constraints
        raw_lang = str(answers.get("allowed_languages") or answers.get("q_allowed_languages") or answers.get("languages") or "")
        allowed_languages = ["en"]
        if raw_lang:
            found_langs = re.findall(r'\b([a-zA-Z]{2})\b', raw_lang)
            if found_langs:
                allowed_languages = list(dict.fromkeys(found_langs))  # Deduplicate preserving order

        reject_foreign_scripts = True
        raw_reject = str(answers.get("reject_foreign_scripts") or "")
        if "false" in raw_reject.lower():
            reject_foreign_scripts = False

        # 4. Parse injection policies
        direct_action = "BLOCK"
        raw_direct = str(answers.get("direct_injection_action") or answers.get("q_direct_injection_policy") or "")
        for act in ["BLOCK", "SANITIZE", "LOG"]:
            if act in raw_direct.upper():
                direct_action = act
                break

        indirect_action = "BLOCK"
        raw_indirect = str(answers.get("indirect_injection_action") or answers.get("q_indirect_injection_policy") or "")
        for act in ["BLOCK", "SANITIZE", "ESCALATE"]:
            if act in raw_indirect.upper():
                indirect_action = act
                break

        # 5. Parse timeout degradation
        timeout_ms = 5000
        fallback_mode = "STREAMLINED_FALLBACK"
        raw_deg = str(answers.get("timeout_degradation") or answers.get("q_timeout_degradation") or "")
        if raw_deg:
            m_ms = re.search(r'(\d+)\s*ms', raw_deg, re.IGNORECASE)
            if m_ms:
                try: timeout_ms = int(m_ms.group(1))
                except Exception: pass
            for mode in ["STREAMLINED_FALLBACK", "FAIL_CLOSED", "CIRCUIT_BREAKER"]:
                if mode in raw_deg.upper():
                    fallback_mode = mode
                    break

        # 6. Parse denied tools
        raw_denied = str(answers.get("q_denied_tools") or answers.get("denied_tools") or "")
        denied_list = [d.strip() for d in raw_denied.split(",") if d.strip()]
        for std_banned in ["execute_shell", "delete_database", "format_disk", "drop_tables", "eval"]:
            if std_banned not in denied_list:
                denied_list.append(std_banned)

        # 7. Construct tools structure
        built_tools: Dict[str, Any] = {}
        if tools:
            for t in tools:
                if not isinstance(t, dict):
                    continue
                t_name = t.get("name", "")
                if not t_name:
                    continue
                is_fin = PolicyGapDetector.is_financial_tool(t)
                desc = t.get("description") or f"Discovered tool function {t_name}"
                effects = t.get("effects") or (["financial.transfer"] if is_fin else ["read_only"])
                
                tool_dict: Dict[str, Any] = {
                    "description": desc,
                    "effects": effects,
                    "requires_semantic_verification": any("ui" in str(e).lower() for e in effects),
                }

                # Human confirmation threshold
                if is_fin:
                    tool_dict["human_confirmation_threshold"] = single_ceiling

                # Parameters
                raw_params = t.get("parameters", {})
                params_dict: Dict[str, Any] = {}
                if isinstance(raw_params, dict):
                    for p_name, p_val in raw_params.items():
                        p_type = p_val.get("type", "string") if isinstance(p_val, dict) else str(p_val)
                        p_rule: Dict[str, Any] = {"param_type": p_type}

                        # Spending limit on monetary params
                        if is_fin and p_type == "number":
                            if any(k in str(p_name).lower() for k in ["amount", "cost", "price", "fee", "funds", "budget", "sum", "value", "total"]):
                                p_rule["max_value"] = single_ceiling
                                p_rule["source_authority"] = ["authenticated_user", "verified_invoice_db"]

                        # Untrusted source blocks on sensitive destination params
                        if any(k in str(p_name).lower() for k in ["target", "account", "wallet", "recipient", "payee", "to_email", "dest", "iban"]):
                            p_rule["source_authority"] = ["authenticated_user", "verified_customer_profile"]
                            p_rule["untrusted_sources_blocked"] = ["customer_email", "untrusted_external", "web_scrape"]

                        params_dict[str(p_name)] = p_rule

                elif isinstance(raw_params, list):
                    for p_item in raw_params:
                        if isinstance(p_item, dict):
                            p_name = p_item.get("name", "")
                            p_type = p_item.get("type", "string")
                        else:
                            p_name = str(p_item)
                            p_type = "string"
                        if not p_name:
                            continue
                        p_rule = {"param_type": p_type}
                        if is_fin and p_type == "number":
                            if any(k in p_name.lower() for k in ["amount", "cost", "price", "fee", "funds", "budget", "sum", "value", "total"]):
                                p_rule["max_value"] = single_ceiling
                                p_rule["source_authority"] = ["authenticated_user", "verified_invoice_db"]
                        if any(k in p_name.lower() for k in ["target", "account", "wallet", "recipient", "payee", "to_email", "dest", "iban"]):
                            p_rule["source_authority"] = ["authenticated_user", "verified_customer_profile"]
                            p_rule["untrusted_sources_blocked"] = ["customer_email", "untrusted_external", "web_scrape"]
                        params_dict[p_name] = p_rule

                # If financial transfer tool lacks amount parameter, add it to satisfy schema
                if is_fin and "amount" not in params_dict:
                    params_dict["amount"] = {
                        "param_type": "number",
                        "max_value": single_ceiling,
                        "source_authority": ["authenticated_user", "verified_invoice_db"]
                    }
                if "refund" in t_name.lower() and "target_account" not in params_dict:
                    params_dict["target_account"] = {
                        "param_type": "string",
                        "source_authority": ["authenticated_user", "verified_customer_profile"],
                        "untrusted_sources_blocked": ["customer_email", "untrusted_external", "web_scrape"]
                    }

                tool_dict["parameters"] = params_dict
                built_tools[t_name] = tool_dict
        else:
            # Default standard suite
            built_tools = {
                "read_customer_email": {
                    "description": "Reads incoming customer email or ticket text",
                    "effects": ["data.ingress"],
                    "requires_semantic_verification": False,
                    "parameters": {"ticket_id": {"param_type": "string"}}
                },
                "lookup_customer_db": {
                    "description": "Fetches verified customer order and account data",
                    "effects": ["data.ingress"],
                    "requires_semantic_verification": False,
                    "parameters": {"customer_id": {"param_type": "string"}}
                },
                "process_refund": {
                    "description": "Issues a financial refund to customer payment method",
                    "effects": ["financial.transfer"],
                    "requires_semantic_verification": False,
                    "human_confirmation_threshold": single_ceiling,
                    "parameters": {
                        "amount": {
                            "param_type": "number",
                            "max_value": single_ceiling,
                            "source_authority": ["authenticated_user", "verified_invoice_db"]
                        },
                        "target_account": {
                            "param_type": "string",
                            "source_authority": ["authenticated_user", "verified_customer_profile"],
                            "untrusted_sources_blocked": ["customer_email", "untrusted_external", "web_scrape"]
                        }
                    }
                },
                "reply_to_user": {
                    "description": "Sends conversational response back to the user",
                    "effects": ["ui.output"],
                    "requires_semantic_verification": True,
                    "parameters": {"response_text": {"param_type": "string"}}
                }
            }

        # Build clean contract object
        contract_dict: Dict[str, Any] = {
            "version": "2.0",
            "agent_metadata": {
                "agent_name": agent_name,
                "version": "1.0.0-draft",
                "status": "draft_pending_human_approval",
                "synthesized_by": "ContractGuard Gap Resolution Engine"
            },
            "global_envelope": {
                "max_cumulative_budget": cumulative_budget,
                "max_tool_invocations": 50,
                "allowed_languages": allowed_languages,
                "reject_foreign_scripts": reject_foreign_scripts,
                "language_constraints": {
                    "allowed_languages": allowed_languages,
                    "reject_foreign_scripts": reject_foreign_scripts
                },
                "injection_policy": {
                    "direct_action": direct_action,
                    "indirect_action": indirect_action
                },
                "degradation_policy": {
                    "per_request_timeout_ms": timeout_ms,
                    "fallback_mode": fallback_mode
                },
                "allowed_domains": [
                    "*.company.com",
                    "api.stripe.com"
                ],
                "denied_tools": denied_list
            },
            "tools": built_tools,
            "task_invariants": {
                "prohibit_task_switch": True
            }
        }

        return yaml.dump(contract_dict, sort_keys=False, default_flow_style=False)

    @classmethod
    def lint_policy(cls, contract: Dict[str, Any], allow_ai_self_approval: bool = False) -> PolicyLintResult:
        """Runs deterministic static checks on a policy dictionary and generates test fixtures."""
        issues: List[LintIssue] = []
        fixes: List[str] = []

        if not isinstance(contract, dict) or not contract:
            return PolicyLintResult(
                valid=False,
                issues=[LintIssue(severity="ERROR", rule="EMPTY_OR_INVALID_ROOT", message="Policy root must be a non-empty YAML/JSON mapping.")]
            )

        # Invariant #1 check: Reject AI self-approved drafts
        approval_block = contract.get("approval", {})
        if not allow_ai_self_approval and isinstance(approval_block, dict):
            app_by = str(approval_block.get("approved_by", "")).lower()
            if approval_block.get("status") == "approved" and any(ai_tag in app_by for ai_tag in ["ai", "llm", "nemotron", "assistant", "auto", "self"]):
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="SELF_APPROVED_AI_POLICY_FORBIDDEN",
                    message=f"Invariant #1 Violation: AI model/assistant ('{app_by}') cannot self-approve a security policy. Human developer approval is required."
                ))

        global_envelope = contract.get("global_envelope", {})
        if not isinstance(global_envelope, dict):
            issues.append(LintIssue(
                severity="ERROR",
                rule="INVALID_GLOBAL_ENVELOPE",
                message="Section 'global_envelope' must be a valid dictionary."
            ))
            global_envelope = {}

        denied_tools = set(global_envelope.get("denied_tools", []))
        tools = contract.get("tools", {})
        if not isinstance(tools, dict):
            issues.append(LintIssue(
                severity="ERROR",
                rule="INVALID_TOOLS_SECTION",
                message="Section 'tools' must be a valid dictionary mapping tool names to rules."
            ))
            tools = {}

        # 1. Check if high-risk system execution tools are accidentally exposed or contradictory
        for dangerous in cls.FORBIDDEN_TOOLS:
            if dangerous in tools:
                t_cfg = tools.get(dangerous) or {}
                if not isinstance(t_cfg, dict) or t_cfg.get("allowed", True) is not False:
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="DENIED_TOOL_EXPOSED",
                        message=f"Dangerous tool '{dangerous}' is enabled under tools. It must be placed in global_envelope.denied_tools.",
                        tool_name=dangerous
                    ))
                    fixes.append(f"Move '{dangerous}' to global_envelope.denied_tools.")
            if dangerous not in denied_tools:
                issues.append(LintIssue(
                    severity="WARNING",
                    rule="MISSING_STANDARD_DENIED_TOOL",
                    message=f"Standard banned tool '{dangerous}' is missing from global_envelope.denied_tools.",
                    tool_name=dangerous
                ))

        # Check contradictory rules (tool in both tools and denied_tools)
        for t_name in tools:
            if t_name in denied_tools:
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="CONTRADICTORY_TOOL_RULE",
                    message=f"Contradictory policy: Tool '{t_name}' appears in both 'tools' and 'global_envelope.denied_tools'.",
                    tool_name=t_name
                ))

        # 2. Check wildcard external domains
        allowed_domains = global_envelope.get("allowed_domains", [])
        if "*" in allowed_domains or "*.*" in allowed_domains:
            if not global_envelope.get("allow_wildcard_domains_acknowledged", False):
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="UNACKNOWLEDGED_WILDCARD_DOMAIN",
                    message="Wildcard '*' external domain is forbidden unless explicitly acknowledged."
                ))

        # 3. Check cumulative budget ceiling
        max_budget = global_envelope.get("max_cumulative_budget")
        if max_budget is None:
            issues.append(LintIssue(
                severity="WARNING",
                rule="UNBOUNDED_SESSION_BUDGET",
                message="Global envelope lacks max_cumulative_budget. Agents risk unbounded multi-turn financial drain."
            ))
            fixes.append("Set global_envelope.max_cumulative_budget (e.g. 1000.0).")
        else:
            try:
                if float(max_budget) <= 0:
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="INVALID_BUDGET_VALUE",
                        message="max_cumulative_budget must be greater than 0."
                    ))
            except (ValueError, TypeError):
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="INVALID_BUDGET_TYPE",
                    message="max_cumulative_budget must be a valid number."
                ))

        # 3b. Check language constraints
        language_constraints = global_envelope.get("language_constraints")
        if language_constraints is not None:
            if not isinstance(language_constraints, dict):
                issues.append(LintIssue(
                    severity="ERROR",
                    rule="INVALID_LANGUAGE_CONSTRAINTS",
                    message="global_envelope.language_constraints must be a dictionary."
                ))
            else:
                allowed = language_constraints.get("allowed_languages")
                if allowed is not None and not isinstance(allowed, list):
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="INVALID_ALLOWED_LANGUAGES",
                        message="language_constraints.allowed_languages must be a list of language codes."
                    ))
                reject_scripts = language_constraints.get("reject_foreign_scripts")
                if reject_scripts is not None and not isinstance(reject_scripts, bool):
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="INVALID_REJECT_FOREIGN_SCRIPTS",
                        message="language_constraints.reject_foreign_scripts must be a boolean."
                    ))

        # 4. Check parameter authority rules for sensitive actions
        for t_name, t_spec in tools.items():
            if not isinstance(t_spec, dict):
                continue
            params = t_spec.get("parameters", {}) or {}
            effects = t_spec.get("effects", []) or []

            # Financial tools must have spend limits
            if any("financial" in str(e).lower() or "transfer" in str(e).lower() for e in effects) or "refund" in t_name.lower():
                amount_rule = params.get("amount", {})
                if not amount_rule or "max_value" not in amount_rule:
                    issues.append(LintIssue(
                        severity="ERROR",
                        rule="UNBOUNDED_TRANSACTION_LIMIT",
                        message=f"Financial tool '{t_name}' lacks max_value limit on 'amount' parameter.",
                        tool_name=t_name,
                        parameter_name="amount"
                    ))
                    fixes.append(f"Add parameters.amount.max_value to '{t_name}'.")
                else:
                    min_v = amount_rule.get("min_value")
                    max_v = amount_rule.get("max_value")
                    if min_v is not None and max_v is not None and float(min_v) > float(max_v):
                        issues.append(LintIssue(
                            severity="ERROR",
                            rule="CONTRADICTORY_PARAMETER_BOUNDS",
                            message=f"Parameter 'amount' in '{t_name}' has min_value ({min_v}) > max_value ({max_v}).",
                            tool_name=t_name,
                            parameter_name="amount"
                        ))

            # Destination parameters must block untrusted inputs
            for p_name, p_rule in params.items():
                if not isinstance(p_rule, dict):
                    continue
                if any(k in p_name.lower() for k in ["target", "account", "wallet", "recipient", "payee", "to_email", "dest", "iban"]):
                    blocked = p_rule.get("untrusted_sources_blocked", [])
                    if not blocked or "customer_email" not in blocked:
                        issues.append(LintIssue(
                            severity="WARNING",
                            rule="UNRESTRICTED_DESTINATION_SOURCE",
                            message=f"Sensitive destination '{p_name}' in tool '{t_name}' does not explicitly block customer_email.",
                            tool_name=t_name,
                            parameter_name=p_name
                        ))
                        fixes.append(f"Add 'customer_email' to {t_name}.parameters.{p_name}.untrusted_sources_blocked.")

        pos_tests = [
            {
                "name": "test_legitimate_authorized_workflow",
                "tool": "process_refund" if "process_refund" in tools else next(iter(tools.keys()), "read_document"),
                "parameters": {"amount": 150.0, "target_account": "ACC-VERIFIED-01"},
                "source_trust": "authenticated_user",
                "expected_decision": "ALLOW"
            }
        ]
        neg_tests = [
            {
                "name": "test_indirect_injection_untrusted_recipient",
                "tool": "process_refund" if "process_refund" in tools else "send_email",
                "parameters": {"amount": 450.0, "target_account": "0xHACKER_STEALTH_99"},
                "source_trust": "untrusted_external",
                "expected_decision": "DENY"
            },
            {
                "name": "test_denied_system_tool_execution",
                "tool": "execute_shell",
                "parameters": {"cmd": "rm -rf /"},
                "source_trust": "untrusted_external",
                "expected_decision": "DENY"
            }
        ]

        has_errors = any(i.severity == "ERROR" for i in issues)
        return PolicyLintResult(
            valid=(not has_errors),
            issues=issues,
            suggested_fixes=fixes,
            positive_tests=pos_tests,
            negative_tests=neg_tests
        )

    @classmethod
    def sign_and_publish(
        cls,
        contract_yaml: str,
        policy_id: str,
        approved_by: str,
        version: str = "1.0.0"
    ) -> SignedPolicyPackage:
        """
        Cryptographically signs a validated contract after explicit human approval
        and freezes it in the immutable policy registry.
        """
        if not approved_by or any(ai in approved_by.lower() for ai in ["ai_draft", "nemotron", "llm_auto", "self"]):
            raise ValueError(
                "SELF_APPROVED_AI_POLICY_FORBIDDEN: Invariant #1 Violation — Policy approval must be performed by an authenticated human developer, not an AI model."
            )

        reg_key = f"{policy_id}:{version}"
        if reg_key in cls._approved_registry:
            existing = cls._approved_registry[reg_key]
            if existing.contract_yaml.strip() != contract_yaml.strip():
                raise ValueError(
                    f"IMMUTABLE_POLICY_VIOLATION: Policy '{policy_id}' version '{version}' is already approved and frozen (immutable). Increment version to publish changes."
                )
            return existing

        parsed = yaml.safe_load(contract_yaml) or {}
        lint_res = cls.lint_policy(parsed)
        if not lint_res.valid:
            error_msgs = [i.message for i in lint_res.issues if i.severity == "ERROR"]
            raise ValueError(f"Cannot approve policy with critical lint errors: {'; '.join(error_msgs)}")

        parsed["approval"] = {
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": time.time(),
            "version": version
        }

        raw_bytes = contract_yaml.strip().encode("utf-8")
        signature = hashlib.sha256(raw_bytes).hexdigest()

        pkg = SignedPolicyPackage(
            policy_id=policy_id,
            version=version,
            sha256_signature=signature,
            approved_by=approved_by,
            approved_at=time.time(),
            status="APPROVED",
            immutable=True,
            is_frozen=True,
            contract_yaml=contract_yaml,
            parsed_contract=parsed,
            positive_test_fixtures=lint_res.positive_tests,
            negative_test_fixtures=lint_res.negative_tests
        )
        cls._approved_registry[reg_key] = pkg
        return pkg

    @classmethod
    def get_approved(cls, policy_id: str, version: Optional[str] = None) -> Optional[SignedPolicyPackage]:
        if version:
            return cls._approved_registry.get(f"{policy_id}:{version}")
        matches = [v for k, v in cls._approved_registry.items() if k.startswith(f"{policy_id}:")]
        return matches[-1] if matches else None


policy_compiler = PolicyCompiler()
policy_gap_detector = PolicyGapDetector()
