import { User, OTPPurpose, UserStatus } from '../types/auth';
import { Policy, PastExport, SetupChecklistItem } from '../types/policy';
import { AdminOverviewResponse, AdminUsersFilter, ActivityFeedItem } from '../types/admin';
import { DecisionType, ReviewData, ReviewStepState } from '../types/review';
import { RepoJob, RepoStreamEvent } from '../types/repository';
import {
  DeploymentStyle,
  ArchitecturePack,
  SecurityConfigGroup,
  SecurityConfigItem,
  SecurityAuditLogEntry,
} from '../types/security';
import { mockApiAdapter } from '../mocks/mock-adapter';

// Single source of truth for mock flag: UI components never check this flag directly
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export interface ApiClientInterface {
  // Auth
  signup(data: { name: string; email: string; password?: string }): Promise<{ status: 'otp_sent' }>;
  login(data: { email: string; password?: string }): Promise<{ status: 'otp_required'; email: string }>;
  verifyOtp(params: { email: string; code: string; purpose?: OTPPurpose }): Promise<{ user: User; token: string }>;
  resendOtp(params: { email: string; purpose?: OTPPurpose }): Promise<{ status: 'otp_sent'; resend_cooldown_until?: number }>;
  forgotPassword(data: { email: string }): Promise<{ status: 'otp_sent' }>;
  resetPassword(data: { email: string; code: string; new_password?: string }): Promise<{ status: 'success' }>;
  logout(): Promise<void>;
  getMe(): Promise<User | null>;
  switchDemoUser(role: 'user' | 'super_admin'): Promise<User>;

  // Policies
  getPolicies(): Promise<Policy[]>;
  getPolicy(id: string): Promise<Policy | null>;
  createPolicy(policyData: Partial<Policy>): Promise<Policy>;
  savePolicy(policy: Policy): Promise<Policy>;
  deletePolicy(id: string): Promise<void>;
  getRecentExports(): Promise<PastExport[]>;
  recordExport(exportItem: PastExport): Promise<PastExport>;
  streamPolicy(sectionKey: string, sectionTitle: string, fullText: string, doneCount: number): AsyncIterable<import('../types/policy').PolicyEvent>;
  getSetupChecklist(): Promise<SetupChecklistItem[]>;
  // Review Studio (Flow C)
  createReview(policyId: string, data?: { videoName?: string; textReview?: string }): Promise<{ review_id: string }>;
  getReview(reviewId: string): Promise<ReviewData>;
  streamReview(reviewId: string): AsyncIterable<ReviewStepState>;
  submitDecisions(
    reviewId: string,
    decisions: Array<{ change_id: string; decision: DecisionType; edited_value?: string }>
  ): Promise<{ ok: boolean }>;
  submitReview(reviewId: string): Promise<{ new_version: string; policy: Policy }>;

  // Repositories (Flow D)
  listRepoJobs(): Promise<RepoJob[]>;
  getRepoJob(jobId: string): Promise<RepoJob>;
  createRepoJob(data: { file?: File; path?: string; consent: boolean; name?: string }): Promise<{ job_id: string; job: RepoJob }>;
  streamRepoJob(jobId: string): AsyncIterable<RepoStreamEvent>;
  deleteRepoJob(jobId: string): Promise<{ success: boolean }>;

  // Admin
  getAdminOverview(): Promise<AdminOverviewResponse>;
  getAdminUsers(filter?: AdminUsersFilter): Promise<{ users: User[]; total: number }>;
  updateUserStatus(id: string, status: UserStatus): Promise<User>;
  getAdminActivity(): Promise<ActivityFeedItem[]>;
  exportUsersCsv(): Promise<string>;

  // Security Architecture & Config (Flow E / doc 08 section 5)
  listArchitecturePacks(): Promise<ArchitecturePack[]>;
  createArchitecture(data: {
    policy_id: string;
    version: string;
    deployment_style: DeploymentStyle;
    environment_notes?: string;
  }): Promise<ArchitecturePack>;
  getArchitectureDownload(
    packId: string,
    format: 'pdf' | 'md' | 'docx' | 'zip'
  ): Promise<Blob | { content: string; filename: string }>;
  listConfig(): Promise<SecurityConfigGroup[]>;
  putConfig(
    key: string,
    data: { value?: string; group: string; metadata?: Record<string, unknown> }
  ): Promise<SecurityConfigItem>;
  testConfig(key: string): Promise<{ success: boolean; latency_ms: number; message: string }>;
  deleteConfig(key: string): Promise<{ success: boolean }>;
  getSecurityAuditLogs(): Promise<SecurityAuditLogEntry[]>;
}

class ApiClient implements ApiClientInterface {
  async signup(data: { name: string; email: string; password?: string }): Promise<{ status: 'otp_sent' }> {
    if (USE_MOCKS) {
      return mockApiAdapter.signup(data);
    }
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Signup failed');
    }
    return res.json();
  }

  async login(data: { email: string; password?: string }): Promise<{ status: 'otp_required'; email: string }> {
    if (USE_MOCKS) {
      return mockApiAdapter.login(data);
    }
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Login failed');
    }
    return res.json();
  }

  async verifyOtp(params: { email: string; code: string; purpose?: OTPPurpose }): Promise<{ user: User; token: string }> {
    if (USE_MOCKS) {
      return mockApiAdapter.verifyOtp(params);
    }
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Verification failed');
    }
    return res.json();
  }

  async resendOtp(params: { email: string; purpose?: OTPPurpose }): Promise<{ status: 'otp_sent'; resend_cooldown_until?: number }> {
    if (USE_MOCKS) {
      return mockApiAdapter.resendOtp(params);
    }
    const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Resend OTP failed');
    }
    return res.json();
  }

  async forgotPassword(data: { email: string }): Promise<{ status: 'otp_sent' }> {
    if (USE_MOCKS) {
      return mockApiAdapter.forgotPassword(data);
    }
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Password reset request failed');
    }
    return res.json();
  }

  async resetPassword(data: { email: string; code: string; new_password?: string }): Promise<{ status: 'success' }> {
    if (USE_MOCKS) {
      return mockApiAdapter.resetPassword(data);
    }
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Password reset failed');
    }
    return res.json();
  }

  async logout(): Promise<void> {
    if (USE_MOCKS) {
      return mockApiAdapter.logout();
    }
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }

  async getMe(): Promise<User | null> {
    if (USE_MOCKS) {
      return mockApiAdapter.getMe();
    }
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return res.json();
  }

  async switchDemoUser(role: 'user' | 'super_admin'): Promise<User> {
    if (USE_MOCKS) {
      return mockApiAdapter.switchDemoUser(role);
    }
    throw new Error('Demo switch is only enabled in mock mode.');
  }

  async getPolicies(): Promise<Policy[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.getPolicies();
    }
    const res = await fetch(`${API_BASE_URL}/policies`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch policies');
    return res.json();
  }

  async getPolicy(id: string): Promise<Policy | null> {
    if (USE_MOCKS) {
      return mockApiAdapter.getPolicy(id);
    }
    const res = await fetch(`${API_BASE_URL}/policies/${id}`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }

  async createPolicy(policyData: Partial<Policy>): Promise<Policy> {
    if (USE_MOCKS) {
      return mockApiAdapter.createPolicy(policyData);
    }
    const res = await fetch(`${API_BASE_URL}/policies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policyData),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to create policy');
    return res.json();
  }

  async savePolicy(policy: Policy): Promise<Policy> {
    if (USE_MOCKS) {
      return mockApiAdapter.savePolicy(policy);
    }
    const res = await fetch(`${API_BASE_URL}/policies/${policy.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to save policy');
    return res.json();
  }

  async deletePolicy(id: string): Promise<void> {
    if (USE_MOCKS) {
      return mockApiAdapter.deletePolicy(id);
    }
    await fetch(`${API_BASE_URL}/policies/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  async recordExport(exportItem: PastExport): Promise<PastExport> {
    if (USE_MOCKS) {
      return mockApiAdapter.recordExport(exportItem);
    }
    return exportItem;
  }

  async *streamPolicy(
    sectionKey: string,
    sectionTitle: string,
    fullText: string,
    doneCount: number
  ): AsyncIterable<import('../types/policy').PolicyEvent> {
    if (USE_MOCKS) {
      yield* mockApiAdapter.streamPolicy(sectionKey, sectionTitle, fullText, doneCount);
      return;
    }
    // Real SSE streaming would hook into EventSource/fetch response body reader
    yield {
      event: 'section_start',
      data: { section: sectionKey, title: sectionTitle },
    };
    yield {
      event: 'token',
      data: { section: sectionKey, text: fullText },
    };
    yield {
      event: 'section_done',
      data: { section: sectionKey },
    };
    yield {
      event: 'progress',
      data: { done: doneCount, total: 12 },
    };
  }

  async getRecentExports(): Promise<PastExport[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.getRecentExports();
    }
    const res = await fetch(`${API_BASE_URL}/exports`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch past exports');
    return res.json();
  }

  async getSetupChecklist(): Promise<SetupChecklistItem[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.getSetupChecklist();
    }
    const res = await fetch(`${API_BASE_URL}/checklist`, { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  }

  async toggleChecklistItem(id: string): Promise<SetupChecklistItem[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.toggleChecklistItem(id);
    }
    const res = await fetch(`${API_BASE_URL}/checklist/${id}/toggle`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to update checklist item');
    return res.json();
  }

  // --- Review Studio APIs ---

  async createReview(
    policyId: string,
    data?: { videoName?: string; textReview?: string }
  ): Promise<{ review_id: string }> {
    if (USE_MOCKS) {
      return mockApiAdapter.createReview(policyId, data);
    }
    const res = await fetch(`${API_BASE_URL}/policies/${policyId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to initiate review session');
    return res.json();
  }

  async getReview(reviewId: string): Promise<import('../types/review').ReviewData> {
    if (USE_MOCKS) {
      return mockApiAdapter.getReview(reviewId);
    }
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch review');
    return res.json();
  }

  async *streamReview(reviewId: string): AsyncIterable<import('../types/review').ReviewStepState> {
    if (USE_MOCKS) {
      yield* mockApiAdapter.streamReview(reviewId);
      return;
    }
    // SSE fallback
  }

  async submitDecisions(
    reviewId: string,
    decisions: Array<{ change_id: string; decision: DecisionType; edited_value?: string }>
  ): Promise<{ ok: boolean }> {
    if (USE_MOCKS) {
      return mockApiAdapter.submitDecisions(reviewId, decisions);
    }
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decisions),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to save decisions');
    return res.json();
  }

  async submitReview(reviewId: string): Promise<{ new_version: string; policy: Policy }> {
    if (USE_MOCKS) {
      return mockApiAdapter.submitReview(reviewId);
    }
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/submit`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to finalize policy version');
    return res.json();
  }

  async getAdminOverview(): Promise<AdminOverviewResponse> {
    if (USE_MOCKS) {
      return mockApiAdapter.getAdminOverview();
    }
    const res = await fetch(`${API_BASE_URL}/admin/overview`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch admin overview');
    return res.json();
  }

  async getAdminUsers(filter?: AdminUsersFilter): Promise<{ users: User[]; total: number }> {
    if (USE_MOCKS) {
      return mockApiAdapter.getAdminUsers(filter);
    }
    const params = new URLSearchParams();
    if (filter?.search) params.set('search', filter.search);
    if (filter?.status) params.set('status', filter.status);
    if (filter?.role) params.set('role', filter.role);
    const res = await fetch(`${API_BASE_URL}/admin/users?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch admin users');
    return res.json();
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    if (USE_MOCKS) {
      return mockApiAdapter.updateUserStatus(id, status);
    }
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to update user status');
    return res.json();
  }

  async getAdminActivity(): Promise<ActivityFeedItem[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.getAdminActivity();
    }
    const res = await fetch(`${API_BASE_URL}/admin/activity`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch activity log');
    return res.json();
  }

  async exportUsersCsv(): Promise<string> {
    if (USE_MOCKS) {
      return mockApiAdapter.exportUsersCsv();
    }
    const res = await fetch(`${API_BASE_URL}/admin/users/export.csv`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to export CSV');
    return res.text();
  }

  // --- Repository Analysis Methods (Flow D) ---

  async listRepoJobs(): Promise<RepoJob[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.listRepoJobs();
    }
    const res = await fetch(`${API_BASE_URL}/repos`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to list repository jobs');
    return res.json();
  }

  async getRepoJob(jobId: string): Promise<RepoJob> {
    if (USE_MOCKS) {
      return mockApiAdapter.getRepoJob(jobId);
    }
    const res = await fetch(`${API_BASE_URL}/repos/${jobId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch repository job');
    return res.json();
  }

  async createRepoJob(data: { file?: File; path?: string; consent: boolean; name?: string }): Promise<{ job_id: string; job: RepoJob }> {
    if (USE_MOCKS) {
      return mockApiAdapter.createRepoJob(data);
    }
    const formData = new FormData();
    if (data.file) formData.append('zip', data.file);
    if (data.path) formData.append('path', data.path);
    if (data.name) formData.append('name', data.name);
    formData.append('consent', String(data.consent));

    const res = await fetch(`${API_BASE_URL}/repos`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to create repository job');
    return res.json();
  }

  async *streamRepoJob(jobId: string): AsyncIterable<RepoStreamEvent> {
    if (USE_MOCKS) {
      yield* mockApiAdapter.streamRepoJob(jobId);
      return;
    }
    // SSE fallback for live backend
    const res = await fetch(`${API_BASE_URL}/repos/${jobId}/stream`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to connect to repository event stream');
  }

  async deleteRepoJob(jobId: string): Promise<{ success: boolean }> {
    if (USE_MOCKS) {
      return mockApiAdapter.deleteRepoJob(jobId);
    }
    const res = await fetch(`${API_BASE_URL}/repos/${jobId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete repository findings');
    return res.json();
  }

  // Flow E: Security Architecture & Config (doc 08 section 5)
  async listArchitecturePacks(): Promise<ArchitecturePack[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.listArchitecturePacks();
    }
    const res = await fetch(`${API_BASE_URL}/security/architecture`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch architecture packs');
    return res.json();
  }

  async createArchitecture(data: {
    policy_id: string;
    version: string;
    deployment_style: DeploymentStyle;
    environment_notes?: string;
  }): Promise<ArchitecturePack> {
    if (USE_MOCKS) {
      return mockApiAdapter.createArchitecture(data);
    }
    const res = await fetch(`${API_BASE_URL}/security/architecture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to generate architecture pack');
    return res.json();
  }

  async getArchitectureDownload(
    packId: string,
    format: 'pdf' | 'md' | 'docx' | 'zip'
  ): Promise<Blob | { content: string; filename: string }> {
    if (USE_MOCKS) {
      return mockApiAdapter.getArchitectureDownload(packId, format);
    }
    const res = await fetch(`${API_BASE_URL}/security/architecture/${packId}/download?format=${format}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to download architecture pack');
    return res.blob();
  }

  async listConfig(): Promise<SecurityConfigGroup[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.listConfig();
    }
    const res = await fetch(`${API_BASE_URL}/security/config`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch security configurations');
    return res.json();
  }

  async putConfig(
    key: string,
    data: { value?: string; group: string; metadata?: Record<string, unknown> }
  ): Promise<SecurityConfigItem> {
    if (USE_MOCKS) {
      return mockApiAdapter.putConfig(key, data);
    }
    const res = await fetch(`${API_BASE_URL}/security/config/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to update configuration');
    return res.json();
  }

  async testConfig(key: string): Promise<{ success: boolean; latency_ms: number; message: string }> {
    if (USE_MOCKS) {
      return mockApiAdapter.testConfig(key);
    }
    const res = await fetch(`${API_BASE_URL}/security/config/${key}/test`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to test connection');
    return res.json();
  }

  async deleteConfig(key: string): Promise<{ success: boolean }> {
    if (USE_MOCKS) {
      return mockApiAdapter.deleteConfig(key);
    }
    const res = await fetch(`${API_BASE_URL}/security/config/${key}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete configuration');
    return res.json();
  }

  async getSecurityAuditLogs(): Promise<SecurityAuditLogEntry[]> {
    if (USE_MOCKS) {
      return mockApiAdapter.getSecurityAuditLogs();
    }
    const res = await fetch(`${API_BASE_URL}/security/audit`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch security audit logs');
    return res.json();
  }
}

export const apiClient = new ApiClient();
