import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getWebAppUrl } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileDown,
  FolderGit2,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import { FeatureStudioPreview } from '@/components/landing/feature-studio-preview';

export const metadata: Metadata = {
  title: 'Features — ContractGuard',
  description:
    'Explore AI-guided policy generation, video-based policy review, static repository analysis, security architecture packs, and interactive PDF/YAML exports.',
};

const REPO_FINDINGS = [
  {
    tool: 'stripe.issue_refund',
    source: 'src/agents/tools/billing.ts:42',
    risk: 'High Risk',
    severity: 'danger',
    note: 'Unbounded numeric `amount` parameter passed directly to Stripe SDK',
  },
  {
    tool: 'postgres.run_query',
    source: 'src/agents/tools/db.ts:19',
    risk: 'Warning',
    severity: 'warning',
    note: 'Uses read-write connection string; recommend read-only SELECT policy',
  },
  {
    tool: 'kb.search_articles',
    source: 'src/agents/tools/docs.ts:11',
    risk: 'Safe Scope',
    severity: 'safe',
    note: 'Public documentation index; no PII or state-mutating capability',
  },
] as const;

const FEATURE_INDEX = [
  { num: '01', label: 'AI Policy Studio & Live Preview', href: '#policy-studio' },
  { num: '02', label: 'Video & Written Diff Review', href: '#review-studio' },
  { num: '03', label: 'Static Repository Analysis', href: '#repo-analysis' },
  { num: '04', label: 'Security Architecture Pack', href: '#architecture-export' },
  { num: '05', label: 'Interactive PDF & YAML Export', href: '#architecture-export' },
] as const;

export default function FeaturesPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Full-Width Glass Hero + Tactile Capability Index */}
      <section className="w-full px-5 pt-8 pb-4 sm:px-8 sm:pt-12 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="glass-panel min-w-0 p-6 sm:p-8 lg:p-10 lg:col-span-7 flex flex-col justify-center">
            <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
              ContractGuard Capabilities &middot; Authoring to Audit
            </p>
            <h1
              className="mt-3 font-bold tracking-tight text-[var(--text)] text-balance"
              style={{ fontSize: 'clamp(2rem, 3.3vw, 3.15rem)', lineHeight: 1.13 }}
            >
              Every workflow required to ship bounded, auditable AI agents.
            </h1>
            <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
              ContractGuard bridges developer velocity and security sign-off—combining static tool
              discovery, guided policy authoring, multimodal stakeholder reviews, and verifiable
              exports.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a
                href="#policy-studio"
                className="cta-emerald inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                <span>Explore Policy Studio</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href={getWebAppUrl('/signup')}
                className="neu-raised inline-flex h-11 items-center justify-center px-5 text-sm font-semibold text-[var(--text)] whitespace-nowrap shrink-0"
              >
                Get Started
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass h-full p-6 sm:p-7 flex flex-col justify-center space-y-3">
              <div className="text-[13px] sm:text-sm font-semibold text-[var(--muted)] mb-1">
                Included Capabilities
              </div>
              <ul className="space-y-2.5 text-sm">
                {FEATURE_INDEX.map((item) => (
                  <li key={item.num}>
                    <a
                      href={item.href}
                      className="neu-raised flex items-center justify-between px-4 py-3 text-[var(--text)] hover:text-[var(--accent)]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-xs sm:text-[13px] font-semibold text-[var(--accent)] tabular-nums">
                          {item.num}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-[var(--muted)] shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 01: Policy Generation with AI Chat & Live Preview */}
      <section id="policy-studio" className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16 scroll-mt-24">
        <div className="glass p-6 sm:p-8 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center mb-6">
          <div className="lg:col-span-6">
            <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
              01. Policy Studio
            </span>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
              Policy generation with AI chat and live preview
            </h2>
          </div>
          <div className="lg:col-span-6">
            <p className="text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
              Answer focused edge-case questions while watching your readable specification, YAML
              contract, and section outline stream in real time. Editing any answer regenerates only
              affected sections.
            </p>
          </div>
        </div>

        <FeatureStudioPreview />
      </section>

      {/* Feature 02: Review Studio Layered Dashboard + Solid Diff & Approval Surfaces */}
      <section id="review-studio" className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16 scroll-mt-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="glass min-w-0 p-6 sm:p-8 lg:col-span-5 flex flex-col justify-center space-y-5">
            <div>
              <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                02. Review Studio
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] text-balance">
                Policy review by screen-recorded video or written feedback
              </h2>
            </div>

            <p className="text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
              Security leads and product owners rarely want to hand-edit YAML. Drop a quick screen
              recording talking through a policy—or paste written notes—and ContractGuard extracts
              timestamp-linked rule diffs with per-change Accept/Reject controls and conflict alerts.
            </p>

            <ul className="space-y-3 border-t border-[var(--border)] pt-4 text-sm sm:text-[15px] leading-relaxed text-[var(--text)]">
              <li className="flex items-start gap-2.5">
                <Video className="mt-1 h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                <span>Timestamped transcript links every diff line back to the exact spoken moment</span>
              </li>
              <li className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-1 h-4 w-4 text-[var(--warning)] shrink-0"
                  aria-hidden="true"
                />
                <span>Automatic detection of contradictory thresholds across policy sections</span>
              </li>
            </ul>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div className="glass-panel h-full overflow-hidden flex flex-col">
              {/* Review Studio Chrome Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3.5 sm:px-6 text-[13px]">
                <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
                  <Video className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                  <span>Review Studio &middot; Review #14 &middot; AppSec Walkthrough (02:14 MP4)</span>
                </div>
                <span className="font-mono font-semibold text-[var(--accent)] tabular-nums">
                  3 proposed changes
                </span>
              </div>

              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4 text-sm">
                <div className="surface-opaque p-4 space-y-2">
                  <div className="flex items-center justify-between text-[13px] text-[var(--muted)]">
                    <span className="font-semibold text-[var(--text)]">Transcript Excerpt</span>
                    <span className="font-mono font-semibold tabular-nums text-[var(--accent)]">
                      @ 00:48
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--text)]">
                    &ldquo;...lowering the autonomous refund ceiling from $500 down to $200 for EU
                    cross-border orders, and disabling CSV bulk export completely.&rdquo;
                  </p>
                </div>

                {/* Solid High-Contrast Inline Diff Block */}
                <div className="surface-opaque p-4 font-mono text-[13px] sm:text-sm space-y-1.5 overflow-x-auto tabular-nums">
                  <div className="text-[var(--muted)]">stripe.issue_refund.constraints:</div>
                  <div className="rounded bg-[var(--danger)]/15 px-2.5 py-1 text-[var(--danger)] font-medium">
                    - max_per_call_usd: 500
                  </div>
                  <div className="rounded bg-[var(--accent)]/15 px-2.5 py-1 text-[var(--accent)] font-medium">
                    + max_per_call_usd: 200 # Source: Video @ 00:48
                  </div>
                </div>

                {/* Solid High-Contrast Warning & Approval Controls */}
                <div className="surface-opaque border-[var(--warning)]/55 flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-[13px] sm:text-sm">
                  <div className="flex items-start sm:items-center gap-2 text-[var(--warning)]">
                    <AlertTriangle className="mt-0.5 sm:mt-0 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="font-semibold break-words">
                      Warning: `approval_above_usd: 250` now exceeds `max_per_call_usd: 200`
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-semibold">
                    <span className="neu-raised inline-flex items-center gap-1 px-2.5 py-1 text-[var(--accent)]">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Accept
                    </span>
                    <span className="neu-raised inline-flex items-center gap-1 px-2.5 py-1 text-[var(--danger)]">
                      <X className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 03: Repository Analysis */}
      <section id="repo-analysis" className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16 scroll-mt-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="glass min-w-0 p-6 sm:p-8 lg:col-span-5 flex flex-col justify-center space-y-5">
            <div>
              <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                03. Repository Analysis
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] text-balance">
                Discover every agent tool, risk flag, and secret exposure statically
              </h2>
            </div>

            <p className="text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
              Upload a repository ZIP archive to inventory LangChain, MCP, OpenAI, and custom tool
              definitions automatically. ContractGuard parses ASTs without executing code, flags
              unconstrained parameters, redacts secrets, and issues a deletion receipt once
              findings are extracted.
            </p>

            <div className="pt-1">
              <Link
                href="/security"
                className="neu-raised inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold text-[var(--text)] hover:text-[var(--accent)]"
              >
                <span>Read how repository code is handled and deleted</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div className="glass-panel h-full p-4 sm:p-5 flex flex-col">
              <div className="surface-opaque h-full overflow-hidden">
                <div className="surface-opaque-header flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-[13px] sm:text-sm">
                  <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
                    <FolderGit2 className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    <span className="break-all">acme/support-agent-monorepo.zip</span>
                  </div>
                  <span className="font-mono font-semibold text-[var(--accent)]">
                    Archive Deleted &check;
                  </span>
                </div>

                <div className="divide-y divide-[var(--border-solid)]">
                  {REPO_FINDINGS.map((row) => (
                    <div key={row.tool} className="p-4 sm:p-5 text-sm space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <code className="font-semibold text-[var(--text)]">{row.tool}</code>
                        {row.severity === 'danger' && (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--danger)]">
                            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                            {row.risk}
                          </span>
                        )}
                        {row.severity === 'warning' && (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--warning)]">
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            {row.risk}
                          </span>
                        )}
                        {row.severity === 'safe' && (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)]">
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            {row.risk}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--muted)]">{row.note}</p>
                      <p className="font-mono text-[13px] text-[var(--muted)]">{row.source}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 04 & 05: Security Architecture Pack + PDF/YAML Export */}
      <section id="architecture-export" className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16 scroll-mt-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="glass glass-interactive p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                  04. Security Architecture Pack
                </span>
                <span className="neu-raised inline-flex h-9 w-9 items-center justify-center">
                  <Layers className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
                Tailored enforcement topology &amp; threat documentation
              </h2>
              <p className="text-[15px] leading-relaxed text-[var(--muted)]">
                Pair any policy version with your deployment model—API Gateway middleware,
                Kubernetes sidecar, or MCP server proxy—to generate a complete security architecture
                pack ready for internal security review.
              </p>
            </div>

            <div className="surface-opaque p-4 text-sm">
              <div className="font-semibold text-[var(--text)]">Included in generated pack:</div>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                <li>&bull; Trust boundary &amp; token-scoping specification (PDF / Markdown / DOCX)</li>
                <li>&bull; STRIDE &amp; OWASP LLM Top-10 mitigation mapping per agent tool</li>
                <li>&bull; Tailored `.env.example` template with masked secret placeholders</li>
              </ul>
            </div>
          </div>

          <div className="glass glass-interactive p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                  05. Audit &amp; Runtime Export
                </span>
                <span className="neu-raised inline-flex h-9 w-9 items-center justify-center">
                  <FileDown className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
                Interactive PDF for auditors, YAML &amp; JSON for code
              </h2>
              <p className="text-[15px] leading-relaxed text-[var(--muted)]">
                Export the exact same policy version into deterministic YAML/JSON for your runtime
                enforcement middleware and an interactive, bookmarked PDF for compliance and CISO
                sign-off.
              </p>
            </div>

            <div className="surface-opaque p-4 text-sm">
              <div className="font-semibold text-[var(--text)]">Interactive PDF anatomy:</div>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                <li>&bull; Cover sheet with policy version, owner, and review lineage</li>
                <li>&bull; Clickable Table of Contents, PDF bookmarks, and cross-section links</li>
                <li>&bull; Per-tool appendix + footer timestamp and SHA-256 integrity hash</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="glass-panel mt-8 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
          <div>
            <h3 className="text-lg font-bold text-[var(--text)]">
              See how these capabilities connect end to end
            </h3>
            <p className="mt-1 text-sm sm:text-[15px] text-[var(--muted)]">
              Walk through the five stages from repository connection to runtime enforcement.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            <Link
              href="/how-it-works"
              className="neu-raised inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold text-[var(--text)] whitespace-nowrap"
            >
              <span>How It Works</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={getWebAppUrl('/signup')}
              className="cta-emerald inline-flex h-11 items-center justify-center px-5 text-sm font-semibold whitespace-nowrap"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
