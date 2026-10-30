"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  FolderGit2,
  ShieldCheck,
  Key,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileCode,
  ArrowRight,
  X,
  UserCheck,
  UserX,
  ExternalLink,
  Lock,
  Layers,
  Cpu,
  Eye,
  Sliders
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

interface AdminProjectItem {
  id: string;
  name: string;
  filename: string | null;
  user_id: string | null;
  owner_email: string;
  owner_name: string;
  created_at: string | null;
  tools_count: number;
  discovered_tools: any[];
  extracted_files_count: number;
  extracted_files: string[];
  policy_id: string | null;
  policy_status: "APPROVED" | "DRAFT" | "NONE";
  policy_yaml: string | null;
  policy_json: any | null;
  ingress_key_prefix: string;
  egress_key_prefix: string;
}

export default function AdminGovernanceView({
  token,
  currentUser,
  setActiveTab
}: AdminGovernanceViewProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [projects, setProjects] = useState<AdminProjectItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtering state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);

  // Inspector Modal state
  const [inspectingProject, setInspectingProject] = useState<AdminProjectItem | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"tools" | "files" | "policy">("tools");
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
      setProjects(data.projects || []);
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

  // Admin Policy Approval
  const handleApprovePolicy = async (project: AdminProjectItem) => {
    if (!project.policy_id) return;

    setActionLoading(true);
    setErrorMsg(null);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`/api/policy/${project.policy_id}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          approved_by: currentUser?.email || "platform_admin"
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to approve policy.");
      }

      setSuccessMsg(`Security policy for project "${project.name}" approved and locked with SHA-256 signature.`);
      setTimeout(() => setSuccessMsg(null), 5000);

      // Update local state
      if (inspectingProject && inspectingProject.id === project.id) {
        setInspectingProject({
          ...inspectingProject,
          policy_status: "APPROVED"
        });
      }
      fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q);
  });

  const filteredProjects = projects.filter((p) => {
    if (selectedUserFilter && p.user_id !== selectedUserFilter) {
      return false;
    }
    const q = projectSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.owner_email.toLowerCase().includes(q) ||
      (p.filename && p.filename.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Platform Governance & Project Oversight
            </h2>
            <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Admin Console
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
            System-wide user structuring, cross-platform project portfolios, and reference monitor security contract audits
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
            <span>All Projects View</span>
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
        <div className="theme-card p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm space-y-3 transition-all hover:border-[var(--accent-primary)]/40">
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
          <p className="text-[10px] text-[var(--text-secondary)]">
            Autonomous agent microservice repositories
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
              Enterprise accounts, role privileges, and assigned project portfolios
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
                <th className="px-5 py-3">Projects Created</th>
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
                  const isFiltered = selectedUserFilter === u.id;
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
                              : u.role === "judge"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
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
                          onClick={() => setSelectedUserFilter(isFiltered ? null : u.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                            isFiltered
                              ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]"
                              : "bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-color)]"
                          }`}
                        >
                          {isFiltered ? "Clear Filter" : "Filter Projects"}
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

      {/* SECTION 3: Cross-Platform Projects Portfolio & Admin Audit */}
      <div className="theme-card rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                Cross-Platform Project Portfolio ({filteredProjects.length})
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Inspect agent AST tool extractions, review synthesized security contracts, and enforce policy approvals
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedUserFilter && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">
                <span>Filtered by User</span>
                <button
                  onClick={() => setSelectedUserFilter(null)}
                  className="hover:text-blue-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[var(--text-secondary)] absolute left-3 top-2.5" />
              <input
                type="text"
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                placeholder="Search projects or owners..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--surface-inset)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-inset)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
              <tr>
                <th className="px-5 py-3">Project & Archive</th>
                <th className="px-5 py-3">Owner / Developer</th>
                <th className="px-5 py-3">Discovered Tools</th>
                <th className="px-5 py-3">Security Contract</th>
                <th className="px-5 py-3">Dual-Key Prefix</th>
                <th className="px-5 py-3 text-right">Audit Duty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--text-secondary)]">
                    No projects found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-[var(--surface-card-hover)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[var(--text-primary)]">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5 font-mono">
                          <span>{p.filename || "manual_registration"}</span>
                          <span>•</span>
                          <span>{p.extracted_files_count} files</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {p.owner_name}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                          {p.owner_email}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-inset)] text-[var(--text-primary)] font-bold text-[11px] border border-[var(--border-color)]">
                          <Cpu className="h-3 w-3 text-blue-400" />
                          <span>{p.tools_count} Tools</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.policy_status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved
                          </span>
                        ) : p.policy_status === "DRAFT" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            Draft Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            <AlertTriangle className="h-3 w-3" />
                            Unprotected
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[var(--text-secondary)]">
                        {p.ingress_key_prefix ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-cyan-400 font-semibold">{p.ingress_key_prefix}...</span>
                            <span className="text-amber-400">{p.egress_key_prefix}...</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Unprovisioned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setInspectingProject(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--surface-inset)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--accent-primary)] border border-[var(--border-color)] transition-all shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Analyze Project</span>
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

      {/* SECTION 4: Dedicated Project Security Inspector Modal (Admin Duty) */}
      {inspectingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="theme-card rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col bg-[var(--surface-card)] border border-[var(--border-color)] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border-color)] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    {inspectingProject.name}
                  </h3>
                  {inspectingProject.policy_status === "APPROVED" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved & Enforced
                    </span>
                  ) : inspectingProject.policy_status === "DRAFT" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="h-3 w-3" />
                      Draft Policy
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      <AlertTriangle className="h-3 w-3" />
                      Unprotected
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3">
                  <span>Owner: <strong className="text-[var(--text-primary)]">{inspectingProject.owner_name}</strong> ({inspectingProject.owner_email})</span>
                  <span>•</span>
                  <span>Created: {inspectingProject.created_at ? new Date(inspectingProject.created_at).toLocaleDateString() : "Recent"}</span>
                </div>
              </div>

              <button
                onClick={() => setInspectingProject(null)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="px-6 pt-3 border-b border-[var(--border-color)] flex items-center gap-4 text-xs font-semibold">
              <button
                onClick={() => setInspectorTab("tools")}
                className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
                  inspectorTab === "tools"
                    ? "border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Cpu className="h-4 w-4" />
                <span>Discovered Tools ({inspectingProject.tools_count})</span>
              </button>
              <button
                onClick={() => setInspectorTab("files")}
                className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
                  inspectorTab === "files"
                    ? "border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <FileCode className="h-4 w-4" />
                <span>Extracted Files ({inspectingProject.extracted_files_count})</span>
              </button>
              <button
                onClick={() => setInspectorTab("policy")}
                className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
                  inspectorTab === "policy"
                    ? "border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Security Contract YAML</span>
              </button>
            </div>

            {/* Inspector Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {inspectorTab === "tools" && (
                <div className="space-y-3">
                  <div className="text-xs text-[var(--text-secondary)]">
                    Zero-Token sandboxed AST parser identified {inspectingProject.tools_count} callable tools in this project:
                  </div>
                  {inspectingProject.discovered_tools.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-inset)] rounded-xl border border-[var(--border-color)]">
                      No tool functions were extracted from this project bundle.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {inspectingProject.discovered_tools.map((t: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-blue-400">
                              {t.name || t.tool_name}
                            </span>
                            {t.effects && t.effects.length > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                                {t.effects.join(", ")}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            {t.description || "No tool description provided."}
                          </p>
                          {t.parameters && (
                            <div className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-card)] p-2 rounded border border-[var(--border-color)] overflow-x-auto">
                              {typeof t.parameters === "object" ? JSON.stringify(t.parameters) : String(t.parameters)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {inspectorTab === "files" && (
                <div className="space-y-3">
                  <div className="text-xs text-[var(--text-secondary)]">
                    Discovered source code files inside agent archive:
                  </div>
                  {inspectingProject.extracted_files.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-inset)] rounded-xl border border-[var(--border-color)]">
                      No source files listed.
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto">
                      {inspectingProject.extracted_files.map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-[var(--text-primary)]">
                          <FileCode className="h-3.5 w-3.5 text-blue-400" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {inspectorTab === "policy" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Synthesized Security Contract (SecurityContract v2.0):
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      Deterministic Dual-End Guard
                    </span>
                  </div>

                  {inspectingProject.policy_yaml ? (
                    <pre className="p-4 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] font-mono text-xs text-emerald-400 max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                      {inspectingProject.policy_yaml}
                    </pre>
                  ) : (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-inset)] rounded-xl border border-[var(--border-color)] space-y-2">
                      <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto" />
                      <p className="font-semibold text-[var(--text-primary)]">
                        No Security Policy Synthesized Yet
                      </p>
                      <p className="text-[11px]">
                        The developer has not synthesized a security contract for this agent repository.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer / Governance Approval Action */}
            <div className="p-5 border-t border-[var(--border-color)] bg-[var(--surface-inset)] flex items-center justify-between">
              <div className="text-xs text-[var(--text-secondary)]">
                {inspectingProject.policy_status === "APPROVED" ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Security policy is approved and cryptographically frozen.
                  </span>
                ) : inspectingProject.policy_status === "DRAFT" ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Pending administrator review & policy activation.
                  </span>
                ) : (
                  <span className="text-slate-400">
                    No active policy contract available for approval.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setInspectingProject(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] text-[var(--text-primary)] border border-[var(--border-color)] transition-all"
                >
                  Close
                </button>
                {inspectingProject.policy_status === "DRAFT" && inspectingProject.policy_id && (
                  <button
                    onClick={() => handleApprovePolicy(inspectingProject)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Enforce Policy</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

