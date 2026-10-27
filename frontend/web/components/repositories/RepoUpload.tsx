'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UploadCloud,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShieldAlert,
  ArrowRight,
  HardDrive,
  Info,
  X,
  FileCheck,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export function RepoUpload() {
  const router = useRouter();

  // Mode: "zip" (active) or "path" (disabled on hosted)
  const [mode, setMode] = useState<'zip' | 'path'>('zip');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate ZIP file
  const handleFileValidation = (file: File) => {
    setFileError(null);
    setSubmitError(null);

    const isZip =
      file.name.toLowerCase().endsWith('.zip') ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed';

    if (!isZip) {
      setFileError('Invalid file format. Please upload a standard compressed .zip archive of your repository.');
      setSelectedFile(null);
      return false;
    }

    const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
    if (file.size > MAX_SIZE_BYTES) {
      setFileError(
        `Archive exceeds the maximum size limit of 100 MB (current size: ${(file.size / (1024 * 1024)).toFixed(1)} MB). Please exclude .git/ or node_modules/ folders.`
      );
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    if (!repoName) {
      const suggestedName = file.name.replace(/\.zip$/i, '');
      setRepoName(suggestedName);
    }
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileValidation(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFileError('Please select a .zip archive to upload.');
      return;
    }
    if (!consentChecked) {
      setSubmitError('You must review and consent to the zero-retention analysis policy.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiClient.createRepoJob({
        file: selectedFile,
        consent: consentChecked,
        name: repoName.trim() || undefined,
      });

      // Navigate to repository analysis page
      router.push(`/repositories/${res.job_id}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to initialize repository analysis job.');
      setIsSubmitting(false);
    }
  };

  const isStartDisabled = !selectedFile || !consentChecked || isSubmitting;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/repositories"
            className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            ← Back to Repositories
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] mt-2">
          Add Agent Repository
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
          Upload your autonomous agent codebase for static AST inspection, tool signature discovery, and instant policy generation.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl border border-[var(--border)] surface-opaque shadow-xs">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={() => setMode('zip')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'zip'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload ZIP Archive</span>
          </button>

          {/* File Path Button with Tooltip */}
          <div className="relative flex-1 sm:flex-initial">
            <button
              type="button"
              disabled
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip((prev) => !prev)}
              className="w-full px-4 py-2 text-xs font-semibold rounded-xl text-[var(--muted)]/50 bg-[var(--bg)]/40 border border-[var(--border)]/40 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            >
              <Terminal className="w-4 h-4" />
              <span>File Path</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                CLI Only
              </span>
            </button>

            {/* Interactive Tooltip Explanation */}
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 p-3 rounded-xl border border-[var(--border)] surface-opaque shadow-xl text-xs z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-[var(--text)]">Local File Path Disabled</h5>
                    <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                      A web browser running on a hosted domain cannot read files directly from your computer&apos;s local path. File path ingestion is available exclusively in on-premises/self-hosted installations or via the ContractGuard local CLI.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <span className="text-[11px] font-mono text-[var(--muted)] px-3 text-center sm:text-right">
          Max file size: 100 MB
        </span>
      </div>

      {/* PRIVACY PANEL BEFORE UPLOAD (06_REPO_UPLOAD_AND_CODE_PRIVACY.md) */}
      <div className="rounded-2xl border border-emerald-500/30 surface-opaque p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[var(--accent)] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">
                Zero-Retention Privacy Guarantee
              </h3>
              <p className="text-xs text-[var(--muted)]">
                How ContractGuard processes, protects, and permanently deletes your codebase.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20 font-bold">
            Audited Policy
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>What We Read</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Declared tool function names, parameter typing, docstrings, schema interfaces, and external HTTP/subprocess call patterns.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-red-500">
              <ShieldAlert className="w-4 h-4" />
              <span>What We Never Do</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              We never execute your code, import third-party libraries, install npm/pip modules, execute test suites, or persist raw source files.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
              <FileCheck className="w-4 h-4" />
              <span>What We Keep</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Extracted tool signatures, risk classification flags, parameter schemas, and generated policy contracts. All deletable anytime.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <HardDrive className="w-4 h-4" />
              <span>When Source is Purged</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Purged immediately upon AST completion (<span className="font-mono font-bold">TTL: 0s</span>). An audited cryptographic deletion receipt is generated with timestamp.
            </p>
          </div>
        </div>

        {/* Honest Disclosure Line */}
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-2.5 text-[11px] text-[var(--muted)]">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[var(--text)]">Honest Notice:</strong> This architecture minimizes credential and intellectual property exposure by isolating the parse process and immediately destroying files. However, transmission over the public web is a risk-reduction engineering control rather than an absolute mathematical guarantee.
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Repo Name input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text)]">
            Repository or Project Name (Optional)
          </label>
          <input
            type="text"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="e.g. devops-remediation-agent or customer-support-core"
            className="w-full px-4 py-2.5 rounded-xl text-xs input-opaque text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <p className="text-[11px] text-[var(--muted)]">
            Used as the display label for discovered tools and generated policy contracts.
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--text)]">
            Archive Package (.zip)
          </label>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center relative ${
              isDragging
                ? 'border-[var(--accent)] bg-emerald-500/10 scale-[1.005]'
                : selectedFile
                ? 'border-emerald-500/40 surface-opaque'
                : 'border-[var(--border)] surface-opaque hover:border-[var(--accent)]/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[var(--accent)] flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)] font-mono">
                    {selectedFile.name}
                  </h4>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Ready for static AST scanning · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-3 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-red-500/10 transition-colors inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Choose different archive</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-[var(--ai)] flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">
                    Drag and drop your repository ZIP here
                  </h4>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Or click to browse your computer for an archive (.zip up to 100 MB)
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-[11px] font-mono text-[var(--muted)] px-3 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Supports Python, TypeScript, JavaScript, Go AST parsing</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File Validation Error Message */}
        {fileError && (
          <div className="p-4 rounded-xl border border-[var(--danger)]/30 bg-red-500/5 text-xs text-[var(--danger)] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Upload Validation Error</p>
              <p className="mt-0.5 text-[11px] opacity-90">{fileError}</p>
            </div>
          </div>
        )}

        {/* REQUIRED CONSENT CHECKBOX */}
        <div className="p-4 rounded-xl border border-[var(--border)] surface-opaque space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            />
            <span className="text-xs text-[var(--text)] leading-relaxed">
              <strong className="text-[var(--text)]">Required Consent:</strong> I confirm that I am authorized to upload this codebase and agree to the ContractGuard ephemeral processing pipeline (static AST tokenization, risk flag extraction, and automated source destruction).
            </span>
          </label>
        </div>

        {/* Submit Error Message */}
        {submitError && (
          <div className="p-4 rounded-xl border border-[var(--danger)]/30 bg-red-500/5 text-xs text-[var(--danger)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/repositories"
            className="neu-btn px-4 py-2 text-xs rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isStartDisabled}
            className="neu-btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Initializing Sandbox...</span>
              </>
            ) : (
              <>
                <span>Start AST Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
