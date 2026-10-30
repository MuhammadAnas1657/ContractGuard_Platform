"use client";

import React, { useEffect, useState } from "react";
import TelemetryCards from "./TelemetryCards";
import LiveAttackAuditBench from "./LiveAttackAuditBench";
import ActiveAlertsFeed from "./ActiveAlertsFeed";
import {
  ArrowRight,
  Shield,
  Plus,
  Key,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  Code2,
  Sparkles,
  RefreshCw,
  FolderGit2,
  Play,
  Terminal,
  ExternalLink,
  Lock
} from "lucide-react";

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
  const [liveProjects, setLiveProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // 2-Step Inline Add Project State
  const [step, setStep] = useState<1 | 2>(1);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("financial");
  const [customTools, setCustomTools] = useState<string>("transfer_funds, check_balance, verify_id");
  const [synthesizing, setSynthesizing] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const fetchLiveProjects = async () => {
    setLoadingProjects(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/project/list", { headers });
      if (res.ok) {
        const data = await res.json();
        setLiveProjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      // Silent fail
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    fetchLiveProjects();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === "financial") {
      setNewProjectName("Fintech Wealth Advisor Agent");
      setCustomTools("get_portfolio_balance, execute_wire_transfer, query_market_depth, audit_ledger_records");
    } else if (preset === "support") {
      setNewProjectName("Customer Support & Refunds Agent");
      setCustomTools("lookup_order_status, process_refund_request, send_customer_email");
    } else if (preset === "devops") {
      setNewProjectName("Cloud Infrastructure DevOps Agent");
      setCustomTools("read_cluster_logs, restart_container, apply_firewall_rule, rotate_secrets");
    }
  };

  const handleGeneratePolicyAndCreate = async () => {
    const name = newProjectName.trim() || "My Protected Agent";
    setSynthesizing(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Create project with dual keys
      const res = await fetch("/api/project/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          description: `Protected autonomous agent with dual-key reference monitor policies (${selectedPreset})`
        })
      });

      if (!res.ok) {
        throw new Error("Failed to create project");
      }

      const projectData = await res.json();

      // Synthesize initial policy
      const toolList = customTools.split(",").map(t => t.trim()).filter(Boolean).map(t => ({
        name: t,
        description: `Automated agent tool ${t}`,
        effects: t.includes("transfer") || t.includes("refund") || t.includes("apply") || t.includes("rotate")
          ? ["STATE_CHANGE", "FINANCIAL"]
          : ["READ_ONLY"]
      }));

      await fetch("/api/policy/synthesize", {
        method: "POST",
        headers,
        body: JSON.stringify({
          project_id: projectData.id,
          agent_name: name,
          tools: toolList,
          answers: { risk_level: "HIGH" }
        })
      });

      setCreatedProject(projectData);
      setStep(2);
      fetchLiveProjects();
      fetchTelemetry();
    } catch (err: any) {
      alert("Error generating policy: " + err.message);
    } finally {
      setSynthesizing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const samplePythonSnippet = `import requests

# 1. PRE-LLM INGRESS GUARD (Direct Prompt Injection Defense)
ingress_res = requests.post(
    "http://127.0.0.1:8080/api/v1/guard/ingress",
    headers={"X-API-Key": "${createdProject?.dual_keys?.ingress?.raw_key || 'cgx_ing_live_your_key'}"},
    json={"user_prompt": user_input}
)
if ingress_res.json().get("decision") == "BLOCK":
    raise SecurityException("Prompt Injection Blocked by ContractGuard-X")

# 2. Run your LLM Agent ...

# 3. POST-TOOL EGRESS GUARD (Indirect Tool Hijack & Exfiltration Defense)
egress_res = requests.post(
    "http://127.0.0.1:8080/api/v1/guard/egress",
    headers={"X-API-Key": "${createdProject?.dual_keys?.egress?.raw_key || 'cgx_egr_live_your_key'}"},
    json={
        "tool_name": tool_call.name,
        "tool_arguments": tool_call.args,
        "proposed_llm_output": agent_reply
    }
)
if egress_res.json().get("decision") == "BLOCK":
    raise SecurityException("Indirect Injection Blocked: " + egress_res.json().get("interception_stage"))`;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Streamlined View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Developer Security & Defense Overview
            </h2>
            <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Developer Studio
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
            Real-time prompt inspection KPIs, 2-step AI security policy generator, and live protected project runtime audits
          </p>
        </div>

        <button
          onClick={() => setActiveTab("projects")}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[var(--accent-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-color)] transition-all rounded-lg shadow-sm"
        >
          <FolderGit2 className="h-3.5 w-3.5" />
          <span>My Projects</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* SECTION 1: 4 Focused Real-World Operational KPI Cards */}
      <TelemetryCards
        metricsData={metricsData}
        runtimeTelemetry={runtimeTelemetry}
        onNavigateProjects={() => setActiveTab("projects")}
      />

      {/* SECTION 2: 2-STEP INLINE 'ADD NEW PROTECTED PROJECT' WORKBENCH */}
      <div className="theme-card rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                Add Protected Agent Project (2-Step AI Workflow)
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Step 1: Generate Security Policy with AI • Step 2: Implement Dual Ingress/Egress API Keys
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] text-xs font-semibold">
              <button
                onClick={() => setStep(1)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  step === 1
                    ? "bg-[var(--surface-card)] text-[var(--accent-primary)] font-bold shadow-sm border border-[var(--border-color)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                1. AI Policy Synthesis
              </button>
              <button
                onClick={() => createdProject && setStep(2)}
                disabled={!createdProject}
                className={`px-3 py-1 rounded-lg transition-all ${
                  step === 2
                    ? "bg-[var(--surface-card)] text-[var(--accent-primary)] font-bold shadow-sm border border-[var(--border-color)]"
                    : createdProject
                    ? "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    : "text-slate-400 cursor-not-allowed opacity-50"
                }`}
              >
                2. Dual API Keys
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-5 max-w-3xl">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Select Quick Agent Archetype
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "financial", label: "Fintech & Banking", desc: "Spend caps & wire limits" },
                    { id: "support", label: "Customer Support", desc: "Refund & email controls" },
                    { id: "devops", label: "Cloud & DevOps", desc: "Root command protection" }
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handlePresetSelect(p.id)}
                      role="button"
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedPreset === p.id
                          ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] shadow-sm"
                          : "bg-[var(--surface-inset)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/40"
                      }`}
                    >
                      <div className="font-bold text-xs text-[var(--text-primary)]">{p.label}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Agent Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Fintech Wealth Advisor Agent"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Callable Agent Tools (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={customTools}
                    onChange={(e) => setCustomTools(e.target.value)}
                    placeholder="transfer_funds, check_balance, verify_id"
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Our LLM automatically classifies tool effects & injects financial transaction ceilings</span>
                </span>

                <button
                  onClick={handleGeneratePolicyAndCreate}
                  disabled={synthesizing}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white transition-all shadow-md disabled:opacity-50"
                >
                  {synthesizing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Synthesizing Policy with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Synthesize Policy & Issue Keys →</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Project <strong>{createdProject?.name}</strong> successfully provisioned with AI SecurityContract v2.0!
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("projects")}
                  className="font-bold underline hover:text-emerald-300"
                >
                  View in My Projects
                </button>
              </div>

              {/* Dual Keys Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ingress Key */}
                <div className="p-4 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      Ingress Gateway Key (Direct Attacks)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                      Pre-LLM Guard
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Scans user prompts before passing to the model. Blocks DAN jailbreaks & prompt injections.
                  </p>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-color)] font-mono text-xs">
                    <span className="text-[var(--text-primary)]">
                      {createdProject?.dual_keys?.ingress?.raw_key || `${createdProject?.dual_keys?.ingress?.key_prefix}...`}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdProject?.dual_keys?.ingress?.raw_key || "cgx_ing_sample", "ing")}
                      className="text-slate-400 hover:text-[var(--accent-primary)] p-1 rounded"
                    >
                      {copiedKey === "ing" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Egress Key */}
                <div className="p-4 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      Egress Reference Key (Indirect Attacks)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      Post-Tool TCEAV Guard
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Inspects tool arguments, verifies payee authority, blocks indirect injections & redacts Markdown leaks.
                  </p>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-color)] font-mono text-xs">
                    <span className="text-[var(--text-primary)]">
                      {createdProject?.dual_keys?.egress?.raw_key || `${createdProject?.dual_keys?.egress?.key_prefix}...`}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdProject?.dual_keys?.egress?.raw_key || "cgx_egr_sample", "egr")}
                      className="text-slate-400 hover:text-[var(--accent-primary)] p-1 rounded"
                    >
                      {copiedKey === "egr" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ready-to-use Python snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-blue-400" />
                    Copy Implementation Code (Python SDK & REST)
                  </span>
                  <button
                    onClick={() => copyToClipboard(samplePythonSnippet, "code")}
                    className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline font-semibold"
                  >
                    {copiedKey === "code" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === "code" ? "Copied Snippet!" : "Copy Code"}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] overflow-x-auto leading-relaxed">
                  {samplePythonSnippet}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
                >
                  ← Configure Another Project
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[var(--accent-primary)] text-white shadow-md hover:opacity-90"
                >
                  <span>Open in My Projects Hub</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: LIVE PROTECTED PROJECTS & AUDIT TABLE */}
      <div className="theme-card rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                Live Protected Projects ({liveProjects.length})
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Autonomous agent microservices actively protected by ContractGuard-X Dual-Key Reference Monitors
            </p>
          </div>

          <button
            onClick={() => setActiveTab("projects")}
            className="flex items-center gap-1 text-xs font-bold text-[var(--accent-primary)] hover:underline"
          >
            <span>View Full Project Hub</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-inset)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
              <tr>
                <th className="px-5 py-3">Agent Project</th>
                <th className="px-5 py-3">Reference Policy</th>
                <th className="px-5 py-3">Dual-Key Pair</th>
                <th className="px-5 py-3">Protected Tools</th>
                <th className="px-5 py-3 text-right">Live Security Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {liveProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[var(--text-secondary)]">
                    No active agent projects found. Create one above using the 2-step AI workflow!
                  </td>
                </tr>
              ) : (
                liveProjects.map((p) => {
                  const ingKey = p.dual_keys?.ingress?.key_prefix || "cgx_ing_live";
                  const egrKey = p.dual_keys?.egress?.key_prefix || "cgx_egr_live";
                  const toolCount = Array.isArray(p.discovered_tools) ? p.discovered_tools.length : 0;
                  return (
                    <tr key={p.id} className="hover:bg-[var(--surface-card-hover)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[var(--text-primary)]">{p.name}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                          {p.id} {p.filename ? `• ${p.filename}` : ""}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Enforced v2.0
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-cyan-400 font-semibold">{ingKey}... (Ingress)</span>
                          <span className="text-amber-400">{egrKey}... (Egress)</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-inset)] text-[var(--text-primary)] font-bold text-[11px] border border-[var(--border-color)]">
                          <Cpu className="h-3 w-3 text-blue-400" />
                          <span>{toolCount} Tools Guarded</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            runSimulationDefault();
                            const benchEl = document.getElementById("live-audit-bench");
                            if (benchEl) benchEl.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--surface-inset)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--accent-primary)] border border-[var(--border-color)] transition-all shadow-sm"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Run Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: LIVE ATTACK AUDIT BENCH & ACTIVE SECURITY ALERTS FEED */}
      <div id="live-audit-bench" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <LiveAttackAuditBench
            simulationResult={simulationResult}
            runningSimulation={runningSimulation}
            runSimulation={runSimulation}
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
          />
        </div>
        <div className="lg:col-span-1 h-full">
          <ActiveAlertsFeed />
        </div>
      </div>
    </div>
  );
}
