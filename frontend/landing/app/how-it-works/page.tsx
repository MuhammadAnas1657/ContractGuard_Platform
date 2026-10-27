import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, ShieldCheck } from 'lucide-react';
import { getWebAppUrl } from '@/lib/utils';
import { WORKFLOW_STEPS } from '@/lib/workflow-data';
import { WorkflowGraphic } from '@/components/landing/workflow-graphic';

export const metadata: Metadata = {
  title: 'How It Works — ContractGuard',
  description:
    'Follow the 5-step ContractGuard workflow: Connect, Interview, Review, Export, and Enforce.',
};

export default function HowItWorksPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Full-Width Balanced Header + 5-Step Workflow Graphic */}
      <section className="w-full px-5 pt-8 pb-4 sm:px-8 sm:pt-12 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="glass-panel min-w-0 p-6 sm:p-8 lg:p-10 lg:col-span-7 flex flex-col justify-center">
            <p className="text-[13px] sm:text-sm font-semibold text-[var(--accent)]">
              ContractGuard Workflow &middot; Connect &rarr; Interview &rarr; Review &rarr; Export &rarr; Enforce
            </p>
            <h1
              className="mt-3 font-bold tracking-tight text-[var(--text)] text-balance"
              style={{ fontSize: 'clamp(2rem, 3.3vw, 3.15rem)', lineHeight: 1.13 }}
            >
              From raw agent code to deterministic runtime guardrails in five steps.
            </h1>
            <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-[var(--muted)]">
              AI assists during policy authoring and review, while runtime enforcement stays 100%
              deterministic, local to your infrastructure, and verifiable by hash.
            </p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass glass-interactive p-5 sm:p-6 flex flex-col justify-center space-y-2.5">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <Bot className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                <span>Stages 02–03 (Authoring)</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                AI interviews developers and maps video or text feedback into clean YAML diffs.
              </p>
            </div>
            <div className="glass glass-interactive p-5 sm:p-6 flex flex-col justify-center space-y-2.5">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <ShieldCheck className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                <span>Stages 04–05 (Runtime)</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                Zero LLM in the hot path—deterministic rules evaluate locally in under 2 ms.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive 5-Step Workflow Graphic */}
        <div className="mt-8">
          <WorkflowGraphic />
        </div>
      </section>

      {/* Complete Sequential Reference List */}
      <section className="w-full px-5 py-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="glass-panel p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
                End-to-end stage breakdown
              </h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--muted)]">
                Select any stage in the diagram above or review the full pipeline specification below.
              </p>
            </div>
            <span className="font-mono text-[13px] font-semibold text-[var(--accent)] tabular-nums">
              05 sequential stages
            </span>
          </div>

          <div className="surface-opaque divide-y divide-[var(--border-solid)] overflow-hidden">
            {WORKFLOW_STEPS.map((step) => (
              <div
                key={step.id}
                className="grid grid-cols-1 gap-4 p-5 sm:p-6 md:grid-cols-12 md:items-start"
              >
                <div className="md:col-span-3">
                  <span className="font-mono text-[13px] font-semibold text-[var(--accent)] tabular-nums">
                    Stage {step.stepNumber}
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-[var(--text)]">{step.name}</h3>
                  <p className="mt-0.5 text-[13px] text-[var(--muted)]">{step.actor}</p>
                </div>

                <div className="md:col-span-5 text-[15px] leading-relaxed text-[var(--text)]">
                  {step.summary}
                </div>

                <div className="md:col-span-4 rounded-xl border border-[var(--border-solid)] bg-[var(--surface)] p-4 text-[13px] sm:text-sm space-y-1.5">
                  <div>
                    <span className="font-semibold text-[var(--text)]">In: </span>
                    <span className="text-[var(--muted)]">{step.inputArtifact}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text)]">Out: </span>
                    <span className="text-[var(--muted)]">{step.outputArtifact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <Link
              href="/security"
              className="neu-raised inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold text-[var(--text)] hover:text-[var(--accent)]"
            >
              <span>Inspect how uploaded repositories and secrets are protected</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>

            <Link
              href={getWebAppUrl('/signup')}
              className="cta-emerald inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold whitespace-nowrap"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
