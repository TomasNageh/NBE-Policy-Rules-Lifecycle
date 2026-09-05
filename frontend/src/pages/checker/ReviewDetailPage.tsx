import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AppHeader } from '../../components/layout/AppHeader';
import { PolicyReviewDetail } from '../../types/review';
import { PolicySectionItem, PolicyDiffResponse, PolicyVersionSummary } from '../../types/policy';
import { DiffViewer } from '../../components/policy/DiffViewer';
import { SlaStatusBadge } from '../../components/ui/SlaStatusBadge';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Building,
  User,
  AlertTriangle,
  Send,
  GitCompare,
  Layers,
  RefreshCw,
  UserCheck,
  X,
} from 'lucide-react';

export const ReviewDetailPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<PolicyReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeciding, setIsDeciding] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [availableCheckers, setAvailableCheckers] = useState<Array<{ id: string; fullName: string; email: string; department: string | null }>>([]);
  const [selectedNewCheckerId, setSelectedNewCheckerId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Checker evaluation tab: 'sections' | 'diff'
  const [activeTab, setActiveTab] = useState<'sections' | 'diff'>('sections');
  const [diffData, setDiffData] = useState<PolicyDiffResponse | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [policyVersions, setPolicyVersions] = useState<PolicyVersionSummary[]>([]);
  const [diffFromVersionId, setDiffFromVersionId] = useState<string>('');

  const fetchReview = useCallback(async () => {
    if (!id) return;
    try {
      setErrorMessage(null);
      const res = await fetch(`/api/reviews/${id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load policy review');
      }
      setReview(data.review);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  // Load versions list for diff comparison
  const fetchVersionsForDiff = useCallback(async (policyId: string, currentVersionId: string) => {
    try {
      const res = await fetch(`/api/policies/${policyId}/versions`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.versions) {
        const vers: PolicyVersionSummary[] = data.versions;
        setPolicyVersions(vers);

        // Find index of current version in list
        const currentIndex = vers.findIndex((v) => v.id === currentVersionId);
        if (currentIndex !== -1 && currentIndex < vers.length - 1) {
          // Compare with prior version
          setDiffFromVersionId(vers[currentIndex + 1].id);
        } else if (vers.length > 1) {
          // Fallback to oldest version
          setDiffFromVersionId(vers[vers.length - 1].id);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (review?.policyId && review?.versionId) {
      fetchVersionsForDiff(review.policyId, review.versionId);
    }
  }, [review?.policyId, review?.versionId, fetchVersionsForDiff]);

  // Fetch diff comparison for Checker
  const fetchDiff = useCallback(async (policyId: string, fromId: string, toId: string) => {
    if (!policyId || !fromId || !toId) return;
    setIsLoadingDiff(true);
    setDiffError(null);
    try {
      const res = await fetch(
        `/api/policies/${policyId}/diff?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load version diff comparison');
      }
      setDiffData(data.diff);
    } catch (err) {
      setDiffError((err as Error).message);
    } finally {
      setIsLoadingDiff(false);
    }
  }, []);

  useEffect(() => {
    if (review?.policyId && diffFromVersionId && review?.versionId) {
      fetchDiff(review.policyId, diffFromVersionId, review.versionId);
    }
  }, [review?.policyId, diffFromVersionId, review?.versionId, fetchDiff]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      setIsDeciding(true);
      const res = await fetch(`/api/reviews/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to approve policy review');
      }

      setShowApproveModal(false);
      setToastMessage({
        text: 'Policy approved successfully! Document version is now locked.',
        type: 'success',
      });

      setTimeout(() => {
        navigate('/checker/dashboard', {
          state: { toast: 'Policy approved successfully! Document version is now locked.' },
        });
      }, 1200);
    } catch (err) {
      setToastMessage({
        text: (err as Error).message,
        type: 'error',
      });
    } finally {
      setIsDeciding(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!id) return;
    if (feedbackText.trim().length < 10) {
      setToastMessage({
        text: 'Reviewer feedback is required (minimum 10 characters).',
        type: 'error',
      });
      return;
    }

    try {
      setIsDeciding(true);
      const res = await fetch(`/api/reviews/${id}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ feedback: feedbackText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit change request');
      }

      setShowChangesModal(false);
      setToastMessage({
        text: 'Policy returned to owner with feedback for revision.',
        type: 'info',
      });

      setTimeout(() => {
        navigate('/checker/dashboard', {
          state: { toast: 'Policy returned to owner with revision feedback.' },
        });
      }, 1200);
    } catch (err) {
      setToastMessage({
        text: (err as Error).message,
        type: 'error',
      });
    } finally {
      setIsDeciding(false);
    }
  };

  const fetchCheckers = async () => {
    try {
      const res = await fetch('/api/admin/users?role=CHECKER', {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setAvailableCheckers(data.users);
        if (data.users.length > 0 && !selectedNewCheckerId) {
          const defaultC = data.users.find((u: { id: string }) => u.id !== review?.checkerId) || data.users[0];
          setSelectedNewCheckerId(defaultC.id);
        }
      }
    } catch {
      // Ignored
    }
  };

  const handleReassignReview = async () => {
    if (!selectedNewCheckerId || !id) return;
    setIsReassigning(true);
    try {
      const res = await fetch(`/api/reviews/${id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newCheckerId: selectedNewCheckerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reassign review');
      }

      setReview(data.review);
      setShowReassignModal(false);
      setToastMessage({
        text: data.message || 'Review successfully reassigned.',
        type: 'success',
      });
    } catch (err) {
      setToastMessage({
        text: (err as Error).message,
        type: 'error',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] === undefined ? false : !prev[sectionId],
    }));
  };

  const expandAll = (secs: PolicySectionItem[]) => {
    const next: Record<string, boolean> = {};
    secs.forEach((s) => {
      next[s.id] = true;
    });
    setExpandedSections(next);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex flex-col font-sans">
        <AppHeader currentModule="Review Evaluation" />
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
                <div className="h-7 w-72 bg-slate-200 animate-pulse rounded" />
              </div>
              <div className="h-9 w-32 bg-slate-200 animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <div className="h-12 bg-slate-100 animate-pulse rounded" />
              <div className="h-12 bg-slate-100 animate-pulse rounded" />
              <div className="h-12 bg-slate-100 animate-pulse rounded" />
              <div className="h-12 bg-slate-100 animate-pulse rounded" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-20 bg-white border border-slate-200 animate-pulse rounded-xl" />
            <div className="h-20 bg-white border border-slate-200 animate-pulse rounded-xl" />
            <div className="h-20 bg-white border border-slate-200 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !review) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <AppHeader currentModule="Review Evaluation / Error" />
        <div className="max-w-xl mx-auto mt-16 p-8 bg-white border border-slate-300 text-center space-y-4 rounded-xl">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Review Item Not Found</h2>
          <p className="text-xs text-slate-500">{errorMessage || 'Unable to access policy review'}</p>
          <button
            type="button"
            onClick={() => navigate('/checker/dashboard')}
            className="px-4 py-2 bg-[#00693E] hover:bg-[#005C36] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Return to Review Queue
          </button>
        </div>
      </div>
    );
  }

  const isDecided = review.decision !== 'PENDING';
  const sections = review.sections || [];
  const hasPriorVersions = policyVersions.length > 1 || review.versionNumber > 1;

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col font-sans">
      <AppHeader currentModule={`Review Evaluation / ${review.documentCode}`} />

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-8 z-50 px-5 py-3 shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all rounded-lg ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : toastMessage.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-300'
              : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Document Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Back & Policy Summary */}
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/checker/dashboard')}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-lg"
              title="Return to Review Queue"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-900 bg-[#F5F5F5] px-1.5 py-0.5 border border-[#E8E8E8] rounded">
                  {review.documentCode}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-[#E8F5EE] text-[#005C36] border border-[#9FCFB3] font-semibold rounded">
                  v{review.versionNumber}.0 (Submitted)
                </span>
                {isDecided ? (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      review.decision === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {review.decision === 'APPROVED' ? '✓ APPROVED' : '⚠ CHANGES REQUESTED'}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-[#E8F5EE] text-[#00693E] border border-[#9FCFB3] rounded">
                    UNDER REVIEW
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-[#0F2042] truncate max-w-xl">
                {review.policyTitle}
              </h2>
            </div>
          </div>

          {/* SLA Clock & Actions */}
          <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
            <SlaStatusBadge
              deadline={review.slaDeadline}
              decision={review.decision}
              serverStatus={review.slaStatus}
              size="md"
            />

            {review.sourceFileUrl && (
              <a
                href={review.sourceFileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors rounded-lg"
              >
                <FileText className="w-3.5 h-3.5 text-[#0F2042]" />
                <span className="hidden sm:inline">Original PDF</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            {!isDecided && (
              <div className="flex items-center space-x-2">
                {user?.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      fetchCheckers();
                      setShowReassignModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#0F2042] text-white hover:bg-[#1a3366] text-xs font-bold transition-colors rounded-lg flex items-center gap-1.5 shadow-xs"
                    title="Reassign to another Checker (Admin Only)"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Reassign</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowChangesModal(true)}
                  disabled={isDeciding}
                  className="px-3.5 py-1.5 bg-white border border-[#F7941D] text-[#B96808] hover:bg-[#FEF5E7] text-xs font-bold transition-colors disabled:opacity-50 rounded-lg"
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowApproveModal(true)}
                  disabled={isDeciding}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 rounded-lg"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Policy</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation (Structured Sections vs Visual Diff) */}
        <div className="border-t border-slate-200 bg-slate-50/70 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab('sections')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'sections'
                  ? 'border-[#00693E] text-[#00693E]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Full Sections Review</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 text-[10px] font-mono">
                {sections.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'diff'
                  ? 'border-[#F7941D] text-[#E07F0A]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCompare className="w-4 h-4 text-[#F7941D]" />
              <span>Compare Changes (Diff)</span>
              {hasPriorVersions && (
                <span className="px-1.5 py-0.5 rounded bg-[#FEF5E7] text-[#B96808] text-[10px] font-bold">
                  v{review.versionNumber > 1 ? review.versionNumber - 1 : 1} vs v{review.versionNumber}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Review Outcome Banner if already decided */}
        {isDecided && (
          <div
            className={`p-4 border-l-4 shadow-sm space-y-2 rounded-r-xl ${
              review.decision === 'APPROVED'
                ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                : 'bg-rose-50 border-rose-600 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">
                Evaluation Completed: {review.decision === 'APPROVED' ? 'Approved & Locked' : 'Changes Requested'}
              </span>
              <span className="text-xs">
                {review.decisionAt ? new Date(review.decisionAt).toLocaleString() : ''}
              </span>
            </div>
            {review.feedback && (
              <div className="text-xs bg-white/80 p-3 rounded-lg border border-current/20">
                <strong className="block mb-1">Feedback Provided to Owner:</strong>
                <p className="whitespace-pre-wrap">{review.feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Metadata Details Card */}
        <section className="bg-white border border-slate-300 p-5 shadow-sm rounded-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Policy Submitter</span>
              <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {review.submitterName}
              </div>
              <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                <Building className="w-3 h-3 text-slate-400" />
                {review.submitterDepartment || 'Banking Operations'}
              </div>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Assigned Checker</span>
              <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {review.checkerName || 'Unassigned'}
              </div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                {review.assignedAt ? `Claimed ${new Date(review.assignedAt).toLocaleTimeString()}` : 'Awaiting Assignment'}
              </div>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Category & Scope</span>
              <div className="font-bold text-slate-900 mt-0.5">{review.category}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">{sections.length} Standardized Sections</div>
            </div>

            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Submitted Date</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {new Date(review.queuedAt).toLocaleDateString()}
              </div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                {new Date(review.queuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {review.policyDescription && (
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-600">
              <strong className="text-slate-800">Policy Overview: </strong>
              {review.policyDescription}
            </div>
          )}

          {review.changeSummary && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              <strong className="text-slate-900">Change Log (Revision Notes): </strong>
              {review.changeSummary}
            </div>
          )}
        </section>

        {/* TAB 1: Structured Sections Explorer */}
        {activeTab === 'sections' && (
          <section className="space-y-4">
            {/* Change Summary Alert if Diff Data is available */}
            {diffData && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                    <GitCompare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Audit Baseline Comparison: v{review.versionNumber}.0 (Submitted Draft) vs {diffData.fromVersion.versionNumber === 1 ? 'v1.0 (Original Uploaded Document)' : `v${diffData.fromVersion.versionNumber}.0`}
                    </span>
                    <span className="text-[11px] text-amber-800">
                      <strong>{diffData.summary.modifiedSections}</strong> modified section{diffData.summary.modifiedSections === 1 ? '' : 's'} • <strong>{diffData.summary.addedSections}</strong> added • <strong>{diffData.summary.removedSections}</strong> removed • <strong>{diffData.summary.totalFieldChanges}</strong> total field changes
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('diff')}
                  className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-lg shadow-xs transition shrink-0 self-start sm:self-auto"
                >
                  View Full Side-by-Side Diff →
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#00693E] uppercase tracking-wider">
                  Structured Policy Sections ({sections.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Read-only evaluation of extracted control areas, operating procedures, and compliance criteria.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => expandAll(sections)}
                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 rounded-md"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 rounded-md"
                >
                  Collapse All
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {sections.map((sec, idx) => {
                const isExpanded = expandedSections[sec.id] !== false; // default open
                const secDiff = diffData?.sections.find((s) => s.sectionNumber === sec.sectionNumber);
                const isModified = secDiff?.changeType === 'MODIFIED';
                const isAdded = secDiff?.changeType === 'ADDED';
                const isUnchanged = secDiff?.changeType === 'UNCHANGED';

                return (
                  <div
                    key={sec.id || idx}
                    className={`bg-white border rounded-xl overflow-hidden transition-colors shadow-xs ${
                      isModified
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : isAdded
                        ? 'border-emerald-300 ring-1 ring-emerald-200'
                        : 'border-slate-300'
                    }`}
                  >
                    {/* Section Title Bar */}
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className={`w-full px-5 py-3.5 flex items-center justify-between text-left transition border-b ${
                        isModified
                          ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-200'
                          : isAdded
                          ? 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-200'
                          : 'bg-[#F8F8F8] hover:bg-[#F5F5F0] border-[#E8E8E8]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-4">
                        <span className="w-7 h-7 bg-[#00693E] text-white text-xs font-bold flex items-center justify-center font-mono rounded-lg shadow-sm shrink-0">
                          {sec.sectionNumber || idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {sec.title}
                            </span>
                            {isModified && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded font-mono">
                                ✏️ MODIFIED VS ORIGINAL ({secDiff.fieldDiffs.length} fields changed)
                              </span>
                            )}
                            {isAdded && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-mono">
                                ➕ NEW SECTION (ADDED)
                              </span>
                            )}
                            {isUnchanged && (
                              <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                                UNCHANGED
                              </span>
                            )}
                          </div>
                          {sec.controlArea && (
                            <span className="text-[11px] text-slate-500">
                              Area: {sec.controlArea}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-slate-400 shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {/* Section Content Fields */}
                    {isExpanded && (
                      <div className="p-5 space-y-4 text-xs">
                        {/* Policy Statement with Diff Highlighting */}
                        {(() => {
                          const stmtDiff = secDiff?.fieldDiffs.find((f) => f.fieldKey === 'policyStatement');
                          if (stmtDiff && stmtDiff.hasChanges) {
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Mandatory Policy Statement
                                  </label>
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded font-mono">
                                    EDITED IN THIS VERSION
                                  </span>
                                </div>
                                <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-lg text-slate-800 leading-relaxed font-sans space-y-2">
                                  <p className="font-semibold text-slate-900">{sec.policyStatement}</p>
                                  <div className="pt-2 border-t border-amber-200">
                                    <span className="text-[10px] font-bold text-amber-900 block mb-1">
                                      Visual Word Diff vs Original Upload:
                                    </span>
                                    <div className="bg-white p-2 rounded border border-amber-200 text-xs">
                                      {stmtDiff.diffParts.map((part, pIdx) => {
                                        if (part.added) {
                                          return (
                                            <mark key={pIdx} className="bg-emerald-100 text-emerald-950 font-bold px-1 py-0.5 mx-0.5 rounded border border-emerald-300 select-text">
                                              +{part.value}
                                            </mark>
                                          );
                                        }
                                        if (part.removed) {
                                          return (
                                            <del key={pIdx} className="bg-rose-100 text-rose-900 font-bold px-1 py-0.5 mx-0.5 rounded border border-rose-300 line-through select-text">
                                              -{part.value}
                                            </del>
                                          );
                                        }
                                        return <span key={pIdx} className="text-slate-600">{part.value}</span>;
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Mandatory Policy Statement
                              </label>
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 leading-relaxed font-sans">
                                {sec.policyStatement}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Two Column Grid for Roles & Procedures */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sec.rolesAndResponsibilities && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Roles & Responsibilities
                              </label>
                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                                {sec.rolesAndResponsibilities}
                              </div>
                            </div>
                          )}

                          {(sec.standardProcedure || sec.procedures) && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Standard Procedures & Operating Guidelines
                              </label>
                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                                {sec.standardProcedure || sec.procedures}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Controls & Exceptions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sec.controlsAndChecks && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Controls & Monitoring Checks
                              </label>
                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                                {sec.controlsAndChecks}
                              </div>
                            </div>
                          )}

                          {(sec.exceptionsAndEscalation || sec.exceptions) && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Exceptions & Escalation Matrix
                              </label>
                              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded text-amber-900">
                                {sec.exceptionsAndEscalation || sec.exceptions}
                              </div>
                            </div>
                          )}
                        </div>

                        {sec.complianceNotes && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Regulatory Compliance Notes
                            </label>
                            <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded text-blue-900">
                              {sec.complianceNotes}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 2: Visual Diff Comparison */}
        {activeTab === 'diff' && (
          <section className="space-y-6">
            {policyVersions.length > 1 && (
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-600 uppercase">Compare Against:</span>
                  <select
                    value={diffFromVersionId}
                    onChange={(e) => setDiffFromVersionId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#0F2042]"
                  >
                    {policyVersions
                      .filter((v) => v.id !== review.versionId)
                      .map((v) => (
                        <option key={`diff-v-${v.id}`} value={v.id}>
                          v{v.versionNumber}.0 ({v.status}) • {new Date(v.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (diffFromVersionId && review.versionId) {
                      fetchDiff(review.policyId, diffFromVersionId, review.versionId);
                    }
                  }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
                  title="Reload Diff"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDiff ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            {isLoadingDiff ? (
              <div className="py-20 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#00693E]" />
                <span className="text-xs font-semibold">Comparing section contents with prior version...</span>
              </div>
            ) : diffError ? (
              <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                <h4 className="text-sm font-bold text-red-900">Failed to Compare Versions</h4>
                <p className="text-xs text-red-700">{diffError}</p>
              </div>
            ) : diffData ? (
              <DiffViewer diff={diffData} />
            ) : (
              <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2">
                <GitCompare className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500">
                  {policyVersions.length <= 1
                    ? 'This is the initial submitted version of this policy document (no previous version to diff against).'
                    : 'Select a prior version to view word-level additions and deletions.'}
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 shadow-enterprise-lg w-full max-w-md animate-in fade-in zoom-in-95 duration-150 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-[#00693E] w-full" />
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F2042]">Approve Policy Document?</h3>
                  <p className="text-xs text-slate-500">Document Code: {review.documentCode}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-700 space-y-1.5 rounded-lg">
                <p className="font-semibold text-slate-900">Approval Outcome:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                  <li>This version (v{review.versionNumber}.0) will be marked <strong className="text-emerald-700">APPROVED</strong>.</li>
                  <li>The policy status transitions to <strong>APPROVED</strong> across the NBE repository.</li>
                  <li>Compliance audit log entry will be permanently written.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  disabled={isDeciding}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isDeciding}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 rounded-lg"
                >
                  {isDeciding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Approval</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 shadow-enterprise-lg w-full max-w-md animate-in fade-in zoom-in-95 duration-150 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-[#F7941D] w-full" />
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-50 text-orange-700 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F2042]">Request Policy Changes</h3>
                  <p className="text-xs text-slate-500">Document Code: {review.documentCode}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Feedback for Policy Owner <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Detail the required amendments, missing CBE circular references, or control adjustments..."
                  rows={4}
                  className="w-full p-3 text-xs border border-[#E8E8E8] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#F7941D]/40 focus:border-[#F7941D]"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Minimum 10 characters</span>
                  <span>{feedbackText.trim().length} chars</span>
                </div>
              </div>

              <div className="p-3 bg-[#FEF5E7] border border-[#FBD194] text-[#935206] text-[11px] rounded-lg">
                <strong>Workflow:</strong> This review will be marked <span className="font-semibold">CHANGES_REQUESTED</span>. A new draft (Version {review.versionNumber + 1}.0) will be cloned for the Policy Owner with your feedback attached.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowChangesModal(false)}
                  disabled={isDeciding}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleRequestChanges}
                  disabled={isDeciding || feedbackText.trim().length < 10}
                  className="px-4 py-2 bg-[#F7941D] hover:bg-[#E07F0A] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 rounded-lg"
                >
                  {isDeciding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reassign Review Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#F5F5F5] border-b border-[#E8E8E8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#E8F5EE] text-[#00693E] rounded-lg">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#00693E]">Reassign Review Responsibility</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{review.documentCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-500 font-medium">Currently Assigned Checker:</div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{review.checkerName || 'Unassigned Queue'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Select New Compliance Reviewer <span className="text-red-600">*</span>
                </label>
                <select
                  value={selectedNewCheckerId}
                  onChange={(e) => setSelectedNewCheckerId(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0F2042]"
                >
                  {availableCheckers.length === 0 ? (
                    <option value="">Loading compliance checkers...</option>
                  ) : (
                    availableCheckers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.email}) {c.id === review.checkerId ? '— (Currently Assigned)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="p-3 bg-[#E8F5EE] border border-[#9FCFB3] text-[#004F2D] text-[11px] rounded-lg leading-relaxed">
                <strong>Governance Audit Trail:</strong> This reassignment will transfer the evaluation workload, reset the assigned SLA timestamp to now, and create an immutable record in the <span className="font-semibold">AuditLog</span>.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  disabled={isReassigning}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleReassignReview}
                  disabled={isReassigning || !selectedNewCheckerId || selectedNewCheckerId === review.checkerId}
                  className="px-4 py-2 bg-[#00693E] hover:bg-[#005C36] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {isReassigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reassigning...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Confirm Reassignment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
