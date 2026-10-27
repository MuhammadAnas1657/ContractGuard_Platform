'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getWebAppUrl } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/security', label: 'Security & Privacy' },
  { href: '/faq', label: 'FAQ' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header-bar sticky top-0 z-40 w-full">
      <div className="flex h-16 w-full items-center justify-between gap-6 px-5 sm:px-8 lg:px-12 xl:px-16">
        {/* Zone 1: Brand Wordmark */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="inline-flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-[var(--text)] whitespace-nowrap shrink-0"
        >
          <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          <span>ContractGuard</span>
        </Link>

        {/* Zone 2: Primary Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 whitespace-nowrap shrink-0 transition-colors duration-200 ${
                  isActive
                    ? 'text-[var(--text)] font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Theme Switch + Auth Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <ThemeToggle />

          <Link
            href={getWebAppUrl('/login')}
            className="neu-raised hidden sm:inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-[var(--text)] whitespace-nowrap shrink-0"
          >
            Login
          </Link>

          <Link
            href={getWebAppUrl('/signup')}
            className="cta-emerald hidden sm:inline-flex h-10 items-center justify-center px-4 text-sm font-semibold whitespace-nowrap shrink-0"
          >
            Get Started
          </Link>

          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileOpen((prev) => !prev)}
            className={`${
              mobileOpen ? 'neu-pressed text-[var(--accent)]' : 'neu-raised text-[var(--text)]'
            } inline-flex lg:hidden h-11 w-11 items-center justify-center cursor-pointer`}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Layered Glass Navigation Dropdown */}
      {mobileOpen && (
        <div className="px-4 pb-3 pt-2 sm:px-8 lg:hidden">
          <div id="mobile-nav-panel" className="glass-panel p-4">
            <nav aria-label="Mobile navigation" className="flex flex-col space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-11 items-center rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors duration-200 ${
                      isActive
                        ? 'neu-pressed text-[var(--accent)] font-semibold'
                        : 'text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 sm:hidden">
              <Link
                href={getWebAppUrl('/login')}
                onClick={() => setMobileOpen(false)}
                className="neu-raised inline-flex h-11 items-center justify-center px-4 text-sm font-semibold text-[var(--text)] whitespace-nowrap"
              >
                Login
              </Link>
              <Link
                href={getWebAppUrl('/signup')}
                onClick={() => setMobileOpen(false)}
                className="cta-emerald inline-flex h-11 items-center justify-center px-4 text-sm font-semibold whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
