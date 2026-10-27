import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact — ContractGuard',
  description: 'Contact placeholder for ContractGuard security and engineering inquiries.',
};

export default function ContactPlaceholderPage() {
  return (
    <section className="w-full px-5 py-14 sm:px-8 lg:px-12 xl:px-16">
      <div className="glass-panel p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
          <Mail className="h-4 w-4" aria-hidden="true" />
          <span>ContractGuard &middot; Contact Placeholder</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
          Contact Security &amp; Engineering
        </h1>
        <p className="text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
          For security architecture reviews, vulnerability disclosures, or enterprise evaluation:
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div className="surface-opaque p-5">
            <div className="font-semibold text-[var(--text)]">Security Disclosures</div>
            <div className="mt-1.5 font-mono text-[var(--accent)] break-all">
              security@contractguard.example
            </div>
          </div>
          <div className="surface-opaque p-5">
            <div className="font-semibold text-[var(--text)]">Engineering &amp; Support</div>
            <div className="mt-1.5 font-mono text-[var(--accent)] break-all">
              support@contractguard.example
            </div>
          </div>
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
