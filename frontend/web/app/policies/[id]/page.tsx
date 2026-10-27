'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FileCode2,
  Download,
  Video,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Clock,
  ShieldCheck,
  History,
  Layers,
  FileText,
  FileCode,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Policy, PastExport } from '@/lib/types/policy';
import { apiClient } from '@/lib/api/client';
import { compileFullPolicy } from '@/lib/mocks/policy-interview-data';
import { ExportModal } from '@/components/policies/ExportModal';

export default function PolicyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'readable' | 'yaml' | 'versions'>('readable');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadPolicy() {
      try {
        setLoading(true);
        const data = await apiClient.getPolicy(id);
        if (!ignore) {
          if (!data) {
            setError(`Policy with ID "${id}" was not found.`);
          } else {
            setPolicy(data);
          }
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err?.message || 'Failed to load policy');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadPolicy();
    }
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Policy Details">
        <div className="py-24 text-center text-xs text-[var(--muted)] space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Retrieving policy verification clauses...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !policy) {
    return (
      <AppShell title="Policy Details">
        <div className="max-w-md mx-auto py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-[var(--danger)] flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text)]">Policy Not Found</h2>
          <p className="text-xs text-[var(--muted)] mt-1">{error || 'Unknown error'}</p>
          <Link
            href="/policies"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Policies</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  // Ensure content exists
  const compiledContent =
    policy.content ||
    compileFullPolicy(policy.agent_name, policy.description, {
      agent_metadata: policy.description,
      tool_permissions: 'order_status_lookup, issue_refund, send_email',
      hard_banned_tools: 'raw_sql_execution, delete_database, dump_pii',
      per_call_limits: 'Max refund limit: $250.00 USD per single call',
      cumulative_budgets: 'Daily refund ceiling: $2,500.00 USD',
      data_sources: 'Internal PostgreSQL (Trusted), Customer Chat (Untrusted)',
      parameter_binding: 'Require verified order_id in prior turn context',
      sequencing_rules: 'verify_customer_identity -> lookup_order -> issue_refund',
      semantic_verification: 'Detect sentiment score < -0.75 or prompt injection attempts',
      logging_audit: 'Audit every tool call with SHA-256 argument hashes to Datadog/S3',
      escalation: 'Require human supervisor approval if refund > $250 or VIP account',
      summary: 'Verified and ready for Version 1 cryptographic compilation',
    });

  const rawYaml = policy.yaml_spec || compiledContent.rawYaml;
  const activeVersionObj = policy.versions?.[0];

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(rawYaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  return (
    <AppShell
      title={policy.title}
      breadcrumbs={[
        { label: 'Policies', href: '/policies' },
        { label: policy.title },
      ]}
    >
      <div className="space-y-6">
        {/* Toast */}
        {toastNotice && (
          <div className="fixed bottom-6 right-6 z-50 bg-[var(--surface)] border border-emerald-500/40 text-[var(--text)] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>{toastNotice}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="glass-card-strong rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider neu-raised-sm">
                {policy.status === 'active' ? 'Active Guard' : policy.status}
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">{policy.version}</span>
              <span className="text-xs text-[var(--muted)]">·</span>
              <span className="text-xs text-[var(--muted)] font-mono">
                Hash: {activeVersionObj?.integrity_hash?.slice(0, 18) || 'sha256:8f4c...'}...
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
              {policy.title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1.5 max-w-3xl leading-relaxed">
              {policy.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--muted)]">
              <span>Agent: <strong className="text-[var(--text)]">{policy.agent_name}</strong></span>
              <span>·</span>
              <span>Author: <strong className="text-[var(--text)]">{policy.author_name}</strong></span>
              <span>·</span>
              <span>Rules: <strong className="text-[var(--text)]">{policy.rules_count}</strong></span>
              <span>·</span>
              <span>Tools: <strong className="text-[var(--text)]">{policy.tools_count}</strong></span>
            </div>
          </div>

          {/* Quick Actions (Export + Review) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="neu-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text)] flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[var(--accent)]" />
              <span>Export Package</span>
            </button>

            <Link
              href={`/policies/${policy.id}/review`}
              className="neu-btn px-4 py-2.5 rounded-xl bg-[var(--ai)]/15 border-[var(--ai)]/30 text-[var(--ai)] hover:text-white hover:bg-[var(--ai)] text-xs font-semibold flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-[var(--ai)]" />
              <span>Review Policy</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="neu-tab-group p-1 flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('readable')}
              className={`neu-tab px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 ${
                activeTab === 'readable' ? 'neu-tab-active' : 'neu-tab-inactive'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>12 Policy Clauses</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('yaml')}
              className={`neu-tab px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 ${
                activeTab === 'yaml' ? 'neu-tab-active' : 'neu-tab-inactive'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-[var(--ai)]" />
              <span>YAML Specification</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('versions')}
              className={`neu-tab px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 ${
                activeTab === 'versions' ? 'neu-tab-active' : 'neu-tab-inactive'
              }`}
            >
              <History className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Version History ({policy.versions?.length || 1})</span>
            </button>
          </div>

          {activeTab === 'yaml' && (
            <button
              type="button"
              onClick={handleCopyYaml}
              className="neu-btn px-3 py-1.5 text-xs font-mono rounded-lg text-[var(--text)] flex items-center justify-center gap-1.5 self-end sm:self-auto"
            >
              {copiedYaml ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedYaml ? 'Copied' : 'Copy YAML'}</span>
            </button>
          )}
        </div>

        {/* Tab 1: 12 Clauses */}
        {activeTab === 'readable' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(compiledContent.sections).map((sec) => (
              <div
                key={sec.key}
                className="glass-card p-5 rounded-2xl space-y-2.5 transition-all hover:border-[var(--glass-highlight)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[var(--accent)]">
                    {sec.order < 10 ? `0${sec.order}` : sec.order}. {sec.title}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 neu-raised-sm">
                    Enforced
                  </span>
                </div>

                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {sec.summary}
                </p>

                <div className="pt-2.5 border-t border-[var(--glass-border)] space-y-1.5">
                  {sec.readableContent.map((item, idx) => (
                    <div key={idx} className="text-xs text-[var(--text)] flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: YAML Spec - STRICTLY OPAQUE for code readability */}
        {activeTab === 'yaml' && (
          <div className="code-opaque rounded-2xl p-5 font-mono text-xs overflow-x-auto shadow-md">
            <pre className="leading-relaxed whitespace-pre font-mono">
              {rawYaml}
            </pre>
          </div>
        )}

        {/* Tab 3: Version History */}
        {activeTab === 'versions' && (
          <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text)]">
              Cryptographic Version History & Audit Trail
            </h3>
            <p className="text-xs text-[var(--muted)]">
              All policy iterations are immutably signed. Rollbacks generate new forward versions with verified lineage.
            </p>

            <div className="space-y-3 mt-4">
              {(policy.versions || []).map((ver, idx) => (
                <div
                  key={ver.version}
                  className="table-opaque p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[var(--text)]">
                        {ver.version}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20 neu-raised-sm">
                          Current Active
                        </span>
                      )}
                      <span className="text-xs text-[var(--muted)] font-mono">
                        {new Date(ver.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">{ver.change_summary}</p>
                    <div className="text-[10px] font-mono text-[var(--muted)]">
                      Digest: {ver.integrity_hash} · Signed by {ver.author}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(true)}
                      className="neu-btn px-3 py-1.5 text-xs rounded-lg text-[var(--text)]"
                    >
                      Export Artifact
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {policy && (
        <ExportModal
          policy={policy}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExportRecorded={() => {
            setToastNotice('Export recorded in audit center.');
            setTimeout(() => setToastNotice(null), 3500);
          }}
        />
      )}
    </AppShell>
  );
}
