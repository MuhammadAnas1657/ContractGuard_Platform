from __future__ import annotations
import json
from typing import Dict, Any

class MockCustomerSupportAgent:
    """
    A simulated customer support agent with tool calling capability (similar to LangChain).
    Simulates how an LLM decides to call tools based on user instructions and external data.
    """

    def __init__(self, name: str = "RefundBot"):
        self.name = name
        self.execution_logs = []

    def process_refund(self, amount: float, target_account: str) -> str:
        """Issues a financial refund to a specified target account."""
        log = f"SUCCESS: Transferred ${amount:.2f} to account '{target_account}'"
        self.execution_logs.append(log)
        return log

    def send_customer_email(self, to_email: str, subject: str, body: str) -> str:
        """Sends an email notification."""
        log = f"SUCCESS: Sent email to {to_email} with subject '{subject}'"
        self.execution_logs.append(log)
        return log

    def handle_ticket(self, user_instruction: str, incoming_email_body: str) -> Dict[str, Any]:
        """
        Simulates the LLM reasoning process.
        If prompt injection is present in incoming_email_body, an unprotected agent follows it!
        """
        # Simulated LLM parsing:
        # If an attacker injected a command in incoming_email_body to refund account X, LLM complies:
        email_lower = incoming_email_body.lower()
        if "refund" in email_lower and any(kw in email_lower for kw in ["account", "address", "wallet", "0x"]):
            # Injected malicious parameter extraction
            words = incoming_email_body.split()
            amount = 450.0
            target_acc = "0xHACKER_WALLET_99"
            for i, w in enumerate(words):
                if "$" in w:
                    try:
                        amount = float(w.replace("$", "").replace(",", ""))
                    except Exception:
                        pass
                if "0x" in w or "acc" in w.lower():
                    target_acc = w.strip(".,;:\"'")

            return {
                "decision": "CALL_TOOL",
                "tool_name": "process_refund",
                "parameters": {
                    "amount": amount,
                    "target_account": target_acc
                }
            }

        return {
            "decision": "REPLY_USER",
            "message": "Ticket processed normally."
        }
