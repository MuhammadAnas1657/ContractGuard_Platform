'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/layout/AuthShell';
import { OtpInput } from '@/components/auth/OtpInput';
import { apiClient } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please provide your work email address.');
      return;
    }
    try {
      setLoading(true);
      await apiClient.forgotPassword({ email });
      setStep('reset');
      setSuccess('If this email exists in our records, a 6-digit reset code has been dispatched.');
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch password reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 10) {
      setError('New password must be at least 10 characters.');
      return;
    }
    try {
      setLoading(true);
      await apiClient.resetPassword({ email, code, new_password: newPassword });
      setSuccess('Password updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Password reset failed. Make sure to use mock code 123456.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset Account Password"
      subtitle={
        step === 'request'
          ? 'Enter your work email to receive a secure 6-digit one-time code.'
          : `Enter the 6-digit code sent to ${email} and set your new password.`
      }
    >
      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-[var(--danger)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
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
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] input-opaque text-[var(--text)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Send Reset Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-center text-[var(--muted)] mb-3">
              6-Digit Code (Mock: 123456)
            </label>
            <OtpInput value={code} onChange={setCode} disabled={loading} hasError={!!error} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--text)]">
                New Password
              </label>
              <span className="text-[11px] text-[var(--muted)]">Min 10 characters</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new 10+ char password"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] input-opaque text-[var(--text)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6 || newPassword.length < 10}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-[var(--border)] text-center text-xs">
        <Link href="/login" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          ← Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
