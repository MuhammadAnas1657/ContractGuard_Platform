'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  History,
  Sliders,
  Mail,
  Mic,
  BellRing,
  BrainCircuit,
  Sparkles,
  Server,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  X,
  Clock,
  EyeOff,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api/client';
import {
  SecurityConfigGroup,
  SecurityConfigItem,
  SecurityAuditLogEntry,
} from '@/lib/types/security';
import { SecretInput } from '@/components/security/SecretInput';
import { downloadBlob } from '@/lib/utils/architecture-exporter';

export default function SecurityConfigurationPage() {
  const [groups, setGroups] = useState<SecurityConfigGroup[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Per-key testing status
  const [testingKeys, setTestingKeys] = useState<Record<string, boolean>>({});

  // Non-secret editing state: { [key]: value }
  const [editingNonSecret, setEditingNonSecret] = useState<Record<string, string>>({});
  const [savingNonSecret, setSavingNonSecret] = useState<Record<string, boolean>>({});

  // Initial data loading on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [configData, auditData] = await Promise.all([
          apiClient.listConfig(),
          apiClient.getSecurityAuditLogs(),
        ]);
        if (isMounted) {
          setGroups(configData);
          setAuditLogs(auditData);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load security configuration and audit trail.');
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Manual refresh handler
  const loadData = async (isManualRefresh = true) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setError(null);

      const [configData, auditData] = await Promise.all([
        apiClient.listConfig(),
        apiClient.getSecurityAuditLogs(),
      ]);

      setGroups(configData);
      setAuditLogs(auditData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load security configuration and audit trail.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Show auto-dismissing toast
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Save Secret Handler (Masked write-only)
  const handleSaveSecret = async (key: string, secretValue: string, groupId: string) => {
    try {
      const updatedItem = await apiClient.putConfig(key, {
        value: secretValue,
        group: groupId,
      });

      // Update in-memory state with masked metadata ONLY
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                items: g.items.map((it) => (it.key === key ? updatedItem : it)),
              }
            : g
        )
      );

      // Refresh audit logs
      const updatedLogs = await apiClient.getSecurityAuditLogs();
      setAuditLogs(updatedLogs);

      triggerToast(`Saved write-only credential for ${key}. Plaintext cleared.`);
    } catch (err: any) {
      throw new Error(err?.message || `Failed to save secret for ${key}`);
    }
  };

  // Delete / Rotate Secret Handler
  const handleDeleteKey = async (key: string) => {
    try {
      await apiClient.deleteConfig(key);

      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((it) =>
            it.key === key
              ? {
                  ...it,
                  is_set: false,
                  masked_value: undefined,
                  status: 'unconfigured',
                  last_test_result: undefined,
                  last_updated: new Date().toISOString(),
                }
              : it
          ),
        }))
      );

      const updatedLogs = await apiClient.getSecurityAuditLogs();
      setAuditLogs(updatedLogs);

      triggerToast(`Credential for ${key} has been revoked and cleared.`);
    } catch (err: any) {
      throw new Error(err?.message || `Failed to revoke credential for ${key}`);
    }
  };

  // Test Connection Handler
  const handleTestKey = async (key: string) => {
    try {
      setTestingKeys((prev) => ({ ...prev, [key]: true }));
      const result = await apiClient.testConfig(key);

      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((it) =>
            it.key === key
              ? {
                  ...it,
                  last_test_result: {
                    success: result.success,
                    latency_ms: result.latency_ms,
                    message: result.message,
                    tested_at: new Date().toISOString(),
                  },
                }
              : it
          ),
        }))
      );

      const updatedLogs = await apiClient.getSecurityAuditLogs();
      setAuditLogs(updatedLogs);

      triggerToast(`Latency probe for ${key}: ${result.latency_ms}ms (${result.message})`);
    } catch (err: any) {
      triggerToast(`Probe failed for ${key}: ${err?.message || 'Connection error'}`);
    } finally {
      setTestingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Non-secret update handler (e.g. SMTP host, session budget cap, retention)
  const handleSaveNonSecret = async (item: SecurityConfigItem, groupId: string) => {
    const rawVal = editingNonSecret[item.key] ?? item.masked_value ?? '';
    try {
      setSavingNonSecret((prev) => ({ ...prev, [item.key]: true }));

      const updated = await apiClient.putConfig(item.key, {
        value: rawVal,
        group: groupId,
      });

      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                items: g.items.map((it) => (it.key === item.key ? updated : it)),
              }
            : g
        )
      );

      setEditingNonSecret((prev) => {
        const copy = { ...prev };
        delete copy[item.key];
        return copy;
      });

      const updatedLogs = await apiClient.getSecurityAuditLogs();
      setAuditLogs(updatedLogs);

      triggerToast(`Updated configuration for ${item.key}.`);
    } catch (err: any) {
      alert(err?.message || `Failed to update ${item.key}`);
    } finally {
      setSavingNonSecret((prev) => ({ ...prev, [item.key]: false }));
    }
  };

  // Download .env.example with placeholders only
  const handleDownloadEnvExample = () => {
    const lines: string[] = [
      '# =========================================================================',
      '# CONTRACTGUARD PLATFORM - ENVIRONMENT CONFIGURATION TEMPLATE (.env.example)',
      '# Generated on: ' + new Date().toUTCString(),
      '#',
      '# SECURITY NOTICE: Never commit real credentials, tokens, or private keys',
      '# to version control. In production, write-only credentials must be mounted',
      '# via Cloud KMS envelope encryption (AWS KMS / GCP Cloud KMS / Vault).',
      '# =========================================================================',
      '',
    ];

    for (const group of groups) {
      lines.push(`\n# -------------------------------------------------------------------------`);
      lines.push(`# ${group.title.toUpperCase()}`);
      lines.push(`# ${group.description}`);
      lines.push(`# -------------------------------------------------------------------------`);

      for (const item of group.items) {
        lines.push(`\n# [${item.label}]`);
        lines.push(`# ${item.description}`);
        if (item.type === 'secret') {
          lines.push(`${item.key}=${item.placeholder || `your_${item.key.toLowerCase()}_here`}`);
        } else if (item.type === 'boolean') {
          lines.push(`${item.key}=${item.placeholder || item.masked_value || 'true'}`);
        } else if (item.type === 'number') {
          lines.push(`${item.key}=${item.placeholder || item.masked_value || '0'}`);
        } else {
          lines.push(`${item.key}=${item.placeholder || item.masked_value || 'example_value'}`);
        }
      }
    }

    lines.push('\n# End of ContractGuard environment configuration template\n');

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'contractguard.env.example');
    triggerToast('Downloaded .env.example template with placeholders only.');
  };

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => {
        if (activeGroupFilter === 'all') return true;
        return g.id === activeGroupFilter;
      })
      .map((g) => {
        if (!searchQuery.trim()) return g;
        const q = searchQuery.toLowerCase();
        const matchingItems = g.items.filter(
          (it) =>
            it.key.toLowerCase().includes(q) ||
            it.label.toLowerCase().includes(q) ||
            it.description.toLowerCase().includes(q)
        );
        return { ...g, items: matchingItems };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, activeGroupFilter, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    let total = 0;
    let configured = 0;
    let secretsCount = 0;
    for (const g of groups) {
      for (const it of g.items) {
        total++;
        if (it.is_set) configured++;
        if (it.type === 'secret') secretsCount++;
      }
    }
    return { total, configured, secretsCount };
  }, [groups]);

  // Icon selector helper
  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case 'BrainCircuit':
        return <BrainCircuit className="w-5 h-5 text-[var(--accent)]" />;
      case 'Mail':
        return <Mail className="w-5 h-5 text-[var(--accent)]" />;
      case 'Mic':
        return <Mic className="w-5 h-5 text-[var(--accent)]" />;
      case 'BellRing':
        return <BellRing className="w-5 h-5 text-[var(--accent)]" />;
      case 'Sliders':
        return <Sliders className="w-5 h-5 text-[var(--accent)]" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)] mb-2">
              <Link href="/dashboard" className="hover:text-[var(--text)] transition-colors">
                Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[var(--muted)]">Security</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[var(--accent)] font-semibold">Configuration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>Security & Provider Configuration</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                Envelope Vault
              </span>
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1.5 max-w-3xl">
              Masked, write-only credential storage for LLMs, SMTP relay, voice transcription, webhook alerts, and fail-closed runtime guardrails.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowAuditModal(true)}
              className="px-3.5 py-2 rounded-xl neu-btn text-xs font-semibold text-[var(--text)] hover:text-[var(--accent)] flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <History className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Audit Log ({auditLogs.length})</span>
            </button>

            <button
              onClick={handleDownloadEnvExample}
              className="px-3.5 py-2 rounded-xl neu-btn text-xs font-semibold text-[var(--text)] hover:text-[var(--accent)] flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Download clean environment template with placeholders only"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Download .env.example</span>
            </button>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="p-2 rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh security configuration"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[var(--accent)]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="p-1 text-emerald-400 hover:text-emerald-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadData(true)}
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-rose-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Visible KMS & Zero-Knowledge Security Notice */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-r from-[var(--accent)]/5 via-[var(--surface-opaque)] to-[var(--accent)]/5 glass-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 shrink-0 mt-0.5">
                <Lock className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-[var(--text)] tracking-tight">
                    Server-Side Envelope Encryption (AES-256-GCM / Cloud KMS)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Write-Only Vault Active
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed max-w-4xl">
                  Secret credentials are write-only. Once committed, plaintext is cryptographically purged from browser memory and application state. Administrators and API clients can only inspect masked suffixes (e.g. <span className="font-mono text-[var(--text)]">••a9f2</span>) and audit signatures. Plaintext values cannot be revealed or retrieved after save.
                </p>
              </div>
            </div>

            {/* Metric Capsules */}
            <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border)]">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-mono text-[var(--muted)]">Status</div>
                <div className="text-sm font-bold text-[var(--text)] font-mono">
                  {stats.configured} / {stats.total} Configured
                </div>
              </div>
              <div className="w-px h-8 bg-[var(--border)]" />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-mono text-[var(--muted)]">Secrets</div>
                <div className="text-sm font-bold text-[var(--accent)] font-mono">
                  {stats.secretsCount} Vault Keys
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Groups', icon: Layers },
              { id: 'llm', label: 'LLM Providers', icon: BrainCircuit },
              { id: 'email', label: 'Email (SMTP)', icon: Mail },
              { id: 'speech', label: 'Speech-to-Text', icon: Mic },
              { id: 'webhooks', label: 'Webhooks & Alerts', icon: BellRing },
              { id: 'runtime', label: 'Runtime Guardrails', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeGroupFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveGroupFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'neu-btn text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keys or settings..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] input-opaque placeholder-[var(--muted)] outline-none focus:border-[var(--accent)] transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          /* Loading State Skeleton */
          <div className="space-y-6">
            {[1, 2, 3].map((skeletonIdx) => (
              <div
                key={skeletonIdx}
                className="p-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-opaque)]/50 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-48 bg-[var(--surface-subtle)] rounded-lg" />
                  <div className="h-4 w-20 bg-[var(--surface-subtle)] rounded-md" />
                </div>
                <div className="h-3 w-80 bg-[var(--surface-subtle)] rounded" />
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div className="h-20 bg-[var(--surface-subtle)] rounded-xl" />
                  <div className="h-20 bg-[var(--surface-subtle)] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          /* Empty State */
          <div className="p-12 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-opaque)] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto text-[var(--muted)]">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">No configuration keys match your criteria</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
                No active or available parameters found matching &quot;{searchQuery}&quot; in the selected category.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveGroupFilter('all');
              }}
              className="px-4 py-2 rounded-xl neu-btn text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Clear filters and show all
            </button>
          </div>
        ) : (
          /* Grouped Cards */
          <div className="space-y-6">
            {filteredGroups.map((group) => {
              const configuredInGroup = group.items.filter((it) => it.is_set).length;
              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-opaque)]/60 p-5 sm:p-6 space-y-5 transition-all shadow-sm"
                >
                  {/* Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] shrink-0">
                        {getGroupIcon(group.icon || '')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-[var(--text)] tracking-tight">
                            {group.title}
                          </h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--border)]">
                            {group.id}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">
                          {group.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-xs font-mono text-[var(--muted)]">
                        {configuredInGroup} / {group.items.length} configured
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] transition-all duration-500"
                          style={{
                            width: `${(configuredInGroup / Math.max(group.items.length, 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-3">
                    {group.items.map((item) => {
                      if (item.type === 'secret') {
                        return (
                          <SecretInput
                            key={item.key}
                            configKey={item.key}
                            label={item.label}
                            description={item.description}
                            maskedValue={item.masked_value}
                            isSet={item.is_set}
                            lastUpdated={item.last_updated}
                            onSave={async (newSecret) => handleSaveSecret(item.key, newSecret, group.id)}
                            onDelete={async () => handleDeleteKey(item.key)}
                            onTest={async () => handleTestKey(item.key)}
                            testResult={item.last_test_result}
                            isTesting={testingKeys[item.key]}
                          />
                        );
                      }

                      // Non-secret items (text, number, select, boolean)
                      const isSaving = savingNonSecret[item.key] || false;
                      const draftValue = editingNonSecret[item.key] ?? item.masked_value ?? '';
                      const isDirty = draftValue !== (item.masked_value ?? '');

                      return (
                        <div
                          key={item.key}
                          className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-opaque)]/70 transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-[var(--accent)] shrink-0" />
                                <h4 className="text-xs font-bold text-[var(--text)] tracking-tight">{item.label}</h4>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--border)]">
                                  {item.key}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--muted)] mt-1">{item.description}</p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20">
                                Active
                              </span>
                            </div>
                          </div>

                          {/* Control Input */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                            <div className="flex-1 max-w-md">
                              {item.type === 'select' && item.options ? (
                                <select
                                  value={draftValue}
                                  onChange={(e) =>
                                    setEditingNonSecret((prev) => ({ ...prev, [item.key]: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[var(--border)] input-opaque outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                                >
                                  {item.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : item.type === 'boolean' ? (
                                <div className="flex items-center gap-3">
                                  <label
                                    className="relative inline-flex items-center cursor-pointer"
                                    role="switch"
                                    aria-checked={draftValue === 'true'}
                                    aria-label={`${item.label} (${draftValue === 'true' ? 'Enabled' : 'Disabled'})`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={draftValue === 'true'}
                                      onChange={(e) =>
                                        setEditingNonSecret((prev) => ({
                                          ...prev,
                                          [item.key]: e.target.checked ? 'true' : 'false',
                                        }))
                                      }
                                      className="sr-only peer"
                                      aria-label={item.label}
                                    />
                                    <div className="w-11 h-6 bg-[var(--surface-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                                  </label>
                                  <span className="text-xs font-mono text-[var(--text)]">
                                    {draftValue === 'true' ? 'Enabled (Enforcing)' : 'Disabled (Bypass)'}
                                  </span>
                                </div>
                              ) : (
                                <input
                                  type={item.type === 'number' ? 'number' : 'text'}
                                  value={draftValue}
                                  onChange={(e) =>
                                    setEditingNonSecret((prev) => ({ ...prev, [item.key]: e.target.value }))
                                  }
                                  placeholder={item.placeholder || `Enter value for ${item.key}...`}
                                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[var(--border)] input-opaque placeholder-[var(--muted)] outline-none focus:border-[var(--accent)] transition-all"
                                />
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isDirty && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNonSecret((prev) => {
                                      const copy = { ...prev };
                                      delete copy[item.key];
                                      return copy;
                                    });
                                  }}
                                  className="px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                                >
                                  Reset
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={!isDirty || isSaving}
                                onClick={() => handleSaveNonSecret(item, group.id)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Audit Log Modal / Slideover */}
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-opaque)] shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text)] tracking-tight">
                      Security & Credential Audit Trail
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      Immutable record of key rotations, saves, deletions, and latency tests.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body: Audit Table */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 font-mono text-xs">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-[var(--muted)]">No audit entries recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[10px] text-[var(--muted)] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Target Key</th>
                          <th className="py-2.5 px-3">Actor</th>
                          <th className="py-2.5 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] text-[11px]">
                        {auditLogs.map((log) => {
                          const actionColors: Record<string, string> = {
                            create: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                            update: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                            rotate: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                            delete: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                            test: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          };
                          const color = actionColors[log.action] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';

                          return (
                            <tr key={log.id} className="hover:bg-[var(--surface-subtle)]/40 transition-colors">
                              <td className="py-2.5 px-3 whitespace-nowrap text-[var(--muted)]">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] border uppercase font-bold ${color}`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap font-bold text-[var(--text)]">
                                {log.target}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-[var(--muted)]">
                                {log.actor}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--text)] font-sans text-xs">
                                {log.detail}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-subtle)]/50 flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted)]">
                  Log signatures are verified against HMAC sha256 ledger integrity.
                </span>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-1.5 rounded-lg neu-btn text-xs font-semibold text-[var(--text)] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
