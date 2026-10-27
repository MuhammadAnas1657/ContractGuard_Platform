import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { getWebAppUrl } from '@/lib/utils';

export function SiteFooter() {
  return (
    <footer className="glass-footer relative z-10 mt-10">
      <div className="w-full px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-[var(--text)]"
            >
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
              <span>ContractGuard</span>
            </Link>
            <p className="mt-3 max-w-md text-sm sm:text-[15px] leading-relaxed text-[var(--muted)]">
              Generate, review, and export deterministic security policies for AI agents.
              Built for engineering and application security teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Platform</h2>
              <ul className="mt-3 space-y-2.5 text-sm text-[var(--muted)]">
                <li>
                  <Link href="/features" className="hover:text-[var(--text)] transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="hover:text-[var(--text)] transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-[var(--text)] transition-colors">
                    Security &amp; Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-[var(--text)] transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Resources</h2>
              <ul className="mt-3 space-y-2.5 text-sm text-[var(--muted)]">
                <li>
                  <Link href="/docs" className="hover:text-[var(--text)] transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[var(--text)] transition-colors">
                    Contact Security Team
                  </Link>
                </li>
                <li>
                  <Link href={getWebAppUrl('/login')} className="hover:text-[var(--text)] transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href={getWebAppUrl('/signup')} className="hover:text-[var(--text)] transition-colors">
                    Create Account
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h2 className="text-sm font-semibold text-[var(--text)]">Legal</h2>
              <ul className="mt-3 space-y-2.5 text-sm text-[var(--muted)]">
                <li>
                  <Link href="/legal#privacy" className="hover:text-[var(--text)] transition-colors">
                    Privacy Notice
                  </Link>
                </li>
                <li>
                  <Link href="/legal#terms" className="hover:text-[var(--text)] transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/legal#dpa" className="hover:text-[var(--text)] transition-colors">
                    Data Handling Addendum
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-6 text-[13px] sm:text-sm text-[var(--muted)] sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} ContractGuard Inc. All rights reserved.</p>
          <p>
            Static code analysis only &middot; Zero source execution &middot; Verifiable deletion receipts
          </p>
        </div>
      </div>
    </footer>
  );
}
