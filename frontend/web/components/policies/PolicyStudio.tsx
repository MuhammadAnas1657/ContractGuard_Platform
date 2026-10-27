'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RepoJob } from '@/lib/types/repository';
import {
  Sparkles,
  Bot,
  User,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  Save,
  RotateCcw,
  Edit2,
  FileCode,
  FileText,
  ListTree,
  Send,
  HelpCircle,
  ShieldCheck,
  Cpu,
  Layers,
  Lock,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import {
  Policy,
  PolicySectionKey,
  PolicySectionDetail,
  PolicyContent,
  InterviewQuestion,
  InterviewAnswer,
} from '@/lib/types/policy';
import {
  AGENT_PRESETS,
  POLICY_INTERVIEW_QUESTIONS,
  buildSectionContent,
  compileFullPolicy,
  AgentPreset,
} from '@/lib/mocks/policy-interview-data';
import { apiClient } from '@/lib/api/client';
import { ExportModal } from './ExportModal';

export function PolicyStudio() {
  const router = useRouter();

  const searchParams = useSearchParams();

  // Step 0: Source Picker vs Step 1: Split View Studio
  const [step, setStep] = useState<'source_picker' | 'studio'>('source_picker');

  // Source configuration
  const [selectedPreset, setSelectedPreset] = useState<AgentPreset | null>(AGENT_PRESETS[0]);
  const [sourceMode, setSourceMode] = useState<'preset' | 'manual' | 'repo'>('preset');
  const [manualAgentName, setManualAgentName] = useState('');
  const [manualPurpose, setManualPurpose] = useState('');
  const [manualTools, setManualTools] = useState('');

  // Flow D: Analyzed Repositories state
  const [availableRepos, setAvailableRepos] = useState<RepoJob[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoJob | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  // Load repositories for source picker
  useEffect(() => {
    const fetchRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const repos = await apiClient.listRepoJobs();
        setAvailableRepos(repos);
        const repoIdParam = searchParams.get('repo_id');
        if (repoIdParam) {
          const matched = repos.find((r) => r.id === repoIdParam);
          if (matched) {
            setSourceMode('repo');
            setSelectedRepo(matched);
          }
        } else if (repos.length > 0) {
          setSelectedRepo(repos[0]);
        }
      } catch (err) {
        console.warn('Failed to load repositories for studio:', err);
      } finally {
        setIsLoadingRepos(false);
      }
    };
    fetchRepos();
  }, [searchParams]);

  // Studio state
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<PolicySectionKey, string>>({} as any);
  const [qaHistory, setQaHistory] = useState<InterviewAnswer[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Live Policy Preview state
  const [sections, setSections] = useState<Record<PolicySectionKey, PolicySectionDetail>>({} as any);
  const [streamingKey, setStreamingKey] = useState<PolicySectionKey | null>(null);
  const [rightTab, setRightTab] = useState<'preview' | 'yaml' | 'outline'>('preview');
  const [mobileTab, setMobileTab] = useState<'chat' | 'policy'>('chat');

  // Resizable split pane width (percentage for left pane)
  const [leftPanePercent, setLeftPanePercent] = useState<number>(45);
  const isDraggingRef = useRef(false);

  // Draft / Finish / Export state
  const [saveDraftNotice, setSaveDraftNotice] = useState<string | null>(null);
  const [createdPolicy, setCreatedPolicy] = useState<Policy | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);

  const currentQuestion: InterviewQuestion =
    POLICY_INTERVIEW_QUESTIONS[activeQuestionIndex] ||
    POLICY_INTERVIEW_QUESTIONS[POLICY_INTERVIEW_QUESTIONS.length - 1];

  const agentName =
    sourceMode === 'preset'
      ? selectedPreset?.name || 'SupportConcierge-AI'
      : sourceMode === 'repo'
      ? selectedRepo ? `${selectedRepo.name}-Agent` : 'RepoAgent-AI'
      : manualAgentName.trim() || 'CustomAgent-AI';

  const agentPurpose =
    sourceMode === 'preset'
      ? selectedPreset?.purpose || 'Autonomous Agent Operations'
      : sourceMode === 'repo'
      ? selectedRepo
        ? `Autonomous agent synthesized from repository AST analysis (${selectedRepo.tools.length} discovered tools, ${selectedRepo.risk_flags_count} risk flags mapped)`
        : 'Autonomous repository tool pipeline'
      : manualPurpose.trim() || 'Autonomous tool execution workflow';

  // Handle Resizable Split Pane Drag
  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const windowWidth = window.innerWidth;
      // enforce bounds between 30% and 70%
      const newPercent = Math.min(Math.max((e.clientX / windowWidth) * 100, 30), 70);
      setLeftPanePercent(newPercent);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Initialize or start Studio
  const handleStartStudio = () => {
    if (sourceMode === 'manual' && !manualAgentName.trim()) {
      alert('Please provide an agent name before proceeding.');
      return;
    }

    if (sourceMode === 'repo' && !selectedRepo) {
      alert('Please select an analyzed repository to proceed, or upload one first.');
      return;
    }

    setStep('studio');

    if (sourceMode === 'repo' && selectedRepo) {
      // PRE-FILL from repository AST findings and ask FEWER questions!
      const toolNames = selectedRepo.tools.map((t) => t.name).join(', ');
      const hasShell = selectedRepo.risk_flags.shell_execution.detected;
      const bannedOperations = hasShell
        ? 'raw_shell_execution, bash_subprocess_spawn, rm -rf, sudo, chmod, dump_credentials'
        : 'raw_sql_execution, delete_customer_account, dump_user_pii, unauthenticated_network_post';

      const initialAnswers: Partial<Record<PolicySectionKey, string>> = {
        agent_metadata: `${selectedRepo.name}-Agent (v1.0.0, AST scanned from ${selectedRepo.file_name}, verified ephemeral purge)`,
        tool_permissions: toolNames || 'fetch_customer_order, issue_partial_refund, send_transactional_email',
        hard_banned_tools: bannedOperations,
      };

      setAnswers(initialAnswers as Record<PolicySectionKey, string>);

      // Pre-fill QA history so user sees these were automatically extracted
      const prefilledHistory: InterviewAnswer[] = [
        {
          questionId: 'q1',
          sectionKey: 'agent_metadata',
          questionPrompt: 'What is the official agent identifier and operational role in your environment?',
          answer: initialAnswers.agent_metadata!,
          answeredAt: 'Pre-filled (AST)',
        },
        {
          questionId: 'q2',
          sectionKey: 'tool_permissions',
          questionPrompt: 'Which specific tools and capabilities are approved for standard operation?',
          answer: initialAnswers.tool_permissions!,
          answeredAt: 'Pre-filled (AST)',
        },
        {
          questionId: 'q3',
          sectionKey: 'hard_banned_tools',
          questionPrompt: 'Which dangerous tools, database actions, or shell commands are strictly forbidden?',
          answer: initialAnswers.hard_banned_tools!,
          answeredAt: 'Pre-filled (AST)',
        },
      ];
      setQaHistory(prefilledHistory);

      // Pre-populate sections
      const sec1 = buildSectionContent('agent_metadata', initialAnswers.agent_metadata!, agentName);
      const sec2 = buildSectionContent('tool_permissions', initialAnswers.tool_permissions!, agentName);
      const sec3 = buildSectionContent('hard_banned_tools', initialAnswers.hard_banned_tools!, agentName);

      setSections({
        agent_metadata: { ...sec1, isComplete: true, isUpdating: false },
        tool_permissions: { ...sec2, isComplete: true, isUpdating: false },
        hard_banned_tools: { ...sec3, isComplete: true, isUpdating: false },
      } as any);

      // Start the interview at Question 4 (Per-call limits), skipping questions 1, 2, and 3!
      setActiveQuestionIndex(3);

      const q4Key = POLICY_INTERVIEW_QUESTIONS[3].sectionKey;
      const q4Default = POLICY_INTERVIEW_QUESTIONS[3].defaultValue || 'Max $250.00 USD refund per invocation';
      triggerSectionStream(q4Key, q4Default, 4);
    } else {
      // Standard flow (preset or manual)
      setActiveQuestionIndex(0);
      const initialKey = POLICY_INTERVIEW_QUESTIONS[0].sectionKey;
      const defaultAns =
        sourceMode === 'preset' && selectedPreset?.recommendedDefaults[initialKey]
          ? selectedPreset.recommendedDefaults[initialKey]
          : POLICY_INTERVIEW_QUESTIONS[0].defaultValue || 'Default agent identifier';

      triggerSectionStream(initialKey, defaultAns, 1);
    }
  };

  // Stream a section with typing simulation and flash highlight
  const triggerSectionStream = async (
    key: PolicySectionKey,
    answerText: string,
    doneCount: number
  ) => {
    setStreamingKey(key);
    const detail = buildSectionContent(key, answerText, agentName);

    // Stream tokens
    for await (const event of apiClient.streamPolicy(key, detail.title, detail.yamlContent, doneCount)) {
      if (event.event === 'token') {
        // live token progress
      }
    }

    setSections((prev) => ({
      ...prev,
      [key]: {
        ...detail,
        isComplete: true,
        isUpdating: true,
      },
    }));

    // Keep highlight on for 1.2s then remove
    setTimeout(() => {
      setSections((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          isUpdating: false,
        },
      }));
      setStreamingKey(null);
    }, 1200);
  };

  // Submit Answer to current question
  const handleAnswerSubmit = async (answerText: string) => {
    if (!answerText.trim()) return;

    const key = currentQuestion.sectionKey;
    const updatedAnswers = {
      ...answers,
      [key]: answerText.trim(),
    };
    setAnswers(updatedAnswers);

    // Update or append QA history
    const newEntry: InterviewAnswer = {
      questionId: currentQuestion.id,
      sectionKey: key,
      questionPrompt: currentQuestion.prompt,
      answer: answerText.trim(),
      answeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setQaHistory((prev) => {
      const idx = prev.findIndex((item) => item.questionId === currentQuestion.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newEntry;
        return next;
      }
      return [...prev, newEntry];
    });

    setCurrentInput('');
    setEditingQuestionId(null);

    // Stream this section
    const nextDoneCount = Math.max(activeQuestionIndex + 1, Object.keys(updatedAnswers).length);
    await triggerSectionStream(key, answerText.trim(), nextDoneCount);

    // Advance to next question if not at end
    if (activeQuestionIndex < POLICY_INTERVIEW_QUESTIONS.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    }
  };

  // User clicks an earlier answer to edit
  const handleEditPreviousAnswer = (questionId: string) => {
    const qIndex = POLICY_INTERVIEW_QUESTIONS.findIndex((q) => q.id === questionId);
    if (qIndex >= 0) {
      setActiveQuestionIndex(qIndex);
      setEditingQuestionId(questionId);
      const existingAnswer = answers[POLICY_INTERVIEW_QUESTIONS[qIndex].sectionKey];
      if (existingAnswer) {
        setCurrentInput(existingAnswer);
      }
      // On mobile switch to chat
      setMobileTab('chat');
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      const fullPolicyContent = compileFullPolicy(agentName, agentPurpose, answers);
      const draftPolicy: Partial<Policy> = {
        agent_name: agentName,
        title: `${agentName} Policy`,
        description: agentPurpose,
        status: 'draft',
        version: 'v0.1.0-draft',
        tools_count: fullPolicyContent.primary_tools.length || 4,
        rules_count: Object.keys(answers).length || 1,
        content: fullPolicyContent,
        yaml_spec: fullPolicyContent.rawYaml,
      };

      const saved = await apiClient.createPolicy(draftPolicy);
      setCreatedPolicy(saved);
      setSaveDraftNotice(`Draft saved successfully at ${new Date().toLocaleTimeString()} (ID: ${saved.id})`);
      setTimeout(() => setSaveDraftNotice(null), 4000);
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  // Finish -> compile and save as Version 1 -> open Export Modal
  const handleFinishPolicy = async () => {
    try {
      const fullPolicyContent = compileFullPolicy(agentName, agentPurpose, answers);
      const finishedPolicy: Partial<Policy> = {
        agent_name: agentName,
        title: `${agentName} Policy`,
        description: agentPurpose,
        status: 'active',
        version: 'v1.0.0',
        tools_count: fullPolicyContent.primary_tools.length || 4,
        rules_count: 12,
        content: fullPolicyContent,
        yaml_spec: fullPolicyContent.rawYaml,
        versions: [
          {
            version: 'v1.0.0',
            created_at: new Date().toISOString(),
            author: 'Elena Vance',
            change_summary: 'Synthesized Version 1 from Policy Studio interview session',
            integrity_hash: fullPolicyContent.integrity_hash,
          },
        ],
      };

      const saved = await apiClient.createPolicy(finishedPolicy);
      setCreatedPolicy(saved);
      setIsExportModalOpen(true);
    } catch (err) {
      console.error('Failed to save final policy:', err);
    }
  };

  const copyYamlToClipboard = () => {
    const compiled = compileFullPolicy(agentName, agentPurpose, answers);
    navigator.clipboard.writeText(compiled.rawYaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2500);
  };

  const completedCount = Object.keys(answers).length;
  const isAllAnswered = completedCount >= 12;

  // ================= STEP 0: SOURCE PICKER =================
  if (step === 'source_picker') {
    return (
      <div className="w-full max-w-5xl mx-auto py-4 space-y-6">
        <div>
          <span className="text-xs font-semibold text-[var(--ai)] uppercase tracking-wider font-mono">
            Policy Studio · Step 0 of 2
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] mt-1">
            Configure Agent Context & Policy Source
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
            Select an operational preset or provide custom tool metadata to begin the automated security interview.
          </p>
        </div>

        {/* Source Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option A: Preset */}
          <div
            onClick={() => setSourceMode('preset')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              sourceMode === 'preset'
                ? 'bg-[var(--surface)] border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-xs'
                : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-[var(--accent)] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">
                Recommended
              </span>
            </div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Choose Pre-Engineered Preset
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
              Start with vetted security baselines for Customer Support, DevOps, or Financial agents.
            </p>
          </div>

          {/* Option B: Manual Description */}
          <div
            onClick={() => setSourceMode('manual')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              sourceMode === 'manual'
                ? 'bg-[var(--surface)] border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-xs'
                : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-[var(--ai)] flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]">
                Custom
              </span>
            </div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Describe Agent Manually
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
              Define agent identifier, business objectives, and custom tool parameters from scratch.
            </p>
          </div>

          {/* Option C: Use Repository (ENABLED) */}
          <div
            onClick={() => setSourceMode('repo')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              sourceMode === 'repo'
                ? 'bg-[var(--surface)] border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-xs'
                : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-[var(--accent)] flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20 font-bold">
                Flow D · AST Vetted
              </span>
            </div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Use Analyzed Repository
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
              Pre-fill interview with AST tool discovery and secrets findings extracted from codebase ZIP.
            </p>
          </div>
        </div>

        {/* Dynamic Detail based on Mode */}
        {sourceMode === 'preset' ? (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] font-mono">
              Select Preset Architecture:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AGENT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedPreset?.id === preset.id
                      ? 'bg-[var(--surface)] border-[var(--accent)] ring-1 ring-[var(--accent)]'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[var(--muted)]">
                      {preset.category}
                    </span>
                    {selectedPreset?.id === preset.id && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text)] mt-1">
                    {preset.name}
                  </h4>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                    {preset.purpose}
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex flex-wrap gap-1">
                    {preset.tools.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : sourceMode === 'repo' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] font-mono">
                Select Analyzed Repository:
              </h3>
              <Link
                href="/repositories/new"
                className="text-xs font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload & Scan Another Archive</span>
              </Link>
            </div>

            {isLoadingRepos ? (
              <div className="p-8 text-center text-xs text-[var(--muted)] animate-pulse rounded-xl border border-[var(--border)] surface-opaque">
                Loading analyzed repositories from vault...
              </div>
            ) : availableRepos.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] surface-opaque p-6 text-center space-y-3">
                <GitBranch className="w-8 h-8 text-[var(--muted)] mx-auto" />
                <h4 className="text-sm font-bold text-[var(--text)]">No analyzed repositories found</h4>
                <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                  Upload and scan an autonomous agent archive (.zip) first to extract tool signatures and risk profiles.
                </p>
                <Link
                  href="/repositories/new"
                  className="neu-btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload First Repository</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableRepos.map((repo) => {
                  const isSelected = selectedRepo?.id === repo.id;
                  return (
                    <div
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[var(--surface)] border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-xs'
                          : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[var(--text)] truncate">
                          {repo.name}
                        </span>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] shrink-0">
                            {repo.tools.length} tools
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[var(--muted)] font-mono mt-1">
                        {repo.file_name} · {(repo.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex flex-wrap gap-1">
                        {repo.tools.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"
                          >
                            {t.name}
                          </span>
                        ))}
                        {repo.tools.length > 3 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 text-[var(--muted)]">
                            +{repo.tools.length - 3} more
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Source code purged ({repo.deletion_receipt.status_text})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedRepo && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-[var(--text)]">
                  <strong>Pre-fill Active:</strong> Selecting <strong>{selectedRepo.name}</strong> will pre-populate agent metadata, tool permissions ({selectedRepo.tools.length} tools), and dangerous action bans. The interview will start directly at question 4 (Limits & Budgets).
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text)]">
              Manual Agent Definition
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1">
                  Agent Identifier / Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. PaymentsOrchestrator-v1"
                  value={manualAgentName}
                  onChange={(e) => setManualAgentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1">
                  Declared Tools (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. query_ledger, issue_credit, alert_slack"
                  value={manualTools}
                  onChange={(e) => setManualTools(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text)] mb-1">
                Operational Purpose & Mission
              </label>
              <textarea
                rows={2}
                placeholder="Describe what tasks this agent performs and which systems it accesses..."
                value={manualPurpose}
                onChange={(e) => setManualPurpose(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* CTA Launch Studio */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => router.push('/policies')}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartStudio}
            className="py-2.5 px-6 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
          >
            <span>Launch Policy Studio Interview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ================= STEP 1: SPLIT VIEW STUDIO =================
  const compiledPolicyForTabs = compileFullPolicy(agentName, agentPurpose, answers);

  return (
    <div className="w-full flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Toast Notice */}
      {saveDraftNotice && (
        <div className="fixed bottom-14 right-6 z-50 bg-[var(--surface)] border border-emerald-500/40 text-[var(--text)] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span>{saveDraftNotice}</span>
        </div>
      )}

      {/* Top Studio Bar */}
      <div className="h-12 glass-header px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setStep('source_picker')}
            className="p-1.5 rounded-lg neu-btn text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            title="Change agent source"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-xs text-[var(--text)] truncate">
              {agentName}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md neu-raised-sm text-[var(--muted)] border border-[var(--glass-border)] hidden sm:inline">
              Draft v1.0
            </span>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden items-center neu-tab-group text-xs">
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className={`px-3 py-1 text-xs neu-tab cursor-pointer ${
              mobileTab === 'chat' ? 'neu-tab-active' : 'neu-tab-inactive'
            }`}
          >
            Chat ({completedCount}/12)
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('policy')}
            className={`px-3 py-1 text-xs neu-tab cursor-pointer ${
              mobileTab === 'policy' ? 'neu-tab-active' : 'neu-tab-inactive'
            }`}
          >
            Live Policy
          </button>
        </div>

        {/* Progress Tracker (Desktop) */}
        <div className="hidden lg:flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--muted)]">
            Progress: <strong className="text-[var(--text)] font-semibold">{completedCount}</strong>/12 sections
          </span>
          <div className="w-32 h-2 rounded-full neu-pressed-sm border border-[var(--glass-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${(completedCount / 12) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ================= LEFT PANE: AI CHAT ================= */}
        <div
          style={{ width: `${leftPanePercent}%` }}
          className={`h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)] overflow-hidden ${
            mobileTab === 'chat' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          {/* Progress Bar on mobile */}
          <div className="lg:hidden p-3 border-b border-[var(--border)] bg-[var(--bg)] flex items-center justify-between text-xs">
            <span className="font-mono text-[var(--muted)]">
              Clause {currentQuestion.questionNumber} of 12: <strong className="text-[var(--text)]">{currentQuestion.sectionKey}</strong>
            </span>
            <span className="font-mono text-[var(--accent)] font-bold">
              {Math.round((completedCount / 12) * 100)}%
            </span>
          </div>

          {/* QA Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* Context Box */}
            <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--muted)] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--text)]">ContractGuard Policy Synthesis Engine</p>
                <p className="text-[11px] mt-0.5">
                  I will ask 12 targeted questions to construct machine-verifiable constraints. Click on any previous response to revise that section.
                </p>
              </div>
            </div>

            {/* Answered Questions History */}
            {qaHistory.map((item, idx) => (
              <div key={item.questionId} className="space-y-2">
                {/* AI prompt */}
                <div className="flex items-start gap-2.5 max-w-[90%]">
                  <div className="w-7 h-7 rounded-full bg-purple-500/10 text-[var(--ai)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-purple-500/20">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)]">
                    <span className="text-[10px] font-mono text-[var(--muted)] block mb-1">
                      Section {idx + 1}: {item.sectionKey}
                    </span>
                    {item.questionPrompt}
                  </div>
                </div>

                {/* User Answer (Clickable to edit) */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleEditPreviousAnswer(item.questionId)}
                    className="group max-w-[85%] text-left p-3 rounded-xl bg-[var(--accent)] text-white text-xs hover:opacity-95 transition-all shadow-xs"
                    title="Click to edit this answer"
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] text-emerald-100 font-mono mb-1">
                      <span>You · {item.answeredAt}</span>
                      <span className="flex items-center gap-1 group-hover:underline">
                        <Edit2 className="w-2.5 h-2.5" /> Edit
                      </span>
                    </div>
                    <p className="font-medium text-white">{item.answer}</p>
                  </button>
                </div>
              </div>
            ))}

            {/* Active Question from AI */}
            <div className="flex items-start gap-2.5 max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="w-7 h-7 rounded-full bg-purple-500/10 text-[var(--ai)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-purple-500/20">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[var(--ai)] font-semibold uppercase">
                    Question {currentQuestion.questionNumber} of 12 · {currentQuestion.sectionKey}
                  </span>
                  {editingQuestionId && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono border border-amber-500/20">
                      Editing Answer
                    </span>
                  )}
                </div>

                <p className="font-semibold text-[var(--text)] text-sm leading-relaxed">
                  {currentQuestion.prompt}
                </p>

                {currentQuestion.helperText && (
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    {currentQuestion.helperText}
                  </p>
                )}
              </div>
            </div>

            {/* Summary Message when all answered */}
            {isAllAnswered && !editingQuestionId && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-[var(--text)] space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All 12 Security Clauses Synthesized!</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Cryptographic digest calculated ({compiledPolicyForTabs.integrity_hash.slice(0, 24)}...). Click <strong>Finish & Export</strong> below to seal as Version 1.
                </p>
              </div>
            )}
          </div>

          {/* Quick Reply Chips + Input Area */}
          <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--surface)] space-y-3">
            {/* Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-[var(--muted)] font-mono uppercase mr-1">
                Quick Options:
              </span>
              {currentQuestion.chips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAnswerSubmit(chip)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-all font-medium text-left"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Free Text Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAnswerSubmit(currentInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={currentQuestion.placeholder}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
              />
              <button
                type="submit"
                disabled={!currentInput.trim()}
                className="p-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
                title="Send answer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Resizable Divider Handle (Desktop) */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden lg:flex w-3 cursor-col-resize items-center justify-center neu-divider-handle hover:w-3.5 transition-all z-20 group"
          title="Drag to resize panels"
        >
          <div className="w-1 h-8 rounded-full bg-[var(--border)] group-hover:bg-[var(--accent)] transition-colors" />
        </div>

        {/* ================= RIGHT PANE: LIVE POLICY PREVIEW ================= */}
        <div
          style={{ width: `${100 - leftPanePercent}%` }}
          className={`h-full flex flex-col bg-[var(--bg)] overflow-hidden ${
            mobileTab === 'policy' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          {/* Right Pane Navigation Tabs */}
          <div className="h-11 px-4 border-b border-[var(--glass-border)] glass-header flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center neu-tab-group text-xs">
              <button
                type="button"
                onClick={() => setRightTab('preview')}
                className={`px-3 py-1 text-xs neu-tab flex items-center gap-1.5 cursor-pointer ${
                  rightTab === 'preview'
                    ? 'neu-tab-active'
                    : 'neu-tab-inactive'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setRightTab('yaml')}
                className={`px-3 py-1 text-xs neu-tab flex items-center gap-1.5 cursor-pointer ${
                  rightTab === 'yaml'
                    ? 'neu-tab-active text-[var(--ai)]'
                    : 'neu-tab-inactive'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>YAML Spec</span>
              </button>

              <button
                type="button"
                onClick={() => setRightTab('outline')}
                className={`px-3 py-1 text-xs neu-tab flex items-center gap-1.5 cursor-pointer ${
                  rightTab === 'outline'
                    ? 'neu-tab-active'
                    : 'neu-tab-inactive'
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>Outline ({completedCount}/12)</span>
              </button>
            </div>

            {rightTab === 'yaml' && (
              <button
                type="button"
                onClick={copyYamlToClipboard}
                className="px-2.5 py-1 text-[11px] font-mono rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1 cursor-pointer"
              >
                {copiedYaml ? <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedYaml ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          {/* Right Pane Body */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {/* VIEW 1: Human-readable Preview */}
            {rightTab === 'preview' && (
              <div className="space-y-4">
                {Object.values(compiledPolicyForTabs.sections).map((sec) => {
                  const isUpdated = sec.isUpdating || streamingKey === sec.key;
                  const isAnswered = !!answers[sec.key];

                  return (
                    <div
                      key={sec.key}
                      id={`sec-${sec.key}`}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        isUpdated
                          ? 'border-[var(--accent)] bg-emerald-500/10 ring-2 ring-[var(--accent)]/40 shadow-md surface-opaque'
                          : isAnswered
                          ? 'border-[var(--border)] surface-opaque shadow-xs'
                          : 'border-[var(--border)]/60 surface-opaque opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[var(--accent)]">
                            {sec.order < 10 ? `0${sec.order}` : sec.order}.
                          </span>
                          <h4 className="text-xs font-bold text-[var(--text)]">
                            {sec.title}
                          </h4>
                        </div>
                        {isAnswered ? (
                          <span className="text-[10px] font-mono text-[var(--accent)] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--muted)]">
                            Pending question
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[var(--muted)] mb-3">
                        {sec.summary}
                      </p>

                      <ul className="space-y-1.5">
                        {sec.readableContent.map((line, i) => (
                          <li key={i} className="text-xs text-[var(--text)] flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW 2: Monospace YAML Viewer (Strictly Opaque and High-Contrast) */}
            {rightTab === 'yaml' && (
              <div className="rounded-xl border border-[var(--border)] code-opaque p-4 font-mono text-xs overflow-x-auto shadow-inner">
                <pre className="leading-relaxed whitespace-pre font-mono">
                  {compiledPolicyForTabs.rawYaml}
                </pre>
              </div>
            )}

            {/* VIEW 3: Outline Checklist */}
            {rightTab === 'outline' && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider font-mono mb-3">
                  12 Policy Enforcement Sections
                </h3>
                {POLICY_INTERVIEW_QUESTIONS.map((q) => {
                  const isDone = !!answers[q.sectionKey];
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setRightTab('preview');
                        setTimeout(() => {
                          const el = document.getElementById(`sec-${q.sectionKey}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 50);
                      }}
                      className={`w-full text-left p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-[var(--text)] hover:border-emerald-500/60'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-[var(--muted)] shrink-0" />
                        )}
                        <span className="font-medium">
                          {q.questionNumber}. {q.sectionKey.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        {isDone ? 'Completed' : 'Pending'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= STUDIO FOOTER ================= */}
      <footer className="h-14 px-4 sm:px-6 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep('source_picker')}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)] transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>Save Draft</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleFinishPolicy}
            disabled={!isAllAnswered}
            className="py-2 px-5 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={!isAllAnswered ? `Answer all 12 questions to finish (${completedCount}/12 completed)` : 'Finish and compile Version 1'}
          >
            <span>Finish & Export</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Export Modal after Finish */}
      {createdPolicy && (
        <ExportModal
          policy={createdPolicy}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExportRecorded={() => {
            // Can redirect or show toast
          }}
        />
      )}
    </div>
  );
}
