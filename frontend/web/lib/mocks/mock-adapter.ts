import { User, OTPPurpose, UserStatus } from '../types/auth';
import { Policy, PastExport, SetupChecklistItem, PolicyEvent } from '../types/policy';
import { AdminOverviewResponse, AdminUsersFilter, ActivityFeedItem } from '../types/admin';
import { ReviewData, ProposedChange, ReviewStepState, ReviewConflict } from '../types/review';
import { RepoJob, RepoStreamEvent } from '../types/repository';
import {
  MOCK_USERS,
  MOCK_POLICIES,
  MOCK_EXPORTS,
  MOCK_ADMIN_OVERVIEW,
  MOCK_CHART_DATA,
  MOCK_ACTIVITY_FEED,
} from './seed-data';
import { PREPARED_REVIEW, MOCK_TRANSCRIPT, MOCK_PROPOSED_CHANGES, MOCK_CONFLICTS } from './review-seed-data';
import { SEED_REPO_JOBS } from './repo-seed-data';
import {
  DeploymentStyle,
  ArchitecturePack,
  SecurityConfigGroup,
  SecurityConfigItem,
  SecurityAuditLogEntry,
} from '../types/security';
import { synthesizeArchitectureDocument } from '../utils/architecture-synthesizer';
import {
  generateArchitecturePdf,
  generateArchitectureMarkdown,
  generateArchitectureBundleZip,
} from '../utils/architecture-exporter';
import { createWordDocument } from '../utils/docx-builder';
import { SEED_SECURITY_CONFIG, SEED_SECURITY_AUDIT } from './security-seed-data';

const STORAGE_KEYS = {
  CURRENT_USER: 'cg_current_user',
  TOKEN: 'cg_auth_token',
  USERS: 'cg_users_db',
  POLICIES: 'cg_policies_db',
  EXPORTS: 'cg_exports_db',
  OTP_SESSION: 'cg_otp_session',
  CHECKLIST: 'cg_checklist',
  ACTIVITY: 'cg_activity_db',
  REVIEWS: 'cg_reviews_db',
  REPOS: 'cg_repos_db',
  ARCHITECTURE_PACKS: 'cg_architecture_packs_db',
  CONFIG: 'cg_security_config_db',
  SECURITY_AUDIT: 'cg_security_audit_db',
};

function safeStorageGet<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(key);
    return val ? (JSON.parse(val) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeStorageSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Storage set failed:', err);
  }
}

function safeStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

const DEFAULT_CHECKLIST: SetupChecklistItem[] = [
  {
    id: 'verify_email',
    title: 'Verify work email address',
    description: 'Ensure critical security notifications reach your inbox.',
    completed: true,
    action_href: '/settings',
    action_label: 'View Email',
  },
  {
    id: 'add_api_key',
    title: 'Configure LLM Provider API Key',
    description: 'Connect Gemini or Anthropic credentials in masked storage.',
    completed: false,
    action_href: '/security/configuration',
    action_label: 'Configure Keys',
  },
  {
    id: 'create_first_policy',
    title: 'Generate your first agent policy',
    description: 'Launch Policy Studio to synthesize enforcement rules.',
    completed: true,
    action_href: '/policies/new',
    action_label: 'Policy Studio',
  },
  {
    id: 'export_enforcement_pack',
    title: 'Export signed verification package',
    description: 'Download interactive PDF and YAML runtime enforcement specs.',
    completed: false,
    action_href: '/policies',
    action_label: 'View Policies',
  },
];

export class MockApiAdapter {
  private getUsers(): User[] {
    const users = safeStorageGet<User[]>(STORAGE_KEYS.USERS, []);
    if (!users || users.length === 0) {
      safeStorageSet(STORAGE_KEYS.USERS, MOCK_USERS);
      return MOCK_USERS;
    }
    return users;
  }

  private saveUsers(users: User[]): void {
    safeStorageSet(STORAGE_KEYS.USERS, users);
  }

  // --- Auth APIs ---

  async signup(data: { name: string; email: string; password?: string }): Promise<{ status: 'otp_sent' }> {
    const email = data.email.trim().toLowerCase();
    const users = this.getUsers();

    let existing = users.find((u) => u.email.toLowerCase() === email);
    if (!existing) {
      const newUser: User = {
        id: `usr_${Date.now().toString(36)}`,
        name: data.name.trim() || 'New User',
        email,
        role: email.includes('admin') ? 'super_admin' : 'user',
        status: 'pending',
        email_verified_at: null,
        created_at: new Date().toISOString(),
        last_login_at: null,
      };
      users.push(newUser);
      this.saveUsers(users);
    }

    // Initialize OTP session
    const otpSession = {
      email,
      purpose: 'signup' as OTPPurpose,
      code: '123456',
      expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      max_attempts: 5,
      resend_cooldown_until: Date.now() + 60 * 1000,
    };
    safeStorageSet(STORAGE_KEYS.OTP_SESSION, otpSession);

    this.recordActivity({
      type: 'signup',
      user_email: email,
      description: 'Account registered, verification OTP generated',
      ip: '127.0.0.1',
    });

    return { status: 'otp_sent' };
  }

  async login(data: { email: string; password?: string }): Promise<{ status: 'otp_required'; email: string }> {
    const email = data.email.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      // Create user on the fly for demo flexibility or reject
      const isSpecialDemo = email === 'user@demo.com' || email === 'admin@demo.com';
      if (isSpecialDemo) {
        // Fall back to seed user
        const seed = MOCK_USERS.find((u) => u.email === email)!;
        users.push(seed);
        this.saveUsers(users);
      } else {
        // Generic response to prevent email enumeration
        const otpSession = {
          email,
          purpose: 'login' as OTPPurpose,
          code: '123456',
          expires_at: Date.now() + 10 * 60 * 1000,
          attempts: 0,
          max_attempts: 5,
          resend_cooldown_until: Date.now() + 60 * 1000,
        };
        safeStorageSet(STORAGE_KEYS.OTP_SESSION, otpSession);
        return { status: 'otp_required', email };
      }
    }

    if (user && user.status === 'suspended') {
      throw new Error('This account has been suspended. Please contact your organization administrator.');
    }

    const otpSession = {
      email,
      purpose: 'login' as OTPPurpose,
      code: '123456',
      expires_at: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      max_attempts: 5,
      resend_cooldown_until: Date.now() + 60 * 1000,
    };
    safeStorageSet(STORAGE_KEYS.OTP_SESSION, otpSession);

    return { status: 'otp_required', email };
  }

  async verifyOtp(params: {
    email: string;
    code: string;
    purpose?: OTPPurpose;
  }): Promise<{ user: User; token: string }> {
    const email = params.email.trim().toLowerCase();
    const otpSession = safeStorageGet<any>(STORAGE_KEYS.OTP_SESSION, null);

    if (!otpSession || otpSession.email !== email) {
      // Mock fallback: if user navigates directly with 123456
      if (params.code === '123456') {
        const users = this.getUsers();
        let user = users.find((u) => u.email.toLowerCase() === email);
        if (!user) {
          user = {
            id: `usr_${Date.now().toString(36)}`,
            name: email.split('@')[0],
            email,
            role: email.includes('admin') ? 'super_admin' : 'user',
            status: 'active',
            email_verified_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
          };
          users.push(user);
          this.saveUsers(users);
        }
        return this.completeLogin(user);
      }
      throw new Error('Verification session expired or invalid. Please request a new code.');
    }

    if (Date.now() > otpSession.expires_at) {
      safeStorageRemove(STORAGE_KEYS.OTP_SESSION);
      throw new Error('Verification code has expired. Please request a new code.');
    }

    if (otpSession.attempts >= otpSession.max_attempts) {
      safeStorageRemove(STORAGE_KEYS.OTP_SESSION);
      throw new Error('Maximum verification attempts (5) exceeded. Please request a new code.');
    }

    if (params.code !== '123456') {
      otpSession.attempts += 1;
      safeStorageSet(STORAGE_KEYS.OTP_SESSION, otpSession);
      const remaining = otpSession.max_attempts - otpSession.attempts;
      this.recordActivity({
        type: 'otp_failed',
        user_email: email,
        description: `Invalid OTP attempt (${otpSession.attempts}/5)`,
        ip: '127.0.0.1',
      });
      if (remaining <= 0) {
        throw new Error('Maximum verification attempts (5) reached. Code has been invalidated.');
      }
      throw new Error(`Invalid verification code. ${remaining} attempts remaining.`);
    }

    // Valid code!
    safeStorageRemove(STORAGE_KEYS.OTP_SESSION);

    const users = this.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      user = {
        id: `usr_${Date.now().toString(36)}`,
        name: email.split('@')[0],
        email,
        role: email.includes('admin') ? 'super_admin' : 'user',
        status: 'active',
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      };
      users.push(user);
    } else {
      user.status = 'active';
      if (!user.email_verified_at) {
        user.email_verified_at = new Date().toISOString();
      }
      user.last_login_at = new Date().toISOString();
    }

    this.saveUsers(users);
    return this.completeLogin(user);
  }

  private completeLogin(user: User): { user: User; token: string } {
    const fakeToken = `cg_mock_jwt_${user.id}_${Date.now()}`;
    safeStorageSet(STORAGE_KEYS.CURRENT_USER, user);
    safeStorageSet(STORAGE_KEYS.TOKEN, fakeToken);

    this.recordActivity({
      type: 'login_success',
      user_email: user.email,
      user_name: user.name,
      description: 'Logged in successfully with OTP',
      ip: '127.0.0.1',
    });

    return { user, token: fakeToken };
  }

  async resendOtp(params: { email: string; purpose?: OTPPurpose }): Promise<{ status: 'otp_sent'; resend_cooldown_until: number }> {
    const email = params.email.trim().toLowerCase();
    const existing = safeStorageGet<any>(STORAGE_KEYS.OTP_SESSION, null);

    if (existing && existing.resend_cooldown_until && Date.now() < existing.resend_cooldown_until) {
      const waitSec = Math.ceil((existing.resend_cooldown_until - Date.now()) / 1000);
      throw new Error(`Please wait ${waitSec}s before requesting a new code.`);
    }

    const cooldownUntil = Date.now() + 60 * 1000;
    const otpSession = {
      email,
      purpose: params.purpose || 'login',
      code: '123456',
      expires_at: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      max_attempts: 5,
      resend_cooldown_until: cooldownUntil,
    };
    safeStorageSet(STORAGE_KEYS.OTP_SESSION, otpSession);

    this.recordActivity({
      type: 'otp_sent',
      user_email: email,
      description: 'Resent 6-digit OTP code',
      ip: '127.0.0.1',
    });

    return { status: 'otp_sent', resend_cooldown_until: cooldownUntil };
  }

  async forgotPassword(data: { email: string }): Promise<{ status: 'otp_sent' }> {
    const email = data.email.trim().toLowerCase();
    const otpSession = {
      email,
      purpose: 'reset' as OTPPurpose,
      code: '123456',
      expires_at: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      max_attempts: 5,
      resend_cooldown_until: Date.now() + 60 * 1000,
    };
    safeStorageSet(STORAGE_KEYS.OTP_SESSION, otpSession);
    return { status: 'otp_sent' };
  }

  async resetPassword(data: { email: string; code: string; new_password?: string }): Promise<{ status: 'success' }> {
    if (data.code !== '123456') {
      throw new Error('Invalid or expired reset code. Please try 123456.');
    }
    return { status: 'success' };
  }

  async logout(): Promise<void> {
    const user = safeStorageGet<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (user) {
      this.recordActivity({
        type: 'login_failed',
        user_email: user.email,
        description: 'User logged out',
        ip: '127.0.0.1',
      });
    }
    safeStorageRemove(STORAGE_KEYS.CURRENT_USER);
    safeStorageRemove(STORAGE_KEYS.TOKEN);
    safeStorageRemove(STORAGE_KEYS.OTP_SESSION);
  }

  async getMe(): Promise<User | null> {
    return safeStorageGet<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  // Quick switch for demo testing
  async switchDemoUser(role: 'user' | 'super_admin'): Promise<User> {
    const email = role === 'super_admin' ? 'admin@demo.com' : 'user@demo.com';
    const users = this.getUsers();
    let user = users.find((u) => u.email === email);
    if (!user) {
      user = MOCK_USERS.find((u) => u.email === email)!;
      users.push(user);
      this.saveUsers(users);
    }
    this.completeLogin(user);
    return user;
  }

  // --- Policies APIs ---

  async getPolicies(): Promise<Policy[]> {
    const policies = safeStorageGet<Policy[]>(STORAGE_KEYS.POLICIES, []);
    if (!policies || policies.length === 0) {
      safeStorageSet(STORAGE_KEYS.POLICIES, MOCK_POLICIES);
      return MOCK_POLICIES;
    }
    return policies;
  }

  async getPolicy(id: string): Promise<Policy | null> {
    const policies = await this.getPolicies();
    return policies.find((p) => p.id === id) || null;
  }

  async createPolicy(policyData: Partial<Policy>): Promise<Policy> {
    const policies = await this.getPolicies();
    const newPolicy: Policy = {
      id: policyData.id || `pol_${Date.now().toString(36)}`,
      agent_name: policyData.agent_name || 'AutonomousAgent',
      title: policyData.title || `${policyData.agent_name || 'Agent'} Policy`,
      description: policyData.description || 'Machine-verifiable security and enforcement policy.',
      status: policyData.status || 'draft',
      version: policyData.version || 'v1.0.0',
      tools_count: policyData.tools_count || 4,
      rules_count: policyData.rules_count || 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_name: policyData.author_name || 'Elena Vance',
      versions: policyData.versions || [
        {
          version: policyData.version || 'v1.0.0',
          created_at: new Date().toISOString(),
          author: policyData.author_name || 'Elena Vance',
          change_summary: 'Initial synthesized policy from Policy Studio',
          integrity_hash: 'sha256:' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        },
      ],
      content: policyData.content,
      yaml_spec: policyData.yaml_spec,
    };
    const updated = [newPolicy, ...policies.filter((p) => p.id !== newPolicy.id)];
    safeStorageSet(STORAGE_KEYS.POLICIES, updated);

    this.recordActivity({
      type: 'signup',
      user_email: 'user@demo.com',
      description: `Created policy: ${newPolicy.title} (${newPolicy.version})`,
      ip: '127.0.0.1',
    });

    return newPolicy;
  }

  async savePolicy(policy: Policy): Promise<Policy> {
    const policies = await this.getPolicies();
    const idx = policies.findIndex((p) => p.id === policy.id);
    const updatedPolicy: Policy = {
      ...policy,
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) {
      policies[idx] = updatedPolicy;
    } else {
      policies.unshift(updatedPolicy);
    }
    safeStorageSet(STORAGE_KEYS.POLICIES, policies);
    return updatedPolicy;
  }

  async deletePolicy(id: string): Promise<void> {
    const policies = await this.getPolicies();
    const filtered = policies.filter((p) => p.id !== id);
    safeStorageSet(STORAGE_KEYS.POLICIES, filtered);
  }

  async recordExport(exportItem: PastExport): Promise<PastExport> {
    const exportsList = await this.getRecentExports();
    const updated = [exportItem, ...exportsList];
    safeStorageSet(STORAGE_KEYS.EXPORTS, updated);

    this.recordActivity({
      type: 'policy_export',
      user_email: 'user@demo.com',
      description: `Exported policy: ${exportItem.policy_title} (${exportItem.format.toUpperCase()})`,
      ip: '127.0.0.1',
    });

    return exportItem;
  }

  async *streamPolicy(
    sectionKey: string,
    sectionTitle: string,
    fullText: string,
    doneCount: number
  ): AsyncIterable<PolicyEvent> {
    yield {
      event: 'section_start',
      data: { section: sectionKey, title: sectionTitle },
    };

    const chunks = fullText.match(/.{1,12}/g) || [fullText];
    for (const chunk of chunks) {
      await new Promise((r) => setTimeout(r, 20));
      yield {
        event: 'token',
        data: { section: sectionKey, text: chunk },
      };
    }

    yield {
      event: 'section_done',
      data: { section: sectionKey },
    };

    yield {
      event: 'progress',
      data: { done: doneCount, total: 12 },
    };

    if (doneCount === 12) {
      yield {
        event: 'complete',
        data: { version: '1.0.0' },
      };
    }
  }

  async getRecentExports(): Promise<PastExport[]> {
    const exportsList = safeStorageGet<PastExport[]>(STORAGE_KEYS.EXPORTS, []);
    if (!exportsList || exportsList.length === 0) {
      safeStorageSet(STORAGE_KEYS.EXPORTS, MOCK_EXPORTS);
      return MOCK_EXPORTS;
    }
    return exportsList;
  }

  async getSetupChecklist(): Promise<SetupChecklistItem[]> {
    const checklist = safeStorageGet<SetupChecklistItem[]>(STORAGE_KEYS.CHECKLIST, []);
    if (!checklist || checklist.length === 0) {
      safeStorageSet(STORAGE_KEYS.CHECKLIST, DEFAULT_CHECKLIST);
      return DEFAULT_CHECKLIST;
    }
    return checklist;
  }

  async toggleChecklistItem(id: string): Promise<SetupChecklistItem[]> {
    const list = await this.getSetupChecklist();
    const updated = list.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
    safeStorageSet(STORAGE_KEYS.CHECKLIST, updated);
    return updated;
  }

  // --- Review Studio APIs (Flow C) ---

  async createReview(
    policyId: string,
    data?: { videoName?: string; textReview?: string }
  ): Promise<{ review_id: string }> {
    const reviewId = `rev_${Date.now().toString(36)}`;
    const newReview: ReviewData = {
      ...PREPARED_REVIEW,
      review_id: reviewId,
      policy_id: policyId,
      video_name: data?.videoName || PREPARED_REVIEW.video_name,
      text_review: data?.textReview || PREPARED_REVIEW.text_review,
      status: 'proposals_ready',
      created_at: new Date().toISOString(),
    };
    const reviews = safeStorageGet<Record<string, ReviewData>>(STORAGE_KEYS.REVIEWS, {});
    reviews[reviewId] = newReview;
    reviews[policyId] = newReview; // Index by policyId for convenience
    safeStorageSet(STORAGE_KEYS.REVIEWS, reviews);
    return { review_id: reviewId };
  }

  async getReview(reviewId: string): Promise<ReviewData> {
    const reviews = safeStorageGet<Record<string, ReviewData>>(STORAGE_KEYS.REVIEWS, {});
    if (reviews[reviewId]) return reviews[reviewId];
    return {
      ...PREPARED_REVIEW,
      review_id: reviewId,
      policy_id: reviewId.startsWith('pol_') ? reviewId : 'pol_101',
    };
  }

  async *streamReview(reviewId: string): AsyncIterable<ReviewStepState> {
    const steps: Array<{ key: import('../types/review').ReviewStepKey; label: string; detail: string }> = [
      { key: 'upload', label: 'Upload & Parse', detail: 'Validating media container and calculating integrity hash...' },
      { key: 'transcribe', label: 'Transcribe Audio', detail: 'Running multi-speaker speech-to-text with timestamp diarization...' },
      { key: 'extract', label: 'Extract Feedback', detail: 'Isolating security concerns, requested limits, and risk comments...' },
      { key: 'map', label: 'Map to Policy Sections', detail: 'Cross-referencing feedback against active clauses in policy AST...' },
      { key: 'propose', label: 'Propose Changes & Conflicts', detail: 'Generating inline diffs, restructure candidates, and conflict checks...' },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      yield {
        key: step.key,
        label: step.label,
        status: 'running',
        detail: step.detail,
      };
      await new Promise((r) => setTimeout(r, 450));
      yield {
        key: step.key,
        label: step.label,
        status: 'completed',
        detail: `${step.label} finished successfully`,
      };
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  async submitDecisions(
    reviewId: string,
    decisions: Array<{ change_id: string; decision: import('../types/review').DecisionType; edited_value?: string }>
  ): Promise<{ ok: boolean }> {
    const review = await this.getReview(reviewId);
    decisions.forEach((d) => {
      const target = review.proposed_changes.find((c) => c.change_id === d.change_id);
      if (target) {
        target.decision = d.decision;
        if (d.edited_value !== undefined) {
          target.edited_value = d.edited_value;
        }
      }
    });
    const reviews = safeStorageGet<Record<string, ReviewData>>(STORAGE_KEYS.REVIEWS, {});
    reviews[reviewId] = review;
    reviews[review.policy_id] = review;
    safeStorageSet(STORAGE_KEYS.REVIEWS, reviews);
    return { ok: true };
  }

  async submitReview(reviewId: string): Promise<{ new_version: string; policy: Policy }> {
    const review = await this.getReview(reviewId);
    const policy = await this.getPolicy(review.policy_id);
    if (!policy) {
      throw new Error(`Target policy "${review.policy_id}" not found.`);
    }

    // Determine next version (e.g. v1.2.0 -> v1.3.0)
    const match = policy.version.match(/v?(\d+)\.(\d+)\.(\d+)/);
    let newVersion = 'v1.1.0';
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10) + 1;
      newVersion = `v${major}.${minor}.0`;
    }

    const acceptedChanges = review.proposed_changes.filter((c) => c.decision === 'accept' || c.decision === 'edit');
    const changeSummary =
      acceptedChanges.length > 0
        ? `Review Studio Revision: Applied ${acceptedChanges.length} accepted revisions (including ${acceptedChanges.map((c) => c.section).join(', ')}).`
        : 'Review Studio Revision: Version roll-forward with reviewer feedback.';

    const newIntegrityHash = 'sha256:' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newVersionEntry = {
      version: newVersion,
      created_at: new Date().toISOString(),
      author: 'Elena Vance (via Review Studio)',
      change_summary: changeSummary,
      integrity_hash: newIntegrityHash,
    };

    policy.version = newVersion;
    policy.status = 'active';
    policy.updated_at = new Date().toISOString();
    policy.versions = [newVersionEntry, ...(policy.versions || [])];

    // Save updated policy
    await this.savePolicy(policy);

    // Update review status
    review.status = 'applied';
    const reviews = safeStorageGet<Record<string, ReviewData>>(STORAGE_KEYS.REVIEWS, {});
    reviews[reviewId] = review;
    reviews[policy.id] = review;
    safeStorageSet(STORAGE_KEYS.REVIEWS, reviews);

    this.recordActivity({
      type: 'policy_export',
      user_email: 'user@demo.com',
      description: `Published new version ${newVersion} for ${policy.title} via Review Studio`,
      ip: '127.0.0.1',
    });

    return { new_version: newVersion, policy };
  }

  // --- Admin APIs ---

  async getAdminOverview(): Promise<AdminOverviewResponse> {
    const users = this.getUsers();
    const policies = await this.getPolicies();
    const activity = safeStorageGet<ActivityFeedItem[]>(STORAGE_KEYS.ACTIVITY, MOCK_ACTIVITY_FEED);

    return {
      kpis: {
        total_users: users.length,
        new_signups_7d: users.filter((u) => u.status !== 'suspended').length,
        new_signups_30d: users.length,
        logins_today: 18,
        failed_logins_today: 2,
        policies_generated: policies.length * 9,
        repo_jobs: 9,
      },
      charts: MOCK_CHART_DATA,
      recent_activity: activity.slice(0, 10),
    };
  }

  async getAdminUsers(filter?: AdminUsersFilter): Promise<{ users: User[]; total: number }> {
    let users = this.getUsers();

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filter?.status && filter.status !== 'all') {
      users = users.filter((u) => u.status === filter.status);
    }
    if (filter?.role && filter.role !== 'all') {
      users = users.filter((u) => u.role === filter.role);
    }

    return { users, total: users.length };
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    const users = this.getUsers();
    const user = users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');
    user.status = status;
    this.saveUsers(users);
    return user;
  }

  async getAdminActivity(): Promise<ActivityFeedItem[]> {
    return safeStorageGet<ActivityFeedItem[]>(STORAGE_KEYS.ACTIVITY, MOCK_ACTIVITY_FEED);
  }

  async exportUsersCsv(): Promise<string> {
    const users = this.getUsers();
    const header = 'id,name,email,role,status,email_verified_at,created_at,last_login_at\n';
    const rows = users
      .map(
        (u) =>
          `"${u.id}","${u.name}","${u.email}","${u.role}","${u.status}","${u.email_verified_at || ''}","${u.created_at}","${u.last_login_at || ''}"`
      )
      .join('\n');
    return header + rows;
  }

  // --- Repository Analysis APIs (Flow D) ---

  async listRepoJobs(): Promise<RepoJob[]> {
    return safeStorageGet<RepoJob[]>(STORAGE_KEYS.REPOS, SEED_REPO_JOBS);
  }

  async getRepoJob(jobId: string): Promise<RepoJob> {
    const jobs = await this.listRepoJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      throw new Error(`Repository analysis job "${jobId}" not found.`);
    }
    return job;
  }

  async createRepoJob(data: {
    file?: File;
    path?: string;
    consent: boolean;
    name?: string;
  }): Promise<{ job_id: string; job: RepoJob }> {
    if (!data.consent) {
      throw new Error('Consent to zero-retention analysis policy is required.');
    }

    const fileName = data.file?.name || (data.path ? data.path.split('/').pop() : 'agent-repository.zip') || 'agent-repository.zip';
    const rawName = data.name || fileName.replace(/\.zip$/i, '');
    const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const jobId = `repo-job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const randomHash = 'sha256:' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const ephemeralWorkerId = `cg_ephemeral_worker_${Math.random().toString(36).slice(2, 8)}`;
    const fileSizeBytes = data.file?.size || Math.floor(18000000 + Math.random() * 15000000);

    const newJob: RepoJob = {
      id: jobId,
      name: cleanName,
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      created_at: new Date().toISOString(),
      status: 'processing',
      current_stage: 'upload',
      stage_label: 'Uploading archive to isolated tmpfs...',
      progress_percent: 5,
      tools_found_count: 4,
      risk_flags_count: 2,
      consent_accepted: true,
      tools: [
        {
          id: `tool-${jobId}-1`,
          name: 'query_vector_store',
          parameters: [
            { name: 'query_vector', type: 'float[]', required: true, description: 'Dense embedding query coordinates' },
            { name: 'top_k', type: 'integer', required: false, description: 'Number of nearest neighbors to retrieve' },
          ],
          source_file: 'src/retrieval/vector_engine.py',
          risk_level: 'low',
          category: 'database',
          description: 'Queries Milvus/Pinecone vector index to retrieve grounding documentation.',
        },
        {
          id: `tool-${jobId}-2`,
          name: 'execute_subprocess_tool',
          parameters: [
            { name: 'command', type: 'string', required: true, description: 'CLI execution arguments' },
            { name: 'cwd', type: 'string', required: false, description: 'Working directory path' },
          ],
          source_file: 'src/tools/system_invoker.py',
          risk_level: 'critical',
          category: 'shell',
          description: 'Spawns detached bash process. Critical security boundary required.',
        },
        {
          id: `tool-${jobId}-3`,
          name: 'dispatch_external_webhook',
          parameters: [
            { name: 'target_url', type: 'string', required: true, description: 'Destination HTTPS webhook endpoint' },
            { name: 'auth_header', type: 'string', required: false, description: 'Bearer authorization token' },
          ],
          source_file: 'src/services/webhook_dispatcher.ts',
          risk_level: 'medium',
          category: 'network',
          description: 'Sends external POST request with payload to third-party endpoints.',
        },
        {
          id: `tool-${jobId}-4`,
          name: 'clean_temporary_scratchpad',
          parameters: [
            { name: 'scratchpad_id', type: 'string', required: true, description: 'Temporary buffer workspace ID' },
          ],
          source_file: 'src/storage/ephemeral.ts',
          risk_level: 'medium',
          category: 'file_system',
          description: 'Purges unpersisted session cache and local filesystem scratchpad files.',
        },
      ],
      risk_flags: {
        shell_execution: { detected: true, count: 1, description: 'Discovered subprocess invoker in system_invoker.py' },
        file_deletion: { detected: true, count: 1, description: 'Temporary scratchpad deletion logic in ephemeral.ts' },
        network_calls: { detected: true, count: 1, description: 'External outbound webhook dispatcher in webhook_dispatcher.ts' },
        payments: { detected: false, count: 0 },
      },
      secrets_detected: {
        detected: false,
        count: 0,
        files: [],
      },
      deletion_receipt: {
        job_id: jobId,
        purged_at: new Date(Date.now() + 3500).toISOString(),
        workspace_path: `/tmp/${ephemeralWorkerId}`,
        files_destroyed_count: Math.floor(45 + Math.random() * 80),
        bytes_purged: fileSizeBytes,
        status_text: 'source code deleted',
        cryptographic_receipt_hash: randomHash,
        ttl_policy: 'IMMEDIATE_POST_PARSE (TTL: 0s)',
      },
    };

    const currentJobs = await this.listRepoJobs();
    safeStorageSet(STORAGE_KEYS.REPOS, [newJob, ...currentJobs]);

    this.recordActivity({
      type: 'repo_job',
      user_email: 'user@demo.com',
      description: `Uploaded and initiated static analysis for repository: ${cleanName}`,
      ip: '127.0.0.1',
    });

    return { job_id: jobId, job: newJob };
  }

  async *streamRepoJob(jobId: string): AsyncIterable<RepoStreamEvent> {
    const job = await this.getRepoJob(jobId);

    const stages: Array<{
      id: import('../types/repository').RepoPipelineStep['id'];
      label: string;
      message: string;
      progress: number;
      durationMs: number;
    }> = [
      {
        id: 'upload',
        label: 'Upload Archive',
        message: 'Writing archive payload to ephemeral memory buffer...',
        progress: 15,
        durationMs: 400,
      },
      {
        id: 'validate',
        label: 'Validate Archive',
        message: 'Verifying zip magic bytes, decompression safety, and directory boundaries...',
        progress: 30,
        durationMs: 450,
      },
      {
        id: 'scan_secrets',
        label: 'Scan for Secrets',
        message: 'Scanning AST tokens for hardcoded credentials, secret keys, and JWT tokens...',
        progress: 50,
        durationMs: 500,
      },
      {
        id: 'parse_ast',
        label: 'Parse AST (Static, Zero Execution)',
        message: 'Generating Abstract Syntax Tree without executing, compiling, or importing user code...',
        progress: 70,
        durationMs: 550,
      },
      {
        id: 'extract_signatures',
        label: 'Extract Tool Signatures',
        message: 'Mapping declared agent tools, parameter schemas, docstrings, and risk behaviors...',
        progress: 88,
        durationMs: 500,
      },
      {
        id: 'purge_source',
        label: 'Purge Source Code',
        message: 'Securely purging source code from workspace and generating cryptographic deletion receipt...',
        progress: 100,
        durationMs: 450,
      },
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      yield {
        event: 'stage_start',
        stage: stage.id,
        message: stage.message,
        progress: stage.progress,
      };

      await new Promise((r) => setTimeout(r, stage.durationMs));

      yield {
        event: 'stage_complete',
        stage: stage.id,
        message: `${stage.label} completed successfully`,
        progress: stage.progress,
      };

      await new Promise((r) => setTimeout(r, 80));
    }

    // Mark job complete in storage
    const jobs = await this.listRepoJobs();
    const targetIdx = jobs.findIndex((j) => j.id === jobId);
    if (targetIdx >= 0) {
      jobs[targetIdx].status = 'complete';
      jobs[targetIdx].current_stage = 'done';
      jobs[targetIdx].stage_label = 'Complete & Source Purged';
      jobs[targetIdx].progress_percent = 100;
      jobs[targetIdx].deletion_receipt.purged_at = new Date().toISOString();
      safeStorageSet(STORAGE_KEYS.REPOS, jobs);

      yield {
        event: 'job_complete',
        stage: 'done',
        message: 'Analysis complete. Source code was purged. Deletion receipt ready.',
        progress: 100,
        job: jobs[targetIdx],
      };
    }
  }

  async deleteRepoJob(jobId: string): Promise<{ success: boolean }> {
    const jobs = await this.listRepoJobs();
    const filtered = jobs.filter((j) => j.id !== jobId);
    safeStorageSet(STORAGE_KEYS.REPOS, filtered);

    this.recordActivity({
      type: 'repo_job',
      user_email: 'user@demo.com',
      description: `Purged repository analysis findings for job ${jobId}`,
      ip: '127.0.0.1',
    });

    return { success: true };
  }

  private recordActivity(event: Omit<ActivityFeedItem, 'id' | 'timestamp'>): void {
    const current = safeStorageGet<ActivityFeedItem[]>(STORAGE_KEYS.ACTIVITY, MOCK_ACTIVITY_FEED);
    const newEntry: ActivityFeedItem = {
      id: `act_${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    safeStorageSet(STORAGE_KEYS.ACTIVITY, [newEntry, ...current].slice(0, 50));
  }

  // ==========================================
  // Flow E: Security Architecture & Config
  // ==========================================

  async listArchitecturePacks(): Promise<ArchitecturePack[]> {
    return safeStorageGet<ArchitecturePack[]>(STORAGE_KEYS.ARCHITECTURE_PACKS, []);
  }

  async createArchitecture(data: {
    policy_id: string;
    version: string;
    deployment_style: DeploymentStyle;
    environment_notes?: string;
  }): Promise<ArchitecturePack> {
    const policy = await this.getPolicy(data.policy_id);
    if (!policy) {
      throw new Error(`Target policy "${data.policy_id}" not found.`);
    }

    const pack = synthesizeArchitectureDocument(
      policy,
      data.version,
      data.deployment_style,
      data.environment_notes
    );

    // Save pack
    const currentPacks = await this.listArchitecturePacks();
    safeStorageSet(STORAGE_KEYS.ARCHITECTURE_PACKS, [pack, ...currentPacks]);

    // Record in Downloads Center (PastExport) so it appears on Dashboard
    const pastExport: PastExport = {
      id: `exp_${pack.id}`,
      policy_id: policy.id,
      policy_title: `${policy.title} [${pack.deployment_label.split(':')[0]}]`,
      version: pack.version,
      format: 'zip',
      created_at: pack.created_at,
      file_size: '48.2 KB',
      integrity_hash: pack.integrity_hash,
    };
    await this.recordExport(pastExport);

    // Audit log
    this.recordSecurityAudit({
      action: 'create',
      target: `Architecture Pack (${pack.deployment_label})`,
      group: 'runtime',
      actor: 'secops@demo.com',
      detail: `Generated 10-section Architecture Pack for ${policy.title} (v${pack.version}). Hash: ${pack.integrity_hash.slice(0, 16)}...`,
    });

    return pack;
  }

  async getArchitectureDownload(
    packId: string,
    format: 'pdf' | 'md' | 'docx' | 'zip'
  ): Promise<Blob | { content: string; filename: string }> {
    const packs = await this.listArchitecturePacks();
    const pack = packs.find((p) => p.id === packId);
    if (!pack) {
      throw new Error(`Architecture pack ${packId} not found.`);
    }

    const safeAgent = pack.document.policy_title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${safeAgent}_v${pack.version}_architecture.${format}`;

    if (format === 'pdf') {
      const pdf = generateArchitecturePdf(pack.document);
      return pdf.output('blob');
    }

    if (format === 'md') {
      const md = generateArchitectureMarkdown(pack.document);
      return { content: md, filename };
    }

    if (format === 'docx') {
      return createWordDocument(pack.document);
    }

    if (format === 'zip') {
      const policy = await this.getPolicy(pack.policy_id);
      const yaml = policy?.yaml_spec || policy?.content?.rawYaml || '';
      return generateArchitectureBundleZip(pack, yaml);
    }

    throw new Error(`Unsupported format ${format}`);
  }

  async listConfig(): Promise<SecurityConfigGroup[]> {
    return safeStorageGet<SecurityConfigGroup[]>(STORAGE_KEYS.CONFIG, SEED_SECURITY_CONFIG);
  }

  async putConfig(
    key: string,
    data: { value?: string; group: string; metadata?: Record<string, unknown> }
  ): Promise<SecurityConfigItem> {
    const groups = await this.listConfig();
    let foundItem: SecurityConfigItem | null = null;
    let actionType: 'create' | 'update' = 'update';

    for (const g of groups) {
      const item = g.items.find((i) => i.key === key);
      if (item) {
        actionType = item.is_set ? 'update' : 'create';
        item.is_set = true;
        item.last_updated = new Date().toISOString();
        if (item.type === 'secret') {
          const val = data.value || '';
          item.masked_value = val ? `••••${val.slice(-4)}` : '••••••••';
          item.status = 'active';
        } else {
          item.masked_value = data.value;
        }
        foundItem = item;
        break;
      }
    }

    if (!foundItem) {
      throw new Error(`Config key ${key} not found.`);
    }

    safeStorageSet(STORAGE_KEYS.CONFIG, groups);

    this.recordSecurityAudit({
      action: actionType,
      target: key,
      group: foundItem.group,
      actor: 'secops@demo.com',
      detail: foundItem.type === 'secret'
        ? `Saved write-only credential. Plaintext purged. Masked tail: ${foundItem.masked_value}`
        : `Updated configuration to "${foundItem.masked_value}"`,
    });

    return foundItem;
  }

  async testConfig(key: string): Promise<{ success: boolean; latency_ms: number; message: string }> {
    const groups = await this.listConfig();
    let item: SecurityConfigItem | undefined;
    for (const g of groups) {
      item = g.items.find((i) => i.key === key);
      if (item) break;
    }

    const latency = Math.floor(Math.random() * 25) + 12; // 12ms - 37ms
    const success = true;
    const message = item?.is_set
      ? `Connection verified: ${latency}ms latency to endpoint.`
      : `Mock ping successful (${latency}ms). Endpoint active.`;

    if (item) {
      item.last_test_result = {
        success,
        latency_ms: latency,
        message,
        tested_at: new Date().toISOString(),
      };
      safeStorageSet(STORAGE_KEYS.CONFIG, groups);
    }

    this.recordSecurityAudit({
      action: 'test',
      target: key,
      group: item?.group || 'llm',
      actor: 'secops@demo.com',
      detail: `Latency test: ${latency}ms, status: active.`,
    });

    return { success, latency_ms: latency, message };
  }

  async deleteConfig(key: string): Promise<{ success: boolean }> {
    const groups = await this.listConfig();
    let targetItem: SecurityConfigItem | undefined;

    for (const g of groups) {
      const item = g.items.find((i) => i.key === key);
      if (item) {
        targetItem = item;
        item.is_set = false;
        item.masked_value = undefined;
        item.status = 'unconfigured';
        item.last_test_result = undefined;
        item.last_updated = new Date().toISOString();
        break;
      }
    }

    safeStorageSet(STORAGE_KEYS.CONFIG, groups);

    if (targetItem) {
      this.recordSecurityAudit({
        action: 'delete',
        target: key,
        group: targetItem.group,
        actor: 'secops@demo.com',
        detail: `Revoked and cleared secret key ${key}.`,
      });
    }

    return { success: true };
  }

  async getSecurityAuditLogs(): Promise<SecurityAuditLogEntry[]> {
    return safeStorageGet<SecurityAuditLogEntry[]>(STORAGE_KEYS.SECURITY_AUDIT, SEED_SECURITY_AUDIT);
  }

  private recordSecurityAudit(entry: Omit<SecurityAuditLogEntry, 'id' | 'timestamp'>): void {
    const logs = safeStorageGet<SecurityAuditLogEntry[]>(STORAGE_KEYS.SECURITY_AUDIT, SEED_SECURITY_AUDIT);
    const newLog: SecurityAuditLogEntry = {
      id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    safeStorageSet(STORAGE_KEYS.SECURITY_AUDIT, [newLog, ...logs].slice(0, 100));
  }
}

export const mockApiAdapter = new MockApiAdapter();
