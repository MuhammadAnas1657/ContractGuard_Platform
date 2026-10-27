"""
ContractGuard-X Python SDK
Zero-Trust Security Gateway & Stateful Reference Monitor for AI Agents
"""

from .client import ContractGuardClient
from .decorators import guarded_tool, guard_agent
from .models import (
    SecurityContract,
    ToolContract,
    ParameterRule,
    GlobalEnvelope,
    InterceptionDecision,
    SourceTrust
)
from .provenance import ProvenanceTracker
from .ledger import CumulativeEffectLedger

__version__ = "2.0.0"

__all__ = [
    "ContractGuardClient",
    "guarded_tool",
    "guard_agent",
    "SecurityContract",
    "ToolContract",
    "ParameterRule",
    "GlobalEnvelope",
    "InterceptionDecision",
    "SourceTrust",
    "ProvenanceTracker",
    "CumulativeEffectLedger",
]
