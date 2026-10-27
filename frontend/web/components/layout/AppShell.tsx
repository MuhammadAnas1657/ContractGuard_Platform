'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  FileCode2,
  Sparkles,
  GitBranch,
  Network,
  Sliders,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User as UserIcon,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { ThemeToggle } from '../common/ThemeToggle';
import { DevBanner } from '../common/DevBanner';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({ children, title, breadcrumbs }: AppShellProps) {
  const { user, loading, isAuthenticated, isSuperAdmin, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Route protection
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // 403 Check for Admin routes
  const isAdminRoute = pathname?.startsWith('/admin');
  if (isAdminRoute && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
        <DevBanner showDemoSwitch={true} />
        <header className="h-16 glass-header px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl neu-raised-sm flex items-center justify-center text-[var(--accent)] border border-[var(--glass-border)]">
              <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <span className="font-bold text-lg tracking-tight">ContractGuard</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 text-xs rounded-xl neu-btn hover:text-[var(--danger)] transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-card-strong border border-[var(--danger)]/30 p-8 text-center shadow-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[var(--danger)] neu-pressed-sm">
              <Lock className="w-7 h-7 text-[var(--danger)]" />
            </div>
            <span className="text-xs font-mono font-semibold text-[var(--danger)] uppercase tracking-wider">
              HTTP 403 Forbidden
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] mt-2">
              Super Admin Access Required
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
              Your account (<span className="font-mono text-xs">{user?.email}</span>) holds the{' '}
              <span className="font-semibold text-[var(--text)]">{user?.role}</span> role. Administrative console endpoints are strictly restricted to verified super administrators.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 shadow-md transition-opacity"
              >
                Return to User Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Policies', href: '/policies', icon: FileCode2 },
    { label: 'Policy Studio', href: '/policies/new', icon: Sparkles },
    { label: 'Repositories', href: '/repositories', icon: GitBranch },
    { label: 'Security Architecture', href: '/security/architecture', icon: Network },
    { label: 'Configuration', href: '/security/configuration', icon: Sliders },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Dev OTP & Account Switcher Banner */}
      <DevBanner showDemoSwitch={true} />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 glass-sidebar shrink-0 relative z-10">
          {/* Brand Wordmark */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-[var(--glass-border)]">
            <div className="w-9 h-9 rounded-xl neu-raised-sm flex items-center justify-center text-[var(--accent)] border border-[var(--glass-border)]">
              <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[var(--text)]">
                ContractGuard
              </span>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                Agent Security Mesh
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Security Console
            </div>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'neu-pressed-sm text-[var(--accent)] font-semibold border border-[var(--glass-border)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {/* Admin Section */}
            <div className="pt-4 px-3 pb-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
              <span>Governance</span>
              {isSuperAdmin && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-mono border border-purple-500/25">
                  Admin
                </span>
              )}
            </div>
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                pathname?.startsWith('/admin')
                  ? 'neu-pressed-sm text-[var(--ai)] font-semibold border border-[var(--glass-border)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/40'
              }`}
            >
              <ShieldAlert className={`w-4 h-4 ${pathname?.startsWith('/admin') ? 'text-[var(--ai)]' : 'text-[var(--muted)]'}`} />
              <span className="truncate">Super Admin</span>
            </Link>
          </div>

          {/* User Account Capsule in Sidebar */}
          <div className="p-3 border-t border-[var(--glass-border)]">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl glass-subtle">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full neu-raised-sm flex items-center justify-center text-xs font-semibold text-[var(--text)] uppercase shrink-0 border border-[var(--glass-border)]">
                  {user?.name?.slice(0, 2) || 'US'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[var(--text)] truncate">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-[11px] text-[var(--muted)] truncate font-mono">
                    {user?.role === 'super_admin' ? 'Super Admin' : 'Security Lead'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                title="Log out"
                className="p-1.5 text-[var(--muted)] hover:text-[var(--danger)] neu-btn rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] glass-sidebar flex flex-col z-10 shadow-2xl">
              <div className="h-16 px-6 flex items-center justify-between border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl neu-raised-sm flex items-center justify-center text-[var(--accent)] border border-[var(--glass-border)]">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <span className="font-bold text-base tracking-tight text-[var(--text)]">ContractGuard</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg neu-btn text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'neu-pressed-sm text-[var(--accent)] font-semibold border border-[var(--glass-border)]'
                          : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/40'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="pt-3 border-t border-[var(--glass-border)]">
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      pathname?.startsWith('/admin')
                        ? 'neu-pressed-sm text-[var(--ai)] font-semibold border border-[var(--glass-border)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/40'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Super Admin Console</span>
                  </Link>
                </div>
              </div>

              <div className="p-4 border-t border-[var(--glass-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-xl neu-btn text-[var(--danger)] hover:bg-red-500/10 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Viewport Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Header */}
          <header className="h-16 px-4 sm:px-6 lg:px-8 glass-header sticky top-0 z-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl neu-btn text-[var(--text)]"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1.5 text-xs text-[var(--muted)] overflow-hidden truncate">
                <Link href="/dashboard" className="hover:text-[var(--text)] transition-colors">
                  ContractGuard
                </Link>
                {breadcrumbs && breadcrumbs.length > 0 ? (
                  breadcrumbs.map((b, i) => (
                    <React.Fragment key={i}>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                      {b.href ? (
                        <Link href={b.href} className="hover:text-[var(--text)] transition-colors truncate">
                          {b.label}
                        </Link>
                      ) : (
                        <span className="text-[var(--text)] font-medium truncate">{b.label}</span>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                    <span className="text-[var(--text)] font-medium truncate">{title || 'Console'}</span>
                  </>
                )}
              </nav>
            </div>

            {/* Header Right Controls */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl neu-btn text-[var(--text)] cursor-pointer"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold uppercase">
                    {user?.name?.slice(0, 2) || 'US'}
                  </div>
                  <span className="text-xs font-medium text-[var(--text)] hidden sm:inline max-w-[120px] truncate">
                    {user?.name || user?.email}
                  </span>
                  {user?.role === 'super_admin' && (
                    <span className="hidden md:inline text-[10px] px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-400 font-mono border border-purple-500/25">
                      Admin
                    </span>
                  )}
                </button>

                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 glass-dropdown p-1.5 z-40 text-xs">
                      <div className="px-3.5 py-2.5 border-b border-[var(--glass-border)]">
                        <p className="font-semibold text-[var(--text)] truncate">{user?.name}</p>
                        <p className="text-[11px] text-[var(--muted)] font-mono truncate">{user?.email}</p>
                        <div className="mt-1.5">
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-mono ${
                            user?.role === 'super_admin'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          }`}>
                            Role: {user?.role}
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/settings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[var(--text)] hover:bg-[var(--surface)]/60 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-[var(--muted)]" />
                          Account Settings
                        </Link>
                        {user?.role === 'super_admin' && (
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[var(--ai)] hover:bg-[var(--surface)]/60 transition-colors"
                          >
                            <ShieldAlert className="w-4 h-4 text-[var(--ai)]" />
                            Admin Console
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-[var(--glass-border)] pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 rounded-lg text-[var(--danger)] hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Log out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area - Full width without extra side space */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
