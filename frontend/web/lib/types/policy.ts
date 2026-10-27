export type PolicyStatus = 'active' | 'draft' | 'in_review';

export type PolicySectionKey =
  | 'agent_metadata'
  | 'tool_permissions'
  | 'hard_banned_tools'
  | 'per_call_limits'
  | 'cumulative_budgets'
  | 'data_sources'
  | 'parameter_binding'
  | 'sequencing_rules'
  | 'semantic_verification'
  | 'logging_audit'
  | 'escalation'
  | 'summary';

export interface PolicySectionDetail {
  key: PolicySectionKey;
  order: number;
  title: string;
  summary: string;
  readableContent: string[];
  yamlContent: string;
  isComplete: boolean;
  isUpdating?: boolean;
}

export interface PolicyContent {
  agent_name: string;
  purpose: string;
  primary_tools: string[];
  sections: Record<PolicySectionKey, PolicySectionDetail>;
  integrity_hash: string;
  rawYaml: string;
}

export interface PolicyVersion {
  version: string;
  created_at: string;
  author: string;
  change_summary: string;
  integrity_hash: string;
  yaml_spec?: string;
}

export interface Policy {
  id: string;
  agent_name: string;
  title: string;
  description: string;
  status: PolicyStatus;
  version: string;
  tools_count: number;
  rules_count: number;
  created_at: string;
  updated_at: string;
  author_name: string;
  versions: PolicyVersion[];
  content?: PolicyContent;
  yaml_spec?: string;
}

export interface PastExport {
  id: string;
  policy_id: string;
  policy_title: string;
  version: string;
  format: 'pdf' | 'yaml' | 'json' | 'md' | 'docx' | 'zip';
  created_at: string;
  file_size: string;
  integrity_hash: string;
  download_url?: string;
}

export interface SetupChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action_href?: string;
  action_label?: string;
}

export interface InterviewQuestion {
  id: string;
  sectionKey: PolicySectionKey;
  questionNumber: number;
  totalQuestions: number;
  prompt: string;
  helperText?: string;
  chips: string[];
  placeholder: string;
  defaultValue?: string;
}

export interface InterviewAnswer {
  questionId: string;
  sectionKey: PolicySectionKey;
  questionPrompt: string;
  answer: string;
  answeredAt: string;
}

export type PolicyEventType =
  | 'section_start'
  | 'token'
  | 'section_done'
  | 'progress'
  | 'complete'
  | 'error';

export interface PolicyEvent {
  event: PolicyEventType;
  data: {
    section?: PolicySectionKey | string;
    title?: string;
    text?: string;
    done?: number;
    total?: number;
    version?: string | number;
    code?: string;
    message?: string;
  };
}
