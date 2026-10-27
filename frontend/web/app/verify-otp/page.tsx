'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, RotateCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { AuthShell } from '@/components/layout/AuthShell';
import { OtpInput } from '@/components/auth/OtpInput';
import { OTPPurpose } from '@/lib/types/auth';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, resendOtp } = useAuth();

  const emailParam = searchParams.get('email') || 'user@demo.com';
  const purposeParam = (searchParams.get('purpose') as OTPPurpose) || 'login';

  const [email] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 60-second live cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleVerify = async (codeToVerify: string) => {
    setError(null);
    setSuccessMsg(null);

    if (codeToVerify.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setLoading(true);
      const user = await verifyOtp({
        email,
        code: codeToVerify,
        purpose: purposeParam,
      });

      setSuccessMsg('Identity verified successfully! Redirecting...');
      setTimeout(() => {
        if (user.role === 'super_admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }, 600);
    } catch (err: any) {
      setAttemptsUsed((prev) => Math.min(prev + 1, 5));
      setError(err?.message || 'Verification failed. Please try again.');
      setOtp(''); // clear for retry
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || resending) return;
    setError(null);
    try {
      setResending(true);
      await resendOtp({ email, purpose: purposeParam });
      setCooldownSeconds(60);
      setAttemptsUsed(0);
      setSuccessMsg('A new verification code has been dispatched to your email.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const attemptsRemaining = Math.max(0, 5 - attemptsUsed);

  return (
    <AuthShell
      title="Enter Verification Code"
      subtitle={`We sent a secure 6-digit confirmation code to ${email}`}
    >
      {/* Dev OTP Helper Highlight */}
      <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
        <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span>Mock mode active: Code is 123456</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setOtp('123456');
          }}
          className="px-2.5 py-1 rounded-lg neu-btn text-[var(--text)] font-mono text-[11px] cursor-pointer"
        >
          Auto-fill
        </button>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-[var(--danger)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{error}</p>
            {attemptsRemaining < 5 && attemptsRemaining > 0 && (
              <p className="text-[11px] text-[var(--muted)]">
                Warning: {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} left before code invalidation.
              </p>
            )}
            {attemptsRemaining === 0 && (
              <p className="text-[11px] font-medium text-[var(--danger)]">
                Session locked due to too many attempts. Please request a new code below.
              </p>
            )}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-center text-[var(--muted)] uppercase tracking-wider mb-3">
            6-Digit One-Time Password
          </label>
          <OtpInput
            value={otp}
            onChange={(val) => {
              setOtp(val);
              if (error) setError(null);
              if (val.length === 6 && !loading) {
                handleVerify(val);
              }
            }}
            disabled={loading || attemptsRemaining === 0}
            hasError={!!error}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--muted)] pt-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Valid for 10 minutes</span>
          </div>
          <span className="font-mono text-[11px]">
            {attemptsRemaining} / 5 attempts remaining
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleVerify(otp)}
          disabled={loading || otp.length !== 6 || attemptsRemaining === 0}
          className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Verify & Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        {/* Resend Cooldown Section */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">Didn&apos;t receive the code?</span>
          {cooldownSeconds > 0 ? (
            <span className="text-[var(--muted)] font-mono text-[11px]">
              Resend in {cooldownSeconds}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-[var(--accent)] font-semibold hover:underline flex items-center gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>Resend code</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--border)] text-center text-xs">
        <Link href="/login" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          ← Back to email sign in
        </Link>
      </div>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-sm text-[var(--muted)]">
          Loading verification...
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
