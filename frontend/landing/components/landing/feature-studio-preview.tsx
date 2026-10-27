'use client';

import React, { useState } from 'react';
import { Bot, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

type StudioTab = 'preview' | 'yaml' | 'outline';

export function FeatureStudioPreview() {
  const [activeTab, setActiveTab] = useState<StudioTab>('preview');

  return (
    <div className="glass-panel min-w-0 overflow-hidden">
      {/* Layered Studio Header Chrome */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
          <ShieldCheck className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
          <span>Policy Studio &middot; Split Authoring Workspace</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="font-mono tabular-nums">Progress 7 / 12</span>
          <div className="neu-track h-2 w-24" aria-hidden="true">
            <div className="h-full w-[58%] rounded-full bg-[var(--accent)]" />
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: AI Conversation */}
        <div className="min-w-0 lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-[13px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text)]">
                <Bot className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                <span>Policy Interview</span>
              </span>
              <span className="font-mono text-xs text-[var(--accent)]">Section 3 Active</span>
            </div>

            <div className="mt-4 space-y-3.5 text-sm leading-relaxed">
              <div className="surface-opaque p-4">
                <p className="text-[13px] font-semibold text-[var(--accent)]">Specialized AI</p>
                <p className="mt-1 text-[var(--text)]">
                  What is the maximum single-call refund `stripe.issue_refund` can issue without
                  human escalation?
                </p>
              </div>

              <div className="neu-pressed p-4 ml-4 sm:ml-6">
                <p className="text-[13px] font-semibold text-[var(--text)]">You</p>
                <p className="mt-1 text-[var(--text)]">
                  Hard limit of $500 per call, and require human approval above $250.
                </p>
              </div>

              <div className="surface-opaque p-4">
                <p className="text-[13px] font-semibold text-[var(--accent)]">Specialized AI</p>
                <p className="mt-1 text-[var(--text)]">
                  Updated section 3 (`Monetary & Rate Limits`). Should unverified guest tickets be
                  permitted to trigger refunds?
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-[13px]">
            <span className="text-[var(--muted)] py-1 mr-1">Suggested replies:</span>
            <span className="neu-raised px-3 py-1.5 text-[var(--text)] font-medium">
              Deny guest tickets
            </span>
            <span className="neu-raised px-3 py-1.5 text-[var(--text)] font-medium">
              Require verified order ID
            </span>
          </div>
        </div>

        {/* Right: Live Policy Preview with Segmented Neumorphic Tabs & Solid Technical Content */}
        <div className="min-w-0 lg:col-span-7 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <span className="text-sm font-semibold text-[var(--text)]">Live Policy Output</span>
            <div className="neu-group flex items-center gap-1" role="tablist" aria-label="Policy output view">
              {(
                [
                  { id: 'preview', label: 'Preview' },
                  { id: 'yaml', label: 'YAML' },
                  { id: 'outline', label: 'Outline' },
                ] as const
              ).map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-8 px-3.5 text-[13px] font-medium cursor-pointer whitespace-nowrap rounded-lg transition-all duration-200 ${
                      active
                        ? 'neu-pressed text-[var(--accent)] font-semibold'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === 'preview' && (
              <div className="space-y-3.5 text-sm">
                <div className="surface-opaque p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text)]">
                      1. Agent Metadata &amp; Scope
                    </span>
                    <span className="inline-flex items-center gap-1 text-[13px] text-[var(--accent)] font-semibold">
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Complete
                    </span>
                  </div>
                  <p className="mt-1.5 leading-relaxed text-[var(--muted)]">
                    Agent `billing-support-agent` operating in production customer support queue.
                  </p>
                </div>

                <div className="surface-opaque border-[var(--accent)]/45 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text)]">
                      3. Monetary &amp; Rate Limits
                    </span>
                    <span className="font-mono text-[13px] text-[var(--accent)] font-semibold">
                      Updated just now
                    </span>
                  </div>
                  <ul className="mt-2.5 space-y-1.5 leading-relaxed text-[var(--text)] tabular-nums">
                    <li>&bull; Hard cap per tool invocation: $500.00 USD</li>
                    <li>&bull; Human-in-the-loop escalation threshold: &gt; $250.00 USD</li>
                    <li>&bull; Default fallback on missing order match: Deny execution</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'yaml' && (
              <pre className="surface-opaque p-4 sm:p-5 font-mono text-[13px] sm:text-sm leading-relaxed overflow-x-auto text-[var(--text)] tabular-nums">
                <code>{`tools:
  stripe.issue_refund:
    effect: allow
    limits:
      max_per_call_usd: 500
      approval_required_above_usd: 250
      max_calls_per_minute: 3
    preconditions:
      - ticket.customer_verified == true`}</code>
              </pre>
            )}

            {activeTab === 'outline' && (
              <ul className="space-y-3 text-sm">
                {[
                  { name: '1. Agent Metadata', status: 'Complete', done: true },
                  { name: '2. Discovered Tool Permissions', status: 'Complete', done: true },
                  { name: '3. Monetary & Rate Limits', status: 'Updated', done: true },
                  { name: '4. Data Egress & PII Redaction', status: 'Pending Q8', done: false },
                  { name: '5. Escalation & Incident Webhooks', status: 'Pending Q10', done: false },
                ].map((sec) => (
                  <li
                    key={sec.name}
                    className="surface-opaque flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <span className="font-medium text-[var(--text)]">{sec.name}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold ${
                        sec.done ? 'text-[var(--accent)]' : 'text-[var(--warning)]'
                      }`}
                    >
                      {sec.done ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      )}
                      {sec.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
