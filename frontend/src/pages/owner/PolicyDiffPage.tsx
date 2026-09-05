import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../../components/layout/AppHeader';
import { DiffViewer } from '../../components/policy/DiffViewer';
import { PolicyDiffResponse, PolicyVersionSummary } from '../../types/policy';
import {
  ArrowLeft,
  GitCompare,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const PolicyDiffPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [versions, setVersions] = useState<PolicyVersionSummary[]>([]);
  const [fromVersionId, setFromVersionId] = useState<string>(searchParams.get('from') || '');
  const [toVersionId, setToVersionId] = useState<string>(searchParams.get('to') || '');

  const [diffData, setDiffData] = useState<PolicyDiffResponse | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available versions for this policy
  const fetchVersions = useCallback(async () => {
    if (!id) return;
    setIsLoadingVersions(true);
    setError(null);
    try {
      const res = await fetch(`/api/policies/${id}/versions`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load policy versions');
      }

      const vers: PolicyVersionSummary[] = data.versions || [];
      setVersions(vers);

      // Resolve initial selection if not set
      let initialFrom = searchParams.get('from');
      let initialTo = searchParams.get('to');

      if (!initialTo && vers.length > 0) {
        initialTo = vers[0].id;
      }

      if (!initialFrom && vers.length > 1) {
        initialFrom = vers[1].id;
      } else if (!initialFrom && vers.length === 1) {
        initialFrom = vers[0].id;
      }

      if (initialFrom) setFromVersionId(initialFrom);
      if (initialTo) setToVersionId(initialTo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [id, searchParams]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // 2. Fetch diff comparison when fromVersionId and toVersionId are set
  const fetchDiff = useCallback(async () => {
    if (!id || !fromVersionId || !toVersionId) return;
    setIsLoadingDiff(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/policies/${id}/diff?from=${encodeURIComponent(fromVersionId)}&to=${encodeURIComponent(toVersionId)}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate version diff');
      }
      setDiffData(data.diff);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingDiff(false);
    }
  }, [id, fromVersionId, toVersionId]);

  useEffect(() => {
    if (fromVersionId && toVersionId) {
      fetchDiff();
      setSearchParams({ from: fromVersionId, to: toVersionId }, { replace: true });
    }
  }, [fromVersionId, toVersionId, fetchDiff, setSearchParams]);

  const handleSwapVersions = () => {
    const temp = fromVersionId;
    setFromVersionId(toVersionId);
    setToVersionId(temp);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <AppHeader currentModule="Version Comparison & Diff" />

      {/* Top Action & Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded">
                  {diffData?.documentCode || 'POL-DIFF'}
                </span>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Version Diff Viewer
                </span>
              </div>
              <h2 className="text-sm font-bold text-[#0F2042] truncate max-w-xl">
                {diffData?.policyTitle || 'Policy Version Comparison'}
              </h2>
            </div>
          </div>

          {/* Quick Version Dropdowns in Navbar */}
          {versions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1">
                <span className="text-[11px] font-bold text-slate-500 px-1.5">From:</span>
                <select
                  value={fromVersionId}
                  onChange={(e) => setFromVersionId(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-semibold text-slate-900 rounded px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-[#0F2042]"
                >
                  {versions.map((v) => (
                    <option key={`nav-from-${v.id}`} value={v.id}>
                      v{v.versionNumber}.0 ({v.status})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleSwapVersions}
                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded"
                  title="Swap From and To versions"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                </button>

                <span className="text-[11px] font-bold text-slate-500 px-1.5">To:</span>
                <select
                  value={toVersionId}
                  onChange={(e) => setToVersionId(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-semibold text-slate-900 rounded px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-[#0F2042]"
                >
                  {versions.map((v) => (
                    <option key={`nav-to-${v.id}`} value={v.id}>
                      v{v.versionNumber}.0 ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={fetchDiff}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
                title="Refresh Diff"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingDiff ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isLoadingVersions || (isLoadingDiff && !diffData) ? (
          <div className="py-24 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-3 text-[#0F2042]">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B1D2C]" />
            <span className="text-sm font-semibold">Generating section-level granular diff...</span>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
            <h3 className="text-base font-bold text-red-900">Failed to Generate Diff</h3>
            <p className="text-xs text-red-700 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={fetchDiff}
              className="px-4 py-2 bg-[#0F2042] text-white text-xs font-semibold rounded-lg"
            >
              Retry Diff
            </button>
          </div>
        ) : diffData ? (
          <DiffViewer diff={diffData} />
        ) : null}
      </main>
    </div>
  );
};
