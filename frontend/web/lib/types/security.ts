export type DeploymentStyle = 'in_process' | 'sidecar' | 'gateway';

export interface ArchitectureCodeSnippet {
  language: string;
  filename: string;
  code: string;
  description?: string;
}

export interface ArchitectureChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  note?: string;
}

export interface ArchitectureSection {
  id: string;
  number: number;
  title: string;
  summary: string;
  content: string[];
  codeSnippets?: ArchitectureCodeSnippet[];
  checklistItems?: ArchitectureChecklistItem[];
  diagramType?: DeploymentStyle;
}

export interface ArchitectureDocument {
  title: string;
  subtitle: string;
  date: string;
  author: string;
  version: string;
  policy_title: string;
  policy_version: string;
  integrity_hash: string;
  deployment_style: DeploymentStyle;
  deployment_label: string;
  environment_notes?: string;
  sections: ArchitectureSection[];
}

export interface ArchitecturePack {
  id: string;
  policy_id: string;
  policy_title: string;
  version: string;
  deployment_style: DeploymentStyle;
  deployment_label: string;
  environment_notes?: string;
  created_at: string;
  integrity_hash: string;
  document: ArchitectureDocument;
}

export type ConfigGroupId = 'llm' | 'email' | 'speech' | 'webhooks' | 'runtime';

export interface SecurityConfigItem {
  key: string;
  label: string;
  description: string;
  type: 'secret' | 'text' | 'number' | 'boolean' | 'select';
  group: ConfigGroupId;
  masked_value?: string; // e.g. "••••a9f2"
  is_set: boolean;
  last_updated?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  status?: 'active' | 'testing' | 'error' | 'unconfigured';
  last_test_result?: {
    success: boolean;
    latency_ms: number;
    message: string;
    tested_at: string;
  };
}

export interface SecurityConfigGroup {
  id: ConfigGroupId;
  title: string;
  description: string;
  icon: string;
  items: SecurityConfigItem[];
}

export interface SecurityAuditLogEntry {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'rotate' | 'test';
  target: string;
  group: ConfigGroupId;
  actor: string;
  detail: string;
}
