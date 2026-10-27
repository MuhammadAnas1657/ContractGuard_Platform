import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentation — ContractGuard',
  description: 'Documentation placeholder for ContractGuard policy schema and SDK integration.',
};

export default function DocsPlaceholderPage() {
  return (
    <section className="w-full px-5 py-14 sm:px-8 lg:px-12 xl:px-16">
      <div className="glass-panel p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span>ContractGuard &middot; Documentation Placeholder</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
          Policy Schema &amp; Enforcement Reference
        </h1>
        <p className="max-w-3xl text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
          Full reference guides for `AgentSecurityPolicy` v1 YAML syntax, MCP gateway adapters, and
          interactive PDF verification will live here alongside the documentation portal.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/how-it-works"
            className="cta-emerald inline-flex h-11 items-center justify-center px-5 text-sm font-semibold"
          >
            View 5-Step Workflow
          </Link>
          <Link
            href="/"
            className="neu-raised inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold text-[var(--text)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
