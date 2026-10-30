"use client";

import React from "react";
import { Shield, FolderGit2, Settings, LogOut, Activity, Cpu } from "lucide-react";

interface TopNavBarProps {
  activeTab: "dashboard" | "projects" | "settings";
  setActiveTab: (tab: "dashboard" | "projects" | "settings") => void;
  systemStatus: {
    nebius_live: boolean;
    provider_mode: string;
  };
  setApiKeyModalOpen?: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  } | null;
  handleLogout: () => void;
}

export default function TopNavBar({
  activeTab,
  setActiveTab,
  systemStatus,
  setApiKeyModalOpen,
  user,
  handleLogout,
}: TopNavBarProps) {
  return (
    <header className="border-b border-slate-200/90 bg-[#F1F5F9]/90 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-sm">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="ContractGuard-X Logo"
          className="h-9 w-9 object-contain drop-shadow-sm"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              ContractGuard<span className="text-blue-600">-X</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              Tri-Guard
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            AI Agent Security & Defense Platform
          </span>
        </div>
      </div>

      {/* Center Tabs: Strictly 3 Post-Login Navigation Tabs (Dashboard, Projects, Settings) */}
      <div className="hidden md:flex items-center gap-1.5 neu-inset p-1.5 rounded-xl bg-[#E2E8F0]/70">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-lg ${
            activeTab === "dashboard"
              ? "neu-tab-active text-blue-700 bg-white shadow-sm"
              : "neu-tab-inactive text-slate-600 hover:text-slate-900"
          }`}
        >
          <Shield className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-lg ${
            activeTab === "projects"
              ? "neu-tab-active text-blue-700 bg-white shadow-sm"
              : "neu-tab-inactive text-slate-600 hover:text-slate-900"
          }`}
        >
          <FolderGit2 className="h-4 w-4" />
          Projects
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-lg ${
            activeTab === "settings"
              ? "neu-tab-active text-blue-700 bg-white shadow-sm"
              : "neu-tab-inactive text-slate-600 hover:text-slate-900"
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Right Controls: Provider Status & User Session */}
      <div className="flex items-center gap-3">
        {/* Nebius / Sandbox Provider Badge */}
        <button
          onClick={() => setApiKeyModalOpen && setApiKeyModalOpen(true)}
          title={
            systemStatus.nebius_live
              ? "Connected to Live Nebius Token Factory Cloud"
              : "Running in deterministic sandbox mode"
          }
          className={`neu-card-sm flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all hover:bg-white ${
            systemStatus.nebius_live
              ? "border-emerald-300 bg-emerald-50/40 text-emerald-800"
              : "border-slate-300 bg-slate-100/60 text-slate-700"
          }`}
        >
          <Cpu
            className={`h-3.5 w-3.5 ${
              systemStatus.nebius_live ? "text-emerald-600 animate-pulse" : "text-slate-500"
            }`}
          />
          <span className="font-semibold capitalize">
            {systemStatus.nebius_live ? "Nebius Live" : systemStatus.provider_mode || "Sandbox"}
          </span>
          <span
            className={`h-2 w-2 rounded-full ${
              systemStatus.nebius_live ? "bg-emerald-500" : "bg-amber-400"
            }`}
          />
        </button>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">
                {user.full_name || user.email}
              </span>
              <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="neu-card-sm p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 transition-all rounded-lg"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
