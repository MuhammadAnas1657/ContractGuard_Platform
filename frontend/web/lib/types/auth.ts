export type UserRole = 'user' | 'super_admin';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type OTPPurpose = 'signup' | 'login' | 'reset';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  email_verified_at: string | null;
  created_at: string;
  last_login_at: string | null;
  avatar_url?: string;
}

export interface Session {
  id: string;
  user_id: string;
  device: string;
  ip: string;
  expires_at: string;
  created_at: string;
}

export interface LoginEvent {
  id: string;
  user_id?: string;
  email: string;
  success: boolean;
  ip: string;
  user_agent: string;
  reason?: string;
  created_at: string;
}

export interface OtpSessionState {
  email: string;
  purpose: OTPPurpose;
  expires_at: number; // timestamp in ms
  attempts_left: number;
  resend_available_at: number; // timestamp in ms
}
