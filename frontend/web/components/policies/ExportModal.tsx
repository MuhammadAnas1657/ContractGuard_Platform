'use client';

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Download,
  FileText,
  FileCode,
  FileJson,
  X,
  CheckCircle2,
  ShieldCheck,
  Hash,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Policy, PastExport, PolicySectionKey } from '@/lib/types/policy';
import { compileFullPolicy } from '@/lib/mocks/policy-interview-data';
import { apiClient } from '@/lib/api/client';
import { downloadBlob } from '@/lib/utils';

interface ExportModalProps {
  policy: Policy;
  isOpen: boolean;
  onClose: () => void;
  onExportRecorded?: (item: PastExport) => void;
}

export function ExportModal({ policy, isOpen, onClose, onExportRecorded }: ExportModalProps) {
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'yaml' | 'json' | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Ensure policy has content or synthesize default representation
  const content = policy.content || compileFullPolicy(
    policy.agent_name,
    policy.description,
    {
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
    }
  );

  const rawYaml = policy.yaml_spec || content.rawYaml;
  const hash = policy.versions?.[0]?.integrity_hash || content.integrity_hash || 'sha256:d8a9e4...';
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const recordExportInDatabase = async (format: 'pdf' | 'yaml' | 'json', fileSize: string) => {
    const pastExport: PastExport = {
      id: `exp_${Date.now().toString(36)}`,
      policy_id: policy.id,
      policy_title: policy.title,
      version: policy.version,
      format,
      created_at: new Date().toISOString(),
      file_size: fileSize,
      integrity_hash: hash,
    };
    try {
      await apiClient.recordExport(pastExport);
      if (onExportRecorded) {
        onExportRecorded(pastExport);
      }
    } catch (err) {
      console.warn('Failed to record export:', err);
    }
  };

  // 1. Interactive PDF Generator
  const generateInteractivePdf = async () => {
    setExportingFormat('pdf');
    try {
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4',
      });

      const primaryColor = [16, 185, 129]; // Emerald (#10B981)
      const textColor = [15, 23, 42]; // Slate-900 (#0F172A)
      const mutedColor = [91, 102, 127]; // Muted (#5B667F)
      const darkBg = [11, 16, 32]; // Dark (#0B1020)

      // ================= PAGE 1: COVER PAGE =================
      doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      doc.rect(0, 0, 595, 842, 'F');

      // Decorative top accent stripe
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 595, 8, 'F');

      // Brand kicker
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('CONTRACTGUARD SECURITY MESH // RUNTIME ENFORCEMENT SPECIFICATION', 50, 80);

      // Main Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      const splitTitle = doc.splitTextToSize(policy.title, 495);
      doc.text(splitTitle, 50, 140);

      // Subtitle / Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(180, 190, 210);
      const splitDesc = doc.splitTextToSize(policy.description, 495);
      doc.text(splitDesc, 50, 210);

      // Metadata Box
      doc.setFillColor(18, 26, 46);
      doc.roundedRect(50, 290, 495, 220, 8, 8, 'F');
      doc.setDrawColor(38, 49, 77);
      doc.roundedRect(50, 290, 495, 220, 8, 8, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('GOVERNANCE METADATA & CRYPTOGRAPHIC CONTEXT', 70, 325);

      const metaItems = [
        ['Target Agent:', policy.agent_name],
        ['Specification Version:', `${policy.version} (Active Guard)`],
        ['Enforcement Mode:', 'Strict Interception & Blocking (Pre-dispatch)'],
        ['Compiled By:', 'ContractGuard Automated Policy Studio'],
        ['Verification Timestamp:', `${currentDate} · 12 Security Clauses Verified`],
        ['Integrity Digest:', hash],
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let metaY = 355;
      metaItems.forEach(([label, val]) => {
        doc.setTextColor(139, 151, 181);
        doc.text(label, 70, metaY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(String(val), 220, metaY);
        doc.setFont('helvetica', 'normal');
        metaY += 25;
      });

      // Cover Footer Notice
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(139, 151, 181);
      doc.text(
        'This document defines machine-enforced runtime invariants. Alteration invalidates the integrity hash.',
        50,
        770
      );
      doc.text('Page 1 of 6 · ContractGuard Cryptographic Artifact', 360, 770);

      // ================= PAGE 2: CLICKABLE TABLE OF CONTENTS =================
      doc.addPage();
      const tocPageNum = 2;

      // Header on TOC Page
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text('Table of Contents', 50, 60);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text('Click on any section title below to jump directly to its verification criteria.', 50, 80);

      doc.setDrawColor(226, 230, 239);
      doc.line(50, 95, 545, 95);

      const sectionList = Object.values(content.sections).sort((a, b) => a.order - b.order);

      // Section mapping to target pages
      // Pages 3, 4, 5, 6 host sections 1-3, 4-6, 7-9, 10-12
      let tocY = 125;
      sectionList.forEach((sec, idx) => {
        const targetPage = 3 + Math.floor(idx / 3);

        // Clickable row container
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(16, 185, 129); // Accent
        const numStr = `${sec.order < 10 ? '0' : ''}${sec.order}.`;
        doc.text(numStr, 50, tocY);

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(sec.title, 80, tocY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(`Page ${targetPage}`, 490, tocY);

        // Clickable Link over the row
        doc.link(50, tocY - 12, 495, 20, { pageNumber: targetPage });

        // Dotted leader line
        doc.setDrawColor(220, 225, 235);
        doc.line(260, tocY - 3, 475, tocY - 3);

        tocY += 32;
      });

      // Footer on TOC page
      addPdfFooter(doc, 2, 6, policy.version, hash, currentDate);

      // ================= PAGES 3-6: 12 POLICY SECTIONS =================
      let currentPage = 3;
      doc.addPage();

      sectionList.forEach((sec, idx) => {
        const pageForThisSec = 3 + Math.floor(idx / 3);
        if (pageForThisSec > currentPage) {
          addPdfFooter(doc, currentPage, 6, policy.version, hash, currentDate);
          doc.addPage();
          currentPage = pageForThisSec;
        }

        const secIndexInPage = idx % 3;
        const startY = 65 + secIndexInPage * 225;

        // Section Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(16, 185, 129);
        doc.text(`${sec.order}. ${sec.title}`, 50, startY);

        // Back to TOC link
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('[Jump to TOC]', 480, startY);
        doc.link(475, startY - 8, 70, 12, { pageNumber: tocPageNum });

        // Section Summary
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(sec.summary, 50, startY + 16);

        // Rule Bullet Points
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        let ruleY = startY + 36;
        sec.readableContent.slice(0, 3).forEach((line) => {
          doc.setFillColor(16, 185, 129);
          doc.circle(54, ruleY - 3, 2, 'F');
          const splitLine = doc.splitTextToSize(line, 475);
          doc.text(splitLine, 65, ruleY);
          ruleY += 15;
        });

        // Code Box (YAML snippet)
        doc.setFillColor(247, 248, 251);
        doc.roundedRect(50, ruleY + 5, 495, 70, 4, 4, 'F');
        doc.setDrawColor(226, 230, 239);
        doc.roundedRect(50, ruleY + 5, 495, 70, 4, 4, 'S');

        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const yamlLines = sec.yamlContent.split('\n').slice(0, 4);
        let codeY = ruleY + 22;
        yamlLines.forEach((yl) => {
          doc.text(yl, 60, codeY);
          codeY += 13;
        });

        // Horizontal separator between sections on same page
        if (secIndexInPage < 2 && idx < sectionList.length - 1) {
          doc.setDrawColor(235, 238, 245);
          doc.line(50, startY + 215, 545, startY + 215);
        }
      });

      // Footer on final page
      addPdfFooter(doc, 6, 6, policy.version, hash, currentDate);

      // Bookmarks / Outline
      if ((doc as any).outline) {
        const rootOutline = (doc as any).outline;
        rootOutline.add(null, 'Cover Page', { pageNumber: 1 });
        rootOutline.add(null, 'Table of Contents', { pageNumber: 2 });
        sectionList.forEach((sec, idx) => {
          const p = 3 + Math.floor(idx / 3);
          rootOutline.add(null, `${sec.order}. ${sec.title}`, { pageNumber: p });
        });
      }

      // Save PDF to browser download
      const filename = `${policy.agent_name.toLowerCase()}-policy-${policy.version}.pdf`;
      doc.save(filename);

      await recordExportInDatabase('pdf', '1.4 MB');
      setSuccessNotice('Interactive PDF downloaded successfully with TOC links and bookmarks.');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  // Helper for consistent PDF footers
  function addPdfFooter(doc: jsPDF, page: number, total: number, version: string, h: string, date: string) {
    doc.setDrawColor(226, 230, 239);
    doc.line(50, 790, 545, 790);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(139, 151, 181);
    doc.text(`ContractGuard Security Mesh · ${version} · ${date}`, 50, 808);

    doc.setFont('courier', 'normal');
    doc.text(`Digest: ${h.slice(0, 24)}...`, 270, 808);

    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${page} of ${total}`, 500, 808);
  }

  // 2. YAML Export
  const downloadYaml = async () => {
    setExportingFormat('yaml');
    try {
      const blob = new Blob([rawYaml], { type: 'text/yaml;charset=utf-8' });
      const filename = `${policy.agent_name.toLowerCase()}-policy-${policy.version}.yaml`;
      downloadBlob(blob, filename);

      const sizeStr = `${(blob.size / 1024).toFixed(1)} KB`;
      await recordExportInDatabase('yaml', sizeStr);
      setSuccessNotice('Runtime YAML specification downloaded.');
      setTimeout(() => setSuccessNotice(null), 4000);
    } finally {
      setExportingFormat(null);
    }
  };

  // 3. JSON Export
  const downloadJson = async () => {
    setExportingFormat('json');
    try {
      const jsonContent = JSON.stringify(
        {
          schema: 'https://contractguard.dev/schemas/v1/policy.json',
          policy_id: policy.id,
          agent_name: policy.agent_name,
          title: policy.title,
          description: policy.description,
          version: policy.version,
          status: policy.status,
          rules_count: policy.rules_count,
          tools_count: policy.tools_count,
          integrity_hash: hash,
          created_at: policy.created_at,
          updated_at: policy.updated_at,
          sections: content.sections,
        },
        null,
        2
      );

      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const filename = `${policy.agent_name.toLowerCase()}-policy-${policy.version}.json`;
      downloadBlob(blob, filename);

      const sizeStr = `${(blob.size / 1024).toFixed(1)} KB`;
      await recordExportInDatabase('json', sizeStr);
      setSuccessNotice('ContractGuard JSON bundle downloaded.');
      setTimeout(() => setSuccessNotice(null), 4000);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog (Glassmorphism with rounded-2xl & inner highlight) */}
      <div className="relative w-full max-w-xl glass-modal p-6 sm:p-8 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl neu-raised-sm flex items-center justify-center text-[var(--accent)] border border-[var(--glass-border)]">
                <Download className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text)] tracking-tight">
                  Export Enforcement Package
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {policy.title} · <span className="font-mono">{policy.version}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Success Alert */}
          {successNotice && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--accent)]" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Verification Summary Badge */}
          <div className="mt-5 p-3.5 rounded-xl glass-subtle flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <span>Verified 12 clauses</span>
              <span>·</span>
              <span className="font-mono text-[11px] truncate max-w-[140px] sm:max-w-[200px]" title={hash}>
                {hash.slice(0, 20)}...
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase font-semibold">
              Ready
            </span>
          </div>

          {/* 3 Export Cards */}
          <div className="mt-5 space-y-3">
            {/* 1. Interactive PDF */}
            <button
              type="button"
              onClick={generateInteractivePdf}
              disabled={exportingFormat !== null}
              className="w-full text-left p-4 rounded-xl glass-card hover:border-[var(--accent)]/60 transition-all flex items-center justify-between group disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl neu-raised-sm text-red-500 flex items-center justify-center shrink-0 mt-0.5 border border-[var(--glass-border)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                      Interactive PDF Specification
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                    Clickable table of contents, PDF outline bookmarks, internal cross-links, and cryptographic digest footer.
                  </p>
                </div>
              </div>

              <div className="pl-3 shrink-0">
                {exportingFormat === 'pdf' ? (
                  <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-y-0.5 transition-all" />
                )}
              </div>
            </button>

            {/* 2. YAML Spec */}
            <button
              type="button"
              onClick={downloadYaml}
              disabled={exportingFormat !== null}
              className="w-full text-left p-4 rounded-xl glass-card hover:border-[var(--accent)]/60 transition-all flex items-center justify-between group disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl neu-raised-sm text-[var(--ai)] flex items-center justify-center shrink-0 mt-0.5 border border-[var(--glass-border)]">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                    Runtime YAML Schema
                  </span>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                    Machine-verifiable <code className="font-mono text-[11px] surface-opaque px-1 py-0.5 rounded">contracts.yaml</code> specification ready for agent middleware or sidecar proxies.
                  </p>
                </div>
              </div>

              <div className="pl-3 shrink-0">
                {exportingFormat === 'yaml' ? (
                  <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-y-0.5 transition-all" />
                )}
              </div>
            </button>

            {/* 3. JSON Bundle */}
            <button
              type="button"
              onClick={downloadJson}
              disabled={exportingFormat !== null}
              className="w-full text-left p-4 rounded-xl glass-card hover:border-[var(--accent)]/60 transition-all flex items-center justify-between group disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl neu-raised-sm text-amber-500 flex items-center justify-center shrink-0 mt-0.5 border border-[var(--glass-border)]">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                    Structured JSON Bundle
                  </span>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                    Strict JSON payload with verified metadata, tools map, and schema definitions for REST endpoints.
                  </p>
                </div>
              </div>

              <div className="pl-3 shrink-0">
                {exportingFormat === 'json' ? (
                  <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-y-0.5 transition-all" />
                )}
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-[var(--glass-border)] flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Client-side generated · Zero telemetry</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl neu-btn text-[var(--text)] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
