"use client";

import React, { useState } from "react";
import {
  Layers,
  ShieldAlert,
  GitBranch,
  ShieldCheck,
  Lock,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface AgentExecutionTrustGraphProps {
  activeStage?: string;
  blockedNode?: number | null;
  isRunning?: boolean;
}

interface GraphNode {
  id: number;
  name: string;
  stageCode: string;
  role: string;
  latency: string;
  details: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NODES: GraphNode[] = [
  {
    id: 1,
    name: "User Ingress",
    stageCode: "PRE_LLM_INGRESS",
    role: "Provenance Envelopes & Normalization",
    latency: "<0.05ms",
    details: "Strips zero-width characters, isolates untrusted user and tool outputs with cryptographic provenance wrappers.",
    icon: Layers,
  },
  {
    id: 2,
    name: "Zero-Token Sentinel",
    stageCode: "PRE_LLM_INGRESS",
    role: "Deterministic Script & Homoglyph Scan",
    latency: "<0.08ms",
    details: "Deterministic Unicode normalization and foreign script detector. Intercepts Cyrillic and Greek homoglyphs before tokenization.",
    icon: ShieldAlert,
  },
  {
    id: 3,
    name: "Auto-Switching",
    stageCode: "RUNTIME_DISPATCH",
    role: "Heuristic Classifier (RAG vs Full)",
    latency: "<0.12ms",
    details: "Dynamically classifies intent. Read-only queries route to Streamlined RAG (<0.1ms), tool-calling routes to Full Tri-Guard.",
    icon: GitBranch,
  },
  {
    id: 4,
    name: "Tri-Guard Monitor",
    stageCode: "POST_LLM_EGRESS",
    role: "TCEAV Latent Activations & Schema Guard",
    latency: "<0.35ms",
    details: "Inspects proposed tool arguments against synthesized schemas and probes latent concept activations for jailbreaks.",
    icon: ShieldCheck,
  },
  {
    id: 5,
    name: "State & Privacy Ledger",
    stageCode: "STATEFUL_LEDGER",
    role: "Atomic Cumulative Ledger & Redactor",
    latency: "<0.15ms",
    details: "Enforces session-wide budget caps, transactional locks, and sanitizes outgoing PII before external execution.",
    icon: Lock,
  },
];

export default function AgentExecutionTrustGraph({
  activeStage,
  blockedNode,
  isRunning,
}: AgentExecutionTrustGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode>(NODES[1]);

  const getNodeStatus = (node: GraphNode) => {
    if (blockedNode === node.id) {
      return "blocked";
    }
    if (isRunning && activeStage === node.stageCode) {
      return "active";
    }
    return "ready";
  };

  return (
    <div className="theme-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Agent Execution & Trust Graph
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Sub-millisecond verification pipeline traversed on every agent prompt & tool invocation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-secondary)]">
            <span
              className={`h-2 w-2 rounded-full ${
                isRunning ? "bg-cyan-400 animate-ping" : "bg-emerald-400"
              }`}
            />
            {isRunning ? "PROCESSING STAGE" : "TRUST CHAIN VERIFIED"}
          </span>
        </div>
      </div>

      {/* 5-Node Interactive Workflow Chain */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 relative">
        {NODES.map((node, idx) => {
          const status = getNodeStatus(node);
          const Icon = node.icon;
          const isSelected = selectedNode.id === node.id;

          let cardStyle = "border-[var(--border-color)] bg-[var(--surface-card)]";
          let badgeStyle = "text-[var(--text-secondary)] bg-[var(--surface-inset)]";

          if (status === "blocked") {
            cardStyle = "border-rose-500/80 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
            badgeStyle = "text-rose-400 bg-rose-500/20";
          } else if (status === "active") {
            cardStyle = "border-cyan-400/80 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-pulse";
            badgeStyle = "text-cyan-400 bg-cyan-500/20";
          } else if (isSelected) {
            cardStyle = "border-[var(--accent-primary)] bg-[var(--surface-card-hover)] shadow-sm";
            badgeStyle = "text-blue-400 bg-blue-500/10";
          }

          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedNode(node)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${cardStyle}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-[var(--border-color)] ${badgeStyle}`}>
                    0{node.id}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                    {node.latency}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-4 w-4 text-[var(--accent-primary)]" />
                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {node.name}
                  </h4>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {node.role}
                </p>
              </div>

              {/* Status Badge */}
              <div className="mt-3 pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  {status === "blocked" ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Blocked
                    </span>
                  ) : status === "active" ? (
                    <span className="text-cyan-400 flex items-center gap-1">
                      <Activity className="h-3 w-3 animate-spin" /> Active
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  )}
                </span>
                {idx < 4 && (
                  <span className="hidden sm:inline text-[var(--text-muted)]">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Node Details Drawer */}
      <div className="p-3.5 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Stage: {selectedNode.stageCode}
            </span>
            <span className="font-bold text-[var(--text-primary)]">
              {selectedNode.name} Enforcement Contract
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {selectedNode.details}
          </p>
        </div>
        <div className="flex sm:flex-col items-end gap-1 font-mono text-[11px] text-[var(--text-secondary)] shrink-0">
          <span>Determinism SLA: {selectedNode.latency}</span>
          <span className="text-emerald-400">Zero-Token Verified</span>
        </div>
      </div>
    </div>
  );
}

