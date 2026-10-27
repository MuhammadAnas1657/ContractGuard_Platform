'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldAlert,
  UserCheck,
  UserX,
  Activity,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api/client';
import { User, UserStatus } from '@/lib/types/auth';
import { AdminOverviewResponse } from '@/lib/types/admin';

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [overview, usersRes] = await Promise.all([
        apiClient.getAdminOverview(),
        apiClient.getAdminUsers(),
      ]);
      setData(overview);
      setUsers(usersRes.users);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadAdminData() {
      try {
        const [overview, usersRes] = await Promise.all([
          apiClient.getAdminOverview(),
          apiClient.getAdminUsers(),
        ]);
        if (!ignore) {
          setData(overview);
          setUsers(usersRes.users);
        }
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadAdminData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleUserStatus = async (user: User) => {
    const nextStatus: UserStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      await apiClient.updateUserStatus(user.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      setActionNotice(
        `User ${user.email} status updated to ${nextStatus.toUpperCase()}`
      );
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await apiClient.exportUsersCsv();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contractguard-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <AppShell
      title="Super Admin Console"
      breadcrumbs={[
        { label: 'Governance', href: '/admin' },
        { label: 'Admin Overview' },
      ]}
    >
      <div className="space-y-8">
        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="fixed bottom-6 right-6 z-50 bg-[var(--surface)] border border-emerald-500/40 text-[var(--text)] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Admin Privacy Boundary Callout */}
        <div className="rounded-2xl glass-panel p-5 flex items-start gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl neu-raised-sm text-[var(--ai)] shrink-0 border border-[var(--glass-border)]">
            <Lock className="w-4 h-4 text-[var(--ai)]" />
          </div>
          <div className="text-xs">
            <h4 className="font-semibold text-[var(--text)]">
              Admin Privacy Boundary Enforced
            </h4>
            <p className="text-[var(--muted)] mt-1 leading-relaxed">
              Super administrators have access to account, authentication, and platform activity metadata only. Zero access is granted to proprietary policy content, uploaded source code, review video recordings, or customer secret keys.
            </p>
          </div>
        </div>

        {/* 1. Overview KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl glass-card shadow-sm">
            <span className="text-[11px] text-[var(--muted)] block">Total Users</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-[var(--text)] mt-1 block">
              {data?.kpis.total_users ?? 0}
            </span>
            <span className="text-[10px] text-[var(--muted)] mt-1 block">Registered accounts</span>
          </div>

          <div className="p-4 rounded-2xl glass-card shadow-sm">
            <span className="text-[11px] text-[var(--muted)] block">New Signups (7d)</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-[var(--accent)] mt-1 block">
              +{data?.kpis.new_signups_7d ?? 0}
            </span>
            <span className="text-[10px] text-[var(--muted)] mt-1 block">30d: {data?.kpis.new_signups_30d ?? 0}</span>
          </div>

          <div className="p-4 rounded-2xl glass-card shadow-sm">
            <span className="text-[11px] text-[var(--muted)] block">Logins Today</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-[var(--text)] mt-1 block">
              {data?.kpis.logins_today ?? 0}
            </span>
            <span className="text-[10px] text-[var(--accent)] mt-1 block font-mono">100% OTP verified</span>
          </div>

          <div className="p-4 rounded-2xl glass-card shadow-sm">
            <span className="text-[11px] text-[var(--muted)] block">Failed Logins</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-[var(--danger)] mt-1 block">
              {data?.kpis.failed_logins_today ?? 0}
            </span>
            <span className="text-[10px] text-[var(--danger)] mt-1 block font-mono">Rate-limited</span>
          </div>

          <div className="p-4 rounded-2xl glass-card shadow-sm">
            <span className="text-[11px] text-[var(--muted)] block">Policies Built</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-[var(--ai)] mt-1 block">
              {data?.kpis.policies_generated ?? 0}
            </span>
            <span className="text-[10px] text-[var(--muted)] mt-1 block">By all organizations</span>
          </div>

          <div className="p-4 rounded-2xl glass-card shadow-sm">
            <span className="text-[11px] text-[var(--muted)] block">Repo Scans</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-500 mt-1 block">
              {data?.kpis.repo_jobs ?? 0}
            </span>
            <span className="text-[10px] text-[var(--muted)] mt-1 block">Purged upon exit</span>
          </div>
        </div>

        {/* 2. Visual Activity Chart (Signups vs Logins) */}
        <div className="rounded-2xl glass-panel p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">
                Authentication & Registration Trajectory (Last 7 Days)
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Daily volume of completed OTP logins vs newly onboarded security leads.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[var(--accent)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" /> Logins
              </span>
              <span className="flex items-center gap-1.5 text-[var(--ai)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ai)]" /> Signups
              </span>
            </div>
          </div>

          {/* Simple Clean Bar/Line Visualization */}
          <div className="h-44 w-full flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-[var(--glass-border)]">
            {data?.charts.map((point) => {
              const maxVal = 25;
              const loginHeight = Math.round((point.logins / maxVal) * 100);
              const signupHeight = Math.round((point.signups / maxVal) * 100);

              return (
                <div key={point.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    <div
                      style={{ height: `${Math.max(loginHeight, 8)}%` }}
                      className="w-1/2 max-w-[20px] bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all group-hover:scale-105"
                      title={`${point.date}: ${point.logins} Logins`}
                    />
                    <div
                      style={{ height: `${Math.max(signupHeight, 4)}%` }}
                      className="w-1/2 max-w-[20px] bg-purple-500/80 hover:bg-purple-400 rounded-t transition-all group-hover:scale-105"
                      title={`${point.date}: ${point.signups} Signups`}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[var(--muted)] truncate">
                    {point.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Users Management Table */}
        <div className="rounded-2xl glass-panel overflow-hidden shadow-md">
          <div className="p-5 border-b border-[var(--glass-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">
                User Directory & Access Control
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Manage accounts, review verification timestamps, and enforce suspensions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] input-opaque text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border)] input-opaque text-[var(--text)] outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border)] input-opaque text-[var(--text)] outline-none"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="super_admin">Super Admin</option>
              </select>

              {/* CSV Export Button */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-1.5 text-xs rounded-xl neu-btn text-[var(--text)] transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Download users CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto surface-opaque">
            <table className="w-full text-left border-collapse text-xs table-opaque">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]/80 text-[var(--muted)] font-medium">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Email Verified</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] table-opaque">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text)]">{u.name}</div>
                      <div className="text-[11px] text-[var(--muted)] font-mono">{u.email}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {u.role === 'super_admin' ? (
                        <span className="text-[var(--ai)] font-bold">super_admin</span>
                      ) : (
                        <span className="text-[var(--muted)]">user</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-mono rounded-md border ${
                          u.status === 'active'
                            ? 'text-[var(--accent)] bg-emerald-500/10 border-emerald-500/20'
                            : u.status === 'pending'
                            ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                            : 'text-[var(--danger)] bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[var(--muted)] font-mono text-[11px]">
                      {u.email_verified_at ? 'Verified ✔' : 'Pending OTP'}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--muted)] font-mono text-[11px] tabular-nums">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {u.role !== 'super_admin' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 text-xs rounded-xl neu-btn transition-colors cursor-pointer ${
                            u.status === 'suspended'
                              ? 'text-[var(--accent)]'
                              : 'text-[var(--danger)]'
                          }`}
                        >
                          {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--muted)] font-mono italic">
                          Protected
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Activity Log Feed */}
        <div className="rounded-2xl glass-panel p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">
                Security & Platform Audit Log
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Immutable record of signups, OTP deliveries, login events, and policy exports.
              </p>
            </div>
            <Activity className="w-4 h-4 text-[var(--muted)]" />
          </div>

          <div className="space-y-3">
            {data?.recent_activity.map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-xl border border-[var(--glass-border)] glass-subtle flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 inline-block w-2 h-2 rounded-full shrink-0 ${
                      act.type === 'login_success'
                        ? 'bg-[var(--accent)]'
                        : act.type === 'login_failed' || act.type === 'otp_failed'
                        ? 'bg-[var(--danger)]'
                        : act.type === 'policy_export'
                        ? 'bg-[var(--ai)]'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-[var(--text)]">
                      {act.description}
                    </span>
                    <div className="text-[11px] text-[var(--muted)] mt-1 flex items-center gap-2 font-mono">
                      <span>User: {act.user_email}</span>
                      <span>·</span>
                      <span>IP: {act.ip}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[11px] text-[var(--muted)] font-mono tabular-nums shrink-0">
                  {new Date(act.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
