"use client";

import React, { useEffect, useState } from "react";
import TelemetryCards from "./TelemetryCards";
import AgentExecutionTrustGraph from "./AgentExecutionTrustGraph";
import LiveAttackAuditBench from "./LiveAttackAuditBench";
import ActiveAlertsFeed from "./ActiveAlertsFeed";
import { ArrowRight, Shield } from "lucide-react";

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
  const [activeStage, setActiveStage] = useState<string>("PRE_LLM_INGRESS");
  const [blockedNode, setBlockedNode] = useState<number | null>(4);

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

  const handleStageChange = (stage: string, node: number | null) => {
    setActiveStage(stage);
    setBlockedNode(node);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Streamlined View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            Operational Telemetry & Defense Overview
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Live auto-switching runtime metrics, multi-stage reference monitor telemetry, and empirical benchmarks
          </p>
        </div>

        <button
          onClick={() => setActiveTab("projects")}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[var(--accent-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-color)] transition-all rounded-lg shadow-sm"
        >
          <span>Manage Agent Projects</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* SECTION 1: Top-Level KPI Telemetry Cards */}
      <TelemetryCards
        metricsData={metricsData}
        runtimeTelemetry={runtimeTelemetry}
      />

      {/* SECTION 2: Agent Execution & Trust Graph */}
      <AgentExecutionTrustGraph
        activeStage={activeStage}
        blockedNode={blockedNode}
        isRunning={runningSimulation}
      />

      {/* SECTION 3 & 4: Live Attack Audit Bench & Active Security Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <LiveAttackAuditBench
            simulationResult={simulationResult}
            runningSimulation={runningSimulation}
            runSimulation={runSimulation}
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
            onStageChange={handleStageChange}
          />
        </div>
        <div className="lg:col-span-1 h-full">
          <ActiveAlertsFeed />
        </div>
      </div>
    </div>
  );
}
