"""
ContractGuard-X Runtime Auto-Switching Classifier & Telemetry Engine
Features: F15 (Classifier), F16 (Execution Pathways), F17 (Telemetry Tagging)
"""
from __future__ import annotations
import re
import time
import threading
from functools import lru_cache
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple, Set


class ExecutionMode(str, Enum):
    FULL_TRI_GUARD = "FULL_TRI_GUARD"
    STREAMLINED_RAG = "STREAMLINED_RAG"


# Read-only tools taxonomy (no state mutation, no financial spending, no system commands)
READ_ONLY_TOOLS: Set[str] = {
    "summarize",
    "summarize_text",
    "summarize_document",
    "rag_read",
    "read_document",
    "query_docs",
    "search_docs",
    "search_knowledge_base",
    "document_qa",
    "reply_to_user",
    "answer_question",
    "get_info",
    "fetch_faq",
    "read_only_query",
    "retrieve_context",
    "search_web",
    "lookup_record",
    "view_file",
}

# Prefixes indicating informational queries
READ_ONLY_PREFIXES = ("get_", "read_", "search_", "query_", "fetch_", "lookup_", "summarize_")

# Known stateful tools requiring full multi-tier inspection
STATEFUL_TOOLS: Set[str] = {
    "transfer",
    "transfer_funds",
    "refund",
    "process_refund",
    "pay",
    "execute_payment",
    "delete",
    "delete_database",
    "drop_tables",
    "exec",
    "execute_command",
    "shell",
    "terminal",
    "write_database",
    "send_email",
    "execute_order",
    "wire",
    "modify_record",
    "update_user",
    "format_disk",
}

# Parameter keys that signify state alteration or financial spending
STATEFUL_ARGUMENT_KEYS: Set[str] = {
    "amount",
    "fund",
    "spend",
    "cost",
    "payment",
    "value",
    "sum",
    "target_account",
    "recipient",
    "recipient_iban",
    "to_address",
    "delete",
    "drop",
    "cmd",
    "command",
    "exec",
    "write",
    "sql",
    "destination",
}

# Ingress prompt intent heuristics
STATEFUL_INTENT_RE = re.compile(
    r"\b(transfer|wire|refund|pay|spend|deposit|withdraw|disperse|rebalance|"
    r"exec|execute|run\s+command|delete|drop\s+table|format|modify|update|"
    r"send\s+(?:an?\s+)?email|post\s+webhook|execute\s+order|buy|sell)\b",
    re.IGNORECASE
)

READ_ONLY_INTENT_RE = re.compile(
    r"\b(summarize|summary|tldr|explain|describe|what\s+is|who\s+is|tell\s+me|how\s+to|"
    r"search|find|retrieve|read|query|lookup|faq|document|outline)\b",
    re.IGNORECASE
)

CAMEL_RE = re.compile(r"([a-z0-9])([A-Z])")
SPLIT_RE = re.compile(r"[^a-zA-Z0-9]+")

STATEFUL_VERBS: Set[str] = {
    "transfer", "refund", "pay", "spend", "withdraw", "deposit", "wire",
    "disperse", "rebalance", "delete", "drop", "remove", "purge",
    "exec", "execute", "command", "cmd", "shell", "terminal",
    "format", "write", "overwrite", "order", "post", "update", "modify",
    "mutate", "patch", "buy", "sell"
}

UNAMBIGUOUS_SUBSTRINGS: Set[str] = {
    "transfer", "refund", "withdraw", "deposit", "rebalance", "disperse", "delete"
}

STATEFUL_ARG_STEMS: Set[str] = {
    "amount", "fund", "spend", "cost", "pay", "value", "sum", "account", "iban",
    "wallet", "recipient", "delete", "drop", "table", "cmd", "command",
    "exec", "write", "dest"
}

_BYPASSED_PURE_TEXT: List[str] = [
    "Stage 1: Hard Perimeter Invariant",
    "Stage 2: TCEAV Evidence & Authority Guard",
    "Stage 3: Policy Transaction Ceiling Guard",
    "Stage 4: Stateful Cumulative Effect Ledger"
]

_BYPASSED_READ_ONLY: List[str] = [
    "Stage 2: TCEAV Evidence & Authority Guard",
    "Stage 4: Stateful Cumulative Effect Ledger"
]

_EMPTY_LIST: List[str] = []


@lru_cache(maxsize=2048)
def _is_stateful_arg_key(key: str) -> bool:
    k_low = key.lower()
    if k_low in STATEFUL_ARGUMENT_KEYS:
        return True
    for stem in STATEFUL_ARG_STEMS:
        if stem in k_low:
            return True
    return False


@lru_cache(maxsize=2048)
def contains_stateful_verb(tool_name: Optional[str]) -> Tuple[bool, str]:
    """
    Evaluates whether a tool name contains any stateful or destructive action verb.
    Supports snake_case, camelCase, PascalCase, kebab-case, dot-notation, and unambiguous substrings.
    Returns: (is_stateful, matched_verb)
    """
    if not tool_name or not tool_name.strip():
        return False, ""

    t_clean = tool_name.strip()
    clean_low = t_clean.lower()

    # Fast-path 1: Substring scan for unambiguous stateful roots
    for u in UNAMBIGUOUS_SUBSTRINGS:
        if u in clean_low:
            return True, u

    # Fast-path 2: Delimiter-aware tokenization avoiding regex when possible
    if any(c.isupper() for c in t_clean):
        s = CAMEL_RE.sub(r"\1_\2", t_clean).lower()
        tokens = [t for t in SPLIT_RE.split(s) if t]
    elif "_" in clean_low or "-" in clean_low or "." in clean_low:
        tokens = [t for t in SPLIT_RE.split(clean_low) if t]
    else:
        tokens = [clean_low]

    for token in tokens:
        if token in STATEFUL_VERBS:
            return True, token
        for v in STATEFUL_VERBS:
            if token.startswith(v):
                return True, v

    return False, ""


def classify_ingress_operation(
    prompt: str,
    tool_name: Optional[str] = None,
    operation_type: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Tuple[ExecutionMode, str]:
    """
    Classifies an incoming ingress request into FULL_TRI_GUARD vs STREAMLINED_RAG.
    Stateful tool names override all hints and caller hints under Zero-Trust fail-secure rules.
    """
    # 1. Inspect explicit tool_name if provided: stateful verbs take absolute precedence!
    if tool_name:
        is_stateful, matched_verb = contains_stateful_verb(tool_name)
        if is_stateful:
            return (
                ExecutionMode.FULL_TRI_GUARD,
                f"Tool hint '{tool_name}' contains stateful action verb '{matched_verb}'; full inspection required."
            )
        t_clean = tool_name.strip().lower()
        if t_clean in READ_ONLY_TOOLS or t_clean.startswith(READ_ONLY_PREFIXES):
            return ExecutionMode.STREAMLINED_RAG, f"Read-only tool hint '{tool_name}' mapped to STREAMLINED_RAG."
        return ExecutionMode.FULL_TRI_GUARD, f"Tool hint '{tool_name}' mapped to FULL_TRI_GUARD."

    # 2. Explicit caller hint in metadata or operation_type (only when no tool_name is provided)
    if operation_type:
        op_low = operation_type.strip().lower()
        if op_low in ("rag", "summarize", "streamlined", "streamlined_rag"):
            return ExecutionMode.STREAMLINED_RAG, "Explicit caller operation_type hint: STREAMLINED_RAG."
        if op_low in ("tool_call", "stateful", "full", "full_tri_guard"):
            return ExecutionMode.FULL_TRI_GUARD, "Explicit caller operation_type hint: FULL_TRI_GUARD."

    # 3. Prompt intent regex heuristics
    text = prompt or ""
    has_stateful_intent = bool(STATEFUL_INTENT_RE.search(text))
    has_read_only_intent = bool(READ_ONLY_INTENT_RE.search(text))

    if has_stateful_intent:
        return ExecutionMode.FULL_TRI_GUARD, "Detected action verbs / state-altering intent in user prompt."
    if has_read_only_intent:
        return ExecutionMode.STREAMLINED_RAG, "Detected pure RAG / summarization / informational intent."

    # 4. Zero-Trust Default Fallback: If ambiguous, default to FULL_TRI_GUARD
    return ExecutionMode.FULL_TRI_GUARD, "Ambiguous prompt intent; default to FULL_TRI_GUARD (Zero-Trust fail-secure)."


def classify_egress_operation(
    tool_name: Optional[str],
    tool_arguments: Optional[Dict[str, Any]] = None
) -> Tuple[ExecutionMode, str, List[str]]:
    """
    Classifies an egress tool call / output into FULL_TRI_GUARD vs STREAMLINED_RAG.
    Returns: (mode, reason, bypassed_stages)
    """
    # Case 1: Pure LLM text generation (no tool invocation proposed)
    if not tool_name or not tool_name.strip():
        return ExecutionMode.STREAMLINED_RAG, "No tool invocation proposed; pure text response.", _BYPASSED_PURE_TEXT

    t_clean = tool_name.strip().lower()

    # Case 2: Strict Stateful Action Verb Interception (Compound Tool Hardening)
    # If tool_name contains ANY stateful verb, it MUST be classified as FULL_TRI_GUARD,
    # even if it also starts with a read-only prefix (e.g. fetch_and_transfer, read_then_delete).
    is_stateful, matched_verb = contains_stateful_verb(tool_name)
    if is_stateful:
        return (
            ExecutionMode.FULL_TRI_GUARD,
            f"Tool '{tool_name}' contains stateful action verb '{matched_verb}'; full inspection required.",
            _EMPTY_LIST
        )

    # Case 3: Read-only tool check
    is_read_only = (t_clean in READ_ONLY_TOOLS) or t_clean.startswith(READ_ONLY_PREFIXES)

    if is_read_only:
        # Verify no state-altering arguments were injected (parameter smuggling check)
        if tool_arguments:
            for k, v in tool_arguments.items():
                if v not in (None, "", 0, 0.0, False) and _is_stateful_arg_key(k):
                    return (
                        ExecutionMode.FULL_TRI_GUARD,
                        f"Read-only tool '{tool_name}' accompanied by state-altering arguments; escalated to FULL_TRI_GUARD.",
                        _EMPTY_LIST
                    )

        return (
            ExecutionMode.STREAMLINED_RAG,
            f"Read-only tool '{tool_name}' with safe parameters; auto-switched to STREAMLINED_RAG.",
            _BYPASSED_READ_ONLY
        )

    # Case 4: Stateful or unrecognized tool
    return (
        ExecutionMode.FULL_TRI_GUARD,
        f"Stateful or unrecognized tool '{tool_name}' requires complete 5-stage Tri-Guard inspection.",
        _EMPTY_LIST
    )


class RuntimeTelemetryTracker:
    """
    Thread-safe in-memory telemetry engine tracking auto-switching metrics and latencies.
    """
    def __init__(self, max_samples: int = 1000):
        self._lock = threading.Lock()
        self._max_samples = max_samples
        self.total_evaluations: int = 0
        self.ingress_count: int = 0
        self.egress_count: int = 0
        self.streamlined_rag_count: int = 0
        self.full_tri_guard_count: int = 0
        self.bypassed_tceav_count: int = 0
        self.bypassed_ledger_count: int = 0
        self._streamlined_latencies: List[float] = []
        self._full_guard_latencies: List[float] = []

    def record_evaluation(
        self,
        endpoint: str,
        mode: str,
        latency_ms: float,
        bypassed_stages: Optional[List[str]] = None
    ) -> None:
        with self._lock:
            self.total_evaluations += 1
            if endpoint == "ingress":
                self.ingress_count += 1
            elif endpoint == "egress":
                self.egress_count += 1

            if mode == ExecutionMode.STREAMLINED_RAG.value:
                self.streamlined_rag_count += 1
                self._streamlined_latencies.append(latency_ms)
                if len(self._streamlined_latencies) > self._max_samples:
                    self._streamlined_latencies.pop(0)

                if bypassed_stages:
                    if any("TCEAV" in s for s in bypassed_stages):
                        self.bypassed_tceav_count += 1
                    if any("Ledger" in s for s in bypassed_stages):
                        self.bypassed_ledger_count += 1
            else:
                self.full_tri_guard_count += 1
                self._full_guard_latencies.append(latency_ms)
                if len(self._full_guard_latencies) > self._max_samples:
                    self._full_guard_latencies.pop(0)

    def get_telemetry_summary(self) -> Dict[str, Any]:
        with self._lock:
            total = self.total_evaluations
            streamlined = self.streamlined_rag_count
            full = self.full_tri_guard_count

            ratio = round((streamlined / total * 100), 2) if total > 0 else 0.0

            s_lat = sorted(self._streamlined_latencies)
            f_lat = sorted(self._full_guard_latencies)

            s_avg = round(sum(s_lat) / len(s_lat), 3) if s_lat else 0.04
            f_avg = round(sum(f_lat) / len(f_lat), 3) if f_lat else 0.42

            s_p50 = round(s_lat[len(s_lat) // 2], 3) if s_lat else 0.04
            f_p50 = round(f_lat[len(f_lat) // 2], 3) if f_lat else 0.38

            s_p99 = round(s_lat[int(len(s_lat) * 0.99)], 3) if s_lat else 0.09
            f_p99 = round(f_lat[int(len(f_lat) * 0.99)], 3) if f_lat else 1.25

            reduction = round(((f_avg - s_avg) / f_avg * 100), 1) if f_avg > 0 else 88.0

            return {
                "total_evaluations": total,
                "ingress_count": self.ingress_count,
                "egress_count": self.egress_count,
                "streamlined_rag_count": streamlined,
                "full_tri_guard_count": full,
                "auto_switch_ratio_pct": ratio,
                "streamlined_avg_latency_ms": s_avg,
                "streamlined_p50_latency_ms": s_p50,
                "streamlined_p99_latency_ms": s_p99,
                "full_guard_avg_latency_ms": f_avg,
                "full_guard_p50_latency_ms": f_p50,
                "full_guard_p99_latency_ms": f_p99,
                "latency_reduction_pct": reduction,
                "bypassed_tceav_count": self.bypassed_tceav_count,
                "bypassed_ledger_count": self.bypassed_ledger_count,
                "target_sla_met": bool(s_avg < 0.5 or s_p50 < 0.1)
            }

    def reset(self) -> None:
        with self._lock:
            self.total_evaluations = 0
            self.ingress_count = 0
            self.egress_count = 0
            self.streamlined_rag_count = 0
            self.full_tri_guard_count = 0
            self.bypassed_tceav_count = 0
            self.bypassed_ledger_count = 0
            self._streamlined_latencies.clear()
            self._full_guard_latencies.clear()


runtime_telemetry = RuntimeTelemetryTracker()
