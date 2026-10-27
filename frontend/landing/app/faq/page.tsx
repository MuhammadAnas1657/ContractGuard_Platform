import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { getWebAppUrl } from '@/lib/utils';
import { FaqAccordion } from '@/components/landing/faq-accordion';

export const metadata: Metadata = {
  title: 'FAQ — ContractGuard',
  description:
    'Frequently asked questions about ContractGuard policy authoring, video reviews, static repository scanning, privacy, and exports.',
};

export default function FaqPage() {
  return (
    <div className="pb-10">
      <section className="w-full px-5 pt-8 pb-6 sm:px-8 sm:pt-12 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Header Card + Support Card */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="glass-panel p-6 sm:p-7">
              <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
                ContractGuard FAQ &middot; Architecture &amp; Privacy
              </p>
              <h1
                className="mt-3 font-bold tracking-tight text-[var(--text)] text-balance"
                style={{ fontSize: 'clamp(1.85rem, 2.8vw, 2.6rem)', lineHeight: 1.15 }}
              >
                Answers for developers and security reviewers.
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">
                Straightforward answers on how policies are authored, how repositories are handled,
                and what exported contracts guarantee at runtime.
              </p>
            </div>

            <div className="glass p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Need a deeper architecture walkthrough?</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                Review our repository data handling table or start generating a policy contract
                directly.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href={getWebAppUrl('/signup')}
                  className="cta-emerald inline-flex h-10 items-center gap-1.5 px-4 text-sm font-semibold whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/security"
                  className="neu-raised inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-[var(--text)] whitespace-nowrap"
                >
                  Security &amp; Privacy
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Accordion */}
          <div className="lg:col-span-8 min-w-0">
            <FaqAccordion />
          </div>
        </div>
      </section>
    </div>
  );
}
