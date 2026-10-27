import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getWebAppUrl } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  EyeOff,
  FileCode2,
  KeyRound,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security & Privacy — ContractGuard',
  description:
    'How ContractGuard handles uploaded code: static analysis without execution, post-analysis deletion, secret redaction, encrypted keys, and honest limitations.',
};

const SECURITY_CONTROLS = [
  {
    icon: FileCode2,
    title: 'Analyzed statically—never executed',
    summary:
      'Uploaded repositories are parsed as inert text and abstract syntax trees (ASTs) to extract tool names, parameter types, and permission hints.',
    details: [
      'No `npm install`, `pip install`, build hooks, or post-install scripts are ever run.',
      'Code is processed inside a network-isolated parser worker with zero outbound internet access.',
      'Malicious or broken scripts in an uploaded archive cannot execute arbitrary commands during analysis.',
    ],
  },
  {
    icon: Trash2,
    title: 'Deleted immediately after analysis',
    summary:
      'Raw source files exist only for the duration of static extraction and are purged once structured tool metadata is saved.',
    details: [
      'Ephemeral scratch directories are unlinked and wiped immediately when the scan job finishes or errors out.',
      'Only extracted tool signatures, file/line references, and risk flags are stored in your workspace.',
      'Every scan generates a timestamped deletion receipt recording the archive SHA-256 digest and purge timestamp.',
    ],
  },
  {
    icon: EyeOff,
    title: 'Secrets redacted before AI context',
    summary:
      'Before any extracted metadata is sent to an LLM for policy interviewing, deterministic redaction strips credentials.',
    details: [
      'Files matching `.env*`, `*.pem`, `*.key`, and credential manifests are excluded from content ingestion.',
      'Regex and Shannon-entropy scanners mask API tokens, bearer strings, private keys, and database URLs (`[REDACTED_SECRET]`).',
      'Your source code and redacted credentials are never used to train foundation models.',
    ],
  },
  {
    icon: KeyRound,
    title: 'Encrypted keys & write-only configuration',
    summary:
      'Provider API keys and webhook secrets configured in ContractGuard are encrypted at rest and never returned to the browser.',
    details: [
      'Secrets are encrypted using envelope encryption (AES-256-GCM) with per-tenant key material and TLS 1.3 in transit.',
      'Configuration inputs are strictly write-only; after saving, the UI displays only the last 4 characters (for example, `••a9f2`).',
      'Connection health checks run server-side without exposing stored secret values to client sessions.',
    ],
  },
  {
    icon: Users,
    title: 'Scoped access control & audit trail',
    summary:
      'Every policy draft, review diff, repository scan, and export event is scoped to authenticated workspace roles.',
    details: [
      'Authentication uses short-lived sessions via `httpOnly`, `Secure`, `SameSite` cookies—never `localStorage` tokens.',
      'Workspace tenants are logically isolated at the query and storage layer.',
      'Immutable activity logs record logins, policy approvals, key rotations, and export downloads.',
    ],
  },
] as const;

export default function SecurityPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Restrained Glass Hero + Accessible Security Status Indicators */}
      <section className="w-full px-5 pt-8 pb-4 sm:px-8 sm:pt-12 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="glass-panel min-w-0 p-6 sm:p-8 lg:p-10 lg:col-span-7 flex flex-col justify-center">
            <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
              ContractGuard Security &amp; Data Handling &middot; Specific Controls, Plain Language
            </p>
            <h1
              className="mt-3 font-bold tracking-tight text-[var(--text)] text-balance"
              style={{ fontSize: 'clamp(2rem, 3.3vw, 3.15rem)', lineHeight: 1.13 }}
            >
              How we handle your code, secrets, and policy artifacts.
            </h1>
            <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
              Security tools earn trust through verifiable mechanics rather than vague assurances.
              Below is exactly what ContractGuard reads, what we discard, how keys are stored, and
              where residual risk still applies.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a
                href="#security-controls"
                className="cta-emerald inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                <span>Explore Security Controls</span>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>

              <a
                href="#data-lifecycle"
                className="neu-raised inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold text-[var(--text)] whitespace-nowrap shrink-0"
              >
                <span>Review Our Methodology</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass p-5 sm:p-6 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 font-mono text-lg sm:text-xl font-bold text-[var(--accent)] tabular-nums">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Zero Exec</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Static AST parsing only; untrusted code is never executed.
              </p>
            </div>
            <div className="glass p-5 sm:p-6 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 font-mono text-lg sm:text-xl font-bold text-[var(--accent)] tabular-nums">
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>0s Retain</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Archives are purged post-scan with a SHA-256 deletion receipt.
              </p>
            </div>
            <div className="glass p-5 sm:p-6 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 font-mono text-lg sm:text-xl font-bold text-[var(--text)] tabular-nums">
                <KeyRound className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                <span>AES-256-GCM</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Write-only API keys encrypted at rest; masked to last 4 chars.
              </p>
            </div>
            <div className="glass p-5 sm:p-6 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 font-mono text-lg sm:text-xl font-bold text-[var(--text)] tabular-nums">
                <AlertTriangle className="h-4 w-4 text-[var(--warning)] shrink-0" aria-hidden="true" />
                <span>Explicit Scope</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Reduces blast radius substantially; not an absolute guarantee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solid, High-Contrast Repository Data Lifecycle Table */}
      <section
        id="data-lifecycle"
        className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16 scroll-mt-24"
      >
        <div className="glass-panel p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
              Data Handling Methodology
            </p>
            <h2 className="mt-1 text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--text)]">
              Repository data lifecycle at a glance
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--muted)]">
              Every repository upload follows a strict minimal-retention pipeline.
            </p>
          </div>

          <div className="surface-opaque overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="surface-opaque-header text-[13px] sm:text-sm font-semibold text-[var(--text)]">
                <tr>
                  <th className="px-5 py-4">Artifact Type</th>
                  <th className="px-5 py-4">How It Is Processed</th>
                  <th className="px-5 py-4">Retention Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-solid)] text-sm sm:text-[15px] leading-relaxed">
                <tr>
                  <td className="px-5 py-4 font-semibold text-[var(--text)]">
                    Uploaded ZIP &amp; Source Code
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    Parsed statically via AST in isolated scratch storage; never executed
                  </td>
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-[var(--accent)] tabular-nums">
                    0s post-scan (deleted immediately)
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-semibold text-[var(--text)]">
                    `.env` Files &amp; Detected Secrets
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    Blocked or redacted locally prior to database storage or AI prompts
                  </td>
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-[var(--accent)] tabular-nums">
                    Never persisted (line warning only)
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-semibold text-[var(--text)]">
                    Tool Signatures &amp; Risk Findings
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    Function names, parameter schemas, and file:line references saved for authoring
                  </td>
                  <td className="px-5 py-4 font-mono text-sm text-[var(--text)] tabular-nums">
                    Until deleted by workspace owner
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-semibold text-[var(--text)]">
                    Integration API Keys
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    Write-only input, AES-256-GCM envelope encrypted, masked to last 4 chars
                  </td>
                  <td className="px-5 py-4 font-mono text-sm text-[var(--text)] tabular-nums">
                    Until rotated or revoked by user
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detailed Security Controls */}
      <section
        id="security-controls"
        className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16 scroll-mt-24"
      >
        <div className="mb-6">
          <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
            Technical Safeguards
          </p>
          <h2 className="mt-1 text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--text)]">
            Five core security controls
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
          {SECURITY_CONTROLS.map((control, index) => {
            const Icon = control.icon;
            const spanClass = index < 3 ? 'xl:col-span-2' : 'xl:col-span-3';
            return (
              <div
                key={control.title}
                className={`${spanClass} glass glass-interactive min-w-0 p-6 sm:p-7 flex flex-col justify-between space-y-5`}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="neu-raised flex h-10 w-10 items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text)]">{control.title}</h3>
                  </div>

                  <p className="text-[15px] leading-relaxed text-[var(--text)]">
                    {control.summary}
                  </p>
                </div>

                <ul className="surface-opaque space-y-3 p-4 text-sm leading-relaxed text-[var(--muted)]">
                  {control.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2.5">
                      <ShieldCheck
                        className="mt-1 h-4 w-4 text-[var(--accent)] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[var(--text)] break-words">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Solid High-Contrast Honest Limitations & Residual Risk Callout */}
      <section className="w-full px-5 pt-4 pb-2 sm:px-8 lg:px-12 xl:px-16">
        <div className="surface-opaque border-[var(--warning)]/45 p-6 sm:p-8">
          <div className="flex items-start gap-3.5">
            <AlertTriangle
              className="mt-1 h-5 w-5 text-[var(--warning)] shrink-0"
              aria-hidden="true"
            />
            <div className="w-full min-w-0 space-y-5">
              <div>
                <p className="text-[13px] sm:text-sm font-semibold text-[var(--warning)]">
                  Honest Scope &amp; Residual Risk Disclosure
                </p>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
                  Substantial risk reduction—not an absolute guarantee
                </h2>
              </div>

              <p className="text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
                Analyzing code statically, redacting detected secrets, deleting archives after
                extraction, and encrypting keys{' '}
                <strong className="font-semibold text-[var(--text)]">substantially reduces</strong>{' '}
                the blast radius of repository handling and agent tool abuse,{' '}
                <strong className="font-semibold text-[var(--text)]">
                  but no security control provides an absolute guarantee
                </strong>
                . Engineering teams should plan around these concrete boundaries:
              </p>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3 text-sm leading-relaxed">
                <div className="rounded-xl border border-[var(--border-solid)] bg-[var(--surface-opaque-alt)]/55 p-5">
                  <h3 className="text-base font-bold text-[var(--text)]">
                    1. Heuristic Redaction Limits
                  </h3>
                  <p className="mt-2 text-[var(--muted)]">
                    Pattern and entropy scanners catch standard keys and tokens, but custom
                    low-entropy passwords hardcoded inside business logic can still evade static
                    detectors. Avoid uploading production secrets whenever possible.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border-solid)] bg-[var(--surface-opaque-alt)]/55 p-5">
                  <h3 className="text-base font-bold text-[var(--text)]">
                    2. Enforcement Requires Wiring
                  </h3>
                  <p className="mt-2 text-[var(--muted)]">
                    An exported YAML or PDF policy cannot protect an agent on its own; your
                    application must evaluate the policy inside a non-bypassable tool gateway or
                    middleware layer.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border-solid)] bg-[var(--surface-opaque-alt)]/55 p-5">
                  <h3 className="text-base font-bold text-[var(--text)]">
                    3. Defense in Depth Still Applies
                  </h3>
                  <p className="mt-2 text-[var(--muted)]">
                    ContractGuard constrains tool invocations and parameters, but does not replace
                    least-privilege IAM credentials, network egress rules, or OS container
                    sandboxing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/faq"
            className="neu-raised inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold text-[var(--text)] hover:text-[var(--accent)]"
          >
            <span>Have more questions? Read the Security &amp; Platform FAQ</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link
            href={getWebAppUrl('/signup')}
            className="cta-emerald inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold whitespace-nowrap"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
