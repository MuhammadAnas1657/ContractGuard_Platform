"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Key,
  Copy,
  Check,
  AlertTriangle,
  FolderPlus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: any) => void;
  token?: string | null;
}

export default function ProjectCreateModal({
  isOpen,
  onClose,
  onProjectCreated,
  token,
}: ProjectCreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Once created, hold raw keys for one-time display
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null);
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch("/api/project/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to create project (HTTP ${res.status})`);
      }

      const data = await res.json();
      setCreatedProject(data);
      onProjectCreated(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create project.");
    } finally {
      setCreating(false);
    }
  };

  const handleDone = () => {
    setName("");
    setDescription("");
    setCreatedProject(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="neu-card w-full max-w-lg p-6 bg-white relative shadow-2xl rounded-2xl">
        <button
          onClick={handleDone}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-all p-1"
        >
          <X className="h-5 w-5" />
        </button>

        {!createdProject ? (
          <div>
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 neu-card-sm">
                <FolderPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Create Guarded Agent Project
                </h3>
                <p className="text-xs text-slate-500">
                  Auto-provisions dual Ingress and Egress API keys for runtime Tri-Guard defense
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="neu-card-sm p-3 bg-rose-50 text-rose-700 border border-rose-200 text-xs mb-4 rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Project / Agent Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Customer Support Agent"
                  className="w-full neu-inset px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. LLM agent with refund processing and customer communication tools"
                  className="w-full neu-inset px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="neu-card-sm p-3 bg-blue-50/50 border border-blue-100 text-xs text-blue-800 rounded-xl space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Dual Security Keys Will Be Provisioned:
                </span>
                <p className="text-[11px] text-blue-700">
                  Pre-LLM Ingress Key (<code className="font-mono font-bold">cgx_ing_...</code>) and Post-LLM Egress Key (<code className="font-mono font-bold">cgx_egr_...</code>).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDone}
                  className="neu-card-sm px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="neu-btn-primary flex items-center gap-2 px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Provisioning Keys...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* One-Time Raw Key Banner Screen */
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 neu-card-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Project Created Successfully
                </h3>
                <p className="text-xs text-slate-500">
                  Project: <span className="font-semibold text-slate-800">{createdProject.name}</span>
                </p>
              </div>
            </div>

            <div className="neu-card-sm p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                Copy Your Secret API Keys Now
              </span>
              <p className="text-[11px] text-amber-800">
                For security reasons, full secret keys are only revealed once. Subsequent listings will only display prefixes.
              </p>
            </div>

            {/* Ingress Key Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Pre-LLM Ingress Key (Input Sentinel)
                </span>
                <span className="text-[10px] text-blue-600 font-mono">
                  cgx_ing_...
                </span>
              </div>
              <div className="neu-inset p-2.5 rounded-xl bg-slate-900 font-mono text-xs text-blue-300 flex items-center justify-between">
                <span className="truncate mr-2 select-all">
                  {createdProject.ingress_key?.raw_key ||
                    createdProject.dual_keys?.ingress?.raw_key ||
                    createdProject.ingress_key?.key_prefix ||
                    createdProject.dual_keys?.ingress?.key_prefix ||
                    "cgx_ing_..."}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      createdProject.ingress_key?.raw_key ||
                        createdProject.dual_keys?.ingress?.raw_key ||
                        createdProject.ingress_key?.key_prefix ||
                        createdProject.dual_keys?.ingress?.key_prefix ||
                        "",
                      "ingress"
                    )
                  }
                  className="p-1 text-slate-400 hover:text-white transition-all"
                >
                  {copiedKey === "ingress" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Egress Key Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Post-LLM Egress Key (Reference Monitor)
                </span>
                <span className="text-[10px] text-emerald-600 font-mono">
                  cgx_egr_...
                </span>
              </div>
              <div className="neu-inset p-2.5 rounded-xl bg-slate-900 font-mono text-xs text-emerald-300 flex items-center justify-between">
                <span className="truncate mr-2 select-all">
                  {createdProject.egress_key?.raw_key ||
                    createdProject.dual_keys?.egress?.raw_key ||
                    createdProject.egress_key?.key_prefix ||
                    createdProject.dual_keys?.egress?.key_prefix ||
                    "cgx_egr_..."}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      createdProject.egress_key?.raw_key ||
                        createdProject.dual_keys?.egress?.raw_key ||
                        createdProject.egress_key?.key_prefix ||
                        createdProject.dual_keys?.egress?.key_prefix ||
                        "",
                      "egress"
                    )
                  }
                  className="p-1 text-slate-400 hover:text-white transition-all"
                >
                  {copiedKey === "egress" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleDone}
                className="neu-btn-primary px-6 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-md hover:bg-slate-800"
              >
                Done, I Have Saved My Keys
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
