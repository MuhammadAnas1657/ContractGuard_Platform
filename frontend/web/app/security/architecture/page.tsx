'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Download,
  FileCode,
  FileText,
  FileArchive,
  RefreshCw,
  Sparkles,
  Server,
  Network,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Hash,
  Info,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api/client';
import { Policy } from '@/lib/types/policy';
import { ArchitecturePack, DeploymentStyle } from '@/lib/types/security';
import { ArchitectureDiagram } from '@/components/security/ArchitectureDiagram';
import {
  generateArchitecturePdf,
  generateArchitectureMarkdown,
  generateArchitectureBundleZip,
  downloadBlob,
} from '@/lib/utils/architecture-exporter';
import { createWordDocument } from '@/lib/utils/docx-builder';

export default function SecurityArchitecturePage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [deploymentStyle, setDeploymentStyle] = useState<DeploymentStyle>('in_process');
  const [environmentNotes, setEnvironmentNotes] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState<string>('');
  const [currentPack, setCurrentPack] = useState<ArchitecturePack | null>(null);
  const [pastPacks, setPastPacks] = useState<ArchitecturePack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);
  const [copiedSnippetIdx, setCopiedSnippetIdx] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [fetchedPolicies, fetchedPacks] = await Promise.all([
          apiClient.getPolicies(),
          apiClient.listArchitecturePacks(),
        ]);

        if (isMounted) {
          setPolicies(fetchedPolicies);
          setPastPacks(fetchedPacks);

          if (fetchedPolicies.length > 0) {
            setSelectedPolicyId(fetchedPolicies[0].id);
            setSelectedVersion(fetchedPolicies[0].version || '1.0.0');
          }

          if (fetchedPacks.length > 0) {
            setCurrentPack(fetchedPacks[0]);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to load policy data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePolicyChange = (id: string) => {
    setSelectedPolicyId(id);
    const pol = policies.find((p) => p.id === id);
    if (pol) {
      setSelectedVersion(pol.version || '1.0.0');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) return;

    try {
      setGenerating(true);
      setError(null);

      setGenStep('Parsing policy invariants & threat model...');
      await new Promise((r) => setTimeout(r, 250));

      setGenStep(`Compiling ${deploymentStyle.replace('_', ' ')} topology specifications...`);
      await new Promise((r) => setTimeout(r, 300));

      setGenStep('Generating 3-stage reference monitor architecture diagram...');
      await new Promise((r) => setTimeout(r, 250));

      setGenStep('Finalizing 10-section deployment pack...');
      const pack = await apiClient.createArchitecture({
        policy_id: selectedPolicyId,
        version: selectedVersion,
        deployment_style: deploymentStyle,
        environment_notes: environmentNotes.trim() || undefined,
      });

      setCurrentPack(pack);
      const updatedPacks = await apiClient.listArchitecturePacks();
      setPastPacks(updatedPacks);
      setDownloadSuccessNotice('Architecture Pack generated and recorded in Downloads Center!');
      setTimeout(() => setDownloadSuccessNotice(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate architecture pack');
    } finally {
      setGenerating(false);
      setGenStep('');
    }
  };

  const handleDownload = async (format: 'pdf' | 'md' | 'docx' | 'zip') => {
    if (!currentPack) return;
    try {
      const selectedPolicy = policies.find((p) => p.id === currentPack.policy_id);
      const safeAgent = currentPack.document.policy_title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `${safeAgent}_v${currentPack.version}_architecture.${format}`;

      if (format === 'pdf') {
        const pdf = generateArchitecturePdf(currentPack.document);
        pdf.save(filename);
      } else if (format === 'md') {
        const mdText = generateArchitectureMarkdown(currentPack.document);
        const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
        downloadBlob(blob, filename);
      } else if (format === 'docx') {
        const docBlob = createWordDocument(currentPack.document);
        downloadBlob(docBlob, filename);
      } else if (format === 'zip') {
        const sec10 = currentPack.document.sections.find((s) => s.number === 10);
        const fallbackYaml = sec10?.codeSnippets?.[0]?.code || '';
        const yaml = selectedPolicy?.yaml_spec || selectedPolicy?.content?.rawYaml || fallbackYaml;
        const zipBlob = generateArchitectureBundleZip(currentPack, yaml);
        downloadBlob(zipBlob, `${safeAgent}_v${currentPack.version}_security_bundle.zip`);
      }

      setDownloadSuccessNotice(`Downloaded ${filename} successfully!`);
      setTimeout(() => setDownloadSuccessNotice(null), 3500);
    } catch (err: any) {
      setError(err?.message || `Failed to download ${format.toUpperCase()}`);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetIdx(id);
    setTimeout(() => setCopiedSnippetIdx(null), 2000);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Security &middot; Flow E</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)] mt-1">
              Security Architecture Pack Generator
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 max-w-2xl">
              Synthesize production-grade, 10-section defense-in-depth architecture specifications, interactive diagrams, and executable deployment bundles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/security/configuration"
              className="px-3 py-1.5 text-xs rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--text)] transition-all flex items-center gap-1.5"
            >
              <span>Provider Configuration</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Global Notices */}
        {downloadSuccessNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-[var(--accent)] flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{downloadSuccessNotice}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs underline hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Generator Form */}
        <div className="rounded-2xl glass-panel p-5 sm:p-6 shadow-md border border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-sm font-bold text-[var(--text)]">Configure Architecture Pack</h2>
            </div>
            <span className="text-[11px] text-[var(--muted)] font-mono">10-Section Specification</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--muted)] space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--accent)]" />
              <p>Loading agent policies and available versions...</p>
            </div>
          ) : policies.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)] space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 opacity-80" />
              <p>No active agent policies available. Generate a policy in Policy Studio first.</p>
              <Link
                href="/policies/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90"
              >
                <span>Launch Policy Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Select Policy */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Select Agent Policy
                  </label>
                  <select
                    value={selectedPolicyId}
                    onChange={(e) => handlePolicyChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] input-opaque outline-none focus:border-[var(--accent)]"
                  >
                    {policies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.agent_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Version */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Policy Version
                  </label>
                  <select
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] input-opaque outline-none focus:border-[var(--accent)]"
                  >
                    {selectedPolicy?.versions && selectedPolicy.versions.length > 0 ? (
                      selectedPolicy.versions.map((v) => (
                        <option key={v.version} value={v.version}>
                          Version {v.version} ({v.change_summary.slice(0, 30)})
                        </option>
                      ))
                    ) : (
                      <option value={selectedPolicy?.version || '1.0.0'}>
                        Version {selectedPolicy?.version || '1.0.0'} (Active)
                      </option>
                    )}
                  </select>
                </div>

                {/* Deployment Style */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Deployment Style
                  </label>
                  <select
                    value={deploymentStyle}
                    onChange={(e) => setDeploymentStyle(e.target.value as DeploymentStyle)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] input-opaque outline-none focus:border-[var(--accent)] font-medium"
                  >
                    <option value="in_process">Style A: In-Process Middleware</option>
                    <option value="sidecar">Style B: Sidecar / Local Proxy</option>
                    <option value="gateway">Style C: Enterprise API Gateway</option>
                  </select>
                </div>
              </div>

              {/* Topology Quick Description */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--glass-border)] text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[var(--text)]">
                  {deploymentStyle === 'in_process' && <Cpu className="w-4 h-4 text-[#06B6D4]" />}
                  {deploymentStyle === 'sidecar' && <Server className="w-4 h-4 text-[#10B981]" />}
                  {deploymentStyle === 'gateway' && <Network className="w-4 h-4 text-[#8B5CF6]" />}
                  <span className="font-semibold">
                    {deploymentStyle === 'in_process' && 'Style A: Embedded in application runtime loop via Python/TS SDK (<0.5ms overhead)'}
                    {deploymentStyle === 'sidecar' && 'Style B: Container sidecar proxy intercepting localhost gRPC/HTTP socket'}
                    {deploymentStyle === 'gateway' && 'Style C: Edge reverse proxy / API Gateway separating client from agent cluster'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">Zero-Trust Guard</span>
              </div>

              {/* Environment Notes */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Environment Context &amp; Infrastructure Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS EKS Kubernetes cluster, Redis cumulative ledger at redis-internal:6379, strict SOC2 compliance..."
                  value={environmentNotes}
                  onChange={(e) => setEnvironmentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] input-opaque placeholder-[var(--muted)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Submit Button with animated progress state */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
                <div className="text-[11px] text-[var(--muted)] font-mono">
                  {generating ? (
                    <span className="flex items-center gap-2 text-[var(--accent)]">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {genStep || 'Synthesizing Architecture Pack...'}
                    </span>
                  ) : (
                    <span>Outputs interactive PDF, Markdown, DOCX, and complete ZIP bundle.</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={generating || !selectedPolicyId}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{generating ? 'Generating Pack...' : 'Generate Architecture Pack'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 2. Document Preview & Download Actions */}
        {currentPack && (
          <div className="space-y-6">
            {/* Action Bar with 4 Export Formats */}
            <div className="p-4 rounded-2xl glass-panel border border-[var(--glass-border)] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                    Active Preview
                  </span>
                  <h3 className="text-sm font-bold text-[var(--text)]">
                    {currentPack.document.title}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)] font-mono mt-1">
                  <span>Topology: {currentPack.deployment_label}</span>
                  <span>·</span>
                  <span>Version {currentPack.version}</span>
                  <span>·</span>
                  <span>SHA-256: {currentPack.integrity_hash.slice(0, 16)}...</span>
                </div>
              </div>

              {/* 4 Download Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload('pdf')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl neu-btn text-[var(--text)] hover:text-[var(--accent)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Download Interactive PDF with Bookmarks"
                >
                  <FileText className="w-3.5 h-3.5 text-red-400" />
                  <span>PDF Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('md')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl neu-btn text-[var(--text)] hover:text-[var(--accent)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Download GitHub Markdown"
                >
                  <FileCode className="w-3.5 h-3.5 text-sky-400" />
                  <span>Markdown</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('docx')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl neu-btn text-[var(--text)] hover:text-[var(--accent)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Download Microsoft Word Document"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>DOCX (Word)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('zip')}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Download Complete Deployment Bundle"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>Download Bundle (.zip)</span>
                </button>
              </div>
            </div>

            {/* PREVIEW: 10-Section Document */}
            <div className="rounded-2xl glass-panel p-6 sm:p-8 space-y-8 shadow-lg border border-[var(--glass-border)]">
              {/* Document Header */}
              <div className="border-b border-[var(--border)] pb-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] font-mono">
                  <ShieldCheck className="w-4 h-4" />
                  <span>DEFENSE-IN-DEPTH SPECIFICATION · CONTRACTGUARD VERIFIED</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
                  {currentPack.document.title}
                </h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  {currentPack.document.subtitle}
                </p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-xs font-mono text-[var(--text)]">
                    Target: <strong className="text-[var(--accent)]">{currentPack.document.policy_title}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-xs font-mono text-[var(--text)]">
                    Topology: <strong>{currentPack.deployment_label}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-xs font-mono text-[var(--text)]">
                    Hash: <strong className="text-emerald-500">{currentPack.integrity_hash.slice(0, 18)}...</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-xs font-mono text-[var(--muted)]">
                    Date: {currentPack.document.date}
                  </span>
                </div>
              </div>

              {/* 10 Sections Outline */}
              <div className="space-y-6">
                {currentPack.document.sections.map((sec) => {
                  const isCollapsed = collapsedSections[sec.id];

                  return (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]/40 overflow-hidden shadow-sm transition-all"
                    >
                      {/* Section Title Bar */}
                      <div
                        onClick={() => toggleSection(sec.id)}
                        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-subtle)] transition-colors border-b border-[var(--glass-border)]"
                      >
                        <div className="space-y-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                              {sec.number}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-[var(--text)] tracking-tight">
                              {sec.title}
                            </h3>
                          </div>
                          <p className="text-xs text-[var(--muted)] pl-7">
                            {sec.summary}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)]"
                          aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Section Body */}
                      {!isCollapsed && (
                        <div className="p-5 sm:p-6 space-y-5">
                          {/* Paragraphs */}
                          <div className="space-y-3">
                            {sec.content.map((p, idx) => (
                              <p key={idx} className="text-xs sm:text-sm text-[var(--text)]/90 leading-relaxed">
                                {p}
                              </p>
                            ))}
                          </div>

                          {/* Architecture Diagram (Section 2) */}
                          {sec.diagramType && (
                            <div className="pt-2">
                              <h4 className="text-xs font-bold text-[var(--text)] mb-2 flex items-center gap-1.5 font-mono">
                                <Network className="w-4 h-4 text-[var(--accent)]" />
                                <span>3-Stage Interception Architecture Topology</span>
                              </h4>
                              <ArchitectureDiagram
                                deploymentStyle={sec.diagramType}
                                policyTitle={currentPack.document.policy_title}
                              />
                            </div>
                          )}

                          {/* Code Snippets (High-contrast opaque blocks) */}
                          {sec.codeSnippets && sec.codeSnippets.length > 0 && (
                            <div className="space-y-4 pt-2">
                              {sec.codeSnippets.map((snippet, sIdx) => {
                                const snippetId = `${sec.id}_${sIdx}`;
                                const isCopied = copiedSnippetIdx === snippetId;

                                return (
                                  <div
                                    key={sIdx}
                                    className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-lg surface-opaque"
                                  >
                                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="font-mono text-xs font-semibold text-slate-200">
                                          {snippet.filename}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                                          ({snippet.language})
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(snippet.code, snippetId)}
                                        className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                                      >
                                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                      </button>
                                    </div>

                                    {snippet.description && (
                                      <div className="px-4 py-1.5 text-[11px] text-slate-400 bg-slate-900/40 border-b border-slate-800/60 font-mono">
                                        {`// ${snippet.description}`}
                                      </div>
                                    )}

                                    <div className="p-4 overflow-x-auto max-h-[360px] scrollbar-thin">
                                      <pre className="text-xs font-mono text-slate-200 leading-relaxed">
                                        <code>{snippet.code}</code>
                                      </pre>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Checklists (High-contrast table) */}
                          {sec.checklistItems && sec.checklistItems.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <h4 className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5 font-mono">
                                <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                                <span>Verification Checklist</span>
                              </h4>
                              <div className="rounded-xl border border-[var(--border)] overflow-hidden surface-opaque">
                                <table className="w-full text-left text-xs table-opaque">
                                  <thead>
                                    <tr className="bg-[var(--bg)]/80 text-[var(--muted)] font-medium border-b border-[var(--border)]">
                                      <th className="py-2.5 px-3 w-10 text-center">Status</th>
                                      <th className="py-2.5 px-3">Control Specification</th>
                                      <th className="py-2.5 px-3 text-right">Standard</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--border)]">
                                    {sec.checklistItems.map((item) => (
                                      <tr key={item.id} className="hover:bg-[var(--bg)]/40 transition-colors">
                                        <td className="py-2.5 px-3 text-center">
                                          {item.checked ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                          ) : (
                                            <div className="w-4 h-4 rounded-full border border-[var(--muted)] mx-auto" />
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 font-medium text-[var(--text)]">
                                          {item.label}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-[var(--muted)]">
                                          {item.note || 'Mandatory'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. Past Generated Packs List (Below Form & Linked to Downloads Center) */}
        <div className="rounded-2xl glass-panel p-5 sm:p-6 shadow-md border border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--glass-border)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--text)]">
                Generated Architecture Packs Archive
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Historical deployments recorded in the dashboard Downloads Center.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-[var(--accent)] font-medium hover:underline flex items-center gap-1"
            >
              <span>View Downloads Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pastPacks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              No previous architecture packs generated yet. Configure and generate your first specification above.
            </div>
          ) : (
            <div className="divide-y divide-[var(--glass-border)]">
              {pastPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 uppercase">
                        {pack.deployment_style}
                      </span>
                      <h4 className="text-xs font-bold text-[var(--text)] truncate">
                        {pack.policy_title}
                      </h4>
                      <span className="font-mono text-xs text-[var(--muted)]">v{pack.version}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] font-mono">
                      <span>Hash: {pack.integrity_hash.slice(0, 16)}...</span>
                      <span>·</span>
                      <span>{new Date(pack.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentPack(pack)}
                      className="px-2.5 py-1 text-xs rounded-lg neu-btn text-[var(--text)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    >
                      View Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPack(pack);
                        handleDownload('zip');
                      }}
                      className="p-1.5 rounded-lg neu-btn text-[var(--accent)] transition-all cursor-pointer"
                      title="Download ZIP Bundle"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
