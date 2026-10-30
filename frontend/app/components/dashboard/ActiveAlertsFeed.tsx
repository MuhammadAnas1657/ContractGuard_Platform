"use client";

import React from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, Clock, Terminal, Filter } from "lucide-react";

interface AlertEvent {
  id: string;
  timestamp: string;
  threatType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  stage: "PRE_LLM_INGRESS" | "POST_LLM_EGRESS" | "STATEFUL_LEDGER";
  decision: "BLOCKED" | "SANITIZED" | "QUARANTINED";
  summary: string;
  session_id: string;
}

const SAMPLE_ALERTS: AlertEvent[] = [
  {
    id: "alt-01",
    timestamp: "Just now",
    threatType: "INDIRECT_PROMPT_INJECTION",
    severity: "CRITICAL",
    stage: "POST_LLM_EGRESS",
    decision: "BLOCKED",
    summary: "Exfiltration payload intercepted in tool call parameters targeting external webhook",
    session_id: "sess_rag_92a10",
  },
  {
    id: "alt-02",
    timestamp: "2 mins ago",
    threatType: "SALAMI_SLICING_BUDGET_EXHAUSTION",
    severity: "HIGH",
    stage: "STATEFUL_LEDGER",
    decision: "BLOCKED",
    summary: "Micro-transaction transfer_funds ($95.00) breached cumulative session ceiling ($1,000.00)",
    session_id: "sess_fin_41b8c",
  },
  {
    id: "alt-03",
    timestamp: "5 mins ago",
    threatType: "FOREIGN_SCRIPT_HOMOGLYPH",
    severity: "HIGH",
    stage: "PRE_LLM_INGRESS",
    decision: "BLOCKED",
    summary: "Cyrillic homoglyph mixed script detected via NVIDIA LLM language validation",
    session_id: "sess_ing_112e4",
  },
  {
    id: "alt-04",
    timestamp: "12 mins ago",
    threatType: "DELIMITER_TOKEN_INJECTION",
    severity: "MEDIUM",
    stage: "PRE_LLM_INGRESS",
    decision: "SANITIZED",
    summary: "Special tokens <|im_start|> and markdown quote delimiters sanitized by InputNormalizer",
    session_id: "sess_norm_88a91",
  },
];

export default function ActiveAlertsFeed() {
  const [filterSeverity, setFilterSeverity] = React.useState<string>("ALL");
  const [liveAlerts, setLiveAlerts] = React.useState<AlertEvent[]>(SAMPLE_ALERTS);

  React.useEffect(() => {
    const fetchRecentAlerts = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/v1/alerts/recent", { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.alerts) && data.alerts.length > 0) {
            setLiveAlerts([...data.alerts, ...SAMPLE_ALERTS].slice(0, 12));
          }
        }
      } catch (err) {
        // Retain seed alerts on network error
      }
    };
    fetchRecentAlerts();
    const timer = setInterval(fetchRecentAlerts, 10000);
    return () => clearInterval(timer);
  }, []);

  const filteredAlerts =
    filterSeverity === "ALL"
      ? liveAlerts
      : liveAlerts.filter((a) => a.severity === filterSeverity);

  return (
    <div className="neu-card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 neu-card-sm">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Active Security Alerts Feed
            </h3>
            <p className="text-xs text-slate-500">
              Real-time Tri-Guard event interception & defense audit stream
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 text-xs">
          {["ALL", "CRITICAL", "HIGH"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filterSeverity === sev
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="neu-card-sm p-4 border border-slate-200/80 bg-white/70 hover:bg-white transition-all rounded-xl"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    alert.severity === "CRITICAL"
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {alert.severity}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {alert.threatType.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                <Clock className="h-3 w-3" />
                {alert.timestamp}
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
              {alert.summary}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
              <span className="font-mono text-slate-500">
                Session: <span className="font-semibold text-slate-700">{alert.session_id}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-[10px]">
                  {alert.stage.replace(/_/g, " ")}
                </span>
                <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] uppercase">
                  {alert.decision}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
