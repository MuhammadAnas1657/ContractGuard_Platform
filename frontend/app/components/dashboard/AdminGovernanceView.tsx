"use client";

import React, { useState, useEffect } from "react";
import AttackDatabaseExplorer from "../settings/AttackDatabaseExplorer";
import {
  Users,
  FolderGit2,
  ShieldCheck,
  Key,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  X,
  ExternalLink
} from "lucide-react";

interface AdminGovernanceViewProps {
  token?: string | null;
  currentUser?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  } | null;
  setActiveTab: (tab: "dashboard" | "projects" | "settings") => void;
}

interface OverviewMetrics {
  total_users: number;
  developer_count: number;
  admin_count: number;
  total_projects: number;
  total_tools_extracted: number;
  policies_approved: number;
  policies_draft: number;
  policies_unconfigured: number;
  active_dual_keys: number;
}

interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string | null;
  projects_count: number;
  policies_count: number;
}

export default function AdminGovernanceView({
  token,
  currentUser,
  setActiveTab
}: AdminGovernanceViewProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtering state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [adminTab, setAdminTab] = useState<"governance" | "threat_database">("governance");
  const [actionLoading, setActionLoading] = useState(false);

  const getAuthToken = () => {
    return token || (typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null);
  };

  const fetchOverview = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const authToken = getAuthToken();
      const headers: Record<string, string> = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch("/api/admin/overview", { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to fetch admin overview (HTTP ${res.status})`);
      }

      const data = await res.json();
      setMetrics(data.metrics);
      setUsers(data.users || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load governance overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Update User Role (Promote / Demote)
  const handleUpdateRole = async (targetUser: AdminUserItem) => {
    const newRole = targetUser.role === "admin" ? "developer" : "admin";
    if (targetUser.id === currentUser?.id) {
      setErrorMsg("You cannot modify your own administrator role.");
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to update user role (HTTP ${res.status})`);
      }

      setSuccessMsg(`User ${targetUser.email} role updated to ${newRole.toUpperCase()}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Platform Governance & Structuring
            </h2>
            <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Admin Console
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
            System-wide user structuring, account privilege controls, and reference monitor compliance metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[var(--text-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-color)] transition-all rounded-lg shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-500" : ""}`} />
            <span>Refresh Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[var(--accent-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-color)] transition-all rounded-lg shadow-sm"
          >
            <span>Projects Tab</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Admin Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdminTab("governance")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === "governance"
                ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Platform Structuring & Governance</span>
            {users.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-inset)] text-[var(--text-secondary)] border border-[var(--border-color)] font-mono font-bold">
                {users.length} users
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab("threat_database")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === "threat_database"
                ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>Threat Signatures Explorer</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
              463 Signatures
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 text-[11px] text-[var(--text-secondary)]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Authentic Research Corpus Active (Sub-0.05ms SLA)</span>
        </div>
      </div>

      {adminTab === "threat_database" ? (
        <div className="space-y-4">
          <AttackDatabaseExplorer token={token} />
        </div>
      ) : (
        <>
          {/* SECTION 1: 4 Executive Platform Structuring Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Registered Users */}
            <div className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm space-y-3 transition-all hover:border-[var(--accent-primary)]/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Registered Users
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {metrics ? metrics.total_users : "..."}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-semibold text-blue-400">
                    {metrics ? `${metrics.developer_count} Developers` : ""}
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">•</span>
                  <span className="text-[11px] font-semibold text-purple-400">
                    {metrics ? `${metrics.admin_count} Admins` : ""}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Active platform identities & developers
              </p>
            </div>

            {/* Card 2: Total Agent Projects */}
            <div
              onClick={() => setActiveTab("projects")}
              role="button"
              className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm space-y-3 transition-all hover:border-[var(--accent-primary)]/40 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Agent Projects Ingested
                </span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <FolderGit2 className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {metrics ? metrics.total_projects.toLocaleString() : "..."}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-cyan-400">
                    {metrics ? `${metrics.total_tools_extracted.toLocaleString()} AST Tools` : ""}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">extracted</span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] flex items-center justify-between">
                <span>Autonomous agent portfolios</span>
                <span className="text-[var(--accent-primary)] font-semibold flex items-center gap-0.5">
                  <span>Manage in Projects</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </p>
            </div>

            {/* Card 3: Security Policy Compliance */}
            <div className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm space-y-3 transition-all hover:border-[var(--accent-primary)]/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Security Policy Health
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
                  {metrics ? `${metrics.policies_approved} Approved` : "..."}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-semibold text-amber-400">
                    {metrics ? `${metrics.policies_draft} Drafts` : ""}
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">•</span>
                  <span className="text-[11px] font-semibold text-rose-400">
                    {metrics ? `${metrics.policies_unconfigured} Unprotected` : ""}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Enforced reference monitor contracts
              </p>
            </div>

            {/* Card 4: Active Gateway Dual-Keys */}
            <div className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm space-y-3 transition-all hover:border-[var(--accent-primary)]/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Gateway Dual-Keys Active
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Key className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {metrics ? metrics.active_dual_keys.toLocaleString() : "..."}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-amber-400">
                    Ingress & Egress Pairs
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Auto-provisioned zero-trust gateway credentials
              </p>
            </div>
          </div>

          {/* SECTION 2: Registered Users Management Directory */}
          <div className="theme-card rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--accent-primary)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                    Registered Platform Users ({users.length})
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Enterprise accounts, role privileges, and assigned project counts
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-[var(--text-secondary)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--surface-inset)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] w-48"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-inset)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Projects Owned</th>
                    <th className="px-5 py-3">Joined Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-[var(--text-secondary)]">
                        No registered users match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrent = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className="hover:bg-[var(--surface-card-hover)] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {u.full_name ? u.full_name.charAt(0) : u.email.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                  <span>{u.full_name || "Enterprise User"}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.role === "admin"
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {u.role === "admin" && <ShieldCheck className="h-3 w-3" />}
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-[var(--text-primary)]">
                              {u.projects_count}
                            </span>{" "}
                            <span className="text-[var(--text-secondary)]">
                              {u.projects_count === 1 ? "project" : "projects"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Historical"}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => setActiveTab("projects")}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--surface-inset)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--accent-primary)] border border-[var(--border-color)] transition-all"
                            >
                              View Projects
                            </button>
                            {!isCurrent && (
                              <button
                                onClick={() => handleUpdateRole(u)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--surface-inset)] hover:bg-[var(--surface-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-all"
                              >
                                {u.role === "admin" ? "Demote to Dev" : "Promote to Admin"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
