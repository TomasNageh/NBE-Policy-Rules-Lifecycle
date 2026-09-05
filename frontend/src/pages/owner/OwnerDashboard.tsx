import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AppHeader } from '../../components/layout/AppHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableRowSkeleton, MetricCardSkeleton } from '../../components/ui/Skeleton';
import { NewPolicyModal } from '../../components/policy/NewPolicyModal';
import { PdfUploadModal } from '../../components/policy/PdfUploadModal';
import { PolicySummary } from '../../types/policy';
import { 
  FileEdit, 
  PlusCircle, 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ArrowRight, 
  Calendar,
  Layers,
  UploadCloud,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/policies', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Unable to retrieve policy catalog. Please check your network connection or session.');
      }

      const data = await res.json();
      setPolicies(data.policies || []);
    } catch (err) {
      setFetchError((err as Error).message || 'Failed to fetch policies');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Derived Metrics
  const draftCount = policies.filter((p) => p.currentStatus === 'DRAFT').length;
  const reviewCount = policies.filter(
    (p) => p.currentStatus === 'QUEUED' || p.currentStatus === 'UNDER_REVIEW',
  ).length;
  const revisionsCount = policies.filter(
    (p) => p.currentStatus === 'DRAFT' && p.currentVersionNumber > 1,
  ).length;
  const approvedCount = policies.filter((p) => p.currentStatus === 'APPROVED').length;

  // Filtered Policies
  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.documentCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(policies.map((p) => p.category)));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <AppHeader currentModule="Policy Authoring & Drafts (Owner Workspace)" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome Section */}
        <section className="bg-white border-l-4 border-[#8B1D2C] border-y border-r border-slate-200 p-6 shadow-sm rounded-r-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B1D2C]">
                <FileEdit className="w-3.5 h-3.5" />
                Policy Authoring Workspace
              </div>
              <h2 className="text-2xl font-bold text-[#0F2042]">
                Welcome back, {user?.fullName || 'Policy Author'}
              </h2>
              <p className="text-xs text-slate-600">
                Department: <span className="font-semibold text-slate-800">{user?.department || 'General Banking'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors rounded-lg"
              >
                <UploadCloud className="w-4 h-4 text-[#0F2042]" />
                <span>Upload Policy PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-[#8B1D2C] hover:bg-[#721623] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm rounded-lg"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Policy Document</span>
              </button>
            </div>
          </div>
        </section>

        {/* Error Alert Banner */}
        {fetchError && (
          <div className="p-4 bg-red-50 border-l-4 border-[#8B1D2C] text-red-900 flex items-center justify-between shadow-xs rounded-r-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#8B1D2C] shrink-0" />
              <div>
                <p className="text-xs font-bold">Policy Data Synchronization Error</p>
                <p className="text-xs text-red-700">{fetchError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchPolicies}
              className="px-3 py-1.5 bg-[#8B1D2C] hover:bg-[#721623] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white border border-slate-200 p-4 shadow-sm rounded-xl">
                <div className="text-xs text-slate-500 font-medium flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    My Active Drafts
                  </span>
                  <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 rounded">
                    DRAFT
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-[#0F2042]">{draftCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Policies currently being authored</p>
              </div>

              <div className="bg-white border border-slate-200 p-4 shadow-sm rounded-xl">
                <div className="text-xs text-slate-500 font-medium flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Under Review
                  </span>
                  <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 border border-amber-200 font-bold rounded">
                    QUEUED
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-[#0F2042]">{reviewCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Awaiting compliance reviewer sign-off</p>
              </div>

              <div className="bg-white border border-slate-200 p-4 shadow-sm rounded-xl">
                <div className="text-xs text-slate-500 font-medium flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#8B1D2C]" />
                    Changes Requested
                  </span>
                  <span className="text-[10px] font-mono bg-red-50 text-red-700 px-1.5 py-0.5 border border-red-200 font-bold rounded">
                    REVISION
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-[#8B1D2C]">{revisionsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Drafts undergoing revision</p>
              </div>

              <div className="bg-white border border-slate-200 p-4 shadow-sm rounded-xl">
                <div className="text-xs text-slate-500 font-medium flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Approved & Active
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 border border-emerald-200 font-bold rounded">
                    PUBLISHED
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-emerald-700">{approvedCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Finalized enterprise policies</p>
              </div>
            </>
          )}
        </div>

        {/* Policies Table Section */}
        <section className="bg-white border border-slate-300 shadow-sm rounded-xl overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-[#0F2042] uppercase tracking-wider">
                My Policy Repository ({filteredPolicies.length})
              </h3>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-2.5 my-auto pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search code or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#8B1D2C] w-full sm:w-56 rounded-md"
                />
              </div>

              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#8B1D2C] rounded-md"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Document Code</th>
                    <th className="py-3 px-4">Policy Title & Category</th>
                    <th className="py-3 px-4">Lifecycle Status</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Sections</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton cols={7} />
                  <TableRowSkeleton cols={7} />
                  <TableRowSkeleton cols={7} />
                  <TableRowSkeleton cols={7} />
                </tbody>
              </table>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 mx-auto flex items-center justify-center border border-slate-200 rounded-full">
                <FileText className="w-6 h-6 text-[#8B1D2C]" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {searchTerm || categoryFilter !== 'ALL'
                  ? 'No policies match your search filters'
                  : 'No Policy Documents Yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || categoryFilter !== 'ALL'
                  ? 'Try adjusting your search keywords or filter settings.'
                  : 'Start by creating your first policy draft or upload an existing PDF policy document.'}
              </p>
              {!searchTerm && categoryFilter === 'ALL' && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 rounded-lg transition"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Policy PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-[#8B1D2C] hover:bg-[#721623] text-white text-xs font-semibold inline-flex items-center gap-1.5 rounded-lg shadow-sm transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Policy Draft</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Document Code</th>
                    <th className="py-3 px-4">Policy Title & Category</th>
                    <th className="py-3 px-4">Lifecycle Status</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Sections</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPolicies.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/owner/policies/${p.id}/edit`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.documentCode}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{p.title}</span>
                          {p.sourceFileUrl && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 border border-slate-200 font-mono rounded">
                              PDF
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{p.category}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.currentStatus} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        v{p.currentVersionNumber}.0
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {p.sectionsCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/owner/policies/${p.id}/edit`)}
                          className="px-3 py-1.5 bg-[#0F2042] hover:bg-[#1A2B4C] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors rounded-lg"
                        >
                          <span>{p.currentStatus === 'DRAFT' ? 'Edit Draft' : 'View Policy'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* New Policy Modal Dialog */}
      <NewPolicyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPolicies}
      />

      {/* PDF Upload Modal Dialog */}
      <PdfUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};

// Legacy alias — kept for any remaining references
export const UserDashboard = OwnerDashboard;
