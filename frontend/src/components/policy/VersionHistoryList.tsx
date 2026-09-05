import React, { useState, useEffect, useCallback } from 'react';
import { PolicyVersionSummary } from '../../types/policy';
import { StatusBadge } from '../ui/StatusBadge';
import { VersionSnapshotModal } from './VersionSnapshotModal';
import {
  History,
  Calendar,
  User,
  Layers,
  ArrowRight,
  GitCompare,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface VersionHistoryListProps {
  policyId: string;
  currentVersionNumber?: number;
  onSelectDiff: (fromVersionId: string, toVersionId: string) => void;
  className?: string;
}

export const VersionHistoryList: React.FC<VersionHistoryListProps> = ({
  policyId,
  onSelectDiff,
  className = '',
}) => {
  const [versions, setVersions] = useState<PolicyVersionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected snapshot modal
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  // Custom comparison selectors
  const [compareFromId, setCompareFromId] = useState<string>('');
  const [compareToId, setCompareToId] = useState<string>('');

  const fetchVersions = useCallback(async () => {
    if (!policyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/policies/${policyId}/versions`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load policy versions');
      }
      const vers: PolicyVersionSummary[] = data.versions || [];
      setVersions(vers);

      // Default compare selectors: if >= 2 versions, compare v1 to v(latest)
      if (vers.length >= 2) {
        setCompareToId(vers[0].id); // Latest
        setCompareFromId(vers[vers.length - 1].id); // Oldest / v1
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleLaunchCustomDiff = () => {
    if (!compareFromId || !compareToId) return;
    onSelectDiff(compareFromId, compareToId);
  };

  const handleCompareWithPrevious = (currentIndex: number) => {
    if (currentIndex >= versions.length - 1) return;
    const currentVer = versions[currentIndex];
    const prevVer = versions[currentIndex + 1];
    onSelectDiff(prevVer.id, currentVer.id);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Version Compare Launcher Bar */}
      {versions.length >= 2 && (
        <div className="bg-gradient-to-r from-[#0F2042] to-[#1b356b] text-white p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                <GitCompare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Compare Any Two Versions</h4>
                <p className="text-xs text-slate-300">
                  Select a base version and a comparison version to inspect word-level diffs
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            {/* From Version Select */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Base Version (From):
              </label>
              <select
                value={compareFromId}
                onChange={(e) => setCompareFromId(e.target.value)}
                className="w-full bg-white text-slate-900 font-semibold text-xs px-3 py-2 rounded-lg border border-white/20 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                {versions.map((v) => (
                  <option key={`from-${v.id}`} value={v.id}>
                    v{v.versionNumber}.0 ({v.status}) • {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1 flex justify-center text-slate-400">
              <ArrowRight className="w-5 h-5 hidden sm:inline" />
            </div>

            {/* To Version Select */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Compare To (Target):
              </label>
              <select
                value={compareToId}
                onChange={(e) => setCompareToId(e.target.value)}
                className="w-full bg-white text-slate-900 font-semibold text-xs px-3 py-2 rounded-lg border border-white/20 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                {versions.map((v) => (
                  <option key={`to-${v.id}`} value={v.id}>
                    v{v.versionNumber}.0 ({v.status}) • {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Launch Button */}
            <div className="sm:col-span-3 sm:self-end pt-1 sm:pt-0">
              <button
                type="button"
                onClick={handleLaunchCustomDiff}
                disabled={compareFromId === compareToId}
                className="w-full py-2 px-4 bg-[#8B1D2C] hover:bg-[#a32234] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare Versions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Timeline Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#0F2042] uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-[#8B1D2C]" />
          Document Version History ({versions.length})
        </h4>

        <button
          type="button"
          onClick={fetchVersions}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Version List Body */}
      {isLoading ? (
        <div className="py-12 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#8B1D2C]" />
          <span className="text-xs font-semibold">Loading version history...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      ) : versions.length === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2">
          <History className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-500">No versions recorded for this policy document yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((ver, idx) => {
            const isLatest = idx === 0;
            const hasPrevious = idx < versions.length - 1;
            const prevVer = hasPrevious ? versions[idx + 1] : null;

            return (
              <div
                key={ver.id}
                className={`bg-white border rounded-xl shadow-2xs p-5 space-y-3.5 transition-all hover:border-slate-300 ${
                  isLatest ? 'border-[#0F2042]/40 ring-1 ring-[#0F2042]/10' : 'border-slate-200'
                }`}
              >
                {/* Top Row: Version Badge, Status, Timestamps, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                        isLatest
                          ? 'bg-[#0F2042] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      v{ver.versionNumber}.0
                    </span>

                    <StatusBadge status={ver.status as any} size="sm" />

                    {isLatest && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded border border-blue-200">
                        Current Active Draft / Revision
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {hasPrevious && prevVer && (
                      <button
                        type="button"
                        onClick={() => handleCompareWithPrevious(idx)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
                        title={`Compare v${ver.versionNumber} with v${prevVer.versionNumber}`}
                      >
                        <GitCompare className="w-3.5 h-3.5 text-[#8B1D2C]" />
                        <span>Diff vs v{prevVer.versionNumber}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedSnapshotId(ver.id)}
                      className="px-3 py-1.5 bg-[#0F2042] hover:bg-[#1c3668] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Snapshot</span>
                    </button>
                  </div>
                </div>

                {/* Change Summary */}
                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
                  <span className="font-bold text-slate-900 block mb-0.5">Summary of Changes:</span>
                  {ver.changeSummary || (
                    <span className="text-slate-400 italic">Initial document draft</span>
                  )}
                </div>

                {/* Bottom Metadata: Submitter, Dates, Section Count */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                  <div className="flex flex-wrap items-center gap-4">
                    {ver.submittedBy && (
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Author: <strong className="text-slate-900">{ver.submittedBy.fullName}</strong>
                        {ver.submittedBy.department && ` (${ver.submittedBy.department})`}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {ver.submittedAt ? (
                        <>Submitted: {new Date(ver.submittedAt).toLocaleString()}</>
                      ) : (
                        <>Created: {new Date(ver.createdAt).toLocaleString()}</>
                      )}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 font-mono text-slate-600">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    {ver.sectionsCount} Sections
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Snapshot Viewer Modal */}
      {selectedSnapshotId && (
        <VersionSnapshotModal
          policyId={policyId}
          versionId={selectedSnapshotId}
          isOpen={true}
          onClose={() => setSelectedSnapshotId(null)}
          onCompareWithActive={(vId) => {
            if (versions.length > 0) {
              onSelectDiff(vId, versions[0].id);
            }
          }}
        />
      )}
    </div>
  );
};
