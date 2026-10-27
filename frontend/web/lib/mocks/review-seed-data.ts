import { ReviewData, ProposedChange, ReviewConflict, VideoTranscriptItem } from '../types/review';

export const MOCK_TRANSCRIPT: VideoTranscriptItem[] = [
  {
    timestamp: '00:15',
    seconds: 15,
    speaker: 'Marcus (Security Lead)',
    text: 'Okay team, let us review the active Customer Refund policy for the support bot. Looking at our recent audit logs.',
  },
  {
    timestamp: '01:14',
    seconds: 74,
    speaker: 'Elena (Compliance Officer)',
    text: 'Five hundred dollars unassisted is way too risky for a first-line support bot. Let us cap it at two-fifty.',
  },
  {
    timestamp: '02:05',
    seconds: 125,
    speaker: 'Marcus (Security Lead)',
    text: 'Agreed. And in the written review, there is a suggestion for a strict one-fifty cap. We need to decide on that conflict.',
  },
  {
    timestamp: '02:45',
    seconds: 165,
    speaker: 'Elena (Compliance Officer)',
    text: 'The agent also needs to check sentiment telemetry before dispensing refund credits to prevent social engineering.',
  },
  {
    timestamp: '03:30',
    seconds: 210,
    speaker: 'Marcus (Security Lead)',
    text: 'Any refund above two hundred and fifty dollars must trigger supervisor approval before dispatch.',
  },
  {
    timestamp: '04:15',
    seconds: 255,
    speaker: 'Elena (Compliance Officer)',
    text: 'Also notice how step 1 and step 4 both run identity checks. Let us restructure that into a consolidated sequence.',
  },
];

export const MOCK_PROPOSED_CHANGES: ProposedChange[] = [
  {
    change_id: 'c1',
    section: 'limits.per_call',
    section_title: 'Per-Call Limits',
    type: 'modify',
    before: 'max_refund_usd: 500.00 (single invocation)',
    after: 'max_refund_usd: 250.00 (single invocation)',
    reason: 'Reviewer flagged $500 as excessive for unassisted automated returns',
    source: {
      kind: 'video',
      timestamp: '01:14',
      quote: 'Five hundred dollars unassisted is way too risky for a first-line support bot. Let us cap it at two-fifty.',
    },
    decision: 'pending',
    conflict_with: 'c2',
  },
  {
    change_id: 'c2',
    section: 'limits.per_call',
    section_title: 'Per-Call Limits',
    type: 'modify',
    before: 'max_refund_usd: 500.00 (single invocation)',
    after: 'max_refund_usd: 150.00 (strict global threshold)',
    reason: 'Written audit comment proposes an alternative aggressive $150 limit',
    source: {
      kind: 'text',
      quote: 'Probationary user accounts must have an absolute refund ceiling of $150 across the board.',
    },
    decision: 'pending',
    conflict_with: 'c1',
  },
  {
    change_id: 'c3',
    section: 'tools.permissions',
    section_title: 'Tool Whitelist',
    type: 'add',
    before: 'tools: [order_status_lookup, issue_refund, send_email, customer_notes]',
    after: 'tools: [order_status_lookup, issue_refund, send_email, customer_notes, customer_sentiment_check]',
    reason: 'Enables pre-dispatch sentiment telemetry before executing disputed return actions',
    source: {
      kind: 'video',
      timestamp: '02:45',
      quote: 'The agent needs to check sentiment telemetry before dispensing refund credits to prevent social engineering.',
    },
    decision: 'pending',
  },
  {
    change_id: 'c4',
    section: 'hard_banned_tools',
    section_title: 'Hard-Banned Tools',
    type: 'remove',
    before: 'banned: [raw_sql_execution, delete_customer_account, delete_customer_notes]',
    after: 'banned: [raw_sql_execution, delete_customer_account] # Removed delete_customer_notes to allow soft-archive',
    reason: 'Customer notes require soft-archiving capability rather than a hard firewall block',
    source: {
      kind: 'text',
      quote: 'Move customer note purge to soft-archive rather than a hard firewall block.',
    },
    decision: 'pending',
  },
  {
    change_id: 'c5',
    section: 'escalation',
    section_title: 'Human-in-the-Loop Escalation',
    type: 'modify',
    before: 'supervisor_approval: amount > $500.00',
    after: 'supervisor_approval: amount > $250.00 OR account.is_vip == true',
    reason: 'Align escalation boundary with the revised refund threshold and protect VIP accounts',
    source: {
      kind: 'video',
      timestamp: '03:30',
      quote: 'Any refund above two hundred and fifty dollars must trigger supervisor approval before dispatch.',
    },
    decision: 'pending',
  },
  {
    change_id: 'c6',
    section: 'sequencing_rules',
    section_title: 'Workflow Sequencing',
    type: 'restructure',
    before: '1. verify_identity -> 2. lookup_order -> 3. check_status -> 4. re_verify_identity -> 5. issue_refund',
    after: '1. verify_customer_identity -> 2. lookup_order -> 3. customer_sentiment_check -> 4. issue_refund',
    reason: 'Agent Restructuring: merged redundant identity checks and re-ordered pipeline for optimal latency',
    source: {
      kind: 'video',
      timestamp: '04:15',
      quote: 'Also notice how step 1 and step 4 both run identity checks. Let us restructure that into a consolidated sequence.',
    },
    decision: 'pending',
  },
];

export const MOCK_CONFLICTS: ReviewConflict[] = [
  {
    id: 'conf_1',
    change_ids: ['c1', 'c2'],
    title: 'Conflicting Refund Thresholds',
    description: 'Change c1 proposes setting the per-call refund ceiling to $250.00, while Change c2 proposes capping it at $150.00.',
    resolution_tip: 'Accept either c1 or c2, or click Edit on your preferred change to specify a unified threshold.',
  },
];

export const PREPARED_REVIEW: ReviewData = {
  review_id: 'rev_mock_001',
  policy_id: 'pol_101',
  video_name: 'Policy_Compliance_Walkthrough_Oct2026.mp4',
  video_duration: '04:42',
  text_review: `Review notes from Q4 Compliance Audit:
- Please restrict refund ceiling to prevent automated balance depletion.
- Probationary user accounts must have an absolute refund ceiling of $150 across the board.
- Move customer note purge to soft-archive rather than a hard firewall block.
- Streamline the return workflow by merging redundant authorization steps.`,
  transcript: MOCK_TRANSCRIPT,
  proposed_changes: MOCK_PROPOSED_CHANGES,
  conflicts: MOCK_CONFLICTS,
  status: 'proposals_ready',
  created_at: new Date().toISOString(),
};
