import React, { useState } from 'react';
import {
  PolicyDiffResponse,
  SectionDiffResult,
  FieldDiff,
  SectionDiffPart,
  SectionChangeType,
} from '../../types/policy';
import {
  Columns,
  AlignLeft,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  MinusCircle,
  FileEdit,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  Info,
} from 'lucide-react';

interface DiffViewerProps {
  diff: PolicyDiffResponse;
  initialViewMode?: 'side-by-side' | 'inline';
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  initialViewMode = 'side-by-side',
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>(initialViewMode);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  const { fromVersion, toVersion, summary, sections } = diff;

  // Toggle individual section expand/collapse
  const toggleSection = (sectionNumber: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionNumber]: prev[sectionNumber] === undefined ? false : !prev[sectionNumber],
    }));
  };

  // Check if a section is expanded (by default: changed sections are expanded, unchanged sections are collapsed)
  const isSectionExpanded = (sec: SectionDiffResult): boolean => {
    if (expandedSections[sec.sectionNumber] !== undefined) {
      return expandedSections[sec.sectionNumber];
    }
    // Default: changed sections are expanded, unchanged are collapsed
    return sec.changeType !== 'UNCHANGED';
  };

  // Expand / Collapse all visible sections
  const handleExpandAll = () => {
    const next: Record<number, boolean> = {};
    sections.forEach((s) => {
      next[s.sectionNumber] = true;
    });
    setExpandedSections(next);
  };

  const handleCollapseAll = () => {
    const next: Record<number, boolean> = {};
    sections.forEach((s) => {
      next[s.sectionNumber] = false;
    });
    setExpandedSections(next);
  };

  // Render individual word-level diff text
  const renderWordDiff = (parts: SectionDiffPart[], mode: 'inline' | 'left' | 'right') => {
    if (!parts || parts.length === 0) {
      return <span className="text-slate-400 italic text-xs">No content</span>;
    }

    return (
      <span className="leading-relaxed font-sans text-xs sm:text-sm">
        {parts.map((part, idx) => {
          if (part.added) {
            if (mode === 'left') return null; // Don't show added text in left column
            return (
              <mark
                key={idx}
                className="bg-emerald-100 text-emerald-950 font-semibold px-1 py-0.5 mx-0.5 rounded border border-emerald-300 underline decoration-emerald-600 decoration-2 select-text"
              >
                {part.value}
              </mark>
            );
          }

          if (part.removed) {
            if (mode === 'right') return null; // Don't show removed text in right column
            return (
              <del
                key={idx}
                className="bg-rose-100 text-rose-950 line-through px-1 py-0.5 mx-0.5 rounded border border-rose-300 opacity-90 select-text"
              >
                {part.value}
              </del>
            );
          }

          return <span key={idx}>{part.value}</span>;
        })}
      </span>
    );
  };

  const getSectionBadge = (changeType: SectionChangeType) => {
    switch (changeType) {
      case 'ADDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
            + Added in v{toVersion.versionNumber}
          </span>
        );
      case 'REMOVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
            - Removed from v{fromVersion.versionNumber}
          </span>
        );
      case 'MODIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <FileEdit className="w-3.5 h-3.5 text-amber-600" />
            ~ Modified Section
          </span>
        );
      case 'UNCHANGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            = Unchanged
          </span>
        );
    }
  };

  // Filter sections based on unchanged toggle
  const visibleSections = showUnchanged
    ? sections
    : sections.filter((s) => s.changeType !== 'UNCHANGED');

  const unchangedCount = summary.unchangedSections;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Comparison Header & Version Metadata */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded">
                {diff.documentCode}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Section-Level Comparison
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#0F2042] mt-1">
              {diff.policyTitle}
            </h3>
          </div>

          {/* Side-by-Side vs Inline View Mode Switcher */}
          <div className="flex items-center space-x-2 self-start md:self-auto bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-white text-[#0F2042] shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('inline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'inline'
                  ? 'bg-white text-[#0F2042] shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Unified Inline</span>
            </button>
          </div>
        </div>

        {/* Version Comparison Card Headers (From vs To) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">Base Version:</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-xs font-bold font-mono">
                  v{fromVersion.versionNumber}.0
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 font-medium">
                  {fromVersion.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {fromVersion.changeSummary || 'Original draft version'}
                {fromVersion.submittedAt && ` • ${new Date(fromVersion.submittedAt).toLocaleDateString()}`}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 shrink-0">
              {fromVersion.sectionsCount} Sections
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">Compared To:</span>
                <span className="px-2 py-0.5 rounded bg-[#0F2042] text-white text-xs font-bold font-mono">
                  v{toVersion.versionNumber}.0
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 font-medium">
                  {toVersion.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {toVersion.changeSummary || 'Active or modified revision'}
                {toVersion.submittedAt && ` • ${new Date(toVersion.submittedAt).toLocaleDateString()}`}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 shrink-0">
              {toVersion.sectionsCount} Sections
            </span>
          </div>
        </div>

        {/* Change Statistics KPI Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-md border border-slate-200">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              {summary.totalSections} Total Sections
            </span>

            {summary.addedSections > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-md border border-emerald-200">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                +{summary.addedSections} Added
              </span>
            )}

            {summary.removedSections > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 text-xs font-bold rounded-md border border-rose-200">
                <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                -{summary.removedSections} Removed
              </span>
            )}

            {summary.modifiedSections > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-md border border-amber-200">
                <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                ~{summary.modifiedSections} Modified
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              ={summary.unchangedSections} Unchanged
            </span>
          </div>

          {/* Quick Collapse / Expand Controls */}
          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
            >
              Expand All
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Unchanged Sections Banner Toggle */}
      {unchangedCount > 0 && (
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-700 font-medium">
              {unchangedCount} {unchangedCount === 1 ? 'section has' : 'sections have'} identical content across both versions.
              {!showUnchanged ? ' (Hidden to reduce visual noise)' : ' (Showing all)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors shadow-2xs shrink-0"
          >
            {showUnchanged ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Hide Unchanged ({unchangedCount})</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[#0F2042]" />
                <span>Show Unchanged ({unchangedCount})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Zero Changes Notice */}
      {summary.addedSections === 0 &&
        summary.removedSections === 0 &&
        summary.modifiedSections === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-emerald-900">
              No Differences Found Between These Versions
            </h4>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">
              All {summary.totalSections} sections in Version {fromVersion.versionNumber} and Version {toVersion.versionNumber} are completely identical.
            </p>
          </div>
        )}

      {/* Sections Diff List */}
      <div className="space-y-4">
        {visibleSections.map((sec) => {
          const isExpanded = isSectionExpanded(sec);

          return (
            <div
              key={sec.sectionNumber}
              className={`bg-white border rounded-xl shadow-xs overflow-hidden transition-all ${
                sec.changeType === 'ADDED'
                  ? 'border-emerald-300 ring-1 ring-emerald-200/50'
                  : sec.changeType === 'REMOVED'
                  ? 'border-rose-300 ring-1 ring-rose-200/50'
                  : sec.changeType === 'MODIFIED'
                  ? 'border-amber-300 ring-1 ring-amber-200/50'
                  : 'border-slate-200 opacity-90'
              }`}
            >
              {/* Section Header Card */}
              <button
                type="button"
                onClick={() => toggleSection(sec.sectionNumber)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#0F2042] text-white flex items-center justify-center text-xs font-bold shrink-0 font-mono">
                    {sec.sectionNumber}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {sec.title}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {getSectionBadge(sec.changeType)}
                  <div className="text-slate-400 p-1">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>
              </button>

              {/* Section Diff Content Details */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50/40 p-5 space-y-4">
                  {sec.fieldDiffs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No text fields defined in this section.</p>
                  ) : (
                    sec.fieldDiffs.map((field: FieldDiff) => (
                      <div
                        key={field.fieldKey}
                        className={`bg-white border rounded-lg p-4 space-y-2 shadow-2xs ${
                          field.hasChanges
                            ? 'border-amber-200 bg-amber-50/20'
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Field Header Label */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8B1D2C]" />
                            {field.fieldLabel}
                          </span>
                          {field.hasChanges && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                              Modified Field
                            </span>
                          )}
                        </div>

                        {/* View Mode: Side-by-Side (2 Columns) */}
                        {viewMode === 'side-by-side' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 font-sans">
                            {/* Left: From Version */}
                            <div className="bg-slate-50/80 border border-slate-200 rounded-md p-3">
                              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                                <span>v{fromVersion.versionNumber}.0 (Original)</span>
                                {sec.changeType === 'ADDED' && (
                                  <span className="text-slate-400 italic">None</span>
                                )}
                              </div>
                              <div className="text-slate-800 leading-relaxed">
                                {sec.changeType === 'ADDED' ? (
                                  <span className="text-slate-400 italic text-xs">Section did not exist in v{fromVersion.versionNumber}.0</span>
                                ) : (
                                  renderWordDiff(field.diffParts, 'left')
                                )}
                              </div>
                            </div>

                            {/* Right: To Version */}
                            <div className="bg-slate-50/80 border border-slate-200 rounded-md p-3">
                              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                                <span>v{toVersion.versionNumber}.0 (Revised)</span>
                                {sec.changeType === 'REMOVED' && (
                                  <span className="text-rose-600 font-bold">Deleted</span>
                                )}
                              </div>
                              <div className="text-slate-800 leading-relaxed">
                                {sec.changeType === 'REMOVED' ? (
                                  <span className="text-rose-500 italic text-xs">Section was removed in v{toVersion.versionNumber}.0</span>
                                ) : (
                                  renderWordDiff(field.diffParts, 'right')
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* View Mode: Inline (Unified Single Column) */
                          <div className="bg-slate-50/80 border border-slate-200 rounded-md p-3.5">
                            <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-2">
                              <span>Unified Word Diff</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-rose-700 font-normal">
                                <del className="bg-rose-100 px-1 py-0.5 rounded border border-rose-300">Strikethrough</del> = Removed from v{fromVersion.versionNumber}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-emerald-700 font-normal">
                                <mark className="bg-emerald-100 px-1 py-0.5 rounded border border-emerald-300 font-semibold">Green</mark> = Added in v{toVersion.versionNumber}
                              </span>
                            </div>
                            <div className="text-slate-900 leading-relaxed pt-1">
                              {renderWordDiff(field.diffParts, 'inline')}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
