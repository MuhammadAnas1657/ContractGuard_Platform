'use client';

import React from 'react';
import { DeploymentStyle } from '@/lib/types/security';

interface ArchitectureDiagramProps {
  deploymentStyle: DeploymentStyle;
  policyTitle?: string;
}

export function ArchitectureDiagram({ deploymentStyle, policyTitle }: ArchitectureDiagramProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--glass-border)] bg-[var(--surface)]/60 p-4 transition-all">
      <div className="min-w-[760px] flex flex-col items-center">
        <svg
          viewBox="0 0 920 440"
          className="w-full h-auto select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-card" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--surface-opaque, #161F36)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--surface-opaque, #0F172A)" stopOpacity="0.95" />
            </linearGradient>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" floodColor="#000" />
            </filter>
            <marker
              id="arrow-emerald"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
            </marker>
            <marker
              id="arrow-muted"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748B" />
            </marker>
          </defs>

          {/* Topology Outer Boundary */}
          <rect
            x="20"
            y="20"
            width="880"
            height="400"
            rx="16"
            className="stroke-[var(--glass-border)] fill-[var(--surface-subtle)]"
            strokeWidth="1.5"
            strokeDasharray={deploymentStyle === 'sidecar' ? '6 4' : 'none'}
          />

          <text
            x="40"
            y="50"
            className="fill-[var(--muted)] text-[12px] font-mono tracking-wider uppercase font-semibold"
          >
            {deploymentStyle === 'in_process' && 'DEPLOYMENT TOPOLOGY: IN-PROCESS APPLICATION MIDDLEWARE'}
            {deploymentStyle === 'sidecar' && 'DEPLOYMENT TOPOLOGY: KUBERNETES SIDECAR / LOCAL PROXY'}
            {deploymentStyle === 'gateway' && 'DEPLOYMENT TOPOLOGY: API GATEWAY / REVERSE PROXY DMZ'}
          </text>

          {policyTitle && (
            <text
              x="880"
              y="50"
              textAnchor="end"
              className="fill-[var(--accent)] text-[11px] font-mono font-medium"
            >
              Policy: {policyTitle}
            </text>
          )}

          {/* 1. Ingress Layer */}
          <g transform="translate(45, 90)">
            <rect
              width="150"
              height="300"
              rx="12"
              fill="url(#grad-card)"
              className="stroke-[var(--border)]"
              strokeWidth="1.2"
              filter="url(#shadow)"
            />
            <rect x="0" y="0" width="150" height="34" rx="12" fill="url(#grad-cyan)" />
            <text x="75" y="22" textAnchor="middle" fill="#FFFFFF" className="text-[12px] font-bold">
              1. INGRESS DATA
            </text>

            {/* Ingress Channels */}
            <g transform="translate(14, 52)">
              <rect width="122" height="64" rx="8" className="fill-[var(--bg)] stroke-[var(--border)]" strokeWidth="1" />
              <text x="10" y="22" className="fill-[var(--text)] text-[11px] font-semibold">User Prompt</text>
              <text x="10" y="38" className="fill-[#10B981] text-[9.5px] font-mono">auth_user (Trusted)</text>
              <text x="10" y="52" className="fill-[var(--muted)] text-[9px]">Session ID & Goal</text>
            </g>

            <g transform="translate(14, 130)">
              <rect width="122" height="74" rx="8" className="fill-[var(--bg)] stroke-[#F59E0B]/40" strokeWidth="1" />
              <text x="10" y="20" className="fill-[var(--text)] text-[11px] font-semibold">External Data</text>
              <text x="10" y="36" className="fill-[#F59E0B] text-[9.5px] font-mono">untrusted_ingress</text>
              <text x="10" y="52" className="fill-[var(--muted)] text-[9px]">Email body, Web HTML</text>
              <text x="10" y="65" className="fill-[var(--muted)] text-[9px]">Tool Outputs, RAG docs</text>
            </g>

            <g transform="translate(14, 220)">
              <rect width="122" height="64" rx="8" className="fill-[var(--bg)] stroke-[var(--border)]" strokeWidth="1" />
              <text x="10" y="22" className="fill-[var(--text)] text-[11px] font-semibold">Agent Proposal</text>
              <text x="10" y="38" className="fill-[var(--muted)] text-[9.5px] font-mono">Proposed Tool Call</text>
              <text x="10" y="52" className="fill-[var(--accent)] text-[9px]">tool_name + args</text>
            </g>
          </g>

          {/* Connection Arrows from Ingress to Stage 1 */}
          <path d="M 195 240 L 245 240" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrow-emerald)" />

          {/* 2. ContractGuard 3-Stage Reference Monitor */}
          <g transform="translate(250, 80)">
            <rect
              width="430"
              height="320"
              rx="14"
              className="fill-[var(--bg)]/90 stroke-[var(--accent)]/50"
              strokeWidth="1.5"
              filter="url(#shadow)"
            />
            <rect x="0" y="0" width="430" height="36" rx="14" fill="url(#grad-emerald)" />
            <text x="215" y="23" textAnchor="middle" fill="#FFFFFF" className="text-[13px] font-bold tracking-wide">
              CONTRACTGUARD REFERENCE MONITOR
            </text>

            {/* STAGE 1 */}
            <g transform="translate(20, 52)">
              <rect width="390" height="74" rx="8" fill="url(#grad-card)" className="stroke-[var(--border)]" strokeWidth="1" />
              <rect x="0" y="0" width="6" height="74" rx="3" fill="#06B6D4" />
              <text x="18" y="22" className="fill-[var(--text)] text-[11.5px] font-bold">STAGE 1: Fast Boundary & Provenance Gateway</text>
              <text x="375" y="22" textAnchor="end" className="fill-[#06B6D4] text-[10px] font-mono font-bold">&lt; 0.5 ms</text>
              <text x="18" y="42" className="fill-[var(--muted)] text-[10px]">• Cryptographic source-tagging (Authenticated User vs. Untrusted Ingress)</text>
              <text x="18" y="58" className="fill-[var(--muted)] text-[10px]">• Instant perimeter abort of hard-banned tools (execute_shell, delete_db)</text>
            </g>

            {/* STAGE 2 */}
            <g transform="translate(20, 138)">
              <rect width="390" height="84" rx="8" fill="url(#grad-card)" className="stroke-[var(--border)]" strokeWidth="1" />
              <rect x="0" y="0" width="6" height="84" rx="3" fill="#10B981" />
              <text x="18" y="22" className="fill-[var(--text)] text-[11.5px] font-bold">STAGE 2: Deterministic Policy & Evidence Guard</text>
              <text x="375" y="22" textAnchor="end" className="fill-[#10B981] text-[10px] font-mono font-bold">&lt; 1.0 ms</text>
              <text x="18" y="42" className="fill-[var(--muted)] text-[10px]">• Parameter Evidence-Binding (untrusted text blocked from key params)</text>
              <text x="18" y="58" className="fill-[var(--muted)] text-[10px]">• Cumulative Effect Ledger (stops multi-turn budget draining attacks)</text>
              <text x="18" y="74" className="fill-[var(--muted)] text-[10px]">• Finite State Machine sequencing (auth -&gt; lookup -&gt; transfer)</text>
            </g>

            {/* STAGE 3 */}
            <g transform="translate(20, 234)">
              <rect width="390" height="72" rx="8" fill="url(#grad-card)" className="stroke-[var(--border)]" strokeWidth="1" />
              <rect x="0" y="0" width="6" height="72" rx="3" fill="#8B5CF6" />
              <text x="18" y="22" className="fill-[var(--text)] text-[11.5px] font-bold">STAGE 3: Semantic Invariant Verifier</text>
              <text x="375" y="22" textAnchor="end" className="fill-[#8B5CF6] text-[10px] font-mono font-bold">~ 150 ms</text>
              <text x="18" y="42" className="fill-[var(--muted)] text-[10px]">• Selective invocation: High-risk tools or outbound network requests</text>
              <text x="18" y="58" className="fill-[var(--muted)] text-[10px]">• Inspects Markdown image exfiltration &amp; indirect prompt injection</text>
            </g>
          </g>

          {/* Connection Arrows from Stage 3 to Egress */}
          <path d="M 680 240 L 725 240" stroke="#10B981" strokeWidth="2" markerEnd="url(#arrow-emerald)" />

          {/* 3. Egress Layer */}
          <g transform="translate(730, 90)">
            <rect
              width="150"
              height="300"
              rx="12"
              fill="url(#grad-card)"
              className="stroke-[var(--border)]"
              strokeWidth="1.2"
              filter="url(#shadow)"
            />
            <rect x="0" y="0" width="150" height="34" rx="12" fill="url(#grad-purple)" />
            <text x="75" y="22" textAnchor="middle" fill="#FFFFFF" className="text-[12px] font-bold">
              3. ENFORCEMENT
            </text>

            {/* Authorized */}
            <g transform="translate(14, 52)">
              <rect width="122" height="100" rx="8" className="fill-[var(--bg)] stroke-[#10B981]" strokeWidth="1.2" />
              <text x="10" y="24" className="fill-[#10B981] text-[11.5px] font-bold">✓ AUTHORIZED</text>
              <text x="10" y="42" className="fill-[var(--text)] text-[10px] font-semibold">Safe Execution</text>
              <text x="10" y="58" className="fill-[var(--muted)] text-[9px]">• Tool API executes</text>
              <text x="10" y="72" className="fill-[var(--muted)] text-[9px]">• Ledger updated</text>
              <text x="10" y="86" className="fill-[var(--muted)] text-[9px]">• Output taint tagged</text>
            </g>

            {/* Blocked */}
            <g transform="translate(14, 170)">
              <rect width="122" height="114" rx="8" className="fill-[var(--bg)] stroke-[#EF4444]" strokeWidth="1.2" />
              <text x="10" y="24" className="fill-[#EF4444] text-[11.5px] font-bold">✕ INTERCEPTED</text>
              <text x="10" y="42" className="fill-[var(--text)] text-[10px] font-semibold">Cryptographic Block</text>
              <text x="10" y="58" className="fill-[var(--muted)] text-[9px]">• Tool execution halted</text>
              <text x="10" y="72" className="fill-[var(--muted)] text-[9px]">• Zero fund loss ($0)</text>
              <text x="10" y="86" className="fill-[var(--muted)] text-[9px]">• Audit event emitted</text>
              <text x="10" y="100" className="fill-[var(--muted)] text-[9px]">• Agent receives error</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-[var(--muted)] px-2 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" /> Stage 1: Fast Boundary
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Stage 2: Evidence Guard
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Stage 3: Semantic Verifier
          </span>
        </div>
        <div className="text-[11px]">
          Topology Mode: <span className="text-[var(--accent)] font-semibold uppercase">{deploymentStyle}</span>
        </div>
      </div>
    </div>
  );
}
