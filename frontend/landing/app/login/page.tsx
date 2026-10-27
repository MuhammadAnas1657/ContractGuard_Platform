import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { getWebAppUrl } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Login — ContractGuard',
  description: 'Sign in to the ContractGuard web application.',
};

export default function LoginPlaceholderPage() {
  return (
    <section className="w-full px-5 py-14 sm:px-8 lg:px-12 xl:px-16">
      <div className="glass-panel p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>ContractGuard &middot; Web Application Entry Point</span>
        </div>

        <div className="space-y-3 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            Sign in to ContractGuard
          </h1>
          <p className="text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
            The landing website provides product information. Authentication and workspace access run in the ContractGuard Web App.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={getWebAppUrl('/login')}
            className="cta-emerald inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold whitespace-nowrap"
          >
            <span>Launch Web App Login</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="neu-raised inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold text-[var(--text)] whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
