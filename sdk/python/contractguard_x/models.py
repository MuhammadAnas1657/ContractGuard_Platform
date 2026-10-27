"""
ContractGuard-X SDK Data Models and Declarative Contracts
"""
from __future__ import annotations
import yaml
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class SourceTrust(str, Enum):
    AUTHENTICATED_USER = "authenticated_user"
    UNTRUSTED_EXTERNAL = "untrusted_external"
    INTERNAL_DB = "internal_db"
    SYSTEM_CONFIG = "system_config"
    TOOL_RESULT = "tool_result"
    UNKNOWN = "unknown"

class ParameterRule(BaseModel):
    """Rules for validating a single tool argument."""
    name: str
    param_type: str = "string"
    max_value: Optional[float] = None
    min_value: Optional[float] = None
    allowed_domains: Optional[List[str]] = None
    allowed_values: Optional[List[str]] = None
    source_authority: List[str] = Field(
        default_factory=lambda: ["authenticated_user", "internal_db"],
        description="List of trusted source tags allowed to instantiate this parameter"
    )
    untrusted_sources_blocked: List[str] = Field(
        default_factory=lambda: ["customer_email", "untrusted_external", "web_content", "ticket_comment"],
        description="Untrusted source tags forbidden from directly providing this parameter"
    )

class ToolContract(BaseModel):
    """Security contract for an individual tool."""
    tool_name: str
    description: str = ""
    effects: List[str] = Field(
        default_factory=list,
        description="Canonical effects: e.g. financial.transfer, data.egress, system.exec"
    )
    parameters: Dict[str, ParameterRule] = Field(default_factory=dict)
    requires_semantic_verification: bool = False
    requires_human_approval: bool = False

class GlobalEnvelope(BaseModel):
    """Ceiling limits for the entire agent session."""
    max_cumulative_budget: Optional[float] = 1000.0
    max_tool_invocations: int = 50
    denied_tools: List[str] = Field(
        default_factory=lambda: ["execute_shell", "delete_database", "format_disk", "drop_tables"]
    )
    restricted_effects: List[str] = Field(default_factory=list)

class SecurityContract(BaseModel):
    """The master declarative contract enforced at runtime."""
    version: str = "2.0"
    agent_name: str = "DefaultAgent"
    global_envelope: GlobalEnvelope = Field(default_factory=GlobalEnvelope)
    tools: Dict[str, ToolContract] = Field(default_factory=dict)

    def to_yaml(self) -> str:
        data = self.model_dump()
        return yaml.dump(data, sort_keys=False, default_flow_style=False)

    @classmethod
    def from_yaml(cls, yaml_str: str) -> "SecurityContract":
        data = yaml.safe_load(yaml_str)
        return cls(**data)

    @classmethod
    def from_file(cls, filepath: str) -> "SecurityContract":
        with open(filepath, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return cls(**data)

class InterceptionDecision(BaseModel):
    allowed: bool
    stage: str
    reason: str
    latency_ms: float
    tool_name: str
    parameters: Dict[str, Any]
