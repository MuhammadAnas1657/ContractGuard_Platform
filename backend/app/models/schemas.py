from __future__ import annotations
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# --- Nebius Cloud Schemas ---
class NebiusTestRequest(BaseModel):
    api_key: str

class NebiusTestResponse(BaseModel):
    valid: bool
    latency_ms: float
    available_models: List[str]
    message: str

# --- Tool & Ingestion Schemas ---
class ToolParameterSchema(BaseModel):
    type: str = "string"
    description: Optional[str] = ""

class ToolDefinitionSchema(BaseModel):
    name: str
    description: str = ""
    parameters: Dict[str, Any] = Field(default_factory=dict)
    source_file: Optional[str] = ""

class DiscoveredToolsResponse(BaseModel):
    project_id: Optional[str] = None
    filename: Optional[str] = None
    extracted_files: List[str] = Field(default_factory=list)
    tools: List[ToolDefinitionSchema] = Field(default_factory=list)

# --- Interview & Policy Synthesis Schemas ---
class InterviewQuestionSchema(BaseModel):
    id: str
    tool_name: str
    parameter: str
    question: str
    default_value: str
    explanation: Optional[str] = ""

class InterviewQuestionsResponse(BaseModel):
    questions: List[InterviewQuestionSchema]

class PolicySynthesizeRequest(BaseModel):
    agent_name: str = "CustomAgent"
    tools: List[ToolDefinitionSchema]
    answers: Dict[str, str]
    api_key: Optional[str] = None

class PolicySynthesizeResponse(BaseModel):
    yaml_content: str
    parsed_contract: Dict[str, Any]
    policy_id: Optional[str] = None

class PolicyValidateRequest(BaseModel):
    yaml_content: str

class PolicyValidateResponse(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    parsed_contract: Optional[Dict[str, Any]] = None

# --- Simulation Schemas ---
class SimulationRequest(BaseModel):
    scenario_id: str
    custom_user_goal: Optional[str] = None
    custom_malicious_payload: Optional[str] = None
    contract_yaml: Optional[str] = None
    api_key: Optional[str] = None

class SimulationOutcome(BaseModel):
    status: str  # "BREACHED" or "BLOCKED" or "SAFE_EXECUTED"
    action_proposed: str
    execution_outcome: str
    breach_severity: Optional[str] = None
    interception: Optional[Dict[str, Any]] = None
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list)
    latency_ms: float = 0.0

class SimulationResponse(BaseModel):
    scenario_id: str
    unprotected_run: SimulationOutcome
    contractguard_run: SimulationOutcome

# --- Metrics Schemas ---
class MetricsSummaryResponse(BaseModel):
    total_eval_samples: int
    benchmark_name: str
    metrics: Dict[str, Any]
    confusion_matrix: Dict[str, int]
    ablation_table: List[Dict[str, Any]]
    industry_comparison: List[Dict[str, Any]]
