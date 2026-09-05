import React, { useState, useEffect } from 'react';
import { PolicyVersionDetail, PolicySectionItem } from '../../types/policy';
import { StatusBadge } from '../ui/StatusBadge';
import {
  X,
  History,
  Layers,
  Calendar,
  Lock,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface VersionSnapshotModalProps {
  policyId: string;
  versionId: string;
  isOpen: boolean;
  onClose: () => void;
  onCompareWithActive?: (versionId: string) => void;
}

export const VersionSnapshotModal: React.FC<VersionSnapshotModalProps> = ({
  policyId,
  versionId,
  isOpen,
  onClose,
  onCompareWithActive,
}) => {
  const [versionDetail, setVersionDetail] = useState<
    (PolicyVersionDetail & { policyTitle?: string; documentCode?: string; category?: string }) | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !policyId || !versionId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/policies/${policyId}/versions/${versionId}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load version snapshot');
        }
        if (isMounted) {
          setVersionDetail(data.version);
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSnapshot();

    return () => {
      isMounted = false;
    };
  }, [isOpen, policyId, versionId]);

  if (!isOpen) return null;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    if (!versionDetail?.sections) return;
    const next: Record<string, boolean> = {};
    versionDetail.sections.forEach((s) => {
      next[s.id] = true;
    });
    setExpandedSections(next);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#0F2042] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                  v{versionDetail?.versionNumber || '?'}.0 Snapshot
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Historical Read-Only
                </span>
              </div>
              <h3 className="text-sm font-bold text-white truncate mt-0.5">
                {versionDetail?.policyTitle || 'Policy Document Historical Snapshot'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#8B1D2C]" />
              <p className="text-xs font-semibold">Loading historical version snapshot...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <h4 className="text-sm font-bold text-red-900">Failed to Load Version Snapshot</h4>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          ) : versionDetail ? (
            <>
              {/* Version Metadata Summary Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={versionDetail.status as any} size="sm" />
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {versionDetail.submittedAt
                        ? `Submitted: ${new Date(versionDetail.submittedAt).toLocaleDateString()}`
                        : `Created: ${new Date(versionDetail.createdAt).toLocaleDateString()}`}
                    </span>
                  </div>

                  {versionDetail.sourceFileUrl && (
                    <a
                      href={versionDetail.sourceFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-[#0F2042]" />
                      <span>Original PDF</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {versionDetail.changeSummary && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs text-slate-700">
                    <strong className="text-slate-900">Change Log / Summary:</strong>{' '}
                    {versionDetail.changeSummary}
                  </div>
                )}
              </div>

              {/* Sections Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F2042] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#8B1D2C]" />
                  Sections in Version {versionDetail.versionNumber}.0 ({versionDetail.sections.length})
                </h4>

                <div className="flex items-center space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
                  >
                    Expand All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Sections List */}
              <div className="space-y-3">
                {versionDetail.sections.map((sec: PolicySectionItem) => {
                  const isExpanded = expandedSections[sec.id] !== false; // Default expanded

                  return (
                    <div
                      key={sec.id}
                      className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(sec.id)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="w-6 h-6 rounded bg-[#0F2042] text-white flex items-center justify-center text-xs font-bold font-mono shrink-0">
                            {sec.sectionNumber}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {sec.title}
                          </h5>
                          {sec.controlArea && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium shrink-0 hidden sm:inline">
                              {sec.controlArea}
                            </span>
                          )}
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                              Policy Statement
                            </span>
                            <p className="text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                              {sec.policyStatement}
                            </p>
                          </div>

                          {sec.rolesAndResponsibilities && (
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                                Roles & Responsibilities
                              </span>
                              <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                                {sec.rolesAndResponsibilities}
                              </p>
                            </div>
                          )}

                          {(sec.standardProcedure || sec.procedures) && (
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                                Procedures & Operating Guidelines
                              </span>
                              <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                                {sec.standardProcedure || sec.procedures}
                              </p>
                            </div>
                          )}

                          {(sec.exceptionsAndEscalation || sec.exceptions) && (
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                                Exceptions & Escalation
                              </span>
                              <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                                {sec.exceptionsAndEscalation || sec.exceptions}
                              </p>
                            </div>
                          )}

                          {sec.complianceNotes && (
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                                Compliance Notes
                              </span>
                              <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                                {sec.complianceNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {versionDetail ? `${versionDetail.sections.length} total sections recorded` : ''}
          </div>

          <div className="flex items-center space-x-2">
            {onCompareWithActive && versionDetail && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCompareWithActive(versionDetail.id);
                }}
                className="px-4 py-2 bg-[#0F2042] hover:bg-[#1b3464] text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Compare This Version
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Close Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
