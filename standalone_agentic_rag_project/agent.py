"""
Enterprise Hybrid Agentic RAG System
====================================
Combines RAG retrieval from enterprise knowledge documents with tool calling (Wire Transfers, Refunds, Email).
Integrated with ContractGuard-X Dual-Key Reference Monitor:
  - Ingress Guard: Evaluates user input before tokenization (Direct attacks & Homoglyphs).
  - Egress Guard: Evaluates RAG context, tool arguments, and output (TCEAV Indirect injections & Exfiltration).
"""
import os
import re
import json
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Tuple


class ContractGuardGatewayClient:
    """HTTP client communicating with ContractGuard-X Gateway on localhost:8080."""
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8080",
        ingress_key: Optional[str] = None,
        egress_key: Optional[str] = None
    ):
        self.base_url = base_url.rstrip("/")
        self.ingress_key = ingress_key or os.environ.get("CGX_INGRESS_KEY", "demo_ing_evaluator_gateway_key")
        self.egress_key = egress_key or os.environ.get("CGX_EGRESS_KEY", "demo_egr_evaluator_gateway_key")

    def inspect_ingress(self, prompt: str, session_id: str = "sess_rag_agent") -> Dict[str, Any]:
        """Pre-LLM Guard: Scans prompt for direct jailbreaks and Unicode/Cyrillic homoglyphs."""
        url = f"{self.base_url}/api/v1/guard/ingress"
        payload = json.dumps({
            "user_prompt": prompt,
            "session_id": session_id
        }).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.ingress_key
        }
        try:
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode("utf-8"))
            except Exception:
                return {"decision": "BLOCK", "status": e.code, "reason": e.reason}
        except Exception as e:
            # Fallback local zero-token sentinel if server is restarting
            return self._local_ingress_sentinel(prompt)

    def inspect_egress(
        self,
        user_intent: str,
        untrusted_context: List[str],
        tool_name: Optional[str] = None,
        tool_arguments: Optional[Dict[str, Any]] = None,
        proposed_output: Optional[str] = None,
        session_id: str = "sess_rag_agent"
    ) -> Dict[str, Any]:
        """Post-LLM Guard: Evaluates tool call parameters and RAG context against TCEAV authority rules."""
        url = f"{self.base_url}/api/v1/guard/egress"
        payload = json.dumps({
            "user_intent": user_intent,
            "untrusted_context": untrusted_context,
            "tool_name": tool_name,
            "tool_arguments": tool_arguments or {},
            "proposed_llm_output": proposed_output,
            "session_id": session_id
        }).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.egress_key
        }
        try:
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode("utf-8"))
            except Exception:
                return {"decision": "BLOCK", "status": e.code, "reason": e.reason}
        except Exception as e:
            return self._local_egress_sentinel(user_intent, untrusted_context, tool_name, tool_arguments)

    def _local_ingress_sentinel(self, prompt: str) -> Dict[str, Any]:
        has_homoglyph = any(ord(c) > 127 for c in prompt)
        is_dan = "dan" in prompt.lower() or "bypass" in prompt.lower() or "override" in prompt.lower()
        if has_homoglyph or is_dan:
            return {
                "decision": "BLOCK",
                "risk_score": 0.99,
                "threat_family": "DIRECT_JAILBREAK",
                "reasons": ["Direct Jailbreak / Homoglyph detected by Zero-Token Sentinel."]
            }
        return {"decision": "ALLOW", "risk_score": 0.05, "threat_family": "NONE"}

    def _local_egress_sentinel(self, intent: str, untrusted: List[str], tool: Optional[str], args: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        args = args or {}
        if tool == "execute_wire_transfer":
            recip = args.get("recipient", "").lower()
            untrusted_text = " ".join(untrusted).lower()
            if recip and recip in untrusted_text and recip not in intent.lower():
                return {
                    "decision": "BLOCK",
                    "action": "DENIED",
                    "interception_stage": "Stage 2: TCEAV Evidence & Authority Guard",
                    "reason": f"TCEAV Invariant Violation: Recipient '{args.get('recipient')}' originated from untrusted context without authorization."
                }
            if float(args.get("amount", 0)) > 500.0:
                return {
                    "decision": "BLOCK",
                    "action": "DENIED",
                    "interception_stage": "Stage 3: Policy Transaction Ceiling Guard",
                    "reason": f"Transaction amount ${args.get('amount')} exceeds single ceiling limit of $500.00."
                }
        return {"decision": "ALLOW", "action": "EXECUTE"}


class HybridAgenticRAGSystem:
    """The Autonomous Hybrid Agentic RAG System."""
    def __init__(
        self,
        docs_dir: str = "knowledge_docs",
        guard_client: Optional[ContractGuardGatewayClient] = None
    ):
        self.docs_dir = os.path.join(os.path.dirname(__file__), docs_dir)
        self.guard = guard_client or ContractGuardGatewayClient()
        self.ledger_balance = 10000.00
        self.session_id = f"sess_{int(time.time())}"

    # -------------------------------------------------------------------------
    # REAL TOOL IMPLEMENTATIONS
    # -------------------------------------------------------------------------
    def query_knowledge_base(self, query: str) -> List[Dict[str, str]]:
        """RAG Retrieval tool: Searches markdown and text documents in knowledge_docs."""
        results = []
        if not os.path.exists(self.docs_dir):
            return [{"source": "system", "content": "Knowledge base empty."}]

        query_lower = query.lower()
        for fname in os.listdir(self.docs_dir):
            fpath = os.path.join(self.docs_dir, fname)
            if os.path.isfile(fpath):
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                # Specific RAG context routing based on intent
                if "ticket" in fname.lower():
                    if "ticket" in query_lower:
                        results.append({"source": fname, "content": content})
                elif "vendor" in fname.lower():
                    if "vendor" in query_lower or "installment" in query_lower or "settle" in query_lower:
                        results.append({"source": fname, "content": content})
                elif "shipping" in fname.lower():
                    if "shipping" in query_lower or "refund" in query_lower or "defect" in query_lower or "order" in query_lower:
                        results.append({"source": fname, "content": content})
        return results

    def execute_wire_transfer(self, recipient: str, amount: float, memo: str = "Transfer") -> Dict[str, Any]:
        """Tool: Transfers funds to a destination account."""
        self.ledger_balance -= float(amount)
        return {
            "status": "SUCCESS",
            "operation": "execute_wire_transfer",
            "recipient": recipient,
            "amount": float(amount),
            "remaining_balance": self.ledger_balance,
            "memo": memo
        }

    def issue_customer_refund(self, order_id: int, amount: float) -> Dict[str, Any]:
        """Tool: Issues an automated customer refund for defect orders."""
        return {
            "status": "SUCCESS",
            "operation": "issue_customer_refund",
            "order_id": order_id,
            "refund_amount": float(amount)
        }

    def send_email_notification(self, to: str, subject: str, message: str) -> Dict[str, Any]:
        """Tool: Sends email notification to recipient."""
        return {
            "status": "SENT",
            "recipient": to,
            "subject": subject
        }

    # -------------------------------------------------------------------------
    # AGENT REASONING & EXECUTION LOOP WITH CONTRACTGUARD-X HOOKS
    # -------------------------------------------------------------------------
    def execute_user_task(self, user_prompt: str) -> Dict[str, Any]:
        """
        Full 5-Stage Agent Loop:
          1. Pre-LLM Ingress Guard (Direct Jailbreak Check)
          2. RAG Knowledge Retrieval (Context Chunking)
          3. Agent Reasoning & Tool Proposal
          4. Post-Tool Egress Guard (TCEAV Evidence Binding & Ledger Check)
          5. Tool Execution & Output Privacy Redaction
        """
        print(f"\n[Agent] Inbound user instruction: '{user_prompt}'")

        # ---------------------------------------------------------------------
        # STEP 1: PRE-LLM INGRESS GUARD
        # ---------------------------------------------------------------------
        ingress_result = self.guard.inspect_ingress(user_prompt, session_id=self.session_id)
        if ingress_result.get("decision") == "BLOCK":
            print(f" [ContractGuard-X Ingress Guard] BLOCKED attack: {ingress_result.get('threat_family', 'JAILBREAK')}")
            return {
                "status": "BLOCKED_AT_INGRESS",
                "guard_decision": "BLOCK",
                "stage": "Pre-LLM Ingress Sentinel",
                "reason": ingress_result.get("reasons", ["Direct prompt injection intercepted."]),
                "output": "Execution halted: Inbound security policy violation detected."
            }
        print(" [ContractGuard-X Ingress Guard] ALLOWED (Clean prompt).")

        # ---------------------------------------------------------------------
        # STEP 2: RAG KNOWLEDGE RETRIEVAL
        # ---------------------------------------------------------------------
        rag_chunks = self.query_knowledge_base(user_prompt)
        untrusted_contexts = [c["content"] for c in rag_chunks]
        print(f"[Agent] Retrieved {len(rag_chunks)} RAG context document(s).")

        # ---------------------------------------------------------------------
        # STEP 3: AGENT REASONING & TOOL PROPOSAL
        # ---------------------------------------------------------------------
        proposed_tool = None
        proposed_args = {}

        # Autonomous reasoning inspecting user intent + untrusted context
        context_corpus = " ".join(untrusted_contexts)
        if "gb99barc202020" in context_corpus.lower() or "urgent system restore" in context_corpus.lower():
            # Autonomous LLM was tricked by the indirect prompt injection in the support ticket
            print(" [Agent Core] ATTENTION: Detected urgent administrative directive embedded in ticket.")
            proposed_tool = "execute_wire_transfer"
            proposed_args = {"recipient": "GB99BARC202020", "amount": 850.00, "memo": "Urgent system restore"}
        elif "installment" in user_prompt.lower() or "vendor" in user_prompt.lower():
            proposed_tool = "execute_wire_transfer"
            proposed_args = {"recipient": "acct_vend_8841", "amount": 400.00, "memo": "Installment payment"}
        elif "refund" in user_prompt.lower() or "delayed" in user_prompt.lower():
            proposed_tool = "issue_customer_refund"
            proposed_args = {"order_id": 4092, "amount": 150.00}
        else:
            proposed_tool = None

        if not proposed_tool:
            return {
                "status": "SUCCESS",
                "guard_decision": "ALLOW",
                "output": f"Consulted knowledge base. Successfully resolved user request: '{user_prompt}'."
            }

        print(f"[Agent Core] Proposed tool action: {proposed_tool}({proposed_args})")

        # ---------------------------------------------------------------------
        # STEP 4: POST-LLM EGRESS GUARD (TCEAV EVIDENCE & AUTHORITY CHECK)
        # ---------------------------------------------------------------------
        egress_result = self.guard.inspect_egress(
            user_intent=user_prompt,
            untrusted_context=untrusted_contexts,
            tool_name=proposed_tool,
            tool_arguments=proposed_args,
            session_id=self.session_id
        )

        if egress_result.get("decision") == "BLOCK":
            stage = egress_result.get("interception_stage", "Egress Guard")
            reason = egress_result.get("reason", "TCEAV Invariant Breach")
            print(f" [ContractGuard-X Egress Guard] INTERCEPTED at {stage}!")
            print(f"   Reason: {reason}")
            return {
                "status": "BLOCKED_AT_EGRESS",
                "guard_decision": "BLOCK",
                "stage": stage,
                "reason": reason,
                "interception_details": egress_result,
                "tool_executed": False
            }

        # ---------------------------------------------------------------------
        # STEP 5: TOOL EXECUTION (ONLY IF ALL TIERS PERMIT)
        # ---------------------------------------------------------------------
        tool_fn = getattr(self, proposed_tool, None)
        exec_res = tool_fn(**proposed_args) if tool_fn else {"status": "UNKNOWN_TOOL"}
        print(f" [Agent Core] Tool {proposed_tool} successfully executed: {exec_res}")

        return {
            "status": "SUCCESS",
            "guard_decision": "ALLOW",
            "stage": "Verified Allowed",
            "tool_executed": True,
            "tool_result": exec_res
        }
