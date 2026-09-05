import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AppHeader } from '../../components/layout/AppHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SectionCard } from '../../components/policy/SectionCard';
import { VersionHistoryList } from '../../components/policy/VersionHistoryList';
import { DiffViewer } from '../../components/policy/DiffViewer';
import { 
  PolicyDetail, 
  PolicySectionItem, 
  UpdateSectionInput, 
  CreateSectionInput,
  PolicyDiffResponse,
  PolicyVersionSummary,
} from '../../types/policy';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Layers, 
  Tag, 
  Calendar,
  Send,
  FileText,
  ExternalLink,
  ShieldAlert,
  History,
  GitCompare,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const PolicyEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Tab selection: editor | history | diff
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'diff'>(
    (searchParams.get('tab') as 'editor' | 'history' | 'diff') || 'editor',
  );

  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [sections, setSections] = useState<PolicySectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, UpdateSectionInput>>({});

  // Diff comparison states
  const [diffFromId, setDiffFromId] = useState<string>(searchParams.get('from') || '');
  const [diffToId, setDiffToId] = useState<string>(searchParams.get('to') || '');
  const [diffData, setDiffData] = useState<PolicyDiffResponse | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<PolicyVersionSummary[]>([]);

  // Admin unlock states
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Edit notes / revision comments — one note per save session
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevisionNote, setShowRevisionNote] = useState(false);
  // Per-section notes (sectionId -> note text)
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({});
  const [openNoteSection, setOpenNoteSection] = useState<string | null>(null);

  const fetchPolicy = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/policies/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load policy (status: ${res.status})`);
      }

      const data = await res.json();
      setPolicy(data.policy);
      setSections(data.policy.activeVersion.sections || []);
    } catch (err) {
      setSaveMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  // Load available versions for diff selectors
  const fetchAvailableVersions = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/policies/${id}/versions`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.versions) {
        setAvailableVersions(data.versions);
        if (!diffToId && data.versions.length > 0) {
          setDiffToId(data.versions[0].id);
        }
        if (!diffFromId && data.versions.length > 1) {
          setDiffFromId(data.versions[1].id);
        } else if (!diffFromId && data.versions.length === 1) {
          setDiffFromId(data.versions[0].id);
        }
      }
    } catch {
      // Ignore
    }
  }, [id, diffFromId, diffToId]);

  useEffect(() => {
    if (activeTab === 'diff' || activeTab === 'history') {
      fetchAvailableVersions();
    }
  }, [activeTab, fetchAvailableVersions]);

  // Fetch diff comparison
  const fetchDiffData = useCallback(async (fromId: string, toId: string) => {
    if (!id || !fromId || !toId) return;
    setIsLoadingDiff(true);
    setDiffError(null);
    try {
      const res = await fetch(
        `/api/policies/${id}/diff?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to calculate version diff');
      }
      setDiffData(data.diff);
    } catch (err) {
      setDiffError((err as Error).message);
    } finally {
      setIsLoadingDiff(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'diff' && diffFromId && diffToId) {
      fetchDiffData(diffFromId, diffToId);
    }
  }, [activeTab, diffFromId, diffToId, fetchDiffData]);

  // Sync tab with URL
  const handleTabChange = (tab: 'editor' | 'history' | 'diff') => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      prev.set('tab', tab);
      return prev;
    });
  };

  const handleSelectDiffFromHistory = (fromId: string, toId: string) => {
    setDiffFromId(fromId);
    setDiffToId(toId);
    handleTabChange('diff');
  };

  // Editable when active version is DRAFT and user is USER/OWNER
  const isReadOnly = policy ? (policy.activeVersion.status !== 'DRAFT' || user?.role !== 'USER') : true;
  const isAdmin = user?.role === 'ADMIN';
  const isLocked = policy ? (['QUEUED', 'UNDER_REVIEW'].includes(policy.currentStatus)) : false;

  // Handle in-memory section field edits
  const handleSectionUpdate = (sectionId: string, updates: UpdateSectionInput) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec)),
    );

    setPendingChanges((prev) => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        ...updates,
      },
    }));
  };

  // Move section up in draft
  const handleMoveUp = (sectionId: string) => {
    if (isReadOnly) return;
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index <= 0) return prev;
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;

      const renumbered = updated.map((sec, idx) => ({
        ...sec,
        sectionNumber: idx + 1,
        orderIndex: idx,
      }));

      renumbered.forEach((sec, idx) => {
        setPendingChanges((p) => ({
          ...p,
          [sec.id]: {
            ...(p[sec.id] || {}),
            orderIndex: idx,
            sectionNumber: idx + 1,
          },
        }));
      });

      return renumbered;
    });
  };

  // Move section down in draft
  const handleMoveDown = (sectionId: string) => {
    if (isReadOnly) return;
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;

      const renumbered = updated.map((sec, idx) => ({
        ...sec,
        sectionNumber: idx + 1,
        orderIndex: idx,
      }));

      renumbered.forEach((sec, idx) => {
        setPendingChanges((p) => ({
          ...p,
          [sec.id]: {
            ...(p[sec.id] || {}),
            orderIndex: idx,
            sectionNumber: idx + 1,
          },
        }));
      });

      return renumbered;
    });
  };

  // Insert a new section at any index
  const handleInsertSection = async (insertIndex: number) => {
    if (!id || isReadOnly) return;
    setIsSaving(true);
    setSaveMessage(null);

    const positionNumber = insertIndex + 1;
    const newSectionPayload: CreateSectionInput = {
      sectionNumber: positionNumber,
      orderIndex: insertIndex,
      title: `Section ${positionNumber}: Specific Operating Rule`,
      controlArea: 'Operational Governance',
      policyStatement: 'State the specific operational requirement and compliance rule for this section.',
      rolesAndResponsibilities: 'Executing Unit and Supervisory Staff.',
      procedures: 'Operational steps for execution.',
      standardProcedure: 'Step-by-step operating guidelines.',
      complianceNotes: 'Applicable banking standards.',
    };

    try {
      const res = await fetch(`/api/policies/${id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newSectionPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add section');
      }

      setSections((prev) => {
        const updated = [...prev];
        updated.splice(insertIndex, 0, data.section);
        const renumbered = updated.map((sec, idx) => ({
          ...sec,
          sectionNumber: idx + 1,
          orderIndex: idx,
        }));

        renumbered.forEach((sec, idx) => {
          setPendingChanges((p) => ({
            ...p,
            [sec.id]: {
              ...(p[sec.id] || {}),
              orderIndex: idx,
              sectionNumber: idx + 1,
            },
          }));
        });

        return renumbered;
      });

      setSaveMessage({ text: `Section inserted at position ${positionNumber} successfully`, type: 'success' });
    } catch (err) {
      setSaveMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Add new section to bottom of draft
  const handleAddSection = () => {
    handleInsertSection(sections.length);
  };

  // Remove section from draft
  const handleDeleteSection = async (sectionId: string) => {
    if (!id || isReadOnly) return;
    if (!window.confirm('Are you sure you want to remove this section from the draft?')) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/policies/${id}/sections/${sectionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to remove section');
      }

      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      setSaveMessage({ text: 'Section removed from draft', type: 'success' });
    } catch (err) {
      setSaveMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Create New Revision from Approved Policy
  const handleCreateRevision = async () => {
    if (!id || policy?.currentStatus !== 'APPROVED') return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/policies/${id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create new revision');
      }

      setSaveMessage({ text: 'New draft revision created successfully', type: 'success' });
      await fetchPolicy();
    } catch (err) {
      setSaveMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Admin: Unlock a submitted/locked policy back to DRAFT
  const handleUnlockPolicy = async () => {
    if (!id || !isAdmin) return;
    setIsUnlocking(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/admin/policies/${id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: unlockReason.trim() || 'Admin override — policy returned to draft for revision.' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to unlock policy');
      }

      setShowUnlockConfirm(false);
      setUnlockReason('');
      setSaveMessage({ text: 'Policy unlocked and returned to Draft. The Owner can now edit it.', type: 'success' });
      await fetchPolicy();
    } catch (err) {
      setSaveMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsUnlocking(false);
    }
  };

  // Explicit Save Draft Button — creates a NEW version snapshot with the changes
  const handleSaveDraft = async () => {
    if (!id || isReadOnly) return;
    setIsSaving(true);
    setSaveMessage(null);

    const changeSummaryNote = revisionNote.trim() ? revisionNote.trim() : undefined;

    try {
      // Build the sectionChanges map (include per-section notes as a hint if present)
      const sectionChanges: Record<string, Record<string, unknown>> = {};
      for (const [secId, updates] of Object.entries(pendingChanges)) {
        const sectionNote = sectionNotes[secId]?.trim();
        sectionChanges[secId] = sectionNote ? { ...updates, _editNote: sectionNote } : { ...updates };
      }

      // Single request — backend clones the current version and applies all changes atomically
      const res = await fetch(`/api/policies/${id}/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sectionChanges,
          changeSummary: changeSummaryNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save draft as new version');
      }

      // Update local state with the freshly-returned policy (new version)
      if (data.policy) {
        setPolicy(data.policy);
        setSections(data.policy.activeVersion.sections || []);
      }

      setPendingChanges({});
      setRevisionNote('');
      setShowRevisionNote(false);
      setSectionNotes({});
      setOpenNoteSection(null);

      const newVer = data.newVersionNumber ?? data.policy?.activeVersion?.versionNumber;
      setSaveMessage({
        text: `Saved as new version v${newVer}.0 ✓`,
        type: 'success',
      });
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err) {
      setSaveMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };


  // Submit Policy for Checker Review
  const handleSubmitForReview = async () => {
    if (!id || isReadOnly) return;
    setIsSubmitting(true);
    setSaveMessage(null);

    try {
      // First, persist any pending section edits
      if (Object.keys(pendingChanges).length > 0) {
        await handleSaveDraft();
      }

      const res = await fetch(`/api/policies/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit policy for review');
      }

      setShowSubmitConfirm(false);
      setSaveMessage({ text: 'Policy successfully submitted to Checker Review Queue!', type: 'success' });
      await fetchPolicy();
    } catch (err) {
      setSaveMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <AppHeader currentModule="Policy Editor" />
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
                <div className="h-7 w-80 bg-slate-200 animate-pulse rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 bg-slate-200 animate-pulse rounded" />
                <div className="h-9 w-32 bg-slate-200 animate-pulse rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <div className="h-10 bg-slate-100 animate-pulse rounded" />
              <div className="h-10 bg-slate-100 animate-pulse rounded" />
              <div className="h-10 bg-slate-100 animate-pulse rounded" />
              <div className="h-10 bg-slate-100 animate-pulse rounded" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-28 bg-white border border-slate-200 animate-pulse rounded-xl" />
            <div className="h-28 bg-white border border-slate-200 animate-pulse rounded-xl" />
            <div className="h-28 bg-white border border-slate-200 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <AppHeader currentModule="Policy Editor / Not Found" />
        <div className="max-w-xl mx-auto mt-16 p-8 bg-white border border-slate-300 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Policy Document Not Found</h2>
          <p className="text-xs text-slate-500">The requested policy could not be located or you do not have permission to view it.</p>
          <button
            type="button"
            onClick={() => navigate('/user/dashboard')}
            className="px-4 py-2 bg-[#0F2042] text-white text-xs font-semibold"
          >
            Return to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  const sourceFile = policy.activeVersion.sourceFileUrl;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <AppHeader currentModule={`Policy Inspection / ${policy.documentCode}`} />

      {/* Top Document Action Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Back & Document Title Summary */}
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/owner/dashboard')}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-lg"
              title={isAdmin ? 'Return to Admin Dashboard' : 'Return to Owner Dashboard'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 border border-slate-200 rounded">
                  {policy.documentCode}
                </span>
                <StatusBadge status={policy.currentStatus} size="sm" />
                <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                  v{policy.activeVersion.versionNumber}.0
                </span>
              </div>
              <h2 className="text-sm font-bold text-[#0F2042] truncate max-w-xl">
                {policy.title}
              </h2>
            </div>
          </div>

          {/* Action Buttons (Visible on Editor Tab) */}
          <div className="flex items-center space-x-2.5 self-end sm:self-auto shrink-0">
            {sourceFile && (
              <a
                href={sourceFile}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors rounded-lg"
              >
                <FileText className="w-3.5 h-3.5 text-[#0F2042]" />
                <span className="hidden sm:inline">Original PDF</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            {saveMessage && !isAdmin && (
              <div
                className={`text-xs px-2.5 py-1 flex items-center gap-1.5 font-medium rounded-lg ${
                  saveMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {saveMessage.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                )}
                <span>{saveMessage.text}</span>
              </div>
            )}

            {activeTab === 'editor' && !isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={handleAddSection}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5 text-[#0F2042]" />
                  <span>Add Section</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 rounded-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Draft</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={isSaving || sections.length === 0}
                  className="px-4 py-1.5 bg-[#8B1D2C] hover:bg-[#721623] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 rounded-lg"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Review</span>
                </button>
              </>
            )}

            {activeTab === 'editor' && policy?.currentStatus === 'APPROVED' && !isAdmin && (
              <button
                type="button"
                onClick={handleCreateRevision}
                disabled={isSaving}
                className="px-4 py-1.5 bg-[#00693E] hover:bg-[#005733] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Create New Revision</span>
              </button>
            )}

            {/* Admin: Unlock locked policy */}
            {activeTab === 'editor' && isAdmin && isLocked && (
              <button
                type="button"
                onClick={() => setShowUnlockConfirm(true)}
                disabled={isUnlocking}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 rounded-lg"
              >
                <span>🔓</span>
                <span>Unlock Policy</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="border-t border-slate-200 bg-slate-50/70 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex space-x-6">
            <button
              type="button"
              onClick={() => handleTabChange('editor')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'editor'
                  ? 'border-[#8B1D2C] text-[#8B1D2C]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Structured Sections</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 text-[10px] font-mono">
                {sections.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('history')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-[#8B1D2C] text-[#8B1D2C]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Version History</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 text-[10px] font-mono">
                {policy.versionsCount || 1}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('diff')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'diff'
                  ? 'border-[#8B1D2C] text-[#8B1D2C]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>Diff Comparison</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: Structured Sections Editor */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Reviewer Feedback Banner when status is CHANGES_REQUESTED or feedback exists */}
            {policy.reviewerFeedback && (
              <div className="bg-rose-50 border-l-4 border-[#8B1D2C] p-5 shadow-sm rounded-r-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-[#8B1D2C] text-white flex items-center justify-center text-xs font-bold">
                      !
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Reviewer Feedback (Action Required Before Resubmitting)
                    </h4>
                  </div>
                  {policy.reviewerFeedbackDate && (
                    <span className="text-xs text-slate-500 font-medium">
                      {policy.reviewerName ? `By ${policy.reviewerName} • ` : ''}
                      {new Date(policy.reviewerFeedbackDate).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="bg-white/80 border border-red-200 p-4 rounded-lg text-slate-800 text-sm whitespace-pre-wrap leading-relaxed shadow-2xs">
                  {policy.reviewerFeedback}
                </div>
                <p className="text-xs text-rose-800 font-medium">
                  💡 Please update the sections below to address the compliance reviewer&apos;s comments, then click &quot;Submit for Review&quot; to resubmit.
                </p>
              </div>
            )}

            {/* Read-Only / Admin Inspection Warning Banner */}
            {isAdmin ? (
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 shadow-sm flex items-start space-x-3 rounded-r-xl">
                <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900">
                    Administrative Supervisory Inspection Mode
                  </h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Viewing policy lifecycle structure, authoring content, and compliance assignment in read-only governance mode.
                  </p>
                </div>
              </div>
            ) : isReadOnly ? (
              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 shadow-sm flex items-start space-x-3 rounded-r-xl">
                <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900">
                    Document Locked (Read-Only Mode)
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    This policy is currently in <span className="font-semibold uppercase">{policy.currentStatus}</span> status. 
                    Section editing is disabled while the policy is in the Checker review workflow.
                    {!isAdmin && (' An Admin can unlock this policy if changes are needed.')}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Metadata Banner Card */}
            <section className="bg-white border border-slate-300 p-5 shadow-sm rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Category: <strong className="text-slate-800">{policy.category}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Sections: <strong className="text-slate-800">{sections.length}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Last Modified: <strong className="text-slate-800">{new Date(policy.updatedAt).toLocaleDateString()}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                    <span className="text-slate-500">Author: </span>
                    <strong className="text-slate-800">{policy.ownerName || 'Policy Author'}</strong>
                    {policy.ownerDepartment && (
                      <span className="text-slate-400 font-normal"> ({policy.ownerDepartment})</span>
                    )}
                  </div>

                  <div className="bg-emerald-50/70 px-2.5 py-1 rounded-md border border-emerald-200/60">
                    <span className="text-emerald-800 font-medium">Assigned Checker: </span>
                    {policy.assignedCheckerName ? (
                      <strong className="text-emerald-900">
                        {policy.assignedCheckerName}
                        {policy.assignedCheckerDepartment && (
                          <span className="text-emerald-700 font-normal"> ({policy.assignedCheckerDepartment})</span>
                        )}
                      </strong>
                    ) : policy.currentStatus === 'QUEUED' ? (
                      <span className="text-amber-700 font-semibold italic">Unassigned (In Queue)</span>
                    ) : policy.currentStatus === 'APPROVED' ? (
                      <strong className="text-emerald-900">
                        {policy.reviewerName || 'Compliance Officer'}
                      </strong>
                    ) : (
                      <span className="text-slate-400 italic">None (Draft)</span>
                    )}
                  </div>
                </div>
              </div>

              {policy.description && (
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  &ldquo;{policy.description}&rdquo;
                </p>
              )}
            </section>

            {/* Section List Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F2042] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#8B1D2C]" />
                Structured Policy Sections ({sections.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                Click any section header to expand or collapse
              </span>
            </div>

            {/* Revision Notes Panel — shown when editing */}
            {!isReadOnly && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowRevisionNote((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>📝</span>
                    Revision Notes
                    {revisionNote && (
                      <span className="ml-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 rounded text-[10px] font-bold">
                        {revisionNote.length} chars
                      </span>
                    )}
                  </span>
                  <span className="text-yellow-700">{showRevisionNote ? '▲ Hide' : '▼ Add Note'}</span>
                </button>
                {showRevisionNote && (
                  <div className="px-4 pb-4 pt-2 space-y-1.5">
                    <p className="text-[11px] text-yellow-800">
                      Optional: Describe why you are editing this draft. This note will be saved as the version change summary.
                    </p>
                    <textarea
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder="e.g. Updated compliance references in Section 2 to reflect the latest CBE circular dated August 2026..."
                      rows={3}
                      className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-yellow-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500 placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Sections Collapsible Cards List */}
            <div className="space-y-3">
              {sections.length === 0 ? (
                <div className="bg-white border border-slate-300 p-8 text-center space-y-3 rounded-xl">
                  <p className="text-sm text-slate-500">No sections in this draft version.</p>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="px-4 py-2 bg-[#8B1D2C] text-white text-xs font-semibold rounded-lg"
                    >
                      Add First Section
                    </button>
                  )}
                </div>
              ) : (
                sections.map((section, idx) => (
                  <React.Fragment key={section.id}>
                    <div>
                      <SectionCard
                        section={section}
                        isReadOnly={isReadOnly}
                        onUpdate={handleSectionUpdate}
                        onDelete={handleDeleteSection}
                        isInitialOpen={idx === 0}
                        onNote={(sectionId) =>
                          setOpenNoteSection(openNoteSection === sectionId ? null : sectionId)
                        }
                        hasNote={Boolean(sectionNotes[section.id])}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < sections.length - 1}
                      />
                      {/* Per-section edit note popover */}
                      {!isReadOnly && openNoteSection === section.id && (
                        <div className="mt-1 mb-2 mx-0.5 bg-white border border-yellow-300 rounded-xl shadow-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-yellow-900">📝 Section Edit Note</span>
                            <button
                              type="button"
                              onClick={() => setOpenNoteSection(null)}
                              className="text-slate-400 hover:text-slate-700 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-[10px] text-yellow-700">
                            Why are you editing this section? (optional)
                          </p>
                          <textarea
                            value={sectionNotes[section.id] || ''}
                            onChange={(e) =>
                              setSectionNotes((prev) => ({ ...prev, [section.id]: e.target.value }))
                            }
                            placeholder="e.g. Aligned wording with new CBE regulation..."
                            rows={3}
                            className="w-full px-2 py-1.5 text-xs text-slate-800 bg-yellow-50 border border-yellow-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500"
                          />
                          <button
                            type="button"
                            onClick={() => setOpenNoteSection(null)}
                            className="w-full py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Save Note
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Insert Section Here Divider */}
                    {!isReadOnly && (
                      <div className="relative flex items-center justify-center my-1 group py-0.5">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-dashed border-transparent group-hover:border-[#8B1D2C]/30 transition-colors" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInsertSection(idx + 1)}
                          className="relative z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all px-2.5 py-0.5 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-300 text-[#8B1D2C] text-[10px] font-bold rounded-full shadow-2xs flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Insert Section Here (Position {idx + 2})</span>
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>

            {/* Bottom Action Footer */}
            {!isReadOnly && sections.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors rounded-lg"
                >
                  <Plus className="w-4 h-4 text-[#0F2042]" />
                  <span>Add Another Section</span>
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 rounded-lg"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(true)}
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#8B1D2C] hover:bg-[#721623] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 rounded-lg"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit for Checker Review</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Version History */}
        {activeTab === 'history' && (
          <VersionHistoryList
            policyId={policy.id}
            currentVersionNumber={policy.activeVersion.versionNumber}
            onSelectDiff={handleSelectDiffFromHistory}
          />
        )}

        {/* TAB 3: In-Place Diff Viewer */}
        {activeTab === 'diff' && (
          <div className="space-y-6">
            {/* Version Selectors Bar if multiple versions exist */}
            {availableVersions.length > 0 && (
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-600 uppercase">Compare From:</span>
                    <select
                      value={diffFromId}
                      onChange={(e) => setDiffFromId(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#0F2042]"
                    >
                      {availableVersions.map((v) => (
                        <option key={`tab-from-${v.id}`} value={v.id}>
                          v{v.versionNumber}.0 ({v.status}) • {new Date(v.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-400 font-bold">vs</span>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-600 uppercase">Compare To:</span>
                    <select
                      value={diffToId}
                      onChange={(e) => setDiffToId(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#0F2042]"
                    >
                      {availableVersions.map((v) => (
                        <option key={`tab-to-${v.id}`} value={v.id}>
                          v{v.versionNumber}.0 ({v.status}) • {new Date(v.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (diffFromId && diffToId) {
                        fetchDiffData(diffFromId, diffToId);
                      }
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
                    title="Reload Diff"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingDiff ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/owner/policies/${policy.id}/diff?from=${diffFromId}&to=${diffToId}`)}
                    className="px-3 py-1.5 bg-[#0F2042] text-white text-xs font-semibold rounded-lg hover:bg-[#1b356b] transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Full Page</span>
                  </button>
                </div>
              </div>
            )}

            {/* Diff Content View */}
            {isLoadingDiff ? (
              <div className="py-20 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B1D2C]" />
                <span className="text-xs font-semibold">Comparing section contents word-by-word...</span>
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
                <p className="text-xs text-slate-500">Select two versions above to see section-level diff highlights.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Submit Confirmation Modal Dialog */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 shadow-enterprise-lg w-full max-w-md animate-in fade-in zoom-in-95 duration-150 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-[#8B1D2C] w-full" />
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 text-[#8B1D2C] rounded-lg">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F2042]">Submit Policy for Review?</h3>
                  <p className="text-xs text-slate-500">Document Code: {policy.documentCode}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-700 space-y-1.5 rounded-lg">
                <p className="font-semibold text-slate-900">What happens on submission:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                  <li>The current draft is finalized as an <strong>immutable snapshot</strong>.</li>
                  <li>Policy status transitions to <strong>QUEUED</strong> and locks against further edits.</li>
                  <li>Dispatched to the Compliance Reviewer Queue with a <strong>24-hour SLA target</strong>.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#8B1D2C] hover:bg-[#721623] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 rounded-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm Submission</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Admin: Unlock Policy Confirmation Modal */}
      {showUnlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 shadow-enterprise-lg w-full max-w-md animate-in fade-in zoom-in-95 duration-150 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-amber-600 w-full" />
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                  <span className="text-xl">🔓</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F2042]">Unlock Policy for Editing?</h3>
                  <p className="text-xs text-slate-500">Document Code: {policy?.documentCode}</p>
                </div>
              </div>

              <div className="bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-800 space-y-1.5 rounded-lg">
                <p className="font-semibold text-amber-900">What happens on unlock:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                  <li>Policy status returns to <strong>DRAFT</strong> for the Owner to edit.</li>
                  <li>The active Checker review is <strong>cancelled</strong>.</li>
                  <li>The Owner will need to re-submit after making changes.</li>
                  <li>This action is logged in the audit trail.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Reason for unlock (optional)
                </label>
                <textarea
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="e.g. Owner requested changes after policy was submitted by mistake..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowUnlockConfirm(false); setUnlockReason(''); }}
                  disabled={isUnlocking}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUnlockPolicy}
                  disabled={isUnlocking}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 rounded-lg"
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Unlocking...</span>
                    </>
                  ) : (
                    <>
                      <span>🔓</span>
                      <span>Confirm Unlock</span>
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
