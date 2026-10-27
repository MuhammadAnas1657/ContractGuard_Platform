'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'why-not-system-prompts',
    category: 'Architecture',
    question: 'Why not just write security rules inside the agent’s system prompt?',
    answer:
      'System prompts share the exact same context window as untrusted user tickets, emails, and retrieved documents. Indirect prompt injection can persuade a model to ignore instructions in its prompt. ContractGuard compiles policies into deterministic YAML and JSON rules enforced outside the LLM before a tool function is invoked.',
  },
  {
    id: 'code-execution-safety',
    category: 'Security & Privacy',
    question: 'Do you execute our code or install dependencies when we upload a repository?',
    answer:
      'No. Repository archives are analyzed purely via static AST and schema parsers inside an isolated worker without internet access. Build scripts, package managers, and application binaries are never executed, and the uploaded archive is deleted immediately after tool findings are extracted.',
  },
  {
    id: 'secret-handling',
    category: 'Security & Privacy',
    question: 'What happens if a developer accidentally includes a `.env` file or API token in an upload?',
    answer:
      'ContractGuard skips `.env*` and private key files automatically and runs local pattern and entropy redaction before any extracted metadata enters an AI prompt. We surface a file-and-line secret warning in your scan report without storing the raw secret value. While this substantially reduces exposure risk, it is not an absolute guarantee—teams should still rotate any production credential committed to source control.',
  },
  {
    id: 'video-review-workflow',
    category: 'Review Studio',
    question: 'How does reviewing a policy by screen-recorded video work?',
    answer:
      'Reviewers can upload a short MP4 or WebM walkthrough talking through the policy preview—or submit written notes. ContractGuard transcribes the recording with timestamps, maps each requested change to an inline rule diff, checks for conflicting thresholds across sections, and lets the policy owner accept or reject each change individually before publishing a new version.',
  },
  {
    id: 'export-formats',
    category: 'Exports & Audit',
    question: 'What formats can we export once a policy version is approved?',
    answer:
      'Every approved version exports as machine-readable YAML and strict JSON for runtime enforcement, plus an audit-ready Interactive PDF featuring a cover sheet, clickable Table of Contents, PDF bookmarks, per-tool appendices, version metadata, and a SHA-256 integrity hash in the footer.',
  },
  {
    id: 'agent-framework-support',
    category: 'Integration',
    question: 'Which AI agent frameworks and LLM providers does ContractGuard work with?',
    answer:
      'Because ContractGuard policies govern tool schemas and execution gates rather than model weights, they work alongside OpenAI function calling, Anthropic tool use, Google Gemini tools, Model Context Protocol (MCP) servers, LangGraph, and custom TypeScript or Python tool routers.',
  },
  {
    id: 'runtime-latency',
    category: 'Performance',
    question: 'Does ContractGuard add another LLM call in the critical path at runtime?',
    answer:
      'No. AI is used strictly at design and review time to help you author thorough policies and reconcile stakeholder feedback. At runtime, your service evaluates the exported YAML/JSON policy locally using deterministic rule checks, adding under 2 milliseconds of overhead.',
  },
  {
    id: 'local-path-vs-zip',
    category: 'Repositories',
    question: 'Can we analyze a local filesystem path instead of uploading a ZIP archive?',
    answer:
      'On self-hosted deployments, local repository path scanning can be enabled for monorepos on the same runner. On the hosted web application, direct local path access is disabled by browser and tenant isolation boundaries—use the encrypted ZIP upload flow instead.',
  },
];

export function FaqAccordion() {
  const [openIds, setOpenIds] = useState<string[]>([FAQ_ITEMS[0].id]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allExpanded = openIds.length === FAQ_ITEMS.length;

  const handleToggleAll = () => {
    if (allExpanded) {
      setOpenIds([]);
    } else {
      setOpenIds(FAQ_ITEMS.map((item) => item.id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--muted)] tabular-nums">
          {FAQ_ITEMS.length} questions answered
        </p>
        <button
          type="button"
          onClick={handleToggleAll}
          className={`${
            allExpanded ? 'neu-pressed' : 'neu-raised'
          } h-10 px-4 text-sm font-semibold text-[var(--accent)] cursor-pointer whitespace-nowrap`}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="space-y-3.5">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIds.includes(item.id);
          const panelId = `faq-panel-${item.id}`;
          const buttonId = `faq-button-${item.id}`;

          return (
            <div key={item.id} className="glass glass-interactive overflow-hidden">
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(item.id)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 text-left cursor-pointer transition-colors duration-200 hover:bg-[var(--surface-subtle)]/35"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                      <span className="font-mono font-semibold text-[var(--accent)] tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{item.category}</span>
                    </div>
                    <span className="block text-base sm:text-[17px] font-bold text-[var(--text)]">
                      {item.question}
                    </span>
                  </div>

                  <span
                    className={`${
                      isOpen ? 'neu-pressed text-[var(--accent)]' : 'neu-raised text-[var(--muted)]'
                    } mt-0.5 inline-flex h-9 w-9 items-center justify-center shrink-0`}
                    aria-hidden="true"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>
              </h3>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="surface-opaque mx-4 mb-4 p-4 sm:mx-5 sm:mb-5 sm:p-5 text-[15px] leading-relaxed text-[var(--text)]"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
