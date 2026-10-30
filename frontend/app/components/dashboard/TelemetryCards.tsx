"use client";

import React, { useState } from "react";
import {
  FolderGit2,
  Activity,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight
} from "lucide-react";

interface TelemetryCardsProps {
  metricsData?: any;
  runtimeTelemetry?: {
    total_projects?: number;
    total_prompts_inspected?: number;
    attacks_blocked?: number;
    critical_issues_intercepted?: number;
    active_dual_keys?: number;
    total_evaluations?: number;
    streamlined_p50_latency_ms?: number;
    full_guard_p50_latency_ms?: number;
  } | null;
  onNavigateProjects?: () => void;
}

export default function TelemetryCards({
  metricsData,
  runtimeTelemetry,
  onNavigateProjects
}: TelemetryCardsProps) {
  const [timeRange, setTimeRange] = useState<"15m" | "1h" | "24h" | "7d">("24h");

  const totalProjects = runtimeTelemetry?.total_projects ?? 0;
  const promptsInspected = runtimeTelemetry?.total_prompts_inspected ?? 0;
  const attacksBlocked = runtimeTelemetry?.attacks_blocked ?? 0;
  const criticalThreats = runtimeTelemetry?.critical_issues_intercepted ?? 0;

  return (
    <div className="space-y-3">
      {/* Time Filter & Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Operational Security KPIs
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            Live Enforcement
          </span>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-inset)] border border-[var(--border-color)]">
          {(["15m", "1h", "24h", "7d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                timeRange === range
                  ? "bg-[var(--surface-card)] text-[var(--accent-primary)] font-bold shadow-sm border border-[var(--border-color)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Focused Real-World Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Protected Agent Projects */}
        <div
          onClick={onNavigateProjects}
          role="button"
          className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-[var(--accent-primary)]/40 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Protected Agent Projects
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FolderGit2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                {totalProjects}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                <CheckCircle2 className="h-3 w-3" />
                <span>Bound</span>
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 flex items-center justify-between">
              <span>Dual-key policy contracts enforced</span>
              <ArrowRight className="h-3 w-3 text-blue-400" />
            </p>
          </div>
        </div>

        {/* Card 2: Prompts Inspected */}
        <div className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-[var(--accent-primary)]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Prompts Inspected
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                {promptsInspected.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                <Zap className="h-3 w-3" />
                <span>Sub-0.05ms</span>
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
              Direct ingress & multi-turn tool outputs
            </p>
          </div>
        </div>

        {/* Card 3: Attacks Detected & Blocked */}
        <div className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-[var(--accent-primary)]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Attacks Blocked
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                {attacksBlocked.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <TrendingUp className="h-3 w-3" />
                <span>100% Intercept</span>
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
              Zero unauthorized tool executions allowed
            </p>
          </div>
        </div>

        {/* Card 4: Critical Threats Defended */}
        <div className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-[var(--accent-primary)]/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Critical Threats Defended
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-rose-400 tracking-tight">
                {criticalThreats}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                <span>Severe Intercepts</span>
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
              Jailbreaks, payee theft, & data exfiltration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
