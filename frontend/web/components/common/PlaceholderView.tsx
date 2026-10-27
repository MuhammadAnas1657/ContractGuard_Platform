'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

interface PlaceholderViewProps {
  title: string;
  subtitle: string;
  section: string;
  features: string[];
  plannedFor?: string;
}

export function PlaceholderView({
  title,
  subtitle,
  section,
  features,
  plannedFor = 'Part 2 Specification',
}: PlaceholderViewProps) {
  return (
    <AppShell
      title={title}
      breadcrumbs={[
        { label: section },
        { label: title },
      ]}
    >
      <div className="w-full max-w-4xl py-4">
        <div className="rounded-2xl glass-card p-8 sm:p-10 shadow-lg relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-[var(--ai)] uppercase tracking-wider font-mono px-2 py-0.5 rounded-md neu-raised-sm border border-purple-500/25">
                Coming in next step
              </span>
              <span className="text-xs text-[var(--muted)]">·</span>
              <span className="text-xs text-[var(--muted)] font-mono">{plannedFor}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed max-w-2xl">
              {subtitle}
            </p>

            <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
              <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider font-mono mb-3">
                Planned Architecture & Capabilities:
              </h3>
              <ul className="space-y-2.5">
                {features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[var(--muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--glass-border)] flex items-center justify-between">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl neu-btn text-[var(--text)] hover:text-[var(--accent)] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>

              <span className="text-xs font-mono text-[var(--muted)]">
                ContractGuard v1.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
