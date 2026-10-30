"use client";

import React from "react";
import {
  FolderGit2,
  Wrench,
  ShieldCheck,
  Key,
  ExternalLink,
  Trash2,
  Upload,
  Calendar,
  AlertCircle,
} from "lucide-react";

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  tools_count: number;
  extracted_files_count?: number;
  policy_status: "APPROVED" | "DRAFT" | "NONE" | string;
  dual_keys?: {
    ingress?: { key_prefix: string; key_id?: string; raw_key?: string };
    egress?: { key_prefix: string; key_id?: string; raw_key?: string };
  };
}

interface ProjectListProps {
  projects: ProjectItem[];
  onSelectProject: (project: ProjectItem) => void;
  onDeleteProject?: (projectId: string) => void;
  onIngestZip?: (project: ProjectItem) => void;
  loading?: boolean;
}

export default function ProjectList({
  projects,
  onSelectProject,
  onDeleteProject,
  onIngestZip,
  loading,
}: ProjectListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="neu-card p-5 animate-pulse bg-white/50 h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="neu-card p-10 text-center text-slate-500 rounded-2xl bg-white/70">
        <FolderGit2 className="h-10 w-10 mx-auto mb-3 text-slate-400" />
        <h4 className="text-sm font-bold text-slate-800 mb-1">No Guarded Projects Found</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Create your first agent project or upload a codebase .zip archive to begin AST analysis and Tri-Guard enforcement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {projects.map((project) => {
        const ingPrefix = project.dual_keys?.ingress?.key_prefix || "cgx_ing_...";
        const egrPrefix = project.dual_keys?.egress?.key_prefix || "cgx_egr_...";

        return (
          <div
            key={project.id}
            className="neu-card p-5 bg-white/80 hover:bg-white transition-all rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            {/* Left: Project Info */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {project.name}
                </span>

                {/* Policy Status Badge */}
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    project.policy_status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : project.policy_status === "DRAFT"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {project.policy_status}
                </span>

                <span className="text-[10px] text-slate-400 font-mono">
                  {project.id}
                </span>
              </div>

              {project.description && (
                <p className="text-xs text-slate-500 line-clamp-1">
                  {project.description}
                </p>
              )}

              {/* Stats & Key Prefixes */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-blue-600" />
                  <strong className="text-slate-800">{project.tools_count}</strong> Tools
                </span>

                <span className="text-slate-300">•</span>

                <span className="flex items-center gap-1 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-blue-700">
                  Ing: {ingPrefix.substring(0, 16)}...
                </span>

                <span className="flex items-center gap-1 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-emerald-700">
                  Egr: {egrPrefix.substring(0, 16)}...
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              {onIngestZip && (
                <button
                  onClick={() => onIngestZip(project)}
                  title="Upload / Ingest Code Zip"
                  className="neu-card-sm p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all"
                >
                  <Upload className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => onSelectProject(project)}
                className="neu-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-all"
              >
                <span>View Details</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              {onDeleteProject && (
                <button
                  onClick={() => onDeleteProject(project.id)}
                  title="Delete Project"
                  className="neu-card-sm p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
