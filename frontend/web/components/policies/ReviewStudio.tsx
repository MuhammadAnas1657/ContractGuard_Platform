'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  UploadCloud,
  FileText,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Check,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Download,
  History,
  FileCode2,
  RefreshCw,
  GitPullRequest,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Policy, PastExport } from '@/lib/types/policy';
import {
  ReviewData,
  ProposedChange,
  ReviewConflict,
  VideoTranscriptItem,
  ReviewStepState,
  DecisionType,
} from '@/lib/types/review';
import { apiClient } from '@/lib/api/client';
import { ExportModal } from './ExportModal';

interface ReviewStudioProps {
  policy: Policy;
}

export function ReviewStudio({ policy }: ReviewStudioProps) {
  const router = useRouter();

  // Left/Right Pane resize state
  const [leftPanePercent, setLeftPanePercent] = useState<number>(45);
  const isDraggingRef = useRef(false);
  const [mobileTab, setMobileTab] = useState<'input' | 'diff'>('input');

  // Input state
  const [videoFile, setVideoFile] = useState<{ name: string; size: string } | null>({
    name: 'Compliance_Review_Walkthrough.mp4',
    size: '42.8 MB',
  });
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Video Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(74); // 01:14
  const duration = 282; // 04:42

  // Written review text
  const [textReview, setTextReview] = useState(
    `Review notes from Q4 Compliance Audit:\n- Please restrict refund ceiling to prevent automated balance depletion.\n- Probationary user accounts must have an absolute refund ceiling of $150 across the board.\n- Move customer note purge to soft-archive rather than a hard firewall block.\n- Streamline the return workflow by merging redundant authorization steps.`
  );

  // Agent Pipeline Stepper
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<ReviewStepState[]>([
    { key: 'upload', label: 'Upload & Parse', status: 'completed', detail: 'Video parsed (04:42)' },
    { key: 'transcribe', label: 'Transcribe Audio', status: 'completed', detail: 'Diarization complete (6 turns)' },
    { key: 'extract', label: 'Extract Feedback', status: 'completed', detail: '4 critical constraints identified' },
    { key: 'map', label: 'Map to Policy Sections', status: 'completed', detail: 'Mapped to 5 policy clauses' },
    { key: 'propose', label: 'Propose Changes & Conflicts', status: 'completed', detail: '6 proposals generated (1 conflict, 1 restructure)' },
  ]);

  // Review & Decisions state
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingChangeId, setEditingChangeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Submit / Success state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedVersion, setSubmittedVersion] = useState<string | null>(null);
  const [updatedPolicy, setUpdatedPolicy] = useState<Policy | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Resizable divider
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const windowWidth = window.innerWidth;
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

  // Initial load of review session
  useEffect(() => {
    let ignore = false;
    async function initReview() {
      try {
        setLoading(true);
        const data = await apiClient.getReview(policy.id);
        if (!ignore) {
          setReview(data);
        }
      } catch (err) {
        console.error('Failed to load review:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    initReview();
    return () => {
      ignore = true;
    };
  }, [policy.id]);

  // Video File Drop / Upload
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    setFileError(null);

    const file = e.dataTransfer.files?.[0];
    validateAndSetVideo(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    validateAndSetVideo(file);
  };

  const validateAndSetVideo = (file?: File) => {
    if (!file) return;

    // Check extension
    const validExtensions = ['.mp4', '.webm', '.mov'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setFileError('Invalid file format. Please upload an MP4, WebM, or MOV video recording.');
      return;
    }

    // Check size limit: 500 MB
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError('File exceeds 500 MB limit. Please compress or clip the recording.');
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setVideoFile({
      name: file.name,
      size: `${sizeMb} MB`,
    });
  };

  // Video player seek
  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    setIsPlaying(true);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Run Agent Pipeline Stepper
  const handleAnalyzeFeedback = async () => {
    if (!videoFile && !textReview.trim()) {
      setFileError('Please upload a video or provide written review notes.');
      return;
    }

    setIsAnalyzing(true);
    // Reset steps
    setPipelineSteps([
      { key: 'upload', label: 'Upload & Parse', status: 'idle', detail: 'Pending...' },
      { key: 'transcribe', label: 'Transcribe Audio', status: 'idle', detail: 'Pending...' },
      { key: 'extract', label: 'Extract Feedback', status: 'idle', detail: 'Pending...' },
      { key: 'map', label: 'Map to Policy Sections', status: 'idle', detail: 'Pending...' },
      { key: 'propose', label: 'Propose Changes & Conflicts', status: 'idle', detail: 'Pending...' },
    ]);

    try {
      const reviewSession = await apiClient.createReview(policy.id, {
        videoName: videoFile?.name,
        textReview,
      });

      for await (const stepEvent of apiClient.streamReview(reviewSession.review_id)) {
        setPipelineSteps((prev) =>
          prev.map((s) => (s.key === stepEvent.key ? { ...s, status: stepEvent.status, detail: stepEvent.detail } : s))
        );
      }

      const refreshed = await apiClient.getReview(reviewSession.review_id);
      setReview(refreshed);
      setToastMessage('Analysis complete! Proposed diffs are ready for decision.');
      setTimeout(() => setToastMessage(null), 3500);

      // On mobile switch to diff tab
      setMobileTab('diff');
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setFileError(err?.message || 'Agent analysis pipeline failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Decision Handling: Accept, Reject, Edit
  const handleDecision = (changeId: string, decision: DecisionType, editedValue?: string) => {
    if (!review) return;

    const updated = review.proposed_changes.map((c) => {
      if (c.change_id === changeId) {
        return {
          ...c,
          decision,
          edited_value: editedValue !== undefined ? editedValue : c.edited_value,
        };
      }
      return c;
    });

    setReview({
      ...review,
      proposed_changes: updated,
    });
    setEditingChangeId(null);
  };

  const handleStartEdit = (change: ProposedChange) => {
    setEditingChangeId(change.change_id);
    setEditValue(change.edited_value || change.after);
  };

  const handleSaveEdit = (changeId: string) => {
    handleDecision(changeId, 'edit', editValue);
  };

  // Accept All (resolves non-conflicting proposals; respects existing decisions)
  const handleAcceptAll = () => {
    if (!review) return;

    const updated = review.proposed_changes.map((c) => {
      // If conflicting change already rejected or other accepted, keep safe
      if (c.conflict_with) {
        const other = review.proposed_changes.find((o) => o.change_id === c.conflict_with);
        if (other?.decision === 'accept') {
          return c.decision === 'pending' ? { ...c, decision: 'reject' as DecisionType } : c;
        }
      }
      return {
        ...c,
        decision: c.decision === 'reject' ? 'reject' : ('accept' as DecisionType),
      };
    });

    setReview({
      ...review,
      proposed_changes: updated,
    });
    setToastMessage('Accepted all active proposals.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Discard All Decisions
  const handleDiscardAll = () => {
    if (!review) return;
    const reset = review.proposed_changes.map((c) => ({
      ...c,
      decision: 'pending' as DecisionType,
      edited_value: undefined,
    }));
    setReview({
      ...review,
      proposed_changes: reset,
    });
    setToastMessage('Reset all proposed change decisions.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Conflict evaluation:
  // Are there unresolved conflicts? (i.e. both conflicting changes are accepted, or both remain pending while user tries to submit)
  const unresolvedConflicts = (review?.conflicts || []).filter((conf) => {
    const changeA = review?.proposed_changes.find((c) => c.change_id === conf.change_ids[0]);
    const changeB = review?.proposed_changes.find((c) => c.change_id === conf.change_ids[1]);

    const aAccepted = changeA?.decision === 'accept' || changeA?.decision === 'edit';
    const bAccepted = changeB?.decision === 'accept' || changeB?.decision === 'edit';

    // Conflict exists if both are accepted
    if (aAccepted && bAccepted) return true;
    return false;
  });

  const hasUnresolvedConflicts = unresolvedConflicts.length > 0;
  const acceptedCount = (review?.proposed_changes || []).filter((c) => c.decision === 'accept' || c.decision === 'edit').length;
  const pendingCount = (review?.proposed_changes || []).filter((c) => c.decision === 'pending').length;

  // Final Submit
  const handleFinalSubmit = async () => {
    if (!review) return;
    if (hasUnresolvedConflicts) {
      alert('Please resolve all conflicting proposals before finalizing.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Persist decisions
      await apiClient.submitDecisions(
        review.review_id,
        review.proposed_changes.map((c) => ({
          change_id: c.change_id,
          decision: c.decision,
          edited_value: c.edited_value,
        }))
      );

      // Finalize review roll-forward
      const result = await apiClient.submitReview(review.review_id);
      setSubmittedVersion(result.new_version);
      setUpdatedPolicy(result.policy);
    } catch (err: any) {
      console.error('Final submit failed:', err);
      alert(err?.message || 'Failed to publish new policy version.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group changes by restructuring vs standard
  const standardChanges = (review?.proposed_changes || []).filter((c) => c.type !== 'restructure');
  const restructureChanges = (review?.proposed_changes || []).filter((c) => c.type === 'restructure');

  // ================= SUCCESS SCREEN =================
  if (submittedVersion && updatedPolicy) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-12 text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldCheck className="w-8 h-8 text-[var(--accent)]" />
          </div>

          <span className="text-xs font-mono font-semibold text-[var(--accent)] uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
            Version Roll-Forward Signed
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] mt-3">
            Policy Version {submittedVersion} Published
          </h1>

          <p className="text-xs sm:text-sm text-[var(--muted)] mt-2 max-w-xl mx-auto leading-relaxed">
            All accepted reviewer walkthrough revisions and restructurings have been sealed into <strong className="text-[var(--text)]">{updatedPolicy.title}</strong>. Previous versions are preserved with cryptographic non-repudiation.
          </p>

          <div className="mt-6 p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] max-w-md mx-auto text-xs text-[var(--muted)] flex items-center justify-between font-mono">
            <span>Status: <strong className="text-[var(--accent)]">Active Guard</strong></span>
            <span>·</span>
            <span>Applied: <strong className="text-[var(--text)]">{acceptedCount} changes</strong></span>
            <span>·</span>
            <span className="truncate max-w-[120px]" title={updatedPolicy.versions?.[0]?.integrity_hash}>
              {updatedPolicy.versions?.[0]?.integrity_hash?.slice(0, 16)}...
            </span>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="py-2.5 px-5 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Package ({submittedVersion})</span>
            </button>

            <Link
              href={`/policies/${updatedPolicy.id}`}
              className="py-2.5 px-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg)] text-xs font-semibold text-[var(--text)] transition-colors flex items-center gap-2"
            >
              <History className="w-4 h-4 text-[var(--muted)]" />
              <span>View Version History</span>
            </Link>

            <Link
              href="/policies"
              className="py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--border)]/40 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Back to Catalog
            </Link>
          </div>
        </div>

        {/* Export Modal */}
        <ExportModal
          policy={updatedPolicy}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </div>
    );
  }

  // ================= MAIN REVIEW STUDIO SPLIT VIEW =================
  return (
    <div className="w-full flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-14 right-6 z-50 bg-[var(--surface)] border border-emerald-500/40 text-[var(--text)] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="h-12 glass-header px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/policies/${policy.id}`)}
            className="p-1.5 rounded-lg neu-btn text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            title="Return to policy details"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-xs text-[var(--text)] truncate">
              Review Studio: {policy.title}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md neu-raised-sm text-purple-400 border border-purple-500/25 hidden sm:inline">
              Active: {policy.version}
            </span>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden items-center neu-tab-group text-xs">
          <button
            type="button"
            onClick={() => setMobileTab('input')}
            className={`px-3 py-1 text-xs neu-tab cursor-pointer ${
              mobileTab === 'input' ? 'neu-tab-active' : 'neu-tab-inactive'
            }`}
          >
            Feedback Input
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('diff')}
            className={`px-3 py-1 text-xs neu-tab cursor-pointer ${
              mobileTab === 'diff' ? 'neu-tab-active' : 'neu-tab-inactive'
            }`}
          >
            Diff & Proposals ({acceptedCount}/{review?.proposed_changes.length || 0})
          </button>
        </div>

        {/* Status Chip (Desktop) */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          {hasUnresolvedConflicts ? (
            <span className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25 font-medium neu-raised-sm">
              <AlertTriangle className="w-3.5 h-3.5" />
              1 Conflict Detected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[var(--muted)] font-mono text-[11px] neu-raised-sm px-2.5 py-1 rounded-lg border border-[var(--glass-border)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              {acceptedCount} of {review?.proposed_changes.length || 0} accepted
            </span>
          )}
        </div>
      </div>

      {/* Split Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ================= LEFT PANE: INPUT & PIPELINE ================= */}
        <div
          style={{ width: `${leftPanePercent}%` }}
          className={`h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)] overflow-hidden ${
            mobileTab === 'input' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5">
            {/* 1. Video Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[var(--ai)]" />
                  <span>Video Walkthrough (MP4, WebM, MOV)</span>
                </label>
                {videoFile && (
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    className="text-[11px] text-[var(--danger)] hover:underline"
                  >
                    Remove video
                  </button>
                )}
              </div>

              {fileError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-[var(--danger)]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {videoFile ? (
                /* Video Player with Synchronized Transcript */
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden space-y-3 p-3">
                  {/* Simulated Video Canvas */}
                  <div className="relative aspect-video rounded-lg bg-slate-950 border border-[var(--border)] flex flex-col justify-between p-3 overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {videoFile.name}
                      </span>
                      <span>{videoFile.size}</span>
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center mx-auto transition-transform active:scale-95 cursor-pointer backdrop-blur-xs"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                      <p className="text-xs text-slate-300 font-mono mt-2">
                        {isPlaying ? 'Playing Review Recording' : 'Paused · Click timestamp to seek'}
                      </p>
                    </div>

                    {/* Timeline bar */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{formatSeconds(currentTime)}</span>
                        <span>{formatSeconds(duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamped Transcript */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-[var(--text)]">
                        Timestamped Transcript
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Mock transcript (demo)
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {(review?.transcript || []).map((t, idx) => {
                        const isActive = currentTime >= t.seconds && currentTime < t.seconds + 45;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSeek(t.seconds)}
                            className={`p-2 rounded-lg border cursor-pointer transition-colors text-left ${
                              isActive
                                ? 'border-[var(--accent)] bg-emerald-500/10 text-[var(--text)]'
                                : 'border-transparent hover:bg-[var(--surface)] text-[var(--muted)]'
                            }`}
                          >
                            <div className="flex items-center justify-between font-mono text-[10px] mb-0.5">
                              <span className="text-[var(--accent)] font-bold">{t.timestamp}</span>
                              <span className="text-[var(--muted)]">{t.speaker}</span>
                            </div>
                            <p className="text-[11px] leading-relaxed">{t.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Drag & Drop Dropzone */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDraggingFile
                      ? 'border-[var(--accent)] bg-emerald-500/5'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/60 bg-[var(--bg)]/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp4,.webm,.mov"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[var(--text)]">
                    Drag and drop review walkthrough video, or <span className="text-[var(--accent)] underline">browse</span>
                  </p>
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    Supports MP4, WebM, MOV · Up to 500 MB
                  </p>
                </div>
              )}
            </div>

            {/* 2. Written Review Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Written Review & Audit Notes</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setTextReview(
                      `Review notes from Q4 Compliance Audit:\n- Please restrict refund ceiling to prevent automated balance depletion.\n- Probationary user accounts must have an absolute refund ceiling of $150 across the board.\n- Move customer note purge to soft-archive rather than a hard firewall block.\n- Streamline the return workflow by merging redundant authorization steps.`
                    )
                  }
                  className="text-[11px] text-[var(--accent)] hover:underline"
                >
                  Load sample notes
                </button>
              </div>

              <textarea
                rows={3}
                value={textReview}
                onChange={(e) => setTextReview(e.target.value)}
                placeholder="Paste auditor notes, meeting transcript snippets, or requested policy rule adjustments..."
                className="w-full p-3 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            {/* 3. Stepper Progress Area */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider font-mono">
                  Agent Pipeline Progress
                </span>
                {isAnalyzing && (
                  <span className="text-[10px] font-mono text-[var(--ai)] flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Running
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {pipelineSteps.map((step, idx) => (
                  <div key={step.key} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-0.5">
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                      ) : step.status === 'running' ? (
                        <div className="w-4 h-4 border-2 border-[var(--ai)] border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[var(--border)] text-[9px] font-mono flex items-center justify-center text-[var(--muted)]">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span
                        className={`font-semibold ${
                          step.status === 'completed'
                            ? 'text-[var(--text)]'
                            : step.status === 'running'
                            ? 'text-[var(--ai)]'
                            : 'text-[var(--muted)]'
                        }`}
                      >
                        {step.label}
                      </span>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              type="button"
              onClick={handleAnalyzeFeedback}
              disabled={isAnalyzing}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Walkthrough & Comments...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Feedback with Agent</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Resizable Divider Handle (Desktop) */}
        <div
          onMouseDown={() => (isDraggingRef.current = true)}
          className="hidden lg:flex w-3 cursor-col-resize items-center justify-center neu-divider-handle hover:w-3.5 transition-all z-20 group"
          title="Drag to resize panels"
        >
          <div className="w-1 h-8 rounded-full bg-[var(--border)] group-hover:bg-[var(--accent)] transition-colors" />
        </div>

        {/* ================= RIGHT PANE: DIFF & DECISIONS ================= */}
        <div
          style={{ width: `${100 - leftPanePercent}%` }}
          className={`h-full flex flex-col bg-[var(--bg)] overflow-hidden ${
            mobileTab === 'diff' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          {/* Header Summary */}
          <div className="h-11 px-4 border-b border-[var(--glass-border)] glass-header flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
              <GitPullRequest className="w-3.5 h-3.5 text-[var(--ai)]" />
              <span>Proposed Policy Diff ({review?.proposed_changes.length || 0} proposals)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-2.5 py-1 text-[11px] font-medium rounded-xl neu-btn text-[var(--accent)] transition-all cursor-pointer"
              >
                Accept All Safe
              </button>
              <button
                type="button"
                onClick={handleDiscardAll}
                className="px-2.5 py-1 text-[11px] font-medium rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Diffs Body */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* Conflict Warning Box */}
            {hasUnresolvedConflicts && (
              <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-xs text-[var(--text)] space-y-2 animate-in fade-in neu-raised-sm">
                <div className="flex items-center gap-2 text-amber-500 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Unresolved Conflict: {unresolvedConflicts[0].title}</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  {unresolvedConflicts[0].description}
                </p>
                <div className="p-2.5 rounded-xl surface-opaque border border-amber-500/30 text-[11px] font-medium text-amber-500 shadow-xs">
                  Tip: {unresolvedConflicts[0].resolution_tip}
                </div>
              </div>
            )}

            {/* Group 1: Standard Clause Modifications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
                <span>Clause Level Modifications</span>
                <span>{standardChanges.length} proposals</span>
              </div>

              {standardChanges.map((change) => renderDiffCard(change))}
            </div>

            {/* Group 2: Restructuring Proposals */}
            {restructureChanges.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-xs font-mono text-purple-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--ai)]" />
                    Agent Architecture Restructuring
                  </span>
                  <span>{restructureChanges.length} candidate</span>
                </div>

                {restructureChanges.map((change) => renderDiffCard(change, true))}
              </div>
            )}
          </div>

          {/* Right Pane Footer Actions */}
          <footer className="h-14 px-4 sm:px-6 border-t border-[var(--glass-border)] glass-header flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)] font-mono">
              <span className="font-semibold text-[var(--accent)]">{acceptedCount} accepted</span>
              <span>·</span>
              <span>{pendingCount} pending</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDiscardAll}
                className="px-3 py-1.5 text-xs rounded-xl neu-btn text-[var(--muted)] hover:text-[var(--danger)] transition-all cursor-pointer"
              >
                Discard Review
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || hasUnresolvedConflicts || acceptedCount === 0}
                className="py-2 px-5 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={
                  hasUnresolvedConflicts
                    ? 'Resolve contradictory proposals first'
                    : acceptedCount === 0
                    ? 'Accept at least one proposal before submitting'
                    : 'Submit accepted changes and roll-forward policy version'
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sealing Version...</span>
                  </>
                ) : (
                  <>
                    <span>Final Submit (Version Roll-Forward)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );

  // Helper renderer for individual proposed diff cards
  function renderDiffCard(change: ProposedChange, isRestructure: boolean = false) {
    const isEditing = editingChangeId === change.change_id;
    const isConflicting = !!change.conflict_with;

    // Type styling & badges (never color alone: text prefixes [+], [-], [~], [⚡])
    const typeBadges = {
      modify: { label: '[~] MODIFIED', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
      add: { label: '[+] ADDED', color: 'text-[var(--accent)] bg-emerald-500/10 border-emerald-500/20' },
      remove: { label: '[-] REMOVED', color: 'text-[var(--danger)] bg-red-500/10 border-red-500/20' },
      restructure: { label: '[⚡] RESTRUCTURED', color: 'text-[var(--ai)] bg-purple-500/10 border-purple-500/20' },
    }[change.type];

    const decisionStyles = {
      pending: 'border-[var(--border)] bg-[var(--surface)]',
      accept: 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30',
      reject: 'border-red-500/30 bg-red-500/5 opacity-70',
      edit: 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/30',
    }[change.decision];

    return (
      <div
        key={change.change_id}
        className={`p-4 sm:p-5 rounded-xl border transition-all space-y-3.5 ${decisionStyles}`}
      >
        {/* Top Meta Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${typeBadges.color}`}>
              {typeBadges.label}
            </span>
            <span className="text-xs font-bold text-[var(--text)]">
              {change.section_title}
            </span>
            <span className="text-[11px] font-mono text-[var(--muted)]">
              ({change.section})
            </span>
          </div>

          {/* Conflict Badge */}
          {isConflicting && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Conflict with {change.conflict_with}
            </span>
          )}
        </div>

        {/* Reason Prose */}
        <p className="text-xs text-[var(--text)] font-medium leading-relaxed">
          {change.reason}
        </p>

        {/* Source Chip */}
        <div className="flex items-start gap-2 text-[11px] text-[var(--muted)] bg-[var(--bg)] p-2.5 rounded-lg border border-[var(--border)] font-mono">
          {change.source.kind === 'video' ? (
            <button
              type="button"
              onClick={() => {
                if (change.source.timestamp) {
                  const parts = change.source.timestamp.split(':');
                  const s = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                  handleSeek(s);
                  setMobileTab('input');
                }
              }}
              className="text-[var(--accent)] font-bold hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
              title="Click to seek video"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{change.source.timestamp}</span>
            </button>
          ) : (
            <span className="text-purple-400 font-semibold shrink-0">
              [Written Review]
            </span>
          )}
          <span className="text-[11px] italic truncate">&ldquo;{change.source.quote}&rdquo;</span>
        </div>

        {/* Inline Diff Container */}
        <div className="space-y-1.5 font-mono text-xs">
          {change.before && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-2">
              <span className="font-bold select-none text-red-500">-</span>
              <span className="line-through opacity-80 break-words">{change.before}</span>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-mono text-[var(--muted)] block">
                Edit proposed replacement value:
              </label>
              <textarea
                rows={2}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-2.5 text-xs font-mono rounded-lg border border-[var(--accent)] bg-[var(--bg)] text-[var(--text)] outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingChangeId(null)}
                  className="px-2.5 py-1 text-xs rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(change.change_id)}
                  className="px-3 py-1 text-xs rounded bg-[var(--accent)] text-white font-medium hover:opacity-90 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save & Accept
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-2">
              <span className="font-bold select-none text-emerald-400">+</span>
              <span className="break-words font-medium">
                {change.edited_value || change.after}
              </span>
            </div>
          )}
        </div>

        {/* Decision Buttons */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[var(--muted)] uppercase">Decision:</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.2 rounded font-semibold uppercase ${
                change.decision === 'accept'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : change.decision === 'reject'
                  ? 'text-red-400 bg-red-500/10'
                  : change.decision === 'edit'
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-[var(--muted)] bg-[var(--bg)]'
              }`}
            >
              {change.decision}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleStartEdit(change)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                change.decision === 'edit'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-[var(--border)] hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              title="Edit proposed value inline"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => handleDecision(change.change_id, 'reject')}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                change.decision === 'reject'
                  ? 'border-red-500 text-red-400 bg-red-500/10'
                  : 'border-[var(--border)] hover:bg-[var(--surface)] text-[var(--muted)] hover:text-red-400'
              }`}
              title="Reject change"
            >
              <X className="w-3 h-3" />
              <span>Reject</span>
            </button>

            <button
              type="button"
              onClick={() => handleDecision(change.change_id, 'accept')}
              className={`px-3 py-1 text-xs rounded-md border font-semibold transition-colors flex items-center gap-1 ${
                change.decision === 'accept'
                  ? 'border-emerald-500 text-white bg-[var(--accent)]'
                  : 'border-emerald-500/40 text-[var(--accent)] hover:bg-emerald-500/10'
              }`}
              title="Accept change"
            >
              <Check className="w-3 h-3" />
              <span>Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
