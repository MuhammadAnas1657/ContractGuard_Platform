"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Key,
  Wrench,
  ShieldCheck,
  FileCode,
  Upload,
  HelpCircle,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import DualApiKeyDisplay from "./DualApiKeyDisplay";
import DiscoveredToolsList, { DiscoveredTool } from "./DiscoveredToolsList";
import ZipUploader from "./ZipUploader";
import PolicyInterviewWizard from "./PolicyInterviewWizard";

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  token?: string | null;
}

export default function ProjectDetail({
  projectId,
  onBack,
  token,
}: ProjectDetailProps) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<
    "keys" | "tools" | "policy" | "interview" | "upload"
  >("keys");

  const fetchProjectDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = {};
      const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null);
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch(`/api/project/${projectId}`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load project details (HTTP ${res.status})`);
      }
      const data = await res.json();
      setProject(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load project.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleZipSuccess = (data: any) => {
    fetchProjectDetails();
    setDetailTab("tools");
  };

  if (loading) {
    return (
      <div className="neu-card p-12 text-center text-slate-500 rounded-2xl">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
        <span className="text-xs font-semibold">Loading Project Context...</span>
      </div>
    );
  }

  if (errorMsg || !project) {
    return (
      <div className="neu-card p-8 text-center rounded-2xl space-y-4">
        <AlertTriangle className="h-8 w-8 mx-auto text-rose-500" />
        <p className="text-xs text-rose-700">{errorMsg || "Project not found"}</p>
        <button
          onClick={onBack}
          className="neu-card-sm px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white rounded-xl"
        >
          Back to Projects List
        </button>
      </div>
    );
  }

  const tools: DiscoveredTool[] = project.discovered_tools || [];
  const ingressKey = project.dual_keys?.ingress;
  const egressKey = project.dual_keys?.egress;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="neu-card-sm p-2 text-slate-600 hover:text-blue-600 hover:bg-white transition-all rounded-xl"
            title="Back to Projects"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{project.name}</h2>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  (project.policy_status === "APPROVED" || project.policy?.is_active)
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : (project.policy_status === "DRAFT" || project.policy)
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {project.policy_status || (project.policy?.is_active ? "APPROVED" : project.policy ? "DRAFT" : "NONE")}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Project ID: <span className="font-mono">{project.id}</span>
              {project.description ? ` • ${project.description}` : ""}
            </p>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1 neu-inset p-1 rounded-xl bg-[#E2E8F0]/70 overflow-x-auto text-xs">
          <button
            onClick={() => setDetailTab("keys")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              detailTab === "keys"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            Dual Keys
          </button>
          <button
            onClick={() => setDetailTab("tools")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              detailTab === "tools"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            Tools ({tools.length})
          </button>
          <button
            onClick={() => setDetailTab("policy")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              detailTab === "policy"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Policy YAML
          </button>
          <button
            onClick={() => setDetailTab("interview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              detailTab === "interview"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Policy Interview
          </button>
          <button
            onClick={() => setDetailTab("upload")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              detailTab === "upload"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Ingest Zip
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: DUAL KEYS */}
      {detailTab === "keys" && (
        <div className="neu-card p-6">
          <DualApiKeyDisplay
            ingressKey={ingressKey}
            egressKey={egressKey}
            projectId={project.id}
            token={token}
          />
        </div>
      )}

      {/* SUB-VIEW 2: DISCOVERED TOOLS */}
      {detailTab === "tools" && (
        <div className="neu-card p-6">
          <DiscoveredToolsList tools={tools} />
        </div>
      )}

      {/* SUB-VIEW 3: POLICY YAML PREVIEW */}
      {detailTab === "policy" && (
        <div className="neu-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Security Policy Contract (contracts.yaml)
              </h4>
              <p className="text-xs text-slate-500">
                Deterministic security specifications synthesized for this agent project
              </p>
            </div>
            {(project.policy_yaml || project.policy?.yaml_content) && (
              <button
                onClick={() => {
                  const yamlContent = project.policy_yaml || project.policy?.yaml_content;
                  const blob = new Blob([yamlContent], { type: "text/yaml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${project.name.toLowerCase().replace(/\s+/g, "_")}_contracts.yaml`;
                  a.click();
                }}
                className="neu-card-sm px-3.5 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-white rounded-lg transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download YAML</span>
              </button>
            )}
          </div>

          {(project.policy_yaml || project.policy?.yaml_content) ? (
            <div className="neu-inset p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[380px]">
              <pre className="leading-relaxed">{project.policy_yaml || project.policy?.yaml_content}</pre>
            </div>
          ) : (
            <div className="neu-card-sm p-8 text-center text-slate-500 rounded-xl bg-white/60">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-medium">
                No policy generated yet. Run the Policy Interview to synthesize a typed contracts.yaml policy.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: POLICY INTERVIEW */}
      {detailTab === "interview" && (
        <PolicyInterviewWizard
          projectId={project.id}
          projectName={project.name}
          tools={tools}
          onPolicyApproved={fetchProjectDetails}
          token={token}
        />
      )}

      {/* SUB-VIEW 5: ZIP UPLOADER */}
      {detailTab === "upload" && (
        <div className="neu-card p-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Ingest Agent Source Code
            </h4>
            <p className="text-xs text-slate-500">
              Upload a .zip archive of Python or TypeScript agent code to discover tools and update policies.
            </p>
          </div>
          <ZipUploader
            projectId={project.id}
            projectName={project.name}
            onUploadSuccess={handleZipSuccess}
            token={token}
          />
        </div>
      )}
    </div>
  );
}
