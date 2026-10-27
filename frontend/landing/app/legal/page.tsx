import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Legal Notices — ContractGuard',
  description: 'Privacy notice, terms of service, and data handling placeholders for ContractGuard.',
};

export default function LegalPlaceholderPage() {
  return (
    <section className="w-full px-5 py-14 sm:px-8 lg:px-12 xl:px-16 space-y-6">
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <Scale className="h-4 w-4" aria-hidden="true" />
          <span>ContractGuard &middot; Legal Placeholders</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
          Privacy, Terms &amp; Data Handling
        </h1>

        <div id="privacy" className="surface-opaque p-5 space-y-2">
          <h2 className="text-lg font-bold text-[var(--text)]">Privacy Notice (Placeholder)</h2>
          <p className="text-[15px] leading-relaxed text-[var(--muted)]">
            ContractGuard collects minimal account metadata and stores only extracted tool schemas
            and policy versions. Uploaded repository archives are deleted immediately after static
            analysis. See our{' '}
            <Link href="/security" className="font-semibold text-[var(--accent)] hover:underline">
              Security &amp; Privacy
            </Link>{' '}
            page for technical details.
          </p>
        </div>

        <div id="terms" className="surface-opaque p-5 space-y-2">
          <h2 className="text-lg font-bold text-[var(--text)]">Terms of Service (Placeholder)</h2>
          <p className="text-[15px] leading-relaxed text-[var(--muted)]">
            Policies generated and exported via ContractGuard assist engineering teams in enforcing
            tool boundaries, and are provided subject to customer validation inside their deployment
            environment.
          </p>
        </div>

        <div id="dpa" className="surface-opaque p-5 space-y-2">
          <h2 className="text-lg font-bold text-[var(--text)]">
            Data Handling Addendum (Placeholder)
          </h2>
          <p className="text-[15px] leading-relaxed text-[var(--muted)]">
            Customer source archives and redacted secrets are never used for model training or
            shared across workspace tenants.
          </p>
        </div>

        <div className="pt-2">
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
