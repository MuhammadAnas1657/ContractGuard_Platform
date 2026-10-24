from __future__ import annotations
import time
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

class ActionLog(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    tool_name: str
    effects: List[str]
    parameters: Dict[str, Any]
    delta_budget: float = 0.0

class CumulativeEffectLedger:
    """
    Maintains session-level cumulative effect state to defend against compositional
    (salami-slicing) attacks where multiple individually benign tool calls exceed limits.
    """

    def __init__(self, max_cumulative_budget: Optional[float] = 1000.0, max_invocations: int = 50):
        self.max_cumulative_budget = max_cumulative_budget
        self.max_invocations = max_invocations
        self.current_budget_spent: float = 0.0
        self.total_invocations: int = 0
        self.tool_counts: Dict[str, int] = {}
        self.history: List[ActionLog] = []

    def check_and_record(self, tool_name: str, effects: List[str], parameters: Dict[str, Any]) -> tuple[bool, str]:
        """
        Validates proposed action against cumulative session ceilings.
        If valid, increments the ledger.
        """
        # 1. Check total invocation count
        if self.total_invocations >= self.max_invocations:
            return False, f"Session tool invocation limit ({self.max_invocations}) exceeded."

        # 2. Extract budget/financial delta if applicable
        delta = 0.0
        if "financial.transfer" in effects or "financial" in [e.split(".")[0] for e in effects]:
            for key in ["amount", "cost", "value", "payment"]:
                if key in parameters:
                    try:
                        delta = float(parameters[key])
                        break
                    except (ValueError, TypeError):
                        pass

        # 3. Check cumulative budget
        if self.max_cumulative_budget is not None and delta > 0:
            if (self.current_budget_spent + delta) > self.max_cumulative_budget:
                return False, (
                    f"Action exceeds cumulative session budget ceiling! "
                    f"Proposed delta: ${delta:.2f}, Already spent: ${self.current_budget_spent:.2f}, "
                    f"Ceiling: ${self.max_cumulative_budget:.2f}."
                )

        # 4. Commit to ledger
        self.current_budget_spent += delta
        self.total_invocations += 1
        self.tool_counts[tool_name] = self.tool_counts.get(tool_name, 0) + 1
        self.history.append(ActionLog(
            tool_name=tool_name,
            effects=effects,
            parameters=parameters,
            delta_budget=delta
        ))

        return True, f"Ledger updated: cumulative budget=${self.current_budget_spent:.2f}/{self.max_cumulative_budget or 'unlimited'}."

    def reset(self) -> None:
        self.current_budget_spent = 0.0
        self.total_invocations = 0
        self.tool_counts.clear()
        self.history.clear()
