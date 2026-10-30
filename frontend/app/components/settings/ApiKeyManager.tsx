"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Calendar,
} from "lucide-react";

interface ApiKeyItem {
  id?: string;
  key_id: string;
  key_name: string;
  key_prefix: string;
  key_type?: string;
  project_id?: string;
  created_at?: string;
  is_active: boolean;
}

interface ApiKeyManagerProps {
  token?: string | null;
}

export default function ApiKeyManager({ token }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<"ingress" | "egress" | "gateway">("ingress");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  const fetchKeys = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/keys/list", { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(`Failed to load API keys (HTTP ${res.status})`);
      }
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/keys/create", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          key_name: keyName.trim(),
          key_type: keyType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Key creation failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setCreatedRawKey(data.raw_key || data.key || null);
      setKeyName("");
      fetchKeys();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate key.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Any applications using it will be blocked.")) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/keys/${keyId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => (k.key_id || k.id) !== keyId));
      }
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="neu-card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            API Key & Guard Credentials Manager
          </h3>
          <p className="text-xs text-slate-500">
            Generate and manage Pre-LLM Ingress, Post-LLM Egress, and Unified Gateway authentication keys
          </p>
        </div>

        <button
          onClick={fetchKeys}
          title="Refresh Keys"
          className="neu-card-sm p-2 text-slate-500 hover:text-slate-800 rounded-xl transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {errorMsg && (
        <div className="neu-card-sm p-3 bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2 rounded-xl">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* One-Time Raw Key Reveal Alert */}
      {createdRawKey && (
        <div className="neu-card p-4 bg-emerald-50/70 border-2 border-emerald-300 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              New Secret API Key Generated
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
              One-Time Reveal
            </span>
          </div>
          <p className="text-[11px] text-emerald-800">
            Copy this key now. It cannot be displayed again after you navigate away.
          </p>
          <div className="neu-inset p-2.5 rounded-lg bg-slate-900 font-mono text-xs text-emerald-300 flex items-center justify-between">
            <span className="truncate mr-2 select-all">{createdRawKey}</span>
            <button
              onClick={() => copyKey(createdRawKey)}
              className="p-1 text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[11px]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      <form onSubmit={handleCreateKey} className="neu-card-sm p-4 bg-white/70 rounded-xl space-y-3">
        <span className="text-xs font-bold text-slate-900 block">
          Issue New Guard Key
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              required
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key label (e.g. Production Ingress Monitor)"
              className="w-full neu-inset px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={keyType}
              onChange={(e) => setKeyType(e.target.value as any)}
              className="w-full neu-inset px-3 py-2 text-xs rounded-lg font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ingress">Pre-LLM Ingress (cgx_ing_...)</option>
              <option value="egress">Post-LLM Egress (cgx_egr_...)</option>
              <option value="gateway">Unified Gateway (cgx_live_...)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={creating || !keyName.trim()}
            className="neu-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Generate Key
              </>
            )}
          </button>
        </div>
      </form>

      {/* Keys Table */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 px-1">
          Active Key Fleet ({keys.length})
        </span>

        {keys.length === 0 ? (
          <div className="neu-card-sm p-6 text-center text-slate-400 rounded-xl">
            No API keys found. Generate a key above to authenticate gateway requests.
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => {
              const effectiveId = k.key_id || k.id || k.key_prefix;
              return (
              <div
                key={effectiveId}
                className="neu-card-sm p-3.5 bg-white/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 neu-card-sm">
                    <Key className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">
                        {k.key_name}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                          k.key_type === "ingress" || k.key_prefix?.startsWith("cgx_ing_")
                            ? "bg-blue-100 text-blue-800"
                            : k.key_type === "egress" || k.key_prefix?.startsWith("cgx_egr_")
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {k.key_type || "gateway"}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 block truncate">
                      Prefix: {k.key_prefix}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRevokeKey(effectiveId)}
                    title="Revoke Key"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
