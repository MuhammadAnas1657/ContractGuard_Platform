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
      <div className="neu-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Projects
          </span>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 neu-card-sm">
            <FolderGit2 className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl font-black text-slate-900">{totalProjects}</span>
          <p className="text-[11px] text-slate-500 mt-1">Guarded agent repositories</p>
        </div>
      </div>

      {/* Card 2: Discovered Tools */}
      <div className="neu-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Discovered Tools
          </span>
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 neu-card-sm">
            <Wrench className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl font-black text-slate-900">{totalTools}</span>
          <p className="text-[11px] text-slate-500 mt-1">AST extracted capabilities</p>
        </div>
      </div>

      {/* Card 3: Active Policies */}
      <div className="neu-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Approved Policies
          </span>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 neu-card-sm">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl font-black text-slate-900">{activePoliciesCount}</span>
          <p className="text-[11px] text-slate-500 mt-1">Frozen contracts.yaml drafts</p>
        </div>
      </div>

      {/* Card 4: Auto-Switching */}
      <div className="neu-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Tri-Guard Protection
          </span>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 neu-card-sm">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl font-black text-slate-900">{streamlinedRate}%</span>
          <p className="text-[11px] text-slate-500 mt-1">Streamlined RAG bypass ratio</p>
        </div>
      </div>
    </div>
  );
}
