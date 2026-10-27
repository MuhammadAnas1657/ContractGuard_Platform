export type ChangeType = 'modify' | 'add' | 'remove' | 'restructure';
export type DecisionType = 'pending' | 'accept' | 'reject' | 'edit';

export interface ProposedChangeSource {
  kind: 'video' | 'text';
  timestamp?: string; // e.g. "01:24"
  quote: string;
}

export interface ProposedChange {
  change_id: string;
  section: string;
  section_title: string;
  type: ChangeType;
  before: string;
  after: string;
  reason: string;
  source: ProposedChangeSource;
  decision: DecisionType;
  edited_value?: string;
  conflict_with?: string; // change_id of conflicting change
}

export interface ReviewConflict {
  id: string;
  change_ids: [string, string];
  title: string;
  description: string;
  resolution_tip: string;
}

export interface VideoTranscriptItem {
  timestamp: string;
  seconds: number;
  speaker: string;
  text: string;
}

export type ReviewStepKey =
  | 'upload'
  | 'transcribe'
  | 'extract'
  | 'map'
  | 'propose';

export interface ReviewStepState {
  key: ReviewStepKey;
  label: string;
  status: 'idle' | 'running' | 'completed';
  detail: string;
}

export interface ReviewData {
  review_id: string;
  policy_id: string;
  video_name?: string;
  video_duration?: string;
  text_review?: string;
  transcript: VideoTranscriptItem[];
  proposed_changes: ProposedChange[];
  conflicts: ReviewConflict[];
  status: 'uploaded' | 'transcribing' | 'analyzing' | 'proposals_ready' | 'applied' | 'discarded';
  created_at: string;
}
