"use client";

import React, { useState } from "react";
import {
  Cpu,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Lock,
  Sparkles,
} from "lucide-react";

interface CredentialsConfigProps {
  token?: string | null;
}

export default function CredentialsConfig({ token }: CredentialsConfigProps) {
  // Nebius State
  const [nebiusKey, setNebiusKey] = useState("");
  const [testingNebius, setTestingNebius] = useState(false);
  const [nebiusResult, setNebiusResult] = useState<any>(null);

  // NVIDIA Language Detection State
  const [testText, setTestText] = useState(
    "Por favor verifique el balance de la cuenta del cliente #9921."
  );
  const [testingLanguage, setTestingLanguage] = useState(false);
  const [languageResult, setLanguageResult] = useState<any>(null);

  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null);
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    return headers;
  };

  const handleTestNebius = async () => {
    setTestingNebius(true);
    setNebiusResult(null);
    try {
      const res = await fetch("/api/nebius/test-connection", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ api_key: nebiusKey.trim() || undefined }),
      });
      const data = await res.json();
      setNebiusResult({
        ok: res.ok,
        data,
      });
    } catch (err: any) {
      setNebiusResult({
        ok: false,
        data: { message: err.message || "Failed to contact Nebius API endpoint." },
      });
    } finally {
      setTestingNebius(false);
    }
  };

  const handleTestLanguage = async () => {
    if (!testText.trim()) return;
    setTestingLanguage(true);
    setLanguageResult(null);
    try {
      const res = await fetch("/api/v1/language/detect", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ text: testText.trim() }),
      });
      const data = await res.json();
      setLanguageResult(data);
    } catch (err: any) {
      setLanguageResult({ error: err.message || "Language detection failed" });
    } finally {
      setTestingLanguage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Nebius Token Factory Cloud Section */}
      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 neu-card-sm">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Nebius Token Factory Cloud
              </h3>
              <p className="text-xs text-slate-500">
                High-throughput Nemotron-70B model provider credentials and health check
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Provider Ready
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Nebius Token Factory API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={nebiusKey}
                onChange={(e) => setNebiusKey(e.target.value)}
                placeholder="Optional: Enter Nebius Token Factory Cloud key to override local sandbox"
                className="w-full neu-inset px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleTestNebius}
                disabled={testingNebius}
                className="neu-btn-primary px-4 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl shadow-sm hover:bg-purple-700 transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
              >
                {testingNebius ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {nebiusResult && (
            <div
              className={`neu-card-sm p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                nebiusResult.ok
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {nebiusResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-bold block">
                  {nebiusResult.ok ? "Connection Successful" : "Connection Test Failed"}
                </span>
                <p className="text-[11px] leading-relaxed">
                  {nebiusResult.data?.message || JSON.stringify(nebiusResult.data)}
                </p>
                {nebiusResult.data?.latency_ms !== undefined && (
                  <span className="text-[10px] font-mono font-semibold">
                    Round-trip Latency: {nebiusResult.data.latency_ms.toFixed(1)}ms
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. NVIDIA LLM API & Language Detection Bench */}
      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 neu-card-sm">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                NVIDIA LLM API Language & Homoglyph Sentinel
              </h3>
              <p className="text-xs text-slate-500">
                Live language detection, mixed-script identification, and Unicode homoglyph spoofing defense
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
            NVIDIA Cloud
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Test Prompt String
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter sample prompt in any language or with suspected homoglyphs..."
                className="w-full neu-inset px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleTestLanguage}
                disabled={testingLanguage || !testText.trim()}
                className="neu-btn-primary px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
              >
                {testingLanguage ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                <span>Inspect Language</span>
              </button>
            </div>
          </div>

          {languageResult && (
            <div className="neu-card-sm p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  Inspection Outcome
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  /v1/language/detect
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Language
                  </span>
                  <span className="text-sm font-bold text-slate-900 uppercase">
                    {languageResult.language || "unknown"}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Confidence
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {languageResult.confidence !== undefined
                      ? `${(languageResult.confidence * 100).toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Foreign Script
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      languageResult.is_foreign_script
                        ? "text-rose-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {languageResult.is_foreign_script ? "DETECTED" : "NONE"}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Homoglyph Spoofing
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      languageResult.homoglyph_detected
                        ? "text-rose-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {languageResult.homoglyph_detected ? "DETECTED" : "NONE"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
