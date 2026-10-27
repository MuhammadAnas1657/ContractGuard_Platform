'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, UserCheck, ShieldAlert, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { AuthShell } from '@/components/layout/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchDemoAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please provide your work email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await login({ email, password });
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&purpose=login`);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'user' | 'super_admin') => {
    setError(null);
    try {
      setLoading(true);
      await switchDemoAccount(role);
    } catch (err: any) {
      setError(err?.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to ContractGuard"
      subtitle="Access your agent security policies, audit logs, and enforcement pipeline."
    >
      {/* Demo Quick-Login Buttons */}
      <div className="mb-6 p-3.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
        <p className="text-xs font-semibold text-[var(--muted)] mb-2.5">
          Fast-Track Demo Credentials:
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleDemoLogin('user')}
            className="neu-btn flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium text-[var(--text)] text-left"
          >
            <UserCheck className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span className="truncate">Demo User</span>
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('super_admin')}
            className="neu-btn flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium text-[var(--text)] text-left"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--ai)] shrink-0" />
            <span className="truncate">Demo Admin</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-[var(--danger)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
            Work Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@organization.com"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl input-opaque text-[var(--text)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-[var(--text)]">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl input-opaque text-[var(--text)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Continue with Email OTP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--muted)]">
        Don&apos;t have an organization account?{' '}
        <Link href="/signup" className="text-[var(--accent)] font-semibold hover:underline">
          Sign up
        </Link>
      </div>
    </AuthShell>
  );
}
