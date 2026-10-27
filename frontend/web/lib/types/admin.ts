import { User, LoginEvent } from './auth';

export interface AdminOverviewKPIs {
  total_users: number;
  new_signups_7d: number;
  new_signups_30d: number;
  logins_today: number;
  failed_logins_today: number;
  policies_generated: number;
  repo_jobs: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'signup' | 'otp_sent' | 'otp_failed' | 'login_success' | 'login_failed' | 'policy_export' | 'repo_job';
  user_email: string;
  user_name?: string;
  description: string;
  timestamp: string;
  ip: string;
  metadata?: Record<string, any>;
}

export interface AdminChartPoint {
  date: string;
  signups: number;
  logins: number;
}

export interface AdminOverviewResponse {
  kpis: AdminOverviewKPIs;
  charts: AdminChartPoint[];
  recent_activity: ActivityFeedItem[];
}

export interface AdminUsersFilter {
  search?: string;
  status?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}
