"use client";

import React, { useEffect, useState } from "react";
import TelemetryCards from "./TelemetryCards";
import ActiveAlertsFeed from "./ActiveAlertsFeed";
import LiveAttackAuditBench from "./LiveAttackAuditBench";
import { Shield, Sparkles, ArrowRight } from "lucide-react";

interface DashboardViewProps {
  metricsData: any;
  simulationResult: any;
  runningSimulation: boolean;
  runSimulation: (scenarioId: string) => Promise<void>;
  runSimulationDefault: () => Promise<void>;
  selectedScenario: string;
  setSelectedScenario: (id: string) => void;
  setActiveTab: (tab: "dashboard" | "projects" | "settings") => void;
}

export default function DashboardView({
  metricsData,
  simulationResult,
  runningSimulation,
  runSimulation,
  runSimulationDefault,
  selectedScenario,
  setSelectedScenario,
  setActiveTab,
}: DashboardViewProps) {
  const [runtimeTelemetry, setRuntimeTelemetry] = useState<any>(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/metrics/telemetry");
        if (res.ok) {
          const data = await res.json();
          setRuntimeTelemetry(data);
        }
      } catch (err) {
        // Fallback gracefully
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome header without banned hero patterns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Operational Telemetry & Defense Overview
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Live auto-switching runtime metrics, multi-stage reference monitor telemetry, and empirical benchmarks
          </p>
        </div>

        <button
          onClick={() => setActiveTab("projects")}
          className="neu-card-sm self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50/50 transition-all rounded-xl"
        >
          <span>Manage Agent Projects</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* KPI Telemetry Cards */}
      <TelemetryCards
        metricsData={metricsData}
        runtimeTelemetry={runtimeTelemetry}
      />

      {/* Active Alerts and Live Audit Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 h-full">
          <ActiveAlertsFeed />
        </div>
        <div className="lg:col-span-2">
          <LiveAttackAuditBench
            simulationResult={simulationResult}
            runningSimulation={runningSimulation}
            runSimulation={runSimulation}
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
          />
        </div>
      </div>
    </div>
  );
}
