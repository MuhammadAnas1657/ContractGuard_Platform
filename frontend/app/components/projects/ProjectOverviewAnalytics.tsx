"use client";

import React from "react";
import { FolderGit2, Wrench, ShieldCheck, Zap } from "lucide-react";

interface ProjectOverviewAnalyticsProps {
  totalProjects: number;
  totalTools: number;
  activePoliciesCount: number;
  streamlinedRate?: number;
}

export default function ProjectOverviewAnalytics({
  totalProjects,
  totalTools,
  activePoliciesCount,
  streamlinedRate = 68.4,
}: ProjectOverviewAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Projects */}
      <div className="theme-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Total Projects
          </span>
          <div className="p-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
            <FolderGit2 className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl font-black text-[var(--text-primary)]">{totalProjects}</span>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">Guarded agent repositories</p>
        </div>
      </div>

      {/* Card 2: Discovered Tools */}
      <div className="theme-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Discovered Tools
          </span>
          <div className="p-2 rounded-xl bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
            <Wrench className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl font-black text-[var(--text-primary)]">{totalTools}</span>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">AST extracted capabilities</p>
        </div>
      </div>

      {/* Card 3: Active Policies */}
      <div className="theme-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Approved Policies
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl font-black text-[var(--text-primary)]">{activePoliciesCount}</span>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">Frozen contracts.yaml drafts</p>
        </div>
      </div>

      {/* Card 4: Auto-Switching */}
      <div className="theme-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Tri-Guard Protection
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl font-black text-[var(--text-primary)]">{streamlinedRate}%</span>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">Streamlined RAG bypass ratio</p>
        </div>
      </div>
    </div>
  );
}
