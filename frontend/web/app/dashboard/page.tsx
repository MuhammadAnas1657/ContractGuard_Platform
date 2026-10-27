'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  GitBranch,
  Video,
  Network,
  Download,
  CheckCircle2,
  Circle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Clock,
  Layers,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api/client';
import { Policy, PastExport, SetupChecklistItem, PolicyStatus } from '@/lib/types/policy';

export default function DashboardPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [exportsList, setExportsList] = useState<PastExport[]>([]);
  const [checklist, setChecklist] = useState<SetupChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PolicyStatus>('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [policiesData, exportsData, checklistData] = await Promise.all([
        apiClient.getPolicies(),
        apiClient.getRecentExports(),
        apiClient.getSetupChecklist(),
      ]);
      setPolicies(policiesData);
      setExportsList(exportsData);
      setChecklist(checklistData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [policiesData, exportsData, checklistData] = await Promise.all([
          apiClient.getPolicies(),
          apiClient.getRecentExports(),
          apiClient.getSetupChecklist(),
        ]);
        if (!ignore) {
          setPolicies(policiesData);
          setExportsList(exportsData);
          setChecklist(checklistData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleChecklist = async (id: string) => {
    try {
      const updated = await apiClient.toggleChecklistItem(id);
      setChecklist(updated);
    } catch (err) {
      console.error('Failed to toggle checklist item', err);
    }
  };

  const handleExportClick = (policyTitle: string, version: string, format: string) => {
    setExportNotice(`Exporting "${policyTitle}" (${version}) as .${format.toUpperCase()} package...`);
    setTimeout(() => {
      setExportNotice(null);
    }, 3500);
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.agent_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const completedChecklistCount = checklist.filter((i) => i.completed).length;

  return (
    <AppShell title="Dashboard">
      <div className="space-y-8">
        {/* Export Notification Toast */}
        {exportNotice && (
          <div className="fixed bottom-6 right-6 z-50 bg-[var(--surface)] border border-emerald-500/40 text-[var(--text)] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* 1. Large Hero Card: "Create Policy with Our Specialized AI" */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6 sm:p-10 shadow-lg">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 -mb-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-[var(--ai)] uppercase tracking-wider font-mono">
                Automated Policy Synthesis
              </span>
              <span className="text-xs text-[var(--muted)]">·</span>
              <span className="text-xs text-[var(--muted)] font-mono">Live Guard Generation</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text)] leading-tight text-balance">
              Establish Verifiable Guardrails for Autonomous Agents
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed max-w-2xl">
              Conduct an interactive AI interview to generate cryptographically signed enforcement policies, permission boundaries, and per-call tool limits.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => router.push('/policies/new')}
                className="py-3.5 px-6 rounded-xl bg-[var(--accent)] hover:opacity-95 active:scale-[0.99] text-white text-sm sm:text-base font-semibold shadow-md transition-all flex items-center gap-2.5 group cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-emerald-100 group-hover:rotate-12 transition-transform" />
                <span>Create Policy with Our Specialized AI</span>
                <ArrowRight className="w-4 h-4 text-emerald-100 group-hover:translate-x-1 transition-transform" />
              </button>

              <Link
                href="/policies"
                className="py-3.5 px-5 rounded-xl neu-btn text-xs sm:text-sm font-medium text-[var(--text)] transition-colors flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-[var(--muted)]" />
                <span>Browse Existing Policies ({policies.length})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Secondary Quick-Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Review a policy */}
          <Link
            href="/policies"
            className="group rounded-2xl glass-card p-5 hover:border-[var(--accent)]/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl neu-raised-sm flex items-center justify-center text-[var(--ai)] mb-4 border border-[var(--glass-border)] group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5 text-[var(--ai)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                Review a Policy
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                Ingest video/audio walkthroughs with timestamped transcripts to generate inline policy diffs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between text-xs font-medium text-[var(--accent)]">
              <span>Launch Review Studio</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 2: Upload repository */}
          <Link
            href="/repositories"
            className="group rounded-2xl glass-card p-5 hover:border-[var(--accent)]/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl neu-raised-sm flex items-center justify-center text-[var(--accent)] mb-4 border border-[var(--glass-border)] group-hover:scale-105 transition-transform">
                <GitBranch className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                Upload Repository
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                Analyze agent manifests, tool definitions, and credentials with zero-retention privacy guarantees.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between text-xs font-medium text-[var(--accent)]">
              <span>Inspect Codebase</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Action 3: Security architecture */}
          <Link
            href="/security/architecture"
            className="group rounded-2xl glass-card p-5 hover:border-[var(--accent)]/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl neu-raised-sm flex items-center justify-center text-amber-500 mb-4 border border-[var(--glass-border)] group-hover:scale-105 transition-transform">
                <Network className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                Security Architecture
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                Generate production architecture packages, network boundaries, and runtime proxy blueprints.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between text-xs font-medium text-[var(--accent)]">
              <span>Generate Pack</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* 3. Setup Checklist & Downloads Center (Side-by-side on desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Setup Checklist (2 cols on lg) */}
          <div className="lg:col-span-2 rounded-2xl glass-panel p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text)]">
                  Deployment Readiness Checklist
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Mandatory operational prerequisites for runtime agent enforcement.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg neu-raised-sm text-[var(--text)] border border-[var(--glass-border)]">
                {completedChecklistCount} of {checklist.length} complete
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 neu-pressed-sm rounded-full overflow-hidden mb-5 border border-[var(--glass-border)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{
                  width: `${(completedChecklistCount / Math.max(checklist.length, 1)) * 100}%`,
                }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                    item.completed
                      ? 'glass-subtle opacity-75'
                      : 'glass hover:border-[var(--accent)]/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleChecklist(item.id)}
                      className="mt-0.5 text-[var(--muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                      title={item.completed ? 'Mark incomplete' : 'Mark completed'}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                      ) : (
                        <Circle className="w-4 h-4 text-[var(--muted)]" />
                      )}
                    </button>
                    <div>
                      <h4
                        className={`text-xs font-semibold ${
                          item.completed ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {item.action_href && (
                    <Link
                      href={item.action_href}
                      className="text-xs text-[var(--accent)] font-medium hover:underline shrink-0 ml-3"
                    >
                      {item.action_label || 'Configure'} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Downloads Center / Past Exports (1 col on lg) */}
          <div className="rounded-2xl glass-panel p-6 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text)]">
                    Downloads Center
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Audit-ready policy artifacts.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl neu-raised-sm flex items-center justify-center text-[var(--muted)] border border-[var(--glass-border)]">
                  <Download className="w-4 h-4" />
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-[var(--muted)]">
                  Loading exports...
                </div>
              ) : exportsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted)]">
                  No exports generated yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {exportsList.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 rounded-xl border border-[var(--glass-border)] glass-subtle flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono uppercase text-[10px] font-bold px-1.5 py-0.5 rounded-md neu-raised-sm text-[var(--text)] border border-[var(--glass-border)]">
                            {exp.format}
                          </span>
                          <span className="text-xs font-medium text-[var(--text)] truncate">
                            {exp.policy_title}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-1 flex items-center gap-2 font-mono">
                          <span>{exp.version}</span>
                          <span>·</span>
                          <span>{exp.file_size}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExportClick(exp.policy_title, exp.version, exp.format)}
                        className="p-2 rounded-xl neu-btn text-[var(--accent)] transition-all shrink-0 cursor-pointer"
                        title="Download package"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--glass-border)] text-center">
              <Link
                href="/policies"
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors font-medium"
              >
                View all generated verification files →
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Recent Policies Table */}
        <div className="rounded-2xl glass-panel overflow-hidden shadow-md">
          {/* Table Header & Controls */}
          <div className="p-5 border-b border-[var(--glass-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text)]">
                Active Agent Policies
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Machine-verifiable schemas deployed or staged for execution boundaries.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search (High-contrast opaque for readability) */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by agent or policy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] input-opaque placeholder-[var(--muted)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
                />
              </div>

              {/* Status Segmented Buttons (Neumorphic segmented controls) */}
              <div className="flex items-center neu-tab-group text-xs">
                {(['all', 'active', 'draft', 'in_review'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs capitalize neu-tab cursor-pointer ${
                      statusFilter === st
                        ? 'neu-tab-active'
                        : 'neu-tab-inactive'
                    }`}
                  >
                    {st === 'in_review' ? 'In Review' : st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={refreshData}
                className="p-2 rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
                title="Refresh table"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table Content: Kept OPAQUE and high-contrast for readability and scroll performance */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--muted)] space-y-2 surface-opaque">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading agent policies...</p>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="p-12 text-center surface-opaque">
              <FileText className="w-10 h-10 text-[var(--muted)] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-semibold text-[var(--text)]">No policies found</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No policies match the current filter criteria.'
                  : 'Start by conducting an AI synthesis interview to build your first agent policy.'}
              </p>
              {searchQuery || statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="mt-3 px-3 py-1.5 text-xs rounded-xl neu-btn cursor-pointer"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href="/policies/new"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 shadow-sm transition-opacity"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Create First Policy
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto surface-opaque">
              <table className="w-full text-left border-collapse text-xs table-opaque">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg)]/80 text-[var(--muted)] font-medium">
                    <th className="py-3 px-4">Agent & Policy Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Rules & Tools</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] table-opaque">
                  {filteredPolicies.map((p) => {
                    const statusStyles = {
                      active: 'text-[var(--accent)] bg-emerald-500/10 border-emerald-500/20',
                      draft: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                      in_review: 'text-[var(--ai)] bg-purple-500/10 border-purple-500/20',
                    }[p.status];

                    const statusLabel = {
                      active: 'Active Guard',
                      draft: 'Draft Synthesis',
                      in_review: 'In Review Studio',
                    }[p.status];

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-[var(--bg)]/50 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                            {p.title}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] font-mono mt-0.5">
                            Target: {p.agent_name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-mono font-medium rounded-md border ${statusStyles}`}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono tabular-nums text-[var(--text)]">
                          {p.version}
                        </td>

                        <td className="py-3.5 px-4 text-[var(--muted)] font-mono tabular-nums">
                          {p.rules_count} rules · {p.tools_count} tools
                        </td>

                        <td className="py-3.5 px-4 text-[var(--muted)] font-mono tabular-nums">
                          {new Date(p.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleExportClick(p.title, p.version, 'pdf')}
                              className="px-2.5 py-1 text-xs rounded-xl neu-btn text-[var(--text)] hover:text-[var(--accent)] transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Export</span>
                            </button>
                            <Link
                              href={`/policies`}
                              className="px-2.5 py-1 text-xs rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--text)] transition-all"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
