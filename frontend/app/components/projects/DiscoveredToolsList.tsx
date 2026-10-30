"use client";

import React from "react";
import { Wrench, Code, FileCode, AlertCircle, Shield, CheckCircle } from "lucide-react";

export interface DiscoveredTool {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
  source_file?: string;
  language?: string;
  effects?: string[];
  risk_level?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

interface DiscoveredToolsListProps {
  tools: DiscoveredTool[];
  emptyMessage?: string;
}

export default function DiscoveredToolsList({
  tools,
  emptyMessage = "No tools discovered yet. Upload a .zip code archive or select an agent template to extract tools via AST analysis.",
}: DiscoveredToolsListProps) {
  if (!tools || tools.length === 0) {
    return (
      <div className="neu-card-sm p-8 text-center text-slate-500 rounded-xl bg-white/60">
        <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        <p className="text-xs font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
        <span>Discovered Agent Tools ({tools.length})</span>
        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
          AST Token Usage: 0 Tokens
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tools.map((tool, idx) => {
          const lang = tool.language?.toLowerCase() || (tool.source_file?.endsWith(".ts") ? "typescript" : "python");
          const isFinancial =
            tool.name.includes("transfer") ||
            tool.name.includes("refund") ||
            tool.name.includes("payment");
          const isStateful = tool.effects?.includes("LEDGER_STATE") || isFinancial;

          return (
            <div
              key={`${tool.name}-${idx}`}
              className="neu-card-sm p-4 bg-white/80 border border-slate-200/80 rounded-xl hover:bg-white transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {tool.name}
                    </span>
                    {/* Language Badge */}
                    <span
                      className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                        lang === "typescript"
                          ? "bg-blue-100 text-blue-700"
                          : lang === "javascript"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {lang}
                    </span>
                  </div>

                  {/* Risk Badge */}
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isFinancial
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : isStateful
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isFinancial ? "FINANCIAL RISK" : isStateful ? "STATEFUL EFFECT" : "READ ONLY"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 mb-2 leading-relaxed line-clamp-2">
                  {tool.description || "Agent capability extracted directly from source function signature."}
                </p>

                {/* Parameters Schema Preview */}
                {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                  <div className="neu-inset p-2 rounded-lg bg-slate-50 font-mono text-[10px] text-slate-700 mb-2">
                    <span className="text-slate-400 font-sans block text-[9px] uppercase font-bold mb-0.5">
                      Parameters Schema:
                    </span>
                    <div className="space-y-0.5">
                      {Object.entries(tool.parameters).map(([paramName, paramType]) => (
                        <div key={paramName} className="flex items-center justify-between">
                          <span className="text-blue-700">{paramName}:</span>
                          <span className="text-slate-500">{typeof paramType === "object" ? JSON.stringify(paramType) : String(paramType)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Source file tag */}
              <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1 font-mono">
                  <FileCode className="h-3 w-3 text-slate-400" />
                  {tool.source_file || "source code AST"}
                </span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Guarded
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
