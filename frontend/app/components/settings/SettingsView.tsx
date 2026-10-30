"use client";

import React, { useState } from "react";
import {
  Key,
  Cpu,
  Database,
  ShieldAlert,
  Code2,
  Server,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import ApiKeyManager from "./ApiKeyManager";
import CredentialsConfig from "./CredentialsConfig";
import DatabaseSystemConfig from "./DatabaseSystemConfig";
import AttackDatabaseExplorer from "./AttackDatabaseExplorer";
import DeploymentGatewayTab from "../DeploymentGatewayTab";

interface SettingsViewProps {
  token?: string | null;
  apiBase?: string;
  user?: any;
  apiKeys?: any[];
  newKeyName?: string;
  setNewKeyName?: (v: string) => void;
  createdKey?: string | null;
  setCreatedKey?: (v: string | null) => void;
  createApiKey?: any;
  revokeApiKey?: any;
  isCreatingKey?: boolean;
  vectorSignatures?: any[];
}

export default function SettingsView({
  token,
  apiBase = "http://127.0.0.1:8080",
  user,
  apiKeys = [],
  newKeyName = "",
  setNewKeyName,
  createdKey = null,
  setCreatedKey,
  createApiKey,
  revokeApiKey,
  isCreatingKey = false,
  vectorSignatures = [],
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<
    "keys" | "credentials" | "database" | "attack_db" | "gateway_bench" | "sdk"
  >("keys");
  const [copiedSdk, setCopiedSdk] = useState(false);

  const copySdkCommand = () => {
    navigator.clipboard.writeText("pip install contractguard-x");
    setCopiedSdk(true);
    setTimeout(() => setCopiedSdk(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            Platform Settings & System Configurations
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Manage Tri-Guard API credentials, Nebius & NVIDIA providers, PostgreSQL database, and attack vector signatures
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] overflow-x-auto text-xs">
          <button
            onClick={() => setActiveSection("keys")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSection === "keys"
                ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            API Keys
          </button>
          <button
            onClick={() => setActiveSection("credentials")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSection === "credentials"
                ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Providers
          </button>
          <button
            onClick={() => setActiveSection("database")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSection === "database"
                ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Database
          </button>
          <button
            onClick={() => setActiveSection("attack_db")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSection === "attack_db"
                ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Attack DB
          </button>
          <button
            onClick={() => setActiveSection("gateway_bench")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSection === "gateway_bench"
                ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            Gateway Bench
          </button>
          <button
            onClick={() => setActiveSection("sdk")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSection === "sdk"
                ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Python SDK
          </button>
        </div>
      </div>

      {/* SECTION 1: API KEYS */}
      {activeSection === "keys" && <ApiKeyManager token={token} />}

      {/* SECTION 2: CREDENTIALS (NEBIUS & NVIDIA) */}
      {activeSection === "credentials" && <CredentialsConfig token={token} />}

      {/* SECTION 3: DATABASE & SYSTEM CONFIG */}
      {activeSection === "database" && <DatabaseSystemConfig />}

      {/* SECTION 4: ATTACK DATABASE EXPLORER */}
      {activeSection === "attack_db" && <AttackDatabaseExplorer token={token} />}

      {/* SECTION 5: GATEWAY TEST BENCH (DeploymentGatewayTab) */}
      {activeSection === "gateway_bench" && (
        <div className="neu-card p-6">
          <DeploymentGatewayTab
            apiBase={apiBase}
            user={user}
            apiKeys={apiKeys}
            newKeyName={newKeyName}
            setNewKeyName={setNewKeyName || (() => {})}
            createdKey={createdKey}
            setCreatedKey={setCreatedKey || (() => {})}
            createApiKey={createApiKey || (() => {})}
            revokeApiKey={revokeApiKey || (() => {})}
            isCreatingKey={isCreatingKey}
            vectorSignatures={vectorSignatures}
          />
        </div>
      )}

      {/* SECTION 6: PYTHON SDK INTEGRATION */}
      {activeSection === "sdk" && (
        <div className="neu-card p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 neu-card-sm">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Python SDK Installation & Quickstart
                </h3>
                <p className="text-xs text-slate-500">
                  Protect LangChain, LlamaIndex, and custom agents with the ContractGuard-X SDK
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
              contractguard-x v2.0
            </span>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              1. Install via PyPI
            </span>
            <div className="neu-inset p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs flex items-center justify-between">
              <code>pip install contractguard-x</code>
              <button
                onClick={copySdkCommand}
                className="p-1 text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[11px]"
              >
                {copiedSdk ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSdk ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              2. Python Dual-Key Reference Monitor Example
            </span>
            <div className="neu-inset p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed">
              <pre>{`from contractguard_x import TriGuardClient

# Initialize with Pre-LLM Ingress and Post-LLM Egress credentials
client = TriGuardClient(
    ingress_key="cgx_ing_your_ingress_key_here",
    egress_key="cgx_egr_your_egress_key_here",
    endpoint="http://127.0.0.1:8080"
)

# 1. Pre-LLM Ingress Guard (language validation & vector attack matching)
ingress_verdict = client.guard_ingress(
    session_id="session_101",
    user_prompt="Please analyze Q3 financial filings and prepare refund."
)

if ingress_verdict.is_blocked:
    raise PermissionError(f"Blocked at Ingress: {ingress_verdict.reason}")

# 2. Call LLM ...
llm_action = {"tool": "process_refund", "parameters": {"amount": 50.0, "account_id": "acc_491"}}

# 3. Post-LLM Egress Guard (parameter provenance & stateful ledger budget)
egress_verdict = client.guard_egress(
    session_id="session_101",
    tool_call=llm_action
)

if egress_verdict.is_approved:
    execute_tool(llm_action)
else:
    print(f"Tool execution halted: {egress_verdict.mitigation}")`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
