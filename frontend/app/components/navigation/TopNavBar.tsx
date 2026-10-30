"use client";

import React, { useState } from "react";
import {
  Shield,
  FolderGit2,
  Settings,
  LogOut,
  Cpu,
  Moon,
  Sun,
  Zap,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  Sliders
} from "lucide-react";

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
  theme?: string;
  setTheme?: (theme: string) => void;
  onSwitchAccount?: (accountType: "admin" | "developer") => void;
  adminWorkspaceMode?: "governance" | "developer";
  setAdminWorkspaceMode?: (mode: "governance" | "developer") => void;
}

export default function TopNavBar({
  activeTab,
  setActiveTab,
  systemStatus,
  setApiKeyModalOpen,
  user,
  handleLogout,
  theme = "dark-soc",
  setTheme,
  onSwitchAccount,
  adminWorkspaceMode = "governance",
  setAdminWorkspaceMode,
}: TopNavBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSelectTheme = (newTheme: string) => {
    if (setTheme) {
      setTheme(newTheme);
    }
  };

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--surface-header)] backdrop-blur-xl sticky top-0 z-40 px-6 py-3 flex items-center justify-between shadow-sm transition-all duration-200">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <img
          src={theme === "enterprise-light" ? "/logo.png" : "/logo-white.png"}
          alt="ContractGuard-X Logo"
          className="h-8 w-8 object-contain drop-shadow-sm transition-all"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">
              ContractGuard<span className="text-[var(--accent-primary)]">-X</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
              Tri-Guard
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] font-medium">
            AI Agent Security & Defense Platform
          </span>
        </div>
      </div>

      {/* Center Tabs: Strictly 3 Post-Login Navigation Tabs (Dashboard, Projects, Settings) */}
      <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold transition-all rounded-lg ${
            activeTab === "dashboard"
              ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Shield className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold transition-all rounded-lg ${
            activeTab === "projects"
              ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <FolderGit2 className="h-4 w-4" />
          Projects
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold transition-all rounded-lg ${
            activeTab === "settings"
              ? "bg-[var(--surface-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Right Controls: Theme Selector, Provider Status & User Session */}
      <div className="flex items-center gap-3">
        {/* 3-Way Theme Selector Pill (Uses accessible div role='button' to preserve invariant) */}
        <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-[var(--surface-inset)] border border-[var(--border-color)]">
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectTheme("dark-soc")}
            title="Dark SOC Command Center"
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
              theme === "dark-soc"
                ? "bg-blue-900/40 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)] font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Moon className="h-3 w-3 text-blue-400" />
            <span>Dark SOC</span>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectTheme("enterprise-light")}
            title="Premium Enterprise Light"
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
              theme === "enterprise-light"
                ? "bg-white text-blue-700 shadow-sm border border-slate-300 font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sun className="h-3 w-3 text-amber-500" />
            <span>Light</span>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectTheme("ai-cyber")}
            title="AI Cyber Intelligence"
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
              theme === "ai-cyber"
                ? "bg-purple-900/50 text-cyan-300 border border-purple-500/60 shadow-[0_0_14px_rgba(168,85,247,0.45)] font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Zap className={`h-3 w-3 ${theme === "ai-cyber" ? "text-cyan-300 animate-pulse" : "text-purple-400"}`} />
            <span>Cyber</span>
          </div>
        </div>

        {/* Nebius / Sandbox Provider Badge */}
        <button
          onClick={() => setApiKeyModalOpen && setApiKeyModalOpen(true)}
          title={
            systemStatus.nebius_live
              ? "Connected to Live Nebius Token Factory Cloud"
              : "Running in deterministic sandbox mode"
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
            systemStatus.nebius_live
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-[var(--border-color)] bg-[var(--surface-card)] text-[var(--text-secondary)]"
          }`}
        >
          <Cpu
            className={`h-3.5 w-3.5 ${
              systemStatus.nebius_live ? "text-emerald-400 animate-pulse" : "text-[var(--text-muted)]"
            }`}
          />
          <span className="font-semibold capitalize">
            {systemStatus.nebius_live ? "Nebius Live" : systemStatus.provider_mode || "Sandbox"}
          </span>
          <span
            className={`h-2 w-2 rounded-full ${
              systemStatus.nebius_live ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
        </button>

        {/* User Info & Interactive Workspace / Role Menu */}
        {user && (
          <div className="relative flex items-center gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-color)] cursor-pointer transition-all shadow-sm select-none"
              title="Click to open Account & Workspace Menu"
            >
              <div className="h-6 w-6 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                {user.full_name ? user.full_name.charAt(0) : user.email.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                  {user.full_name || user.email}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold uppercase ${user.role === "admin" ? "text-purple-400" : "text-blue-400"}`}>
                    {user.role}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">• {user.email}</span>
                </div>
              </div>
              <ChevronDown className={`h-3 w-3 text-[var(--text-secondary)] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
            </div>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] shadow-2xl p-3 z-50 animate-fadeIn space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-color)] space-y-1">
                  <div className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>{user.full_name}</span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${user.role === "admin" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] font-mono">{user.email}</div>
                </div>

                {/* Workspace Switcher / Admin Access */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] px-1">
                    Workspace & Role Control
                  </div>

                  {user.role === "admin" ? (
                    <>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (setAdminWorkspaceMode) setAdminWorkspaceMode("governance");
                          setActiveTab("dashboard");
                          setUserMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          adminWorkspaceMode === "governance"
                            ? "bg-purple-500/10 border border-purple-500/30 text-purple-300"
                            : "hover:bg-[var(--surface-card-hover)] text-[var(--text-primary)]"
                        }`}
                      >
                        <ShieldCheck className="h-4 w-4 text-purple-400" />
                        <div>
                          <div className="font-bold">Admin Governance Console</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">Structuring KPIs, users & project audits</div>
                        </div>
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (setAdminWorkspaceMode) setAdminWorkspaceMode("developer");
                          setActiveTab("dashboard");
                          setUserMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          adminWorkspaceMode === "developer"
                            ? "bg-blue-500/10 border border-blue-500/30 text-blue-300"
                            : "hover:bg-[var(--surface-card-hover)] text-[var(--text-primary)]"
                        }`}
                      >
                        <Cpu className="h-4 w-4 text-blue-400" />
                        <div>
                          <div className="font-bold">Developer Simulation Studio</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">Telemetry & live attack audit bench</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (onSwitchAccount) onSwitchAccount("admin");
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 cursor-pointer text-purple-300 transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4 text-purple-400" />
                      <div>
                        <div className="font-bold">Switch to Administrator</div>
                        <div className="text-[10px] text-purple-200">Unlock governance console & policy audits</div>
                      </div>
                    </div>
                  )}

                  {/* 1-Click Quick Account Switcher */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (onSwitchAccount) {
                        onSwitchAccount(user.email.includes("admin") ? "developer" : "admin");
                      }
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface-card-hover)] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                    <span>
                      {user.email.includes("admin") ? "Switch to developer@enterprise.com" : "Switch to admin@contractguard.ai"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[var(--border-color)] pt-1">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 cursor-pointer transition-colors font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-rose)] hover:bg-[var(--surface-card-hover)] transition-all rounded-lg border border-[var(--border-color)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
