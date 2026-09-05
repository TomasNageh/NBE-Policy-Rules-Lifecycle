import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Shield, 
  BookOpen, 
  Users, 
  ListOrdered, 
  FileCheck,
  CheckSquare,
  AlertCircle,
  AlertTriangle,
  MessageSquarePlus,
  MessageSquareText,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PolicySectionItem, UpdateSectionInput } from '../../types/policy';

interface SectionCardProps {
  section: PolicySectionItem;
  isReadOnly: boolean;
  onUpdate: (sectionId: string, updates: UpdateSectionInput) => void;
  onDelete: (sectionId: string) => void;
  isInitialOpen?: boolean;
  /** Called when the note/comment icon is clicked */
  onNote?: (sectionId: string) => void;
  /** Whether this section already has a note written */
  hasNote?: boolean;
  /** Reordering controls */
  onMoveUp?: (sectionId: string) => void;
  onMoveDown?: (sectionId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

// Client-side sanitizer to guarantee clean display even if raw PDF table noise slipped in
export function sanitizeTitle(rawTitle?: string, sectionNumber?: number): string {
  if (!rawTitle) return `Section ${sectionNumber || 1}`;
  
  const noisePattern = /(?:OWNER\s*HR\s*FUNCTION|PROCESS\s*OWNER|APPROVAL\s*PER|DOCUMENTED\s*AUTHORITY\s*MATRIX|EVIDENCE\s*SYSTEM\s*RECORD|AUDIT\s*TRAIL|EXCEPTION\s*DOCUMENTED|TIME\s*BOUND\s*APPROVAL|APPROVAL\s*REVIEW|PERIODIC\s*CONTROL)/gi;
  
  if (noisePattern.test(rawTitle) || (rawTitle.length > 60 && rawTitle === rawTitle.toUpperCase())) {
    const cleaned = rawTitle.replace(noisePattern, '').replace(/[|•\-_:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 4) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }
    return `Section ${sectionNumber || 1} — Policy Governance & Controls`;
  }
  return rawTitle;
}

// Client-side sanitizer for control area tags to prevent long noise strings from breaking layout
export function sanitizeControlArea(rawArea?: string | null): string | null {
  if (!rawArea) return null;
  const noisePattern = /(?:OWNER\s*HR\s*FUNCTION|PROCESS\s*OWNER|APPROVAL\s*PER|DOCUMENTED\s*AUTHORITY\s*MATRIX|EVIDENCE\s*SYSTEM\s*RECORD|AUDIT\s*TRAIL|EXCEPTION\s*DOCUMENTED|TIME\s*BOUND\s*APPROVAL|APPROVAL\s*REVIEW|PERIODIC\s*CONTROL)/gi;
  if (noisePattern.test(rawArea) || rawArea.length > 40) {
    const cleaned = rawArea.replace(noisePattern, '').replace(/[|•\-_:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 3 && cleaned.length <= 35) {
      return cleaned;
    }
    return cleaned.slice(0, 30) || 'Governance & Controls';
  }
  return rawArea.trim();
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  isReadOnly,
  onUpdate,
  onDelete,
  isInitialOpen = true,
  onNote,
  hasNote = false,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}) => {
  const [isOpen, setIsOpen] = useState(isInitialOpen);
  const [isInlineNoteOpen, setIsInlineNoteOpen] = useState(false);
  const [inlineNoteText, setInlineNoteText] = useState('');

  const handleChange = (field: keyof UpdateSectionInput, value: string) => {
    onUpdate(section.id, { [field]: value });
  };

  const hasUnmatched = Boolean(section.unmatchedContent && section.unmatchedContent.trim().length > 0);
  const displayTitle = sanitizeTitle(section.title, section.sectionNumber);
  const displayControlArea = sanitizeControlArea(section.controlArea);
  const hasActiveNote = hasNote || Boolean(inlineNoteText.trim());

  const handleNoteClick = () => {
    if (onNote) {
      onNote(section.id);
    } else {
      setIsInlineNoteOpen((prev) => !prev);
    }
  };

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all shadow-nbe-card ${
      hasUnmatched ? 'border-amber-400' : 'border-[#E8E8E8] hover:border-[#9FCFB3]'
    }`}>
      {/* Section Card Header (Accordion Bar) */}
      <div
        className={`px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors gap-3 ${
          isOpen ? 'bg-[#F9FBF9] border-b border-[#E8E8E8]' : 'bg-white hover:bg-[#FAFAFA]'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Left Side: Number + Title + Control Area Tag */}
        <div className="flex items-center space-x-3 flex-1 min-w-0 overflow-hidden">
          <span className="w-7 h-7 bg-[#00693E] text-white text-xs font-bold font-mono rounded-lg flex items-center justify-center shrink-0 shadow-xs">
            {section.sectionNumber}
          </span>

          <div className="flex flex-row items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <span className="text-sm font-bold text-[#1A1A1A] truncate shrink min-w-0" title={displayTitle}>
              {displayTitle}
            </span>

            {displayControlArea && (
              <span 
                className="hidden sm:inline-block max-w-[180px] truncate px-2.5 py-0.5 text-[10px] font-semibold bg-[#E8F5EE] text-[#005C36] border border-[#9FCFB3] rounded-md font-mono tracking-wide uppercase shrink-0"
                title={displayControlArea}
              >
                {displayControlArea}
              </span>
            )}

            {hasUnmatched && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 rounded-md shrink-0">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="hidden md:inline">Unmatched</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Side Actions: Up/Down Reorder + Comment / Note + Delete + Collapse */}
        <div className="flex items-center space-x-1.5 shrink-0 ml-auto pl-2" onClick={(e) => e.stopPropagation()}>
          {/* Reordering Up/Down controls */}
          {!isReadOnly && (onMoveUp || onMoveDown) && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 mr-0.5">
              <button
                type="button"
                onClick={() => onMoveUp && onMoveUp(section.id)}
                disabled={!canMoveUp}
                className="p-1 text-slate-600 hover:text-[#00693E] hover:bg-white rounded transition-colors disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                title="Move Section Up"
                aria-label="Move Section Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown && onMoveDown(section.id)}
                disabled={!canMoveDown}
                className="p-1 text-slate-600 hover:text-[#00693E] hover:bg-white rounded transition-colors disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                title="Move Section Down"
                aria-label="Move Section Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Comment / Note button */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleNoteClick}
              title={hasActiveNote ? 'View/Edit change note' : 'Add a note / comment beside this change'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all shadow-2xs ${
                hasActiveNote
                  ? 'bg-[#F7941D] border-[#E08316] text-white hover:bg-[#E08316]'
                  : 'bg-[#FFF9F0] border-[#F7941D]/50 text-[#C46E0A] hover:bg-[#FFF2DE] hover:border-[#F7941D]'
              }`}
            >
              <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
              <span>{hasActiveNote ? 'Note ✓' : 'Comment'}</span>
            </button>
          )}

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => onDelete(section.id)}
              className="p-1.5 text-[#777777] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
              title="Delete Section"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-[#555555] hover:text-[#00693E] hover:bg-[#E8F5EE] rounded-lg transition-colors border border-transparent hover:border-[#9FCFB3]"
            aria-label={isOpen ? 'Collapse Section' : 'Expand Section'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4 text-[#00693E]" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Inline Section Note / Comment Drawer */}
      {isInlineNoteOpen && !isReadOnly && (
        <div className="px-5 py-3 bg-[#FFF9F0] border-b border-[#F5DCB7] text-xs space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#8A4B00] flex items-center gap-1.5">
              <MessageSquareText className="w-4 h-4 text-[#F7941D]" />
              Section Change Comment &amp; Reviewer Rationale
            </span>
            <button
              type="button"
              onClick={() => setIsInlineNoteOpen(false)}
              className="text-[#8A4B00] hover:text-[#522D00] font-bold text-xs px-2 py-0.5 rounded hover:bg-[#F5DCB7]"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-[11px] text-[#8A4B00]/80">
            Document why changes were made to Section {section.sectionNumber} (e.g. updated limits, CBE regulatory alignment, or policy refinement).
          </p>
          <textarea
            rows={2}
            value={inlineNoteText}
            onChange={(e) => setInlineNoteText(e.target.value)}
            placeholder="e.g. Adjusted underwriting criteria per Risk Committee circular August 2026..."
            className="w-full px-3 py-2 bg-white border border-[#E0C097] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F7941D] text-xs font-sans"
          />
        </div>
      )}

      {/* Section Form Body */}
      {isOpen && (
        <div className="p-6 space-y-5 bg-white">
          {/* Unmatched Content Warning Alert */}
          {hasUnmatched && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-xs text-amber-900 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Unmatched extracted paragraphs requiring manual verification</span>
              </div>
              <p className="font-mono text-[11px] bg-white/80 p-3 rounded-lg border border-amber-200 whitespace-pre-wrap">
                {section.unmatchedContent}
              </p>
            </div>
          )}

          {/* Top Row: Section Title & Control Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#333333] uppercase tracking-wider">
                Section Heading / Title *
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={section.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Credit Eligibility Criteria & Debt Burden Ratio"
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors disabled:bg-slate-100 disabled:text-slate-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#333333] uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#00693E]" />
                Control Area / Mandate
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={section.controlArea || ''}
                onChange={(e) => handleChange('controlArea', e.target.value)}
                placeholder="e.g. Underwriting Limits"
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors disabled:bg-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Core Field: Policy Statement */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#00693E] uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#00693E]" />
              Policy Statement (Mandatory Core Rule) *
            </label>
            <textarea
              rows={3}
              disabled={isReadOnly}
              value={section.policyStatement}
              onChange={(e) => handleChange('policyStatement', e.target.value)}
              placeholder="State the formal banking policy rule, mandatory obligation, or operational boundary..."
              className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors leading-relaxed disabled:bg-slate-100 font-sans"
            />
          </div>

          {/* Two-Column Grid: Roles & Responsibilities + Standard Procedure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#555555] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#F7941D]" />
                Roles and Responsibilities
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={section.rolesAndResponsibilities || ''}
                onChange={(e) => handleChange('rolesAndResponsibilities', e.target.value)}
                placeholder="Define owner roles, execution parties, and enforcement hierarchy..."
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors disabled:bg-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#555555] uppercase tracking-wider flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-[#F7941D]" />
                Standard Procedure
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={section.standardProcedure || section.procedures || ''}
                onChange={(e) => {
                  handleChange('standardProcedure', e.target.value);
                  handleChange('procedures', e.target.value);
                }}
                placeholder="Step-by-step operating procedure for executing this policy..."
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Two-Column Grid: Required Records + Controls & Quality Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#555555] uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-[#00693E]" />
                Required Records &amp; Evidence
              </label>
              <textarea
                rows={2}
                disabled={isReadOnly}
                value={section.requiredRecords || ''}
                onChange={(e) => handleChange('requiredRecords', e.target.value)}
                placeholder="Required documentation, signed forms, system logs, or retention evidence..."
                className="w-full px-3.5 py-2 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors disabled:bg-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#555555] uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-[#00693E]" />
                Controls and Quality Checks
              </label>
              <textarea
                rows={2}
                disabled={isReadOnly}
                value={section.controlsAndChecks || ''}
                onChange={(e) => handleChange('controlsAndChecks', e.target.value)}
                placeholder="Preventive and detective checks, dual-authorization limits, automated validations..."
                className="w-full px-3.5 py-2 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Exceptions and Escalation */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#555555] uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#F7941D]" />
              Exceptions and Escalation
            </label>
            <textarea
              rows={2}
              disabled={isReadOnly}
              value={section.exceptionsAndEscalation || section.exceptions || ''}
              onChange={(e) => {
                handleChange('exceptionsAndEscalation', e.target.value);
                handleChange('exceptions', e.target.value);
              }}
              placeholder="Permitted exceptions, sign-off authority, and committee escalation pathways..."
              className="w-full px-3.5 py-2 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors disabled:bg-slate-100"
            />
          </div>

          {/* Change Comments & Rationale Section */}
          <div className="space-y-1.5 bg-[#FFF9F0] p-4 rounded-xl border border-[#F5DCB7]">
            <label className="block text-[11px] font-bold text-[#8A4B00] uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-[#F7941D]" />
              Change Notes &amp; Comments for Section {section.sectionNumber} (Owner Remarks)
            </label>
            <textarea
              rows={2}
              disabled={isReadOnly}
              value={section.complianceNotes || ''}
              onChange={(e) => handleChange('complianceNotes', e.target.value)}
              placeholder="Add your comments, revision rationale, or compliance notes for this specific section..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-[#E0C097] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#F7941D] transition-colors disabled:bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};
