export type RepoJobStatus =
  | 'uploaded'
  | 'validating'
  | 'scanning'
  | 'parsing'
  | 'extracting'
  | 'purging'
  | 'complete'
  | 'purged'
  | 'failed';

export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ToolCategory =
  | 'shell'
  | 'file_system'
  | 'network'
  | 'payment'
  | 'database'
  | 'general';

export interface DiscoveredToolParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface DiscoveredTool {
  id: string;
  name: string;
  parameters: DiscoveredToolParameter[];
  source_file: string;
  risk_level: ToolRiskLevel;
  category: ToolCategory;
  description: string;
}

export interface RiskFlagsSummary {
  shell_execution: { detected: boolean; count: number; description?: string };
  file_deletion: { detected: boolean; count: number; description?: string };
  network_calls: { detected: boolean; count: number; description?: string };
  payments: { detected: boolean; count: number; description?: string };
}

export interface DetectedSecretItem {
  file_path: string;
  secret_type: string;
  line_number?: number;
  snippet_hint?: string; // only redactions like "sk_live_••••••"
}

export interface SecretsDetectedSummary {
  detected: boolean;
  count: number;
  files: DetectedSecretItem[];
}

export interface DeletionReceipt {
  job_id: string;
  purged_at: string;
  workspace_path: string;
  files_destroyed_count: number;
  bytes_purged: number;
  status_text: 'source code deleted';
  cryptographic_receipt_hash: string;
  ttl_policy: string;
}

export interface RepoJob {
  id: string;
  name: string;
  file_name: string;
  file_size_bytes: number;
  created_at: string;
  status: 'complete' | 'purged' | 'failed' | 'processing';
  current_stage?: 'upload' | 'validate' | 'scan_secrets' | 'parse_ast' | 'extract_signatures' | 'purge_source' | 'done';
  stage_label?: string;
  progress_percent?: number;
  tools_found_count: number;
  risk_flags_count: number;
  tools: DiscoveredTool[];
  risk_flags: RiskFlagsSummary;
  secrets_detected: SecretsDetectedSummary;
  deletion_receipt: DeletionReceipt;
  consent_accepted: boolean;
  notes?: string;
}

export interface RepoPipelineStep {
  id: 'upload' | 'validate' | 'scan_secrets' | 'parse_ast' | 'extract_signatures' | 'purge_source';
  label: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  duration_ms?: number;
}

export interface RepoStreamEvent {
  event: 'stage_start' | 'stage_progress' | 'stage_complete' | 'job_complete' | 'job_error';
  stage: RepoPipelineStep['id'] | 'done';
  message: string;
  progress: number;
  job?: RepoJob;
}
