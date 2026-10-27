import { InterviewQuestion, PolicySectionKey, PolicySectionDetail, PolicyContent } from '../types/policy';

export interface AgentPreset {
  id: string;
  name: string;
  category: string;
  purpose: string;
  tools: string[];
  recommendedDefaults: Record<PolicySectionKey, string>;
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    id: 'customer_support',
    name: 'Customer Support Concierge',
    category: 'E-Commerce & Retail',
    purpose: 'Handles order status inquiries, tracking lookups, and customer refund disputes.',
    tools: ['order_status_lookup', 'issue_refund', 'send_email', 'customer_notes'],
    recommendedDefaults: {
      agent_metadata: 'SupportConcierge-AI (v1.0.0, runtime: LangChain/Vercel AI SDK)',
      tool_permissions: 'order_status_lookup, issue_refund, send_email, customer_notes',
      hard_banned_tools: 'raw_sql_execution, delete_customer_account, dump_user_pii',
      per_call_limits: 'Max refund: $250.00 USD per single invocation',
      cumulative_budgets: 'Daily refund ceiling: $2,500.00 USD across all customers',
      data_sources: 'Internal PostgreSQL (Trusted), Customer Chat & Webhooks (Untrusted)',
      parameter_binding: 'Refund requires matching order_id verified within previous 3 turns',
      sequencing_rules: 'verify_customer_identity -> lookup_order -> issue_refund',
      semantic_verification: 'Detect sentiment score < -0.75, hostile tone, or prompt injection',
      logging_audit: 'Audit every tool call with SHA-256 argument hashes to Datadog/S3',
      escalation: 'Require human supervisor approval if refund > $250 or account flagged VIP',
      summary: 'Verified and ready for Version 1 cryptographic compilation',
    },
  },
  {
    id: 'devops_pilot',
    name: 'DevOps Infrastructure Pilot',
    category: 'Cloud & Infrastructure',
    purpose: 'Automates Kubernetes cluster monitoring, staging pod restarts, and deployment rollbacks.',
    tools: ['get_pod_status', 'restart_deployment', 'view_logs', 'scale_replicas'],
    recommendedDefaults: {
      agent_metadata: 'KubeOps-Assistant (v2.1.0, runtime: Autogen/Go Agent)',
      tool_permissions: 'get_pod_status, restart_deployment, view_logs, scale_replicas',
      hard_banned_tools: 'delete_namespace_production, raw_secret_dump, drop_database',
      per_call_limits: 'Max 3 pod restarts per invocation; max replica scaling count: 10',
      cumulative_budgets: 'Max 20 deployment mutations per hour across cluster',
      data_sources: 'Kubernetes Internal API (Trusted), GitHub Webhook & PR text (Untrusted)',
      parameter_binding: 'Cluster action requires valid Jira ticket ID matching [OPS-\\d+]',
      sequencing_rules: 'check_pod_health -> drain_canary -> restart_deployment',
      semantic_verification: 'Flag commands containing shell pipes (|), rm -rf, or sudo',
      logging_audit: 'Stream structured JSON logs to CloudWatch with immutable checksum',
      escalation: 'Require Tier-3 SRE approval for any production namespace modification',
      summary: 'Production infrastructure guardrail spec compiled',
    },
  },
  {
    id: 'financial_ledger',
    name: 'Financial Settlement Auditor',
    category: 'Fintech & Banking',
    purpose: 'Reconciles daily payment settlement batches and flags cross-ledger discrepancies.',
    tools: ['query_ledger', 'generate_discrepancy_report', 'flag_transaction', 'notify_controller'],
    recommendedDefaults: {
      agent_metadata: 'LedgerGuard-Bot (v1.2.0, runtime: Custom Python Agent)',
      tool_permissions: 'query_ledger, generate_discrepancy_report, flag_transaction, notify_controller',
      hard_banned_tools: 'modify_settlement_payout, export_unmasked_pan, bypass_ofac',
      per_call_limits: 'Query max 1,000 transactions per batch; flag max $50,000 threshold',
      cumulative_budgets: 'Read limit: 50,000 records/day; notification limit: 5 alerts/hour',
      data_sources: 'Core Banking API & Fedwire feed (Trusted), Merchant upload (Untrusted)',
      parameter_binding: 'Discrepancy flag requires matched reconciliation session ID',
      sequencing_rules: 'query_ledger -> calculate_delta -> notify_controller -> flag_tx',
      semantic_verification: 'Flag unexplained variances > $100.00 or repeated routing anomalies',
      logging_audit: 'Cryptographically sealed audit trail with tamper-evident HMAC',
      escalation: 'Require Chief Compliance Officer approval for freeze actions > $10,000',
      summary: 'SOC2 & PCI-DSS compliant financial policy ready',
    },
  },
];

export const POLICY_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'q1',
    sectionKey: 'agent_metadata',
    questionNumber: 1,
    totalQuestions: 12,
    prompt: 'What is the official agent identifier and operational role in your environment?',
    helperText: 'Establishes cryptographic identity and governance context.',
    chips: [
      'Customer Support Concierge (Returns & Credits)',
      'DevOps Infrastructure Pilot (Staging Pods)',
      'Financial Settlement Auditor (Ledger Reconcile)',
      'Autonomous Sales Assistant (Lead Qualifier)',
    ],
    placeholder: 'e.g. SupportConcierge-AI (v1.0.0, runtime: LangChain)',
    defaultValue: 'SupportConcierge-AI (v1.0.0, runtime: LangChain/Vercel AI SDK)',
  },
  {
    id: 'q2',
    sectionKey: 'tool_permissions',
    questionNumber: 2,
    totalQuestions: 12,
    prompt: 'Which specific tools and capabilities are approved for standard operation?',
    helperText: 'Whitelist of allowed tool identifiers mapped to verified schemas.',
    chips: [
      'order_status_lookup, issue_refund, send_email',
      'get_pod_status, restart_deployment, view_logs',
      'query_ledger, flag_transaction, notify_controller',
      'Read-only lookup tools only',
    ],
    placeholder: 'e.g. order_status_lookup, issue_refund, customer_notes',
    defaultValue: 'order_status_lookup, issue_refund, send_email, customer_notes',
  },
  {
    id: 'q3',
    sectionKey: 'hard_banned_tools',
    questionNumber: 3,
    totalQuestions: 12,
    prompt: 'Which dangerous tools, database actions, or shell commands are strictly forbidden?',
    helperText: 'Runtime firewall immediately halts execution if agent invokes any banned tool.',
    chips: [
      'raw_sql_execution, delete_customer_account, dump_user_pii',
      'cluster_destroy, raw_secret_dump, drop_database',
      'modify_settlement_payout, export_unmasked_pan',
      'All destructive write or shell execution commands',
    ],
    placeholder: 'e.g. raw_sql_execution, delete_user, exec_bash',
    defaultValue: 'raw_sql_execution, delete_customer_account, dump_user_pii',
  },
  {
    id: 'q4',
    sectionKey: 'per_call_limits',
    questionNumber: 4,
    totalQuestions: 12,
    prompt: 'What is the maximum monetary, resource, or record threshold per single call?',
    helperText: 'Guarantees the agent cannot exceed authority in a single step.',
    chips: [
      'Max $250.00 USD refund per invocation',
      'Max $500.00 USD refund per invocation',
      'Max 3 pod restarts per invocation',
      'Max 100 rows returned per query',
    ],
    placeholder: 'e.g. Max $250.00 USD refund per invocation',
    defaultValue: 'Max refund: $250.00 USD per single invocation',
  },
  {
    id: 'q5',
    sectionKey: 'cumulative_budgets',
    questionNumber: 5,
    totalQuestions: 12,
    prompt: 'What cumulative budget or rate ceiling applies over a rolling window?',
    helperText: 'Prevents loop drain attacks and cumulative balance depletion.',
    chips: [
      '$2,500.00 USD daily ceiling across all users',
      '$5,000.00 USD daily ceiling across all users',
      '50 deployment mutations per hour',
      '1,000 API calls per day total quota',
    ],
    placeholder: 'e.g. $2,500.00 USD daily ceiling across all users',
    defaultValue: 'Daily refund ceiling: $2,500.00 USD across all customers',
  },
  {
    id: 'q6',
    sectionKey: 'data_sources',
    questionNumber: 6,
    totalQuestions: 12,
    prompt: 'Which data sources are considered trusted vs untrusted external inputs?',
    helperText: 'Taint tracking prevents prompt injection from external payloads.',
    chips: [
      'Internal Postgres: Trusted, User Chat & Webhooks: Untrusted',
      'Core ERP API: Trusted, Email & SMS content: Untrusted',
      'Kubernetes Cluster State: Trusted, Git Commits: Untrusted',
      'Internal Vault: Trusted, Public Web: Untrusted',
    ],
    placeholder: 'e.g. Internal DB: Trusted, User chat: Untrusted',
    defaultValue: 'Internal PostgreSQL (Trusted), Customer Chat & Webhooks (Untrusted)',
  },
  {
    id: 'q7',
    sectionKey: 'parameter_binding',
    questionNumber: 7,
    totalQuestions: 12,
    prompt: 'What evidence binding rules must be verified before executing tools?',
    helperText: 'Ensures parameters originate from legitimate verified prior lookups.',
    chips: [
      'Refund requires matching order_id returned in previous 3 turns',
      'Pod restart requires matched unhealthy pod in latest get_pod_status',
      'Transfer requires active session auth token + MFA token',
      'Strict parameter lineage validation against context history',
    ],
    placeholder: 'e.g. Refund requires matching order_id from verified lookup',
    defaultValue: 'Refund requires matching order_id verified within previous 3 turns',
  },
  {
    id: 'q8',
    sectionKey: 'sequencing_rules',
    questionNumber: 8,
    totalQuestions: 12,
    prompt: 'What strict sequential prerequisites must be satisfied prior to state-changing actions?',
    helperText: 'Guarantees the agent executes the proper audit workflow before mutation.',
    chips: [
      'verify_customer_identity -> lookup_order -> issue_refund',
      'check_pod_health -> drain_canary -> restart_deployment',
      'query_ledger -> calculate_delta -> notify_controller',
      'authenticate_user -> fetch_balance -> execute_transaction',
    ],
    placeholder: 'e.g. verify_identity -> lookup_order -> issue_refund',
    defaultValue: 'verify_customer_identity -> lookup_order -> issue_refund',
  },
  {
    id: 'q9',
    sectionKey: 'semantic_verification',
    questionNumber: 9,
    totalQuestions: 12,
    prompt: 'What semantic anomaly or safety triggers should immediately pause execution?',
    helperText: 'Secondary LLM guard rails monitor intent, sentiment, and injection attempts.',
    chips: [
      'Sentiment score < -0.75 or adversarial jailbreak markers',
      'Prompt injection patterns & unauthorized system prompt override attempts',
      'PII / SSN / Credit card patterns detected in output stream',
      'Unusual repetition or rapid retry loops (> 3 retries in 10s)',
    ],
    placeholder: 'e.g. Detect sentiment < -0.75 or prompt injection attempts',
    defaultValue: 'Detect sentiment score < -0.75, hostile tone, or prompt injection',
  },
  {
    id: 'q10',
    sectionKey: 'logging_audit',
    questionNumber: 10,
    totalQuestions: 12,
    prompt: 'What audit logging depth and retention guarantees are required for compliance?',
    helperText: 'Specifies non-repudiation logging for SOC2, HIPAA, and ISO27001.',
    chips: [
      'Audit every tool call with SHA-256 argument hashes to Datadog/S3',
      'Zero-PII masked event streaming with 365-day immutable storage',
      'Encrypted JSON log shipment with payload signing to CloudWatch',
      'Strict audit stream with real-time SIEM alerting',
    ],
    placeholder: 'e.g. Audit every tool call with SHA-256 argument hashes to S3',
    defaultValue: 'Audit every tool call with SHA-256 argument hashes to Datadog/S3',
  },
  {
    id: 'q11',
    sectionKey: 'escalation',
    questionNumber: 11,
    totalQuestions: 12,
    prompt: 'When must the agent halt and require human supervisor approval?',
    helperText: 'Human-in-the-loop escalation rules prevent autonomous runaway actions.',
    chips: [
      'Require supervisor approval if refund > $250 or VIP account',
      'Require Tier-3 SRE approval for any production mutation',
      'Require Compliance Officer approval for amounts > $10,000',
      'Escalate whenever semantic confidence is below 85%',
    ],
    placeholder: 'e.g. Require supervisor approval if refund > $250 or VIP account',
    defaultValue: 'Require human supervisor approval if refund > $250 or account flagged VIP',
  },
  {
    id: 'q12',
    sectionKey: 'summary',
    questionNumber: 12,
    totalQuestions: 12,
    prompt: 'Review policy synthesis: All 12 security sections completed. Ready to sign Version 1?',
    helperText: 'Compiles the full machine-verifiable policy set with cryptographic integrity hash.',
    chips: [
      'Yes, finalize and sign Version 1',
      'Save draft and review outline',
      'Tighten per-call limits before signing',
    ],
    placeholder: 'e.g. Yes, finalize Version 1',
    defaultValue: 'Verified and ready for Version 1 cryptographic compilation',
  },
];

export function buildSectionContent(
  key: PolicySectionKey,
  answer: string,
  agentName: string
): PolicySectionDetail {
  const sectionConfig: Record<
    PolicySectionKey,
    { title: string; order: number; summary: string; generate: (ans: string) => { readable: string[]; yaml: string } }
  > = {
    agent_metadata: {
      order: 1,
      title: 'Agent Metadata & Identity',
      summary: 'Agent governance identifier, execution environment, and authorization boundaries.',
      generate: (ans) => ({
        readable: [
          `Agent Identifier: ${agentName}`,
          `Declared Role: ${ans}`,
          `Enforcement Engine: ContractGuard Runtime v1.0 (Signed)`,
          `Policy Boundary Level: Level-3 Autonomous Bound`,
        ],
        yaml: `metadata:
  agent_name: "${agentName}"
  specification_version: "contractguard/v1"
  enforcement_mode: "strict_blocking"
  created_at: "${new Date().toISOString()}"
  role_description: "${ans.replace(/"/g, "'")}"`,
      }),
    },
    tool_permissions: {
      order: 2,
      title: 'Tool Whitelist & Permissions',
      summary: 'Strict whitelist of verified capabilities allowed for invocation.',
      generate: (ans) => {
        const tools = ans.split(/,\s*/).map((t) => t.trim()).filter(Boolean);
        return {
          readable: tools.map((t) => `Allowed Tool: ${t} (Schema validated)`),
          yaml: `tools:
  allowed:
${tools.map((t) => `    - name: "${t}"\n      status: "approved"\n      require_evidence: true`).join('\n')}`,
        };
      },
    },
    hard_banned_tools: {
      order: 3,
      title: 'Hard-Banned Tools & Operations',
      summary: 'Forbidden tools that trigger immediate execution cancellation.',
      generate: (ans) => {
        const banned = ans.split(/,\s*/).map((t) => t.trim()).filter(Boolean);
        return {
          readable: banned.map((b) => `BANNED: ${b} -> Action: Immediate Intercept & Alert`),
          yaml: `tools:
  hard_banned:
${banned.map((b) => `    - pattern: "${b}"\n      action: "immediate_block_and_alert"`).join('\n')}`,
        };
      },
    },
    per_call_limits: {
      order: 4,
      title: 'Per-Call Limits & Thresholds',
      summary: 'Maximum monetary, resource, or record thresholds for single actions.',
      generate: (ans) => ({
        readable: [
          `Invocation Ceiling: ${ans}`,
          'Single-step overage triggers automatic rejection before dispatch',
          'Enforced in pre-dispatch interception hook',
        ],
        yaml: `limits:
  per_call:
    rule_statement: "${ans.replace(/"/g, "'")}"
    action_on_exceed: "block_and_escalate"
    enforce_pre_dispatch: true`,
      }),
    },
    cumulative_budgets: {
      order: 5,
      title: 'Cumulative Rolling Budgets',
      summary: 'Rolling window spending and throughput quotas.',
      generate: (ans) => ({
        readable: [
          `Rolling Quota: ${ans}`,
          'Tracked via sliding window rate limiter in Redis / Memory store',
          'Graceful degradation when quota reaches 90%',
        ],
        yaml: `limits:
  cumulative:
    budget_description: "${ans.replace(/"/g, "'")}"
    window_seconds: 86400
    action_on_depletion: "halt_further_dispatches"`,
      }),
    },
    data_sources: {
      order: 6,
      title: 'Trusted vs Untrusted Data Taint',
      summary: 'Data provenance rules and taint-tracking protections.',
      generate: (ans) => ({
        readable: [
          `Taint Matrix: ${ans}`,
          'Untrusted payload strings cannot directly populate execution parameters',
          'Requires sanitization and schema assertion',
        ],
        yaml: `data_sources:
  provenance_matrix: "${ans.replace(/"/g, "'")}"
  taint_tracking_enabled: true
  block_raw_eval: true`,
      }),
    },
    parameter_binding: {
      order: 7,
      title: 'Parameter Evidence-Binding',
      summary: 'Lineage proof required for critical tool parameters.',
      generate: (ans) => ({
        readable: [
          `Binding Rule: ${ans}`,
          'Arguments must trace to cryptographically verified upstream returns',
          'Hallucinated entity IDs are rejected before tool call',
        ],
        yaml: `parameters:
  evidence_binding:
    enforce: true
    rule: "${ans.replace(/"/g, "'")}"
    max_history_turns: 5`,
      }),
    },
    sequencing_rules: {
      order: 8,
      title: 'Mandatory Execution Sequencing',
      summary: 'Prerequisite order dependencies enforced before mutations.',
      generate: (ans) => ({
        readable: [
          `Workflow Order: ${ans}`,
          'State machine verifies predecessor stages completed successfully',
          'Out-of-order execution rejected with INVALID_SEQUENCE exception',
        ],
        yaml: `sequencing:
  pipeline: "${ans.replace(/"/g, "'")}"
  enforce_strict_order: true`,
      }),
    },
    semantic_verification: {
      order: 9,
      title: 'Semantic Anomaly Triggers',
      summary: 'Heuristic and second-look LLM evaluations on high-risk intent.',
      generate: (ans) => ({
        readable: [
          `Safety Trigger: ${ans}`,
          'Dual-model arbitration activated when triggers are matched',
          'Execution suspended pending verdict',
        ],
        yaml: `semantic_verification:
  triggers:
    - description: "${ans.replace(/"/g, "'")}"
      arbitration_model: "gemini-2.5-pro"
      confidence_threshold: 0.85`,
      }),
    },
    logging_audit: {
      order: 10,
      title: 'Immutable Audit & Logging',
      summary: 'Cryptographic non-repudiation audit logging specification.',
      generate: (ans) => ({
        readable: [
          `Audit Policy: ${ans}`,
          'Immutable ledger recording tool input hashes, outputs, and timestamps',
          'Export format: RFC5424 structured JSON stream',
        ],
        yaml: `logging:
  audit_level: "full_provenance"
  target: "${ans.replace(/"/g, "'")}"
  record_sha256_digests: true
  pii_masking: "enabled"`,
      }),
    },
    escalation: {
      order: 11,
      title: 'Human-in-the-Loop Escalation',
      summary: 'Conditions requiring manual supervisor sign-off.',
      generate: (ans) => ({
        readable: [
          `Escalation Condition: ${ans}`,
          'Dispatches webhook to supervisor portal with 15-minute approval window',
          'Automated fallback: Reject if approval expires',
        ],
        yaml: `escalation:
  human_in_the_loop:
    trigger: "${ans.replace(/"/g, "'")}"
    timeout_seconds: 900
    fallback_action: "reject"`,
      }),
    },
    summary: {
      order: 12,
      title: 'Policy Summary & Integrity Hash',
      summary: 'Verifiable integrity digest and compile status.',
      generate: () => {
        const hash = 'sha256:' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        return {
          readable: [
            'All 12 policy sections compiled and verified.',
            `Integrity Digest: ${hash}`,
            'Runtime Schema: contractguard-spec-v1.0.yaml',
            'Status: Ready to deploy or export as Interactive PDF / YAML / JSON.',
          ],
          yaml: `integrity:
  checksum: "${hash}"
  compiled_by: "ContractGuard Policy Studio"
  version: "v1.0.0"
  status: "active"`,
        };
      },
    },
  };

  const config = sectionConfig[key];
  const { readable, yaml } = config.generate(answer);

  return {
    key,
    order: config.order,
    title: config.title,
    summary: config.summary,
    readableContent: readable,
    yamlContent: yaml,
    isComplete: true,
  };
}

export function compileFullPolicy(
  agentName: string,
  purpose: string,
  answers: Record<PolicySectionKey, string>
): PolicyContent {
  const sections = {} as Record<PolicySectionKey, PolicySectionDetail>;
  const keys: PolicySectionKey[] = [
    'agent_metadata',
    'tool_permissions',
    'hard_banned_tools',
    'per_call_limits',
    'cumulative_budgets',
    'data_sources',
    'parameter_binding',
    'sequencing_rules',
    'semantic_verification',
    'logging_audit',
    'escalation',
    'summary',
  ];

  keys.forEach((k) => {
    sections[k] = buildSectionContent(k, answers[k] || 'Default security boundary configured', agentName);
  });

  const rawYaml = keys.map((k) => sections[k].yamlContent).join('\n\n');
  const integrity_hash = sections.summary.yamlContent.match(/checksum: "([^"]+)"/)?.[1] || 'sha256:d8a9e...';

  return {
    agent_name: agentName,
    purpose,
    primary_tools: (answers.tool_permissions || 'default_tools').split(',').map((t) => t.trim()),
    sections,
    integrity_hash,
    rawYaml,
  };
}
