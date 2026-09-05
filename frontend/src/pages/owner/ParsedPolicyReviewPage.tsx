import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/layout/AppHeader';
import { SectionCard, sanitizeTitle } from '../../components/policy/SectionCard';
import { 
  ParsedPolicyDraft, 
  PolicySectionItem, 
  UpdateSectionInput, 
  ConfirmUploadInput 
} from '../../types/policy';
import { 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  AlertTriangle, 
  Loader2, 
  ExternalLink,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  FileCode,
  Plus,
} from 'lucide-react';

export const ParsedPolicyReviewPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const draftFromLocation = (location.state as { draft?: ParsedPolicyDraft })?.draft;

  const draft = draftFromLocation || null;
  const [title, setTitle] = useState(draftFromLocation?.title || '');
  const [documentCode, setDocumentCode] = useState(draftFromLocation?.documentCode || '');
  const [category, setCategory] = useState(draftFromLocation?.category || 'General Banking & Governance');
  const [description, setDescription] = useState(draftFromLocation?.description || '');
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  // Convert parsed sections to standard PolicySectionItems for editing with clean titles
  const [sections, setSections] = useState<PolicySectionItem[]>(
    draftFromLocation?.sections.map((s, idx) => ({
      id: `temp-${idx}`,
      versionId: 'temp-ver',
      sectionNumber: s.sectionNumber,
      title: sanitizeTitle(s.title, s.sectionNumber),
      controlArea: s.controlArea,
      policyStatement: s.policyStatement,
      rolesAndResponsibilities: s.rolesAndResponsibilities,
      procedures: s.standardProcedure,
      standardProcedure: s.standardProcedure,
      requiredRecords: s.requiredRecords,
      controlsAndChecks: s.controlsAndChecks,
      exceptionsAndEscalation: s.exceptionsAndEscalation,
      kpiExamples: s.kpiExamples,
      testingScenario: s.testingScenario,
      complianceNotes: s.complianceNotes,
      exceptions: s.exceptionsAndEscalation,
      unmatchedContent: s.unmatchedContent.length > 0 ? s.unmatchedContent.join('\n\n') : null,
      orderIndex: idx,
      parseStatus: s.parseStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })) || [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex flex-col font-sans">
        <AppHeader currentModule="Extracted Policy Review" />
        <div className="max-w-xl mx-auto mt-16 p-8 bg-white border border-[#E8E8E8] shadow-nbe-card rounded-2xl text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-[#F7941D] mx-auto" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">No Staged PDF Extraction Found</h2>
          <p className="text-xs text-[#555555]">Please upload a policy PDF document from your dashboard to begin structured extraction.</p>
          <button
            type="button"
            onClick={() => navigate('/user/dashboard')}
            className="px-5 py-2.5 bg-[#00693E] hover:bg-[#005C36] text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleSectionUpdate = (sectionId: string, updates: UpdateSectionInput) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec)),
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections((prev) => {
      const filtered = prev.filter((sec) => sec.id !== sectionId);
      return filtered.map((sec, idx) => ({
        ...sec,
        sectionNumber: idx + 1,
        orderIndex: idx,
      }));
    });
  };

  const handleMoveUp = (sectionId: string) => {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index <= 0) return prev;
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated.map((sec, idx) => ({
        ...sec,
        sectionNumber: idx + 1,
        orderIndex: idx,
      }));
    });
  };

  const handleMoveDown = (sectionId: string) => {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated.map((sec, idx) => ({
        ...sec,
        sectionNumber: idx + 1,
        orderIndex: idx,
      }));
    });
  };

  const handleInsertSection = (insertIndex: number) => {
    const positionNumber = insertIndex + 1;
    const newSection: PolicySectionItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      versionId: 'temp-ver',
      sectionNumber: positionNumber,
      title: `Section ${positionNumber}: Specific Operating Rule`,
      controlArea: 'Operational Governance',
      policyStatement: 'State the specific operational requirement and compliance rule for this section.',
      rolesAndResponsibilities: 'Executing Unit and Supervisory Staff.',
      procedures: 'Operational steps for execution.',
      standardProcedure: 'Step-by-step operating guidelines.',
      requiredRecords: 'Standard system records and signed approvals.',
      controlsAndChecks: 'Dual-authorization and supervisory review.',
      exceptionsAndEscalation: 'Escalation to Department Head.',
      kpiExamples: null,
      testingScenario: null,
      complianceNotes: null,
      exceptions: null,
      unmatchedContent: null,
      orderIndex: insertIndex,
      parseStatus: 'MATCHED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSections((prev) => {
      const updated = [...prev];
      updated.splice(insertIndex, 0, newSection);
      return updated.map((sec, idx) => ({
        ...sec,
        sectionNumber: idx + 1,
        orderIndex: idx,
      }));
    });
  };

  const handleAddSection = () => {
    handleInsertSection(sections.length);
  };

  const handleConfirmAndSave = async () => {
    if (!title.trim() || !documentCode.trim()) {
      setError('Policy title and document code are required before saving.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: ConfirmUploadInput = {
      title: title.trim(),
      documentCode: documentCode.trim().toUpperCase(),
      category: category.trim(),
      description: description.trim() || undefined,
      sourceFileUrl: draft.sourceFileUrl,
      sections: sections.map((sec, idx) => ({
        sectionNumber: sec.sectionNumber || idx + 1,
        title: sec.title,
        controlArea: sec.controlArea,
        policyStatement: sec.policyStatement,
        rolesAndResponsibilities: sec.rolesAndResponsibilities,
        standardProcedure: sec.standardProcedure || sec.procedures,
        requiredRecords: sec.requiredRecords,
        controlsAndChecks: sec.controlsAndChecks,
        exceptionsAndEscalation: sec.exceptionsAndEscalation || sec.exceptions,
        kpiExamples: sec.kpiExamples,
        testingScenario: sec.testingScenario,
        complianceNotes: sec.complianceNotes,
        unmatchedContent: sec.unmatchedContent,
        parseStatus: sec.parseStatus,
        orderIndex: idx,
      })),
    };

    try {
      const res = await fetch('/api/policies/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save policy draft');
      }

      // Navigate straight to the saved policy editor
      navigate(`/user/policies/${data.policy.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const unmatchedSectionsCount = sections.filter(
    (s) => s.unmatchedContent && s.unmatchedContent.trim().length > 0,
  ).length;

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col font-sans">
      <AppHeader currentModule="PDF Ingestion / Review Extracted Policy" />

      {/* Top Document Action Bar */}
      <div className="bg-white border-b border-[#E8E8E8] sticky top-16 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/user/dashboard')}
              className="p-1.5 text-[#555555] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors rounded-lg"
              title="Cancel & Return"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-[#E8E8E8]" />

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[11px] font-bold text-[#005C36] bg-[#E8F5EE] border border-[#9FCFB3] px-2 py-0.5 rounded-md">
                  STAGING EXTRACTION
                </span>
                <span className="text-[11px] text-[#888888] font-mono">
                  {draft.fileName} ({draft.totalPages} {draft.totalPages === 1 ? 'page' : 'pages'})
                </span>
              </div>
              <h2 className="text-sm font-bold text-[#1A1A1A] truncate max-w-xl">
                {title || 'Untitled Extracted Policy Document'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {draft.sourceFileUrl && (
              <a
                href={draft.sourceFileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-[#F5F5F5] hover:bg-[#E8F5EE] border border-[#E8E8E8] hover:border-[#9FCFB3] text-[#333333] text-xs font-semibold flex items-center gap-1.5 transition-colors rounded-lg"
              >
                <FileText className="w-3.5 h-3.5 text-[#00693E]" />
                <span className="hidden sm:inline">Original PDF</span>
                <ExternalLink className="w-3 h-3 text-[#888888]" />
              </a>
            )}

            <button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#00693E] hover:bg-[#005C36] text-white text-xs font-bold flex items-center gap-2 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Staged Policy...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Create Policy Draft</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-xs text-red-900 flex items-start gap-2.5 shadow-nbe-card animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Extraction Staging Error:</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Informational Ingestion Banner */}
        <section className="bg-white border border-[#E8E8E8] p-6 shadow-nbe-card rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F7941D]">
                <Sparkles className="w-4 h-4 text-[#F7941D]" />
                Automated Multi-Section Extraction
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A]">
                Review &amp; Refine Structured Policy Sections
              </h3>
              <p className="text-xs text-[#555555] max-w-3xl leading-relaxed">
                The ingestion engine has split your uploaded document into <strong>{sections.length} distinct compliance sections</strong>. Review headings, control areas, and mandatory obligations below before committing the draft into the four-eyes review lifecycle.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#E8F5EE] border border-[#9FCFB3] px-4 py-2.5 text-center rounded-xl">
                <span className="block text-[10px] font-bold text-[#005C36] uppercase tracking-wider">
                  Total Sections
                </span>
                <span className="text-xl font-bold text-[#00693E]">{sections.length}</span>
              </div>

              {unmatchedSectionsCount > 0 && (
                <div className="bg-amber-50 border border-amber-300 px-4 py-2.5 text-center rounded-xl">
                  <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    Unmatched Content
                  </span>
                  <span className="text-xl font-bold text-amber-700">{unmatchedSectionsCount}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Global Metadata Card */}
        <section className="bg-white border border-[#E8E8E8] p-6 shadow-nbe-card rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-[#00693E] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-[#F0F0F0]">
            <FileCode className="w-4 h-4 text-[#00693E]" />
            Document Master Metadata
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#333333] uppercase tracking-wider">
                Policy Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Retail Credit Underwriting Policy & Standard Rules"
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] font-semibold focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#333333] uppercase tracking-wider">
                Document Code *
              </label>
              <input
                type="text"
                value={documentCode}
                onChange={(e) => setDocumentCode(e.target.value)}
                placeholder="e.g. POL-RET-004"
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] font-mono font-bold focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#333333] uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#888888]" />
                Category / Domain
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#333333] uppercase tracking-wider">
                Executive Summary / Scope
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description or purpose of this policy..."
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Extracted Sections List Header & Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00693E]" />
              <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Extracted Policy Sections ({sections.length})
              </h3>
              <span className="text-[11px] text-[#888888] hidden sm:inline">
                • Move sections up/down or insert new rules anywhere
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddSection}
                className="px-3 py-1.5 bg-[#00693E] hover:bg-[#005C36] text-white text-[11px] font-bold flex items-center gap-1 rounded-lg transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
              <button
                type="button"
                onClick={() => setExpandAll(true)}
                className="px-3 py-1.5 bg-white hover:bg-[#F5F5F5] border border-[#E8E8E8] text-[#333333] text-[11px] font-semibold flex items-center gap-1 rounded-lg transition shadow-2xs"
              >
                <ChevronDown className="w-3.5 h-3.5 text-[#00693E]" />
                <span>Expand All</span>
              </button>
              <button
                type="button"
                onClick={() => setExpandAll(false)}
                className="px-3 py-1.5 bg-white hover:bg-[#F5F5F5] border border-[#E8E8E8] text-[#333333] text-[11px] font-semibold flex items-center gap-1 rounded-lg transition shadow-2xs"
              >
                <ChevronUp className="w-3.5 h-3.5 text-[#888888]" />
                <span>Collapse All</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {sections.length === 0 ? (
              <div className="bg-white border border-[#E8E8E8] p-8 text-center space-y-3 rounded-2xl">
                <p className="text-xs text-slate-500">No sections remaining in this extraction.</p>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-4 py-2 bg-[#00693E] text-white text-xs font-bold rounded-xl"
                >
                  Add First Section
                </button>
              </div>
            ) : (
              sections.map((section, idx) => (
                <React.Fragment key={section.id}>
                  <SectionCard
                    section={section}
                    isReadOnly={false}
                    onUpdate={handleSectionUpdate}
                    onDelete={handleDeleteSection}
                    isInitialOpen={expandAll !== null ? expandAll : idx === 0}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < sections.length - 1}
                  />

                  {/* Insert Section Here Divider */}
                  <div className="relative flex items-center justify-center my-1 group py-0.5">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-dashed border-transparent group-hover:border-[#00693E]/30 transition-colors" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInsertSection(idx + 1)}
                      className="relative z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all px-2.5 py-0.5 bg-white hover:bg-[#E8F5EE] border border-slate-300 hover:border-[#9FCFB3] text-[#00693E] text-[10px] font-bold rounded-full shadow-2xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Insert Section Here (Position {idx + 2})</span>
                    </button>
                  </div>
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-[#E8E8E8] flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/user/dashboard')}
            className="px-4 py-2.5 text-xs font-bold text-[#555555] hover:bg-[#F5F5F5] border border-[#D0D0D0] rounded-xl transition"
          >
            Discard Extraction
          </button>

          <button
            type="button"
            onClick={handleConfirmAndSave}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#00693E] hover:bg-[#005C36] text-white text-xs font-bold flex items-center gap-2 rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Draft...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Create Policy Draft</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};
