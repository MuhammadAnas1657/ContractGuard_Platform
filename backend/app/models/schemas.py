from __future__ import annotations
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# --- Nebius Cloud Schemas ---
class NebiusTestRequest(BaseModel):
    api_key: Optional[str] = ""


class NebiusTestResponse(BaseModel):
    valid: bool
    latency_ms: float = 0.0
    available_models: List[str] = Field(default_factory=list)
    message: str
    is_live: bool = False
    mode: str = "offline"


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
    detected_gaps: List[str] = Field(default_factory=list)
    draft_policy: Optional[Dict[str, Any]] = None
    questions: List[InterviewQuestionSchema] = Field(default_factory=list)
    dual_keys: Optional[Dict[str, Any]] = None
    detected_conflicts: Optional[List[Dict[str, Any]]] = None
    missing_safeguards: Optional[List[Dict[str, Any]]] = None
    detected_privileges: Optional[List[str]] = None
    risk_summary: Optional[str] = None
    model_used: Optional[str] = None


ZipIngestResponseSchema = DiscoveredToolsResponse


# --- Interview & Policy Synthesis Schemas ---
class InterviewQuestionSchema(BaseModel):
    id: str
    title: Optional[str] = ""
    question: str
    prompt: Optional[str] = None
    explanation: Optional[str] = ""
    options: List[Any] = Field(default_factory=list)
    default_value: Any = "500.00"
    gap_type: Optional[str] = "spending_limits"
    required: bool = True
    tool_name: Optional[str] = ""
    parameter: Optional[str] = ""


class InterviewQuestionsRequest(BaseModel):
    project_id: Optional[str] = None
    tools: Optional[List[ToolDefinitionSchema]] = Field(default_factory=list)
    gaps: Optional[List[str]] = Field(default_factory=list)
    current_policy: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None


class InterviewQuestionsResponse(BaseModel):
    questions: List[InterviewQuestionSchema]
    gaps: List[str] = Field(default_factory=list)


class PolicySynthesizeRequest(BaseModel):
    agent_name: str = "CustomAgent"
    project_id: Optional[str] = None
    tools: Optional[List[ToolDefinitionSchema]] = Field(default_factory=list)
    answers: Dict[str, Any] = Field(default_factory=dict)
    tool_limits: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None


PolicySynthesizeRequestSchema = PolicySynthesizeRequest


class PolicySynthesizeResponse(BaseModel):
    id: Optional[str] = None
    policy_id: Optional[str] = None
    project_id: Optional[str] = None
    yaml_content: str
    contract_yaml: Optional[str] = None
    parsed_contract: Dict[str, Any]
    policy: Optional[Dict[str, Any]] = None
    status: str = "DRAFT"
    is_active: bool = False
    signature: str = ""
    lint_result: Optional[Dict[str, Any]] = None


PolicySynthesizeResponseSchema = PolicySynthesizeResponse


class PolicyValidateRequest(BaseModel):
    yaml_content: str


class PolicyValidateResponse(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    issues: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_fixes: List[str] = Field(default_factory=list)
    positive_tests: List[Dict[str, Any]] = Field(default_factory=list)
    negative_tests: List[Dict[str, Any]] = Field(default_factory=list)
    parsed_contract: Optional[Dict[str, Any]] = None


class PolicyApproveRequest(BaseModel):
    approved_by: str = "developer_admin"
    version: str = "1.0.0"
    yaml_content: Optional[str] = None
    notes: Optional[str] = None


class PolicyApproveResponse(BaseModel):
    id: Optional[str] = None
    policy_id: str
    version: str
    status: str
    is_active: bool = True
    approved_by: str
    approved_at: float
    sha256_signature: str
    signature: str = ""
    immutable: bool = True
    parsed_contract: Dict[str, Any]


# --- Simulation Schemas ---
class SimulationRequest(BaseModel):
    scenario_id: str
    custom_user_goal: Optional[str] = None
    custom_malicious_payload: Optional[str] = None
    contract_yaml: Optional[str] = None
    api_key: Optional[str] = None


class SimulationOutcome(BaseModel):
    status: str  # "BREACHED" or "BLOCKED" or "SAFE"
    action_proposed: str
    execution_outcome: str
    breach_severity: Optional[str] = None
    interception: Optional[Dict[str, Any]] = None
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list)
    latency_ms: float = 0.0
    provider_mode: Optional[str] = None


class SimulationResponse(BaseModel):
    scenario_id: str
    unprotected_run: SimulationOutcome
    contractguard_run: SimulationOutcome
    provider_mode: Optional[str] = None


# --- Metrics Schemas ---
class MetricsSummaryResponse(BaseModel):
    total_eval_samples: int
    benchmark_name: str
    metrics: Dict[str, Any]
    summary_kpis: Dict[str, str] = Field(default_factory=dict)
    confusion_matrix: Dict[str, int]
    ablation_table: List[Dict[str, Any]]
    industry_comparison: List[Dict[str, Any]]
    oracle_suite_results: List[Dict[str, Any]] = Field(default_factory=list)
    latex_table: str = ""
    auto_switching_telemetry: Optional[Dict[str, Any]] = None


# --- Project Management Schemas ---
class ProjectCreateRequest(BaseModel):
    name: str = Field(..., description="Project name")
    filename: Optional[str] = Field(default=None, description="Optional uploaded zip file name")
    user_id: Optional[str] = None


class DualKeyInfoSchema(BaseModel):
    key_id: str
    key_prefix: str
    key_type: str
    is_active: bool
    created_at: str
    last_used_at: Optional[str] = None
    raw_key: Optional[str] = None


class ProjectListItemResponse(BaseModel):
    id: str
    name: str
    filename: Optional[str] = None
    user_id: Optional[str] = None
    created_at: str
    tools_count: int
    extracted_files_count: int
    policy_status: str  # "APPROVED", "DRAFT", or "NONE"
    ingress_key_prefix: Optional[str] = None
    egress_key_prefix: Optional[str] = None
    dual_keys: Dict[str, Optional[DualKeyInfoSchema]]


class ProjectDetailResponse(BaseModel):
    id: str
    name: str
    filename: Optional[str] = None
    user_id: Optional[str] = None
    created_at: str
    tools_count: int
    extracted_files: List[str]
    discovered_tools: List[Dict[str, Any]]
    policy: Optional[Dict[str, Any]] = None
    policy_yaml: Optional[str] = None
    policy_status: Optional[str] = "NONE"
    dual_keys: Dict[str, Optional[DualKeyInfoSchema]]
