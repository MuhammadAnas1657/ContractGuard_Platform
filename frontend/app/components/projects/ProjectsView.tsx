"use client";

import React, { useState, useEffect } from "react";
import {
  FolderGit2,
  Plus,
  Upload,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
} from "lucide-react";
import ProjectOverviewAnalytics from "./ProjectOverviewAnalytics";
import ProjectList, { ProjectItem } from "./ProjectList";
import ProjectCreateModal from "./ProjectCreateModal";
import ProjectDetail from "./ProjectDetail";
import ZipUploader from "./ZipUploader";

interface ProjectsViewProps {
  token?: string | null;
}

export default function ProjectsView({ token }: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showZipUploader, setShowZipUploader] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = {};
      const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null);
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch("/api/project/list", { headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch project list (HTTP ${res.status})`);
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectCreated = (newProject: any) => {
    fetchProjects();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project and revoke its dual API keys?")) {
      return;
    }
    try {
      const headers: Record<string, string> = {};
      const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null);
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/project/${projectId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
        }
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleZipSuccess = (data: any) => {
    fetchProjects();
    if (data.project_id) {
      setSelectedProjectId(data.project_id);
      setShowZipUploader(false);
    }
  };

  // If a project is selected, render ProjectDetail view
  if (selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        onBack={() => {
          setSelectedProjectId(null);
          fetchProjects();
        }}
        token={token}
      />
    );
  }

  const totalTools = projects.reduce((acc, p) => acc + (p.tools_count || 0), 0);
  const activePoliciesCount = projects.filter(
    (p) => p.policy_status === "APPROVED"
  ).length;

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Overview Analytics Header */}
      <ProjectOverviewAnalytics
        totalProjects={projects.length}
        totalTools={totalTools}
        activePoliciesCount={activePoliciesCount}
      />

      {/* Main Section Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Agent Projects & Repository Ingestion
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Multi-language AST tool extraction (Python / TypeScript), interactive policy interview, and dual-key reference monitors
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowZipUploader(!showZipUploader)}
            className="neu-card-sm flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all rounded-xl"
          >
            <Upload className="h-4 w-4 text-blue-600" />
            <span>{showZipUploader ? "Hide Uploader" : "Ingest .zip Archive"}</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="neu-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="neu-card-sm p-3 bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Expandable Zip Ingestion Dropzone */}
      {showZipUploader && (
        <div className="neu-card p-6 bg-white/90 border-2 border-blue-200/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Agent Codebase Ingestion (.zip)
            </h3>
            <span className="text-[11px] text-slate-500">
              Analyzes Python & JS/TS without executing code (0 LLM tokens consumed)
            </span>
          </div>
          <ZipUploader
            onUploadSuccess={handleZipSuccess}
            token={token}
          />
        </div>
      )}

      {/* Projects Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name or description..."
            className="w-full neu-inset pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={fetchProjects}
          title="Refresh Projects"
          className="neu-card-sm p-2 text-slate-500 hover:text-slate-800 rounded-xl transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Projects Listing */}
      <ProjectList
        projects={filteredProjects}
        onSelectProject={(p) => setSelectedProjectId(p.id)}
        onDeleteProject={handleDeleteProject}
        onIngestZip={(p) => {
          setSelectedProjectId(p.id);
        }}
        loading={loading}
      />

      {/* Project Creation Modal */}
      <ProjectCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
        token={token}
      />
    </div>
  );
}
