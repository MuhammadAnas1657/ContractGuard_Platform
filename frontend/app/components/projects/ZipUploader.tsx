"use client";

import React, { useState, useRef } from "react";
import { Upload, FileArchive, CheckCircle2, AlertCircle, RefreshCw, Sparkles, FolderUp } from "lucide-react";

interface ZipUploaderProps {
  projectId?: string;
  projectName?: string;
  onUploadSuccess: (data: any) => void;
  token?: string | null;
}

export default function ZipUploader({
  projectId,
  projectName,
  onUploadSuccess,
  token,
}: ZipUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      setUploadError("Please upload a standard .zip archive containing Python (.py) or JavaScript/TypeScript (.js, .ts) agent code.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", file);
    if (projectId) {
      formData.append("project_id", projectId);
    }
    if (projectName) {
      formData.append("project_name", projectName);
    } else {
      formData.append("project_name", file.name.replace(/\.zip$/i, ""));
    }

    try {
      const headers: Record<string, string> = {};
      const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("cgx_auth_token") : null);
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch("/api/project/upload-zip", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      setUploadSuccess(`Successfully ingested ${file.name}. Discovered ${data.tools?.length || 0} agent tools across ${data.extracted_files?.length || 0} code files.`);
      onUploadSuccess(data);
    } catch (err: any) {
      setUploadError(err.message || "Failed to process and ingest zip archive.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`neu-card-sm p-6 text-center cursor-pointer border-2 border-dashed transition-all rounded-2xl ${
          dragActive
            ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
            : "border-slate-300 hover:border-blue-400 bg-white/70 hover:bg-white"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 neu-card-sm">
            {uploading ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : (
              <FolderUp className="h-6 w-6" />
            )}
          </div>

          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {uploading
                ? "Analyzing Codebase via Zero-Token AST Parser..."
                : "Drop your Agent Repository .zip archive here or browse"}
            </span>
            <span className="text-[11px] text-slate-500">
              Supports Python (.py) and JavaScript / TypeScript (.js, .ts, .tsx) codebases
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-100">0 Tokens Consumed</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-slate-100">Instant Parameter Extraction</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-slate-100">Dual Keys Provisioned</span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {uploadError && (
        <div className="neu-card-sm p-3 bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Success alert */}
      {uploadSuccess && (
        <div className="neu-card-sm p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2 rounded-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{uploadSuccess}</span>
        </div>
      )}
    </div>
  );
}
