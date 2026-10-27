import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileCode2, Lock, ShieldCheck, Workflow } from 'lucide-react';
import { AttackProtectedTeaser } from '@/components/landing/attack-protected-teaser';
import { getWebAppUrl } from '@/lib/utils';

const KEY_STATS = [
  {
    value: '< 2 ms',
    label: 'Gate Evaluation Latency',
    detail: 'Deterministic parameter and scope checks before any tool executes.',
  },
  {
    value: '100% Static',
    label: 'Zero Code Execution',
    detail: 'Repositories are parsed via static AST and manifest inspection only.',
  },
  {
    value: '0 Bytes',
    label: 'Post-Scan Code Retention',
    detail: 'Source archives are purged after analysis with a cryptographic receipt.',
  },
  {
    value: '3 Exports',
    label: 'YAML, JSON & Audit PDF',
    detail: 'Machine-enforced runtime schemas paired with human-readable sign-off packs.',
  },
] as const;

const PLATFORM_PILLARS = [
  {
    index: '01.',
    title: 'Capabilities & Studios',
    description:
      'Generate policies via guided AI interviews, review diffs using screen-recorded video walkthroughs, scan repos, and export audit PDFs.',
    href: '/features',
    cta: 'Explore Features',
    icon: FileCode2,
  },
  {
    index: '02.',
    title: 'Five-Stage Workflow',
    description:
      'Trace the full lifecycle from connecting tool schemas through structured interviews, diff reviews, export, and runtime enforcement.',
    href: '/how-it-works',
    cta: 'See How It Works',
    icon: Workflow,
  },
  {
    index: '03.',
    title: 'Honest Security Posture',
    description:
      'Understand exactly how uploaded repositories are parsed without execution, redacted prior to AI prompts, deleted, and where residual risks remain.',
    href: '/security',
    cta: 'Read Security & Privacy',
    icon: Lock,
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Full-Width Hero + Side-by-Side Animated Teaser */}
      <section className="w-full px-5 pt-8 pb-4 sm:px-8 sm:pt-12 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-stretch">
          {/* Left Column: Refined Glass Hero Card */}
          <div className="glass-panel min-w-0 p-6 sm:p-8 lg:p-10 xl:col-span-5 flex flex-col justify-center">
            <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
              ContractGuard &middot; Deterministic AI Agent Security
            </p>

            <h1
              className="mt-3 font-bold tracking-tight text-[var(--text)] text-balance"
              style={{ fontSize: 'clamp(2.1rem, 3.3vw, 3.25rem)', lineHeight: 1.12 }}
            >
              Generate, review, and export enforceable security policies for AI agents.
            </h1>

            <p className="mt-5 text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
              Turn implicit prompt instructions into explicit, versioned YAML contracts that govern
              every tool call, parameter cap, and approval boundary before execution.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href={getWebAppUrl('/signup')}
                className="cta-emerald inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                href={getWebAppUrl('/login')}
                className="neu-raised inline-flex h-11 items-center justify-center px-5 text-sm font-semibold text-[var(--text)] whitespace-nowrap shrink-0"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Right Column: Live Animated Attack vs Protected Teaser */}
          <div className="min-w-0 xl:col-span-7 flex flex-col justify-center">
            <AttackProtectedTeaser />
          </div>
        </div>

        {/* Full-Width Key Stats Strip */}
        <dl className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {KEY_STATS.map((stat) => (
            <div key={stat.label} className="glass glass-interactive p-5 sm:p-6">
              <dd className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-[var(--accent)] tabular-nums">
                {stat.value}
              </dd>
              <dt className="mt-2.5 text-base font-semibold text-[var(--text)]">{stat.label}</dt>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{stat.detail}</p>
            </div>
          ))}
        </dl>
      </section>

      {/* Deterministic Policy Specimen */}
      <section className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="glass min-w-0 p-6 sm:p-8 lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
                ContractGuard Policy Standard &middot; Explicit Contracts Over Prompts
              </p>
              <h2 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] text-balance">
                System prompts advise models. Security policies bind tools.
              </h2>

              <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
                LLMs are probabilistic and susceptible to indirect prompt injection from tickets,
                documents, and web pages. ContractGuard separates policy authoring from model
                weights so engineering and security leads can audit exact execution boundaries.
              </p>

              <ul className="mt-6 space-y-3 border-t border-[var(--border)] pt-5 text-sm sm:text-[15px] leading-relaxed text-[var(--text)]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-1 h-4 w-4 text-[var(--accent)] shrink-0"
                    aria-hidden="true"
                  />
                  <span>Parameter-level bounds on monetary amounts, SQL verbs, and file globs</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-1 h-4 w-4 text-[var(--accent)] shrink-0"
                    aria-hidden="true"
                  />
                  <span>Stakeholder sign-off with clickable audit PDFs and SHA-256 hashes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-1 h-4 w-4 text-[var(--accent)] shrink-0"
                    aria-hidden="true"
                  />
                  <span>Versioned diffs reviewed via written notes or timestamped video clips</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <Link
                href="/features"
                className="neu-raised inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold text-[var(--text)] hover:text-[var(--accent)] whitespace-nowrap"
              >
                <span>Inspect Policy &amp; Review Studios</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div className="glass-panel h-full p-4 sm:p-5 flex flex-col">
              <div className="surface-opaque h-full overflow-hidden flex flex-col">
                <div className="surface-opaque-header flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                  <span className="font-mono font-semibold text-[var(--text)]">
                    policies/billing-support-agent.v3.yaml
                  </span>
                  <span className="font-mono font-semibold text-[var(--accent)] tabular-nums">
                    SHA-256: 8f4c...d91a
                  </span>
                </div>
                <pre className="p-4 sm:p-5 text-[13px] sm:text-sm leading-relaxed overflow-x-auto text-[var(--text)] flex-1">
                  <code>{`apiVersion: contractguard.dev/v1
kind: AgentSecurityPolicy
metadata:
  agent_id: billing-support-agent
  version: 3.2.0
  owner: payments-platform@acme.example
spec:
  default_action: deny
  tools:
    stripe.issue_refund:
      effect: allow
      constraints:
        amount_usd:
          max_per_call: 500
          max_per_session: 1000
        require_human_approval_above: 250
        require_verified_order_match: true
    postgres.customer_lookup:
      effect: allow
      constraints:
        allowed_statements: ["SELECT"]
        redact_columns: ["tax_id", "card_last4_hash"]
    shell.exec:
      effect: deny
      reason: "Billing support agent never requires host shell execution"`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore the Platform Sections */}
      <section className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
              ContractGuard Architecture &amp; Documentation
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
              Built for engineering and security review
            </h2>
          </div>
          <Link
            href="/faq"
            className="neu-raised inline-flex h-10 items-center px-4 text-sm font-semibold text-[var(--text)] whitespace-nowrap self-start sm:self-auto"
          >
            Read frequently asked questions &rarr;
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLATFORM_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link
                key={pillar.href}
                href={pillar.href}
                className="glass glass-interactive group flex flex-col justify-between p-6 sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-[var(--accent)] tabular-nums">
                      {pillar.index}
                    </span>
                    <span className="neu-raised inline-flex h-9 w-9 items-center justify-center">
                      <Icon className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg sm:text-xl font-bold text-[var(--text)]">
                    {pillar.title}
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-[15px] leading-relaxed text-[var(--muted)]">
                    {pillar.description}
                  </p>
                </div>

                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
                  <span>{pillar.cta}</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Bottom Conversion Band */}
      <section className="w-full px-5 pt-4 pb-2 sm:px-8 lg:px-12 xl:px-16">
        <div className="glass-panel flex flex-col items-start justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>ContractGuard &middot; Ready for your first agent policy</span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)] text-balance">
              Start authoring deterministic guardrails in minutes.
            </h2>
            <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-[var(--muted)]">
              Upload a tool manifest or interview our specialized policy assistant to generate a
              versioned YAML and PDF contract.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 shrink-0">
            <Link
              href={getWebAppUrl('/signup')}
              className="cta-emerald inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold whitespace-nowrap"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={getWebAppUrl('/login')}
              className="neu-raised inline-flex h-11 items-center justify-center px-5 text-sm font-semibold text-[var(--text)] whitespace-nowrap"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
