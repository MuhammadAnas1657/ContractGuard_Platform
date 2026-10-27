'use client';

import React, { useState } from 'react';
import { Lock, CheckCircle2, XCircle, RefreshCw, Trash2, KeyRound, Sparkles, AlertCircle } from 'lucide-react';

interface SecretInputProps {
  configKey: string;
  label: string;
  description: string;
  maskedValue?: string;
  isSet: boolean;
  lastUpdated?: string;
  onSave: (newSecret: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onTest?: () => Promise<void>;
  testResult?: {
    success: boolean;
    latency_ms: number;
    message: string;
    tested_at: string;
  };
  isTesting?: boolean;
}

export function SecretInput({
  configKey,
  label,
  description,
  maskedValue,
  isSet,
  lastUpdated,
  onSave,
  onDelete,
  onTest,
  testResult,
  isTesting,
}: SecretInputProps) {
  const [isEditing, setIsEditing] = useState(!isSet);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) {
      setError('Please provide a secret value or cancel editing.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave(inputValue.trim());
      // CRITICAL SECURITY RULE: Clear typed secret from memory immediately
      setInputValue('');
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to securely store credential.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete and revoke the credential for ${label}?`)) {
      try {
        setSaving(true);
        await onDelete();
        setIsEditing(true);
        setInputValue('');
      } catch (err: any) {
        setError(err?.message || 'Failed to revoke credential.');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-opaque)]/70 transition-all space-y-3">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <h4 className="text-xs font-bold text-[var(--text)] tracking-tight">{label}</h4>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--border)]">
              {configKey}
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-1">{description}</p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {isSet && !isEditing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Configured
            </span>
          )}
          {!isSet && !isEditing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Unset
            </span>
          )}
        </div>
      </div>

      {/* Main Secret Display or Input Form */}
      {!isEditing && isSet ? (
        <div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--bg)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-mono text-xs font-semibold text-[var(--text)]">
                Saved (ends in {maskedValue || '••••••••'})
              </span>
            </div>
            <div className="text-[10px] text-[var(--muted)] flex items-center gap-2 font-mono">
              <span>Write-only vault storage (AES-256-GCM)</span>
              {lastUpdated && (
                <>
                  <span>·</span>
                  <span>Updated {new Date(lastUpdated).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons: Never show reveal button */}
          <div className="flex items-center gap-2 shrink-0">
            {onTest && (
              <button
                type="button"
                onClick={onTest}
                disabled={isTesting}
                className="px-2.5 py-1 text-xs rounded-lg neu-btn text-[var(--text)] hover:text-[var(--accent)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Probe endpoint latency and connection"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-[var(--accent)]' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-xs rounded-lg neu-btn text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
            >
              Replace
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 text-xs rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Revoke and delete credential"
              aria-label={`Revoke and delete credential for ${label}`}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-2">
          <div className="relative">
            <input
              type="password"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={`Enter new write-only secret for ${configKey}...`}
              autoComplete="new-password"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[var(--border)] input-opaque placeholder-[var(--muted)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)] font-mono pointer-events-none">
              Write-Only
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
              <Lock className="w-3 h-3 text-[var(--accent)]" />
              Plaintext is never stored in browser or logs.
            </span>

            <div className="flex items-center gap-2">
              {isSet && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setInputValue('');
                    setError(null);
                  }}
                  className="px-3 py-1 text-xs rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !inputValue.trim()}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {saving && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Save Secret</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Test Connection Output Feedback */}
      {testResult && (
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-[var(--text)]'
              : 'bg-rose-500/10 border-rose-500/30 text-[var(--text)]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="truncate text-[11px] font-medium">{testResult.message}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] shrink-0 text-[var(--muted)]">
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border)]">
              {testResult.latency_ms} ms
            </span>
            <span>{new Date(testResult.tested_at).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
