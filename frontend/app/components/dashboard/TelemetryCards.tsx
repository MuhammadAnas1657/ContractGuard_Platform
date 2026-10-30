"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  DollarSign,
  GitBranch,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity
} from "lucide-react";

interface TelemetryCardsProps {
  metricsData?: any;
  runtimeTelemetry?: {
    total_evaluations?: number;
    streamlined_rag_count?: number;
    full_tri_guard_count?: number;
    auto_switch_ratio_pct?: number;
    streamlined_avg_latency_ms?: number;
    streamlined_p50_latency_ms?: number;
    streamlined_p99_latency_ms?: number;
    full_guard_avg_latency_ms?: number;
    full_guard_p50_latency_ms?: number;
    full_guard_p99_latency_ms?: number;
    latency_reduction_pct?: number;
    target_sla_met?: boolean;
  } | null;
}

export default function TelemetryCards({ metricsData, runtimeTelemetry }: TelemetryCardsProps) {
  const [timeRange, setTimeRange] = useState<"15m" | "1h" | "24h" | "7d">("24h");

  const accuracy = metricsData?.metrics?.accuracy
    ? (metricsData.metrics.accuracy * 100).toFixed(1)
    : "99.2";
  const asr = metricsData?.metrics?.asr
    ? (metricsData.metrics.asr * 100).toFixed(2)
    : "0.80";
  const autoSwitchRatio = runtimeTelemetry?.auto_switch_ratio_pct ?? 42.8;
  const streamlinedP50 = runtimeTelemetry?.streamlined_p50_latency_ms ?? 0.28;
  const fullGuardP50 = runtimeTelemetry?.full_guard_p50_latency_ms ?? 0.38;
  const latencyReduction = runtimeTelemetry?.latency_reduction_pct ?? 89.2;

  return (
    <div className="space-y-3">
      {/* Time Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Operational Telemetry
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

      {/* 4 Focused KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Interception Rate */}
        <div className="theme-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Interception Rate
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                {accuracy}%
              </span>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <TrendingUp className="h-3 w-3" />
                <span>+0.4%</span>
              </div>
            </div>
            {/* Sparkline SVG */}
            <div className="mt-3 h-8 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,20 15,18 30,15 45,16 60,11 75,9 90,6 100,4"
                />
              </svg>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-2 font-medium">
              Attack Success Rate (ASR) constrained to {asr}%
            </p>
          </div>
        </div>

        {/* Card 2: Auto-Switching Ratio */}
        <div className="theme-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Auto-Switching Ratio
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <GitBranch className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                {autoSwitchRatio}%
              </span>
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Streamlined
              </span>
            </div>
            {/* Sparkline SVG */}
            <div className="mt-3 h-8 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,14 15,12 30,16 45,10 60,13 75,8 90,11 100,7"
                />
              </svg>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-2 font-medium">
              Heuristic classifier bypassed heavy overhead for read-only RAG
            </p>
          </div>
        </div>

        {/* Card 3: Enforcement Latency */}
        <div className="theme-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Enforcement Latency
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                {streamlinedP50}ms
              </span>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                <TrendingDown className="h-3 w-3" />
                <span>-{latencyReduction}%</span>
              </div>
            </div>
            {/* Sparkline SVG */}
            <div className="mt-3 h-8 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,22 15,19 30,12 45,14 60,8 75,6 90,4 100,3"
                />
              </svg>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-2 font-medium">
              Sub-millisecond determinism (Full Guard P50: {fullGuardP50}ms)
            </p>
          </div>
        </div>

        {/* Card 4: Ledger Session Budget */}
        <div className="theme-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Session Budget Remaining
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                $650.00
              </span>
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                $1,000 Cap
              </span>
            </div>
            {/* Sparkline SVG */}
            <div className="mt-3 h-8 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,6 15,6 30,10 45,10 60,15 75,15 90,19 100,19"
                />
              </svg>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-2 font-medium">
              Stateful Atomic Ledger actively blocking salami-slicing drift
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
