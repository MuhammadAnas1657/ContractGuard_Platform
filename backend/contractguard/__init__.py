"""
ContractGuard: Runtime Authority and Provenance Defense for LLM Agents.
Built for Nebius x NVIDIA Global AI Hackathon & Academic Publication.
"""

from .contracts import SecurityContract, ToolContract, ParameterRule, GlobalEnvelope
from .provenance import ProvenanceTracker, TaggedInput, SourceType
from .ledger import CumulativeEffectLedger
from .interceptor import ContractGuardInterceptor
from .client import NebiusTokenFactoryClient

__version__ = "0.1.0"
__all__ = [
    "SecurityContract",
    "ToolContract",
    "ParameterRule",
    "GlobalEnvelope",
    "ProvenanceTracker",
    "TaggedInput",
    "SourceType",
    "CumulativeEffectLedger",
    "ContractGuardInterceptor",
    "NebiusTokenFactoryClient",
]
