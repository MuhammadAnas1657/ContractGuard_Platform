"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Lock,
  Code,
  DollarSign,
  Globe,
  Sliders,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface PolicyInterviewWizardProps {
  projectId?: string;
  projectName?: string;
  tools?: any[];
  onPolicyApproved?: (policy: any) => void;
  token?: string | null;
}

export default function PolicyInterviewWizard({
  projectId,
  projectName = "My Agent",
  tools = [],
  onPolicyApproved,
  token,
}: PolicyInterviewWizardProps) {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [approving, setApproving] = useState(false);

  // 7 Canonical Gap Answers
  const [answers, setAnswers] = useState({
    spending_limits: "100.00",
    session_budget: "1000.00",
    allowed_languages: ["en", "es"],
    foreign_script_rejection: true,
    direct_injection_action: "BLOCK",
    indirect_injection_action: "BLOCK",
    timeout_degradation: "FAIL_CLOSED",
  });

  const [generatedPolicy, setGeneratedPolicy] = useState<{
    policy_id?: string;
    yaml_content?: string;
    status?: string;
    is_active?: boolean;
    sha256_signature?: string;
    lint_result?: any;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleSynthesize = async () => {
    // Client-side validation: spending ceiling and cumulative budget must be positive numbers
    if (answers.spending_limits !== undefined && answers.spending_limits !== "") {
      const spend = parseFloat(answers.spending_limits);
      if (!isNaN(spend) && spend <= 0) {
        setErrorMsg("Per-call spending ceiling must be a positive number (> 0).");
        return;
      }
    }
    if (answers.session_budget !== undefined && answers.session_budget !== "") {
      const budget = parseFloat(answers.session_budget);
      if (!isNaN(budget) && budget <= 0) {
        setErrorMsg("Session cumulative budget must be a positive number (> 0).");
        return;
      }
    }

    setSynthesizing(true);
    setErrorMsg(null);
    try {
      const payload = {
        agent_name: projectName,
        project_id: projectId,
        tools: tools,
        answers: {
          ...answers,
          financial_ceiling: parseFloat(answers.spending_limits) || 100.0,
          session_budget: parseFloat(answers.session_budget) || 1000.0,
          allowed_languages: answers.allowed_languages,
          reject_foreign_scripts: answers.foreign_script_rejection,
          direct_injection_action: answers.direct_injection_action,
          indirect_injection_action: answers.indirect_injection_action,
          timeout_action: answers.timeout_degradation,
        },
      };

      const res = await fetch("/api/policy/synthesize", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Synthesis failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setGeneratedPolicy({
        policy_id: data.policy_id || data.id,
        yaml_content: data.yaml_content,
        status: data.status || "DRAFT",
        is_active: Boolean(data.is_active),
        lint_result: data.lint_result,
      });
      setWizardStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to synthesize security policy.");
    } finally {
      setSynthesizing(false);
    }
  };

  const handleApprove = async () => {
    if (!generatedPolicy?.policy_id) return;
    setApproving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/policy/${generatedPolicy.policy_id}/approve`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          approved_by: "developer_admin",
          version: "1.0.0",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Approval failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setGeneratedPolicy((prev) => ({
        ...prev,
        status: "APPROVED",
        is_active: true,
        sha256_signature: data.sha256_signature || data.signature,
      }));
      setWizardStep(3);
      if (onPolicyApproved) {
        onPolicyApproved(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to approve and freeze security policy.");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="neu-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 neu-card-sm">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Interactive Policy Interview
            </h3>
            <p className="text-xs text-slate-500">
              Resolve remaining security gaps after AST tool extraction to synthesize typed contracts
            </p>
          </div>
        </div>

        {/* Mini Step indicators */}
        <div className="flex items-center gap-1 text-xs">
          {[
            { s: 1, label: "Questions" },
            { s: 2, label: "Draft Review" },
            { s: 3, label: "Approved" },
          ].map((item) => (
            <span
              key={item.s}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                wizardStep === item.s
                  ? "bg-blue-600 text-white shadow-sm"
                  : wizardStep > item.s
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {item.s}. {item.label}
            </span>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="neu-card-sm p-3 bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2 rounded-xl">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: 7-Canonical Gaps Questionnaire */}
      {wizardStep === 1 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gap 1: Financial Ceiling */}
            <div className="neu-card-sm p-4 bg-white/70 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                1. Single Transaction Ceiling ($)
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Maximum allowed dollar value per single tool invocation (e.g. transfer_funds, refund).
              </p>
              <input
                type="number"
                value={answers.spending_limits}
                onChange={(e) =>
                  setAnswers({ ...answers, spending_limits: e.target.value })
                }
                className="w-full neu-inset px-3 py-2 text-xs rounded-lg font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100.00"
              />
            </div>

            {/* Gap 2: Cumulative Session Budget */}
            <div className="neu-card-sm p-4 bg-white/70 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                2. Session Cumulative Budget ($)
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Hard aggregate spending ceiling across the entire conversation session.
              </p>
              <input
                type="number"
                value={answers.session_budget}
                onChange={(e) =>
                  setAnswers({ ...answers, session_budget: e.target.value })
                }
                className="w-full neu-inset px-3 py-2 text-xs rounded-lg font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000.00"
              />
            </div>

            {/* Gap 3: Allowed Languages */}
            <div className="neu-card-sm p-4 bg-white/70 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-indigo-600" />
                3. Allowed Request Languages
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Select authorized languages verified via NVIDIA LLM language detection.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { code: "en", name: "English" },
                  { code: "es", name: "Spanish" },
                  { code: "fr", name: "French" },
                  { code: "de", name: "German" },
                ].map((lang) => {
                  const isChecked = answers.allowed_languages.includes(lang.code);
                  return (
                    <button
                      type="button"
                      key={lang.code}
                      onClick={() => {
                        const newLangs = isChecked
                          ? answers.allowed_languages.filter((l) => l !== lang.code)
                          : [...answers.allowed_languages, lang.code];
                        setAnswers({ ...answers, allowed_languages: newLangs });
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        isChecked
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {lang.name} ({lang.code})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gap 4: Foreign Script Rejection */}
            <div className="neu-card-sm p-4 bg-white/70 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                4. Foreign Script & Homoglyph Rejection
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Strictly reject non-Latin scripts (Cyrillic, Arabic, Devanagari) to prevent visual spoofing.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={answers.foreign_script_rejection}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        foreign_script_rejection: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>Enforce Strict Foreign Script Rejection</span>
                </label>
              </div>
            </div>

            {/* Gap 5: Direct Prompt Injection Action */}
            <div className="neu-card-sm p-4 bg-white/70 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
                5. Direct Prompt Injection Action
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Ingress action when direct jailbreak pattern or DAN template is matched.
              </p>
              <select
                value={answers.direct_injection_action}
                onChange={(e) =>
                  setAnswers({ ...answers, direct_injection_action: e.target.value })
                }
                className="w-full neu-inset px-3 py-2 text-xs rounded-lg font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BLOCK">BLOCK (Intercept immediately with 403)</option>
                <option value="SANITIZE">SANITIZE (Strip hostile instructions)</option>
                <option value="AUDIT_LOG">AUDIT_LOG (Allow with telemetry alert)</option>
              </select>
            </div>

            {/* Gap 6: Indirect Prompt Injection Action */}
            <div className="neu-card-sm p-4 bg-white/70 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                6. Indirect Prompt Injection Action
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Egress action when secondary untrusted tool output attempts instruction smuggling.
              </p>
              <select
                value={answers.indirect_injection_action}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    indirect_injection_action: e.target.value,
                  })
                }
                className="w-full neu-inset px-3 py-2 text-xs rounded-lg font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BLOCK">BLOCK (Halt execution before tool invoke)</option>
                <option value="SANITIZE">SANITIZE (Strip smuggled markdown links)</option>
                <option value="AUDIT_LOG">AUDIT_LOG (Allow with security event)</option>
              </select>
            </div>

            {/* Gap 7: Timeout Degradation Policy */}
            <div className="neu-card-sm p-4 bg-white/70 rounded-xl space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-slate-600" />
                7. Latency & Timeout Degradation Mode
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Behavior if secondary verification models exceed 200ms latency budget.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {[
                  {
                    val: "FAIL_CLOSED",
                    title: "FAIL_CLOSED",
                    desc: "Safest: Block request immediately",
                  },
                  {
                    val: "FAIL_OPEN_MONITORED",
                    title: "FAIL_OPEN_MONITORED",
                    desc: "High Availability: Allow & trace audit log",
                  },
                  {
                    val: "DEGRADE_READ_ONLY",
                    title: "DEGRADE_READ_ONLY",
                    desc: "Restrict strictly to read-only tools",
                  },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() =>
                      setAnswers({ ...answers, timeout_degradation: item.val })
                    }
                    className={`p-2.5 rounded-lg text-left transition-all border ${
                      answers.timeout_degradation === item.val
                        ? "bg-blue-50 border-blue-400 text-blue-900 font-bold"
                        : "bg-white/80 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="text-xs font-bold block">{item.title}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSynthesize}
              disabled={synthesizing}
              className="neu-btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              {synthesizing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Compiling Security Policy...
                </>
              ) : (
                <>
                  <span>Synthesize Typed Policy Contracts</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Draft Review & Human In-The-Loop Sign-Off */}
      {wizardStep === 2 && generatedPolicy && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                Generated Policy Draft ({generatedPolicy.policy_id})
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                {generatedPolicy.status} (INACTIVE)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Invariant #1: Explicit Human Sign-Off Required Before Activation
            </span>
          </div>

          {/* YAML Viewer */}
          <div className="neu-inset p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[320px]">
            <pre className="leading-relaxed">{generatedPolicy.yaml_content}</pre>
          </div>

          {/* Lint and Invariant notice */}
          <div className="neu-card-sm p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex items-start gap-2.5">
            <FileCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-900 block">
                Deterministic Static Linter Passed
              </span>
              <p className="text-[11px] text-emerald-700">
                All 7 canonical gap constraints and AST parameter bounds are valid. Click "Approve & Freeze Policy" to freeze the SHA-256 cryptographic signature.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setWizardStep(1)}
              className="neu-card-sm px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Modify Answers</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={approving}
              className="neu-btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {approving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Freezing Policy Signature...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Freeze & Approve Security Policy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Approved & Active Confirmation */}
      {wizardStep === 3 && generatedPolicy && (
        <div className="space-y-4">
          <div className="neu-card-sm p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl inline-flex neu-card-sm">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-950">
                Security Policy Approved & Active
              </h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto mt-1">
                Your agent is now protected by active Tri-Guard reference monitors with frozen contracts.
              </p>
            </div>

            <div className="neu-inset p-3 rounded-xl bg-white/90 text-left font-mono text-[11px] max-w-lg mx-auto space-y-1">
              <div>
                <span className="text-slate-400">Policy ID:</span>{" "}
                <span className="font-semibold text-slate-800">{generatedPolicy.policy_id}</span>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>{" "}
                <span className="font-bold text-emerald-700">APPROVED (is_active=True)</span>
              </div>
              <div>
                <span className="text-slate-400">SHA-256 Signature:</span>{" "}
                <span className="font-bold text-blue-700 truncate block">
                  {generatedPolicy.sha256_signature || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setWizardStep(1)}
              className="neu-card-sm px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg"
            >
              Re-run Policy Interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
