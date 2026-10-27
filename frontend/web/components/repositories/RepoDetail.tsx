'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderGit2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Trash2,
  Sparkles,
  ArrowRight,
  FileCode,
  HardDrive,
  Copy,
  Clock,
  Lock,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { RepoJob, RepoStreamEvent, DiscoveredTool } from '@/lib/types/repository';
import { apiClient } from '@/lib/api/client';

interface RepoDetailProps {
  id: string;
}

const PIPELINE_STAGES: Array<{ id: string; label: string; desc: string }> = [
  { id: 'upload', label: 'Upload Archive', desc: 'Isolating in-memory tmpfs container' },
  { id: 'validate', label: 'Validate Archive', desc: 'Magic bytes, zip-slip & decompression check' },
  { id: 'scan_secrets', label: 'Scan for Secrets', desc: 'Static regex & entropy scanning on tokens' },
  { id: 'parse_ast', label: 'Parse AST (Zero Execution)', desc: 'Static syntax tree mapping (no runtime execution)' },
  { id: 'extract_signatures', label: 'Extract Signatures', desc: 'Tool schemas, arguments & risk classifications' },
  { id: 'purge_source', label: 'Purge Source Code', desc: 'Permanent destruction & deletion receipt' },
];

export function RepoDetail({ id }: RepoDetailProps) {
  const router = useRouter();

  const [job, setJob] = useState<RepoJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stepper state for live streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStageId, setCurrentStageId] = useState<string>('upload');
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [streamMessage, setStreamMessage] = useState<string>('');
  const [streamProgress, setStreamProgress] = useState<number>(0);

  // UI filters & controls
  const [toolSearch, setToolSearch] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadJob = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getRepoJob(id);
      setJob(data);

      if (data.status === 'processing') {
        runStreamSimulation(data.id);
      } else {
        setCompletedStages(PIPELINE_STAGES.map((s) => s.id));
      }
    } catch (err: any) {
      setError(err?.message || 'Repository analysis not found');
    } finally {
      setIsLoading(false);
    }
  };

  const runStreamSimulation = async (jobId: string) => {
    setIsStreaming(true);
    setCompletedStages([]);
    try {
      for await (const event of apiClient.streamRepoJob(jobId)) {
        if (event.event === 'stage_start') {
          setCurrentStageId(event.stage);
          setStreamMessage(event.message);
          setStreamProgress(event.progress);
        } else if (event.event === 'stage_complete') {
          setCompletedStages((prev) => [...prev, event.stage]);
          setStreamProgress(event.progress);
        } else if (event.event === 'job_complete' && event.job) {
          setJob(event.job);
          setIsStreaming(false);
          setCompletedStages(PIPELINE_STAGES.map((s) => s.id));
        }
      }
    } catch (err: any) {
      console.error('Stream failure:', err);
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchJob = async () => {
      try {
        const data = await apiClient.getRepoJob(id);
        if (!isMounted) return;
        setJob(data);
        setIsLoading(false);

        if (data.status === 'processing') {
          runStreamSimulation(data.id);
        } else {
          setCompletedStages(PIPELINE_STAGES.map((s) => s.id));
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Repository analysis not found');
        setIsLoading(false);
      }
    };
    fetchJob();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDeleteFindings = async () => {
    if (!job) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteRepoJob(job.id);
      router.push('/repositories');
    } catch (err: any) {
      alert(`Failed to delete findings: ${err?.message || 'Unknown error'}`);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-6 w-32 bg-[var(--border)] rounded animate-pulse" />
        <div className="p-8 rounded-2xl border border-[var(--border)] glass-card space-y-4 animate-pulse">
          <div className="h-6 w-64 bg-[var(--border)] rounded" />
          <div className="h-4 w-96 bg-[var(--border)]/60 rounded" />
          <div className="h-32 bg-[var(--border)]/30 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-[var(--danger)] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text)]">Repository Analysis Not Found</h2>
        <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
          {error || 'The requested repository analysis record does not exist or may have been permanently purged.'}
        </p>
        <Link
          href="/repositories"
          className="neu-btn px-5 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 text-[var(--text)]"
        >
          ← Return to Repositories
        </Link>
      </div>
    );
  }

  // Filter tools
  const filteredTools = job.tools.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.source_file.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(toolSearch.toLowerCase());

    const matchesRisk =
      selectedRiskFilter === 'all' || t.risk_level === selectedRiskFilter;

    return matchesSearch && matchesRisk;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/repositories"
            className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1"
          >
            ← Back to Repositories
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] font-mono">
              {job.name}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Source Purged
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1 font-mono">
            Archive: {job.file_name} ({(job.file_size_bytes / (1024 * 1024)).toFixed(1)} MB) · Job ID: {job.id}
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="neu-btn px-3 py-2 text-xs font-semibold rounded-xl text-[var(--danger)] hover:bg-red-500/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Findings</span>
          </button>

          <Link
            href={`/policies/new?repo_id=${job.id}`}
            className="neu-btn-primary px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Policies</span>
          </Link>
        </div>
      </div>

      {/* LIVE PROGRESS STEPPER (Mock Streaming or Re-run) */}
      <div className="rounded-2xl border border-[var(--border)] surface-opaque p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
              AST Parsing Pipeline
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]">
              Isolated tmpfs
            </span>
          </div>

          {!isStreaming && (
            <button
              type="button"
              onClick={() => runStreamSimulation(job.id)}
              className="text-[11px] font-mono text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Re-run Stream Simulation</span>
            </button>
          )}
        </div>

        {/* Horizontal Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map((stg, idx) => {
            const isCompleted = completedStages.includes(stg.id);
            const isCurrent = currentStageId === stg.id && isStreaming;

            return (
              <div
                key={stg.id}
                className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between min-h-[90px] ${
                  isCurrent
                    ? 'border-[var(--ai)] bg-purple-500/10 ring-2 ring-[var(--ai)]/30'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-[var(--border)] bg-[var(--bg)]/40 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-[var(--muted)]">
                    0{idx + 1}
                  </span>
                  {isCurrent ? (
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--ai)] animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[var(--muted)]" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-[11px] text-[var(--text)] leading-tight">
                    {stg.label}
                  </h4>
                  <p className="text-[10px] text-[var(--muted)] mt-1 line-clamp-2">
                    {stg.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar if streaming */}
        {isStreaming && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--ai)] flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {streamMessage}
              </span>
              <span className="text-[var(--muted)]">{streamProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--ai)] to-[var(--accent)] transition-all duration-300"
                style={{ width: `${streamProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* AMBER SECRETS-DETECTED BANNER (If any secrets found, showing counts & filenames only, NEVER values) */}
      {job.secrets_detected?.detected && (
        <div className="p-5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[var(--text)]">
                  {job.secrets_detected.count} Hardcoded Secret{job.secrets_detected.count > 1 ? 's' : ''} Detected in Static Scan
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                  High Vulnerability
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                The AST token parser identified credential tokens embedded in code files. To safeguard privacy, raw values were immediately scrubbed and are <strong>never stored, logged, or forwarded to LLMs</strong>.
              </p>
            </div>
          </div>

          {/* List of files with detected secrets */}
          <div className="rounded-xl border border-amber-500/20 code-opaque p-3.5 space-y-2">
            <div className="text-[11px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold">
              Exposed Code Locations (Values Redacted):
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              {job.secrets_detected.files.map((f, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-[var(--bg)]/70 border border-[var(--border)]"
                >
                  <div className="flex items-center gap-2 text-[var(--text)]">
                    <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold">{f.file_path}</span>
                    {f.line_number && (
                      <span className="text-[var(--muted)] text-[11px]">
                        :line {f.line_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--muted)]">
                      {f.secret_type}
                    </span>
                    {f.snippet_hint && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 text-[10px] font-mono border border-amber-500/20">
                        {f.snippet_hint}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Remediation recommendation: Move these credentials immediately into environment variables or secrets managers before production deployment.</span>
          </div>
        </div>
      )}

      {/* RISK FLAGS SUMMARY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Flag 1: Shell Execution */}
        <div
          className={`p-4 rounded-2xl border surface-opaque flex flex-col justify-between ${
            job.risk_flags.shell_execution.detected
              ? 'border-red-500/40 bg-red-500/5'
              : 'border-[var(--border)] opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal
                className={`w-4 h-4 ${
                  job.risk_flags.shell_execution.detected ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
                }`}
              />
              <span className="text-xs font-bold text-[var(--text)]">Shell Execution</span>
            </div>
            {job.risk_flags.shell_execution.detected ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-[var(--danger)] border border-red-500/20 font-bold">
                Critical ({job.risk_flags.shell_execution.count})
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[var(--muted)]">None</span>
            )}
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            {job.risk_flags.shell_execution.detected
              ? job.risk_flags.shell_execution.description
              : 'No subprocess spawns, bash executions, or shell commands detected.'}
          </p>
        </div>

        {/* Flag 2: File Deletion */}
        <div
          className={`p-4 rounded-2xl border surface-opaque flex flex-col justify-between ${
            job.risk_flags.file_deletion.detected
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-[var(--border)] opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trash2
                className={`w-4 h-4 ${
                  job.risk_flags.file_deletion.detected ? 'text-amber-500' : 'text-[var(--muted)]'
                }`}
              />
              <span className="text-xs font-bold text-[var(--text)]">File Deletion</span>
            </div>
            {job.risk_flags.file_deletion.detected ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                Detected ({job.risk_flags.file_deletion.count})
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[var(--muted)]">None</span>
            )}
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            {job.risk_flags.file_deletion.detected
              ? job.risk_flags.file_deletion.description
              : 'No filesystem write, unlink, or volume deletion routines discovered.'}
          </p>
        </div>

        {/* Flag 3: Network Calls */}
        <div
          className={`p-4 rounded-2xl border surface-opaque flex flex-col justify-between ${
            job.risk_flags.network_calls.detected
              ? 'border-purple-500/40 bg-purple-500/5'
              : 'border-[var(--border)] opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FolderGit2
                className={`w-4 h-4 ${
                  job.risk_flags.network_calls.detected ? 'text-[var(--ai)]' : 'text-[var(--muted)]'
                }`}
              />
              <span className="text-xs font-bold text-[var(--text)]">Outbound Network</span>
            </div>
            {job.risk_flags.network_calls.detected ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-[var(--ai)] border border-purple-500/20 font-bold">
                Active ({job.risk_flags.network_calls.count})
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[var(--muted)]">None</span>
            )}
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            {job.risk_flags.network_calls.detected
              ? job.risk_flags.network_calls.description
              : 'No external HTTP/HTTPS endpoints or socket network sockets bound.'}
          </p>
        </div>

        {/* Flag 4: Payments */}
        <div
          className={`p-4 rounded-2xl border surface-opaque flex flex-col justify-between ${
            job.risk_flags.payments.detected
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-[var(--border)] opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`w-4 h-4 ${
                  job.risk_flags.payments.detected ? 'text-amber-500' : 'text-[var(--muted)]'
                }`}
              />
              <span className="text-xs font-bold text-[var(--text)]">Payments & Budgets</span>
            </div>
            {job.risk_flags.payments.detected ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                Monetary ({job.risk_flags.payments.count})
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[var(--muted)]">None</span>
            )}
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            {job.risk_flags.payments.detected
              ? job.risk_flags.payments.description
              : 'No billing transfers, refund workflows, or credit operations.'}
          </p>
        </div>
      </div>

      {/* DISCOVERED TOOLS TABLE (Strictly Opaque & High-Contrast) */}
      <div className="rounded-2xl border border-[var(--border)] surface-opaque shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">
                Discovered Agent Tools ({job.tools.length})
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-[var(--accent)] font-semibold border border-emerald-500/20">
                Extracted via AST
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Tools, parameters, and invocation schemas mapped from your repository without code execution.
            </p>
          </div>

          {/* Table Search & Filter Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                placeholder="Filter tools..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl input-opaque text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl input-opaque text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono"
            >
              <option value="all">All Risks</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] table-opaque">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]/80 text-[var(--muted)] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Tool Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Parameters</th>
                <th className="py-3 px-4">Source File</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[var(--muted)]">
                    No tools match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTools.map((tool) => {
                  const isExpanded = expandedToolId === tool.id;

                  return (
                    <React.Fragment key={tool.id}>
                      <tr className="hover:bg-[var(--bg)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[var(--text)]">
                          {tool.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-[11px] px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] font-mono">
                            {tool.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted)]">
                          {tool.parameters.length} param{tool.parameters.length !== 1 ? 's' : ''}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted)] truncate max-w-[180px]">
                          {tool.source_file}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              tool.risk_level === 'critical'
                                ? 'bg-red-500/10 text-[var(--danger)] border border-red-500/20'
                                : tool.risk_level === 'high'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : tool.risk_level === 'medium'
                                ? 'bg-purple-500/10 text-[var(--ai)] border border-purple-500/20'
                                : 'bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20'
                            }`}
                          >
                            {tool.risk_level.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedToolId(isExpanded ? null : tool.id)
                            }
                            className="text-[11px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide' : 'Schema'}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Schema Row */}
                      {isExpanded && (
                        <tr className="bg-[var(--bg)]/40">
                          <td colSpan={6} className="p-4 border-b border-[var(--border)]">
                            <div className="space-y-3 pl-2">
                              <p className="text-xs text-[var(--text)] leading-relaxed">
                                <strong>Description:</strong> {tool.description}
                              </p>

                              <div className="space-y-1.5">
                                <span className="text-[11px] font-mono uppercase text-[var(--muted)] font-bold">
                                  Parameter Schema Specification:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {tool.parameters.map((p, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="p-2 rounded-lg border border-[var(--border)] code-opaque text-xs font-mono flex flex-col justify-between"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[var(--accent)]">
                                          {p.name}
                                        </span>
                                        <span className="text-[10px] text-[var(--muted)]">
                                          {p.type} {p.required && '(required)'}
                                        </span>
                                      </div>
                                      {p.description && (
                                        <p className="text-[11px] text-[var(--muted)] font-sans mt-1">
                                          {p.description}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETION RECEIPT CARD (Audited Proof of Destruction) */}
      <div className="rounded-2xl border border-emerald-500/30 surface-opaque p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[var(--accent)] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text)]">
                  Cryptographic Deletion Receipt
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20 font-bold">
                  {job.deletion_receipt.status_text}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Verifiable record that source files were destroyed immediately following AST extraction.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-[var(--muted)]">
            Policy: {job.deletion_receipt.ttl_policy}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]/50 space-y-1">
            <span className="text-[10px] font-mono text-[var(--muted)] uppercase">Purged Timestamp</span>
            <p className="font-mono text-xs font-semibold text-[var(--text)]">
              {new Date(job.deletion_receipt.purged_at).toLocaleString()}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]/50 space-y-1">
            <span className="text-[10px] font-mono text-[var(--muted)] uppercase">Destroyed Workspace</span>
            <p className="font-mono text-xs font-semibold text-[var(--text)] truncate">
              {job.deletion_receipt.workspace_path}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]/50 space-y-1">
            <span className="text-[10px] font-mono text-[var(--muted)] uppercase">Files & Bytes Destroyed</span>
            <p className="font-mono text-xs font-semibold text-[var(--text)]">
              {job.deletion_receipt.files_destroyed_count} files · {(job.deletion_receipt.bytes_purged / (1024 * 1024)).toFixed(2)} MB purged
            </p>
          </div>
        </div>

        {/* Cryptographic Hash line */}
        <div className="p-3 rounded-xl border border-[var(--border)] code-opaque flex items-center justify-between gap-3 text-xs font-mono">
          <div className="truncate">
            <span className="text-[var(--muted)] select-none mr-2">SHA256 Receipt:</span>
            <span className="text-[var(--accent)] font-bold">{job.deletion_receipt.cryptographic_receipt_hash}</span>
          </div>

          <button
            type="button"
            onClick={() => copyHash(job.deletion_receipt.cryptographic_receipt_hash)}
            className="neu-btn px-2.5 py-1 rounded-lg text-[11px] text-[var(--text)] flex items-center gap-1 shrink-0 cursor-pointer"
            title="Copy cryptographic receipt hash"
          >
            {copiedHash ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--border)] surface-opaque shadow-xs">
        <div>
          <h4 className="text-sm font-bold text-[var(--text)]">
            Ready to synthesize a policy?
          </h4>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Pre-fill the Policy Studio with the {job.tools.length} discovered tools to streamline interview questions.
          </p>
        </div>

        <Link
          href={`/policies/new?repo_id=${job.id}`}
          className="neu-btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto justify-center"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Policies from this Repo</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--danger)]/30 surface-opaque p-6 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[var(--danger)] flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">
                Delete Analysis Findings?
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                This will permanently delete the discovered tool signatures, risk summary, and audit receipt for <strong>{job.name}</strong> from your account. This action cannot be reversed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="neu-btn px-4 py-2 text-xs rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFindings}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--danger)] text-white hover:opacity-90 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
