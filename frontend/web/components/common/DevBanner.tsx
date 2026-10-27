'use client';

import React from 'react';
import { KeyRound, ShieldAlert, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';

export function DevBanner({ showDemoSwitch = true }: { showDemoSwitch?: boolean }) {
  const { user, switchDemoAccount } = useAuth();

  return (
    <div className="w-full glass-header px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 relative z-30">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <span className="flex items-center gap-1.5 font-medium text-[var(--accent)] bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25">
          <KeyRound className="w-3.5 h-3.5" />
          Mock mode: OTP is 123456
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">60s cooldown · 5 attempts max</span>
      </div>

      {showDemoSwitch && (
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)] hidden md:inline">Quick Demo Sign-in:</span>
          <button
            type="button"
            onClick={() => switchDemoAccount('user')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              user?.email === 'user@demo.com'
                ? 'neu-pressed text-emerald-400 border border-emerald-500/40 bg-emerald-500/10'
                : 'neu-btn text-[var(--text)]'
            }`}
          >
            <UserCheck className="w-3 h-3 text-[var(--accent)]" />
            <span>User Demo</span>
          </button>
          <button
            type="button"
            onClick={() => switchDemoAccount('super_admin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              user?.role === 'super_admin'
                ? 'neu-pressed text-purple-400 border border-purple-500/40 bg-purple-500/10'
                : 'neu-btn text-[var(--text)]'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-[var(--ai)]" />
            <span>Admin Demo</span>
          </button>
        </div>
      )}
    </div>
  );
}
