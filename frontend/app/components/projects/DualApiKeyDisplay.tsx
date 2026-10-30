"use client";

import React, { useState } from "react";
import { Key, Copy, Check, ShieldCheck, Zap, Lock, Eye, EyeOff, RefreshCw } from "lucide-react";

interface DualApiKeyDisplayProps {
  ingressKey?: {
    key_prefix: string;
    raw_key?: string;
    key_id?: string;
  } | null;
  egressKey?: {
    key_prefix: string;
    raw_key?: string;
    key_id?: string;
  } | null;
  projectId?: string;
  token?: string | null;
}

export default function DualApiKeyDisplay({
  ingressKey,
  egressKey,
  projectId,
  token,
}: DualApiKeyDisplayProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRawKeys, setShowRawKeys] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [rotatedIngress, setRotatedIngress] = useState<any>(null);
  const [rotatedEgress, setRotatedEgress] = useState<any>(null);

  const effectiveIngress = rotatedIngress || ingressKey;
  const effectiveEgress = rotatedEgress || egressKey;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRotateKeys = async () => {
    if (!projectId) return;
    setRotating(true);
    try {
      const headers: Record<string, string> = {};
      const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null);
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/project/${projectId}/rotate-keys`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setRotatedIngress(data.ingress_key || data.dual_keys?.ingress || null);
        setRotatedEgress(data.egress_key || data.dual_keys?.egress || null);
        setShowRawKeys(true);
      }
    } catch (err) {
      console.error("Failed to rotate dual keys:", err);
    } finally {
      setRotating(false);
    }
  };

  const ingVal = showRawKeys && effectiveIngress?.raw_key ? effectiveIngress.raw_key : effectiveIngress?.key_prefix || "cgx_ing_••••••••••••••••";
  const egrVal = showRawKeys && effectiveEgress?.raw_key ? effectiveEgress.raw_key : effectiveEgress?.key_prefix || "cgx_egr_••••••••••••••••";

  return (
    <div className="space-y-4">
      {/* Header and Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-600" />
            Project Tri-Guard Dual API Keys
          </h4>
          <p className="text-xs text-slate-500">
            Dedicated pre-LLM and post-LLM cryptographic monitor credentials
          </p>
        </div>

        <div className="flex items-center gap-2">
          {projectId && (
            <button
              onClick={handleRotateKeys}
              disabled={rotating}
              className="neu-card-sm px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/70 flex items-center gap-1.5 hover:bg-blue-100 rounded-lg transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${rotating ? "animate-spin" : ""}`} />
              <span>{rotating ? "Generating..." : "Rotate & Reveal Keys"}</span>
            </button>
          )}
          {(effectiveIngress?.raw_key || effectiveEgress?.raw_key) && (
            <button
              onClick={() => setShowRawKeys(!showRawKeys)}
              className="neu-card-sm px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-white rounded-lg transition-all"
            >
              {showRawKeys ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showRawKeys ? "Hide Secret Keys" : "Reveal Secret Keys"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Keys Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pre-LLM Ingress Key Card */}
        <div className="neu-card-sm p-4 border border-blue-200/90 bg-blue-50/20 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Pre-LLM Ingress Key
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                /v1/guard/ingress
              </span>
            </div>
            <h5 className="text-xs font-bold text-slate-900 mb-1">
              Front-Line Input Sentinel
            </h5>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
              Intercepts incoming prompts. Enforces NVIDIA LLM language validation, Unicode homoglyph normalization, and vector attack database matching.
            </p>
            <div className="neu-inset p-2.5 rounded-lg bg-slate-900 font-mono text-xs text-blue-300 flex items-center justify-between">
              <span className="truncate mr-2 select-all">{ingVal}</span>
              <button
                onClick={() =>
                  copyToClipboard(
                    effectiveIngress?.raw_key || effectiveIngress?.key_prefix || "",
                    "ingress"
                  )
                }
                title="Copy Ingress Key"
                className="p-1 hover:text-white transition-all text-slate-400"
              >
                {copiedKey === "ingress" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-blue-100/80 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Role: Ingress Guard</span>
            <span>Target SLA: &lt; 0.1ms</span>
          </div>
        </div>

        {/* Post-LLM Egress Key Card */}
        <div className="neu-card-sm p-4 border border-emerald-200/90 bg-emerald-50/20 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Post-LLM Egress Key
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                /v1/guard/egress
              </span>
            </div>
            <h5 className="text-xs font-bold text-slate-900 mb-1">
              Stateful Reference Monitor
            </h5>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
              Placed behind LLM before tool invocation. Enforces parameter provenance, cumulative session ledger budget, and markdown sanitization.
            </p>
            <div className="neu-inset p-2.5 rounded-lg bg-slate-900 font-mono text-xs text-emerald-300 flex items-center justify-between">
              <span className="truncate mr-2 select-all">{egrVal}</span>
              <button
                onClick={() =>
                  copyToClipboard(
                    effectiveEgress?.raw_key || effectiveEgress?.key_prefix || "",
                    "egress"
                  )
                }
                title="Copy Egress Key"
                className="p-1 hover:text-white transition-all text-slate-400"
              >
                {copiedKey === "egress" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-100/80 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Role: Egress Reference Monitor</span>
            <span>Ledger Budget: $1,000.00</span>
          </div>
        </div>
      </div>

      {/* Runtime Auto-Switching Indicator */}
      <div className="neu-card-sm p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700 neu-card-sm shrink-0">
          <Zap className="h-4 w-4" />
        </div>
        <div className="text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-900">
              Runtime Auto-Switching Architecture
            </span>
            <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
              ACTIVE
            </span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            The dual-key gateway dynamically classifies requests. Pure RAG / text summarization executes in{" "}
            <span className="font-semibold text-blue-700">STREAMLINED_RAG</span> mode (&lt;0.1ms overhead, bypassing tool provenance locks).
            Tool calling requests enforce{" "}
            <span className="font-semibold text-emerald-700">FULL_TRI_GUARD</span> inspection (5-stage deep verification, parameter constraints, and ledger locks).
          </p>
        </div>
      </div>
    </div>
  );
}
