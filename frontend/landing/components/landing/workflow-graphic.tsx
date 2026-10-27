'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  FileCheck2,
  FileOutput,
  FolderGit2,
  ShieldCheck,
} from 'lucide-react';
import { WORKFLOW_STEPS } from '@/lib/workflow-data';

const STEP_ICONS = [FolderGit2, Bot, FileCheck2, FileOutput, ShieldCheck];

export function WorkflowGraphic() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeStep = WORKFLOW_STEPS[selectedIndex];
  const progressPercent = ((selectedIndex + 1) / WORKFLOW_STEPS.length) * 100;

  return (
    <div className="glass-panel min-w-0 p-5 sm:p-6 space-y-6">
      {/* Workflow Progress Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-[var(--text)]">
          Interactive Pipeline Inspector
        </span>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="font-mono tabular-nums">
            Stage {activeStep.stepNumber} / 05
          </span>
          <div className="neu-track h-1.5 w-28" aria-hidden="true">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5-Step Workflow Selector with Distinct Completed, Active, and Upcoming States */}
      <div
        role="tablist"
        aria-label="Five-step ContractGuard workflow"
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5"
      >
        {WORKFLOW_STEPS.map((step, index) => {
          const Icon = STEP_ICONS[index];
          const isSelected = index === selectedIndex;
          const isCompleted = index < selectedIndex;

          return (
            <div key={step.id} className="relative flex items-stretch min-w-0">
              <button
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedIndex(index)}
                className={`w-full min-w-0 p-4 text-left cursor-pointer flex flex-col justify-between transition-all duration-200 ${
                  isSelected
                    ? 'neu-pressed'
                    : isCompleted
                      ? 'neu-raised border-[var(--accent)]/35'
                      : 'neu-raised'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold tabular-nums ${
                      isSelected || isCompleted ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                    }`}
                  >
                    <span>{step.stepNumber}</span>
                    {isCompleted && (
                      <Check className="h-3.5 w-3.5 text-[var(--accent)]" aria-label="Completed stage" />
                    )}
                  </span>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isSelected || isCompleted ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                    }`}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-3">
                  <div className="text-[15px] font-bold text-[var(--text)]">{step.name}</div>
                  <div className="mt-0.5 text-[13px] text-[var(--muted)] truncate">
                    {step.actor}
                  </div>
                </div>
              </button>

              {index < WORKFLOW_STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`hidden lg:flex items-center justify-center -mr-3.5 ml-0.5 z-10 ${
                    isCompleted ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                  }`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Step Inspector (Layered Grouping + Solid Artifact Trace) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 border-t border-[var(--border)] pt-6">
        <div className="min-w-0 lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
            <span className="font-mono font-semibold text-[var(--accent)] tabular-nums">
              Step {activeStep.stepNumber} of 05
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>{activeStep.actor}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            {activeStep.stepNumber}. {activeStep.name}
          </h3>

          <p className="text-[15px] leading-relaxed text-[var(--muted)]">{activeStep.summary}</p>

          <dl className="grid grid-cols-1 gap-3.5 pt-2 sm:grid-cols-2 text-sm">
            <div className="surface-opaque p-3.5">
              <dt className="font-semibold text-[var(--text)]">Stage Input</dt>
              <dd className="mt-1 text-[var(--muted)]">{activeStep.inputArtifact}</dd>
            </div>
            <div className="surface-opaque p-3.5">
              <dt className="font-semibold text-[var(--text)]">Stage Artifact</dt>
              <dd className="mt-1 text-[var(--muted)]">{activeStep.outputArtifact}</dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0 lg:col-span-6 flex flex-col justify-between">
          <div className="text-[13px] font-semibold text-[var(--muted)] mb-2.5">
            Artifact Trace &middot; {activeStep.name}
          </div>
          <pre className="surface-opaque p-4 sm:p-5 font-mono text-[13px] sm:text-sm leading-relaxed overflow-x-auto text-[var(--text)] flex-1">
            <code>{activeStep.codePreview}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
