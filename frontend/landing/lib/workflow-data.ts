export interface WorkflowStep {
  stepNumber: string;
  id: string;
  name: string;
  actor: string;
  summary: string;
  inputArtifact: string;
  outputArtifact: string;
  codePreview: string;
  semanticTone: 'accent' | 'ai' | 'warning';
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stepNumber: '01',
    id: 'connect',
    name: 'Connect',
    actor: 'Static AST Scanner',
    summary:
      'Upload a repository ZIP archive or paste tool definitions. ContractGuard inventories function-calling tools, parameters, and risk flags statically without running code.',
    inputArtifact: 'Repository archive (.zip) or MCP / OpenAI tool schema',
    outputArtifact: 'Sanitized Tool Inventory + Deletion Receipt',
    codePreview: `discovered_tools:
  - name: stripe.issue_refund
    params: [amount: number, currency: string, order_id: string]
    risk_flag: UNBOUNDED_MONETARY_PARAM`,
    semanticTone: 'accent',
  },
  {
    stepNumber: '02',
    id: 'interview',
    name: 'Interview',
    actor: 'Specialized Policy AI',
    summary:
      'Our specialized AI interviews you on concrete operational limits—monetary caps, SQL read/write verbs, path globs, and escalation rules—streaming live YAML as you answer.',
    inputArtifact: 'Sanitized Tool Inventory + Developer Answers',
    outputArtifact: 'Draft AgentSecurityPolicy (v1.0-draft)',
    codePreview: `Q7: Maximum refund without human approval?
A7: "$250 autonomous, $500 hard ceiling per call."
-> Generated rule: max_per_call_usd: 500`,
    semanticTone: 'ai',
  },
  {
    stepNumber: '03',
    id: 'review',
    name: 'Review',
    actor: 'Security & Product Leads',
    summary:
      'Share the draft for review. Stakeholders record a quick video walkthrough or leave written notes; ContractGuard maps feedback to inline diffs and flags rule conflicts.',
    inputArtifact: 'Screen-recorded video (.mp4/.webm) or written notes',
    outputArtifact: 'Reconciled Policy Version (v1.1) with review lineage',
    codePreview: `@@ stripe.issue_refund.constraints @@
- approval_required_above_usd: 250
+ approval_required_above_usd: 150 # Approved via Video @ 01:12`,
    semanticTone: 'ai',
  },
  {
    stepNumber: '04',
    id: 'export',
    name: 'Export',
    actor: 'Deterministic Exporter',
    summary:
      'Export machine-readable YAML and JSON schemas for your codebase alongside an interactive, bookmarked PDF containing a clickable TOC and SHA-256 integrity hash.',
    inputArtifact: 'Approved Policy Version (v1.1)',
    outputArtifact: 'policy.yaml + policy.json + Audit_Pack.pdf',
    codePreview: `exports/
  billing-agent.policy.yaml   (SHA-256: 4a9e...81c2)
  billing-agent.schema.json   (Strict JSON Schema)
  billing-agent.audit.pdf     (Bookmarked + Signed)`,
    semanticTone: 'accent',
  },
  {
    stepNumber: '05',
    id: 'enforce',
    name: 'Enforce',
    actor: 'Runtime Policy Gate',
    summary:
      'Load the exported YAML contract in your tool-execution gateway, MCP proxy, or sidecar. Every proposed tool call is validated deterministically before touching external APIs.',
    inputArtifact: 'Proposed LLM Tool Call + Runtime Context',
    outputArtifact: 'Allow, Deny, or Require Human Approval (< 2 ms)',
    codePreview: `const decision = guard.evaluate("stripe.issue_refund", args);
if (decision.effect !== "allow") {
  throw new PolicyDeniedError(decision.reason);
}`,
    semanticTone: 'accent',
  },
];
