'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderGit2,
  Plus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  ArrowRight,
  Sparkles,
  FileCode,
  HardDrive,
  RefreshCw,
  Search,
  Lock,
} from 'lucide-react';
import { RepoJob } from '@/lib/types/repository';
import { apiClient } from '@/lib/api/client';

export function RepoList() {
  const router = useRouter();
  const [jobs, setJobs] = useState<RepoJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.listRepoJobs();
      setJobs(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load repository analyses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await apiClient.listRepoJobs();
        if (isMounted) {
          setJobs(data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load repository analyses');
          setIsLoading(false);
        }
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete analysis findings for "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await apiClient.deleteRepoJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err: any) {
      alert(`Failed to delete findings: ${err?.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.name.toLowerCase().includes(q) ||
      j.file_name.toLowerCase().includes(q) ||
      j.tools.some((t) => t.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] font-mono">
              Flow D · Zero-Retention Scanner
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] mt-1">
            Repository Analyses
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
            Static AST code scanners identifying declared tools, risky operations, and exposed keys with automated source purging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadJobs}
            disabled={isLoading}
            className="neu-btn px-3 py-2 text-xs font-medium rounded-xl text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1.5 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/repositories/new"
            className="neu-btn-primary px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Repository</span>
          </Link>
        </div>
      </div>

      {/* Privacy Guarantee Pill */}
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-[var(--accent)] flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[var(--text)]">Ephemeral Zero-Retention Policy</span>
            <p className="text-[var(--muted)] mt-0.5">
              Code is parsed in ephemeral isolated tmpfs and immediately purged post-analysis. Cryptographic deletion receipts are generated for audit.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20 font-semibold">
            TTL: 0s Post-Parse
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories, archive files, or discovered tools..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs input-opaque text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
          </input>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-[var(--glass-border)] glass-card animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="h-4 w-48 bg-[var(--border)] rounded" />
                <div className="h-3 w-64 bg-[var(--border)]/60 rounded" />
              </div>
              <div className="h-8 w-24 bg-[var(--border)] rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-2xl border border-[var(--danger)]/30 bg-red-500/5 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-[var(--danger)] mx-auto" />
          <h3 className="text-sm font-bold text-[var(--text)]">Failed to load analyses</h3>
          <p className="text-xs text-[var(--muted)]">{error}</p>
          <button
            type="button"
            onClick={loadJobs}
            className="neu-btn px-4 py-1.5 text-xs rounded-xl text-[var(--text)]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredJobs.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-[var(--border)] surface-opaque space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-[var(--ai)] flex items-center justify-center mx-auto">
            <FolderGit2 className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-[var(--text)]">
              {searchQuery ? 'No matching repositories found' : 'No repository analyses yet'}
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              {searchQuery
                ? `No analyzed repositories matched your query "${searchQuery}". Clear your search to view all results.`
                : 'Upload a ZIP archive of your autonomous agent codebase to automatically discover tool signatures, identify risky capabilities, and generate policies.'}
            </p>
          </div>
          <div>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="neu-btn px-4 py-2 text-xs rounded-xl text-[var(--text)]"
              >
                Clear Search
              </button>
            ) : (
              <Link
                href="/repositories/new"
                className="neu-btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Upload First Repository</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Repository List Grid */}
      {!isLoading && !error && filteredJobs.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => {
            const hasSecrets = job.secrets_detected?.detected;
            const hasShell = job.risk_flags.shell_execution.detected;
            const hasPayments = job.risk_flags.payments.detected;

            return (
              <div
                key={job.id}
                className="p-5 sm:p-6 rounded-2xl border border-[var(--glass-border)] glass-card hover:border-[var(--accent)]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
              >
                {/* Left info */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm sm:text-base font-bold text-[var(--text)] truncate">
                      {job.name}
                    </span>

                    {/* Status Badge */}
                    {job.status === 'complete' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20 font-mono">
                        <CheckCircle2 className="w-3 h-3" />
                        Purged & Verified
                      </span>
                    )}

                    {job.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-[var(--ai)] border border-purple-500/20 font-mono animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Analyzing AST...
                      </span>
                    )}

                    {job.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-[var(--danger)] border border-red-500/20 font-mono">
                        <AlertTriangle className="w-3 h-3" />
                        Failed
                      </span>
                    )}

                    {/* Secrets Badge */}
                    {hasSecrets && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 font-mono">
                        <AlertTriangle className="w-3 h-3" />
                        {job.secrets_detected.count} Secret{job.secrets_detected.count > 1 ? 's' : ''} Flagged
                      </span>
                    )}
                  </div>

                  {/* Metadata line */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1 font-mono">
                      <FileCode className="w-3.5 h-3.5" />
                      {job.file_name}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <HardDrive className="w-3.5 h-3.5" />
                      {(job.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(job.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--muted)]">
                      Job: {job.id}
                    </span>
                  </div>

                  {/* Discovered Tools Chips */}
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-mono text-[var(--muted)] mr-1">
                      Tools ({job.tools.length}):
                    </span>
                    {job.tools.slice(0, 4).map((tool) => (
                      <span
                        key={tool.id}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${
                          tool.risk_level === 'critical'
                            ? 'bg-red-500/10 text-[var(--danger)] border-red-500/20'
                            : tool.risk_level === 'high'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border)]'
                        }`}
                      >
                        {tool.name}
                      </span>
                    ))}
                    {job.tools.length > 4 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 text-[var(--muted)]">
                        +{job.tools.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Risk Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="text-[11px] font-mono text-[var(--muted)]">Risks:</span>
                    {hasShell && (
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-[var(--danger)] border border-red-500/20 font-mono text-[10px]">
                        Shell Execution
                      </span>
                    )}
                    {hasPayments && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono text-[10px]">
                        Financial Transfer
                      </span>
                    )}
                    {job.risk_flags.file_deletion.detected && (
                      <span className="px-2 py-0.5 rounded bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)] font-mono text-[10px]">
                        File Deletion
                      </span>
                    )}
                    {job.risk_flags.network_calls.detected && (
                      <span className="px-2 py-0.5 rounded bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)] font-mono text-[10px]">
                        Outbound Network
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border)] shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id, job.name)}
                      disabled={deletingId === job.id}
                      className="neu-btn px-2.5 py-1.5 text-xs rounded-xl text-[var(--danger)] hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Delete findings"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>

                    <Link
                      href={`/repositories/${job.id}`}
                      className="neu-btn px-3 py-1.5 text-xs font-semibold rounded-xl text-[var(--text)] flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View Findings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <Link
                    href={`/policies/new?repo_id=${job.id}`}
                    className="text-xs font-medium text-[var(--ai)] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate policy</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
