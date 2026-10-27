'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { DevBanner } from '../common/DevBanner';

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-400 relative overflow-hidden">
      {/* Dev OTP Banner */}
      <DevBanner showDemoSwitch={true} />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Header Bar within Auth */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl neu-raised-sm flex items-center justify-center text-[var(--accent)] border border-[var(--glass-border)] group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-[var(--text)]">
                  ContractGuard
                </span>
                <span className="text-[10px] text-[var(--muted)] font-mono">
                  Agent Security Mesh
                </span>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          {/* Form Card (Glassmorphism with rounded-2xl and inner highlight) */}
          <div className="glass-card-strong p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Subtle internal gradient glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-[var(--glass-border)] text-center text-xs text-[var(--muted)] flex flex-wrap items-center justify-center gap-4 relative z-10 glass-subtle">
        <span>© 2026 ContractGuard Security Inc.</span>
        <span>·</span>
        <span className="hover:text-[var(--text)] transition-colors cursor-pointer">Security Model</span>
        <span>·</span>
        <span className="hover:text-[var(--text)] transition-colors cursor-pointer">Privacy & Data Purge</span>
        <span>·</span>
        <span className="hover:text-[var(--text)] transition-colors cursor-pointer">Status</span>
      </footer>
    </div>
  );
}
