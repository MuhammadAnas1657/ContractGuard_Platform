'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileCode2,
  Sparkles,
  Search,
  Filter,
  Download,
  Video,
  ChevronRight,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Policy, PolicyStatus, PastExport } from '@/lib/types/policy';
import { apiClient } from '@/lib/api/client';
import { ExportModal } from '@/components/policies/ExportModal';

export default function PoliciesListPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PolicyStatus>('all');
  const [selectedPolicyForExport, setSelectedPolicyForExport] = useState<Policy | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshPolicies = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const data = await apiClient.getPolicies();
        if (!ignore) {
          setPolicies(data);
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
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

  const handleOpenExport = (p: Policy) => {
    setSelectedPolicyForExport(p);
    setIsExportModalOpen(true);
  };

  const filtered = policies.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.agent_name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell
      title="Agent Security Policies"
      breadcrumbs={[
        { label: 'Policies', href: '/policies' },
        { label: 'Catalog' },
      ]}
    >
      <div className="space-y-6">
        {/* Toast Notice */}
        {actionNotice && (
          <div className="fixed bottom-6 right-6 z-50 bg-[var(--surface)] border border-emerald-500/40 text-[var(--text)] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Top Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
              Agent Security Policies
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              Active, draft, and in-review cryptographic enforcement contracts for autonomous systems.
            </p>
          </div>

          <Link
            href="/policies/new"
            className="py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Policy with AI</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by agent name, title, or clause..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] input-opaque placeholder-[var(--muted)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
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
              onClick={refreshPolicies}
              className="p-2 rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Policies Content */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--muted)] space-y-3">
            <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading security policies...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-[var(--accent)] flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <FileCode2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text)]">
              No policies found
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              {search || statusFilter !== 'all'
                ? 'No policies match your search query or status filter. Try clearing filters.'
                : 'Start by generating your first machine-verifiable security policy with our specialized AI.'}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              {search || statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text)]"
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  href="/policies/new"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Policy</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((policy) => {
              const statusStyles = {
                active: 'text-[var(--accent)] bg-emerald-500/10 border-emerald-500/20',
                draft: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                in_review: 'text-[var(--ai)] bg-purple-500/10 border-purple-500/20',
              }[policy.status];

              const statusLabel = {
                active: 'Active Guard',
                draft: 'Draft Synthesis',
                in_review: 'In Review Studio',
              }[policy.status];

              return (
                <div
                  key={policy.id}
                  className="rounded-2xl glass-card p-5 flex flex-col justify-between hover:border-[var(--accent)]/50 transition-all group shadow-sm"
                >
                  <div>
                    {/* Top Row: Status & Version */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase font-medium ${statusStyles}`}>
                        {statusLabel}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--muted)]">
                        {policy.version}
                      </span>
                    </div>

                    {/* Policy Title & Target */}
                    <Link
                      href={`/policies/${policy.id}`}
                      className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 block"
                    >
                      {policy.title}
                    </Link>
                    <div className="text-[11px] font-mono text-[var(--muted)] mt-1">
                      Agent: <strong className="text-[var(--text)]">{policy.agent_name}</strong>
                    </div>

                    <p className="text-xs text-[var(--muted)] mt-2 line-clamp-2 leading-relaxed">
                      {policy.description}
                    </p>

                    {/* Metadata Strip */}
                    <div className="mt-4 pt-3 border-t border-[var(--glass-border)] grid grid-cols-2 gap-2 text-[11px] font-mono text-[var(--muted)]">
                      <div>
                        <span>Rules: </span>
                        <strong className="text-[var(--text)]">{policy.rules_count}</strong>
                      </div>
                      <div>
                        <span>Tools: </span>
                        <strong className="text-[var(--text)]">{policy.tools_count}</strong>
                      </div>
                      <div className="col-span-2 text-[10px] text-[var(--muted)]">
                        Updated {new Date(policy.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenExport(policy)}
                      className="px-2.5 py-1.5 rounded-xl neu-btn text-xs font-medium text-[var(--text)] hover:text-[var(--accent)] transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Export interactive package"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Export</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/policies/${policy.id}/review`}
                        className="px-2.5 py-1.5 rounded-xl neu-btn text-xs font-medium text-[var(--ai)] transition-all flex items-center gap-1.5"
                        title="Review with video walkthrough"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </Link>

                      <Link
                        href={`/policies/${policy.id}`}
                        className="p-1.5 rounded-lg neu-btn text-[var(--muted)] hover:text-[var(--text)] transition-all"
                        title="View policy details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {selectedPolicyForExport && (
        <ExportModal
          policy={selectedPolicyForExport}
          isOpen={isExportModalOpen}
          onClose={() => {
            setIsExportModalOpen(false);
            setSelectedPolicyForExport(null);
          }}
          onExportRecorded={() => {
            setActionNotice(`Export recorded for ${selectedPolicyForExport.title}`);
            setTimeout(() => setActionNotice(null), 3000);
          }}
        />
      )}
    </AppShell>
  );
}
