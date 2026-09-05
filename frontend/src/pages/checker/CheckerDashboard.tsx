import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AppHeader } from '../../components/layout/AppHeader';
import { PolicyReviewItem } from '../../types/review';
import { SlaStatusBadge } from '../../components/ui/SlaStatusBadge';
import { TableRowSkeleton, MetricCardSkeleton } from '../../components/ui/Skeleton';
import { 
  ShieldCheck, 
  Inbox, 
  CheckCircle2, 
  ArrowRight, 
  UserCheck, 
  Loader2, 
  Calendar, 
  Building,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const CheckerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'queue' | 'mine'>('queue');
  const [queue, setQueue] = useState<PolicyReviewItem[]>([]);
  const [myReviews, setMyReviews] = useState<PolicyReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [queueRes, mineRes] = await Promise.all([
        fetch('/api/reviews/queue', { credentials: 'include' }),
        fetch('/api/reviews/mine', { credentials: 'include' }),
      ]);

      if (!queueRes.ok || !mineRes.ok) {
        throw new Error('Unable to retrieve review queues. Please check your network connection.');
      }

      const queueData = await queueRes.json();
      setQueue(queueData.queue || []);

      const mineData = await mineRes.json();
      setMyReviews(mineData.reviews || []);
    } catch (err) {
      setFetchError((err as Error).message || 'Failed to retrieve review queues');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle "Assign to Me" with 409 Race Condition Handling
  const handleAssignToMe = async (reviewId: string) => {
    setIsAssigning(reviewId);
    setToastMessage(null);

    try {
      const res = await fetch(`/api/reviews/${reviewId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();

      if (res.status === 409) {
        // Race condition: another checker claimed it first
        setToastMessage({
          text: 'This review was already claimed by another checker in real-time.',
          type: 'error',
        });
        await fetchReviews();
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || 'Failed to claim policy review');
      }

      setToastMessage({
        text: 'Policy review successfully assigned to your workspace!',
        type: 'success',
      });

      await fetchReviews();
      setActiveTab('mine');
    } catch (err) {
      setToastMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setIsAssigning(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col font-sans">
      <AppHeader currentModule="Compliance Review Queue (Checker Workspace)" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome Section */}
        <section className="bg-white border-l-4 border-[#00693E] border-y border-r border-[#E8E8E8] p-6 shadow-nbe-card rounded-r-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F7941D]">
                <ShieldCheck className="w-4 h-4 text-[#F7941D]" />
                Four-Eyes Policy Compliance Verification
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A]">
                Compliance Evaluation Queue — {user?.fullName || 'Compliance Reviewer'}
              </h2>
              <p className="text-xs text-[#555555]">
                Department: <span className="font-semibold text-[#1A1A1A]">{user?.department || 'Internal Audit & Compliance'}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={fetchReviews}
              className="px-3.5 py-2 bg-[#F5F5F5] hover:bg-[#E8F5EE] border border-[#E8E8E8] hover:border-[#9FCFB3] text-[#333333] text-xs font-semibold flex items-center gap-1.5 transition-colors self-start md:self-auto rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00693E] ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </section>

        {/* Error Alert Banner */}
        {fetchError && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-900 flex items-center justify-between shadow-nbe-card rounded-r-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-xs font-bold">Review Queue Synchronization Error</p>
                <p className="text-xs text-red-700">{fetchError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchReviews}
              className="px-3 py-1.5 bg-[#00693E] hover:bg-[#005C36] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div
            className={`p-3.5 border-l-4 text-xs flex items-center justify-between shadow-nbe-card animate-in fade-in duration-200 rounded-r-lg ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                : 'bg-red-50 border-red-500 text-red-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className="font-semibold">{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white border border-[#E8E8E8] p-4 shadow-nbe-card rounded-xl">
                <div className="text-xs font-medium flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
                  <span className="flex items-center gap-1.5 font-bold text-[#333333]">
                    <span className="w-6 h-6 rounded-lg bg-[#FDE4BF] flex items-center justify-center">
                      <Inbox className="w-3.5 h-3.5 text-[#F7941D]" />
                    </span>
                    Available in Queue
                  </span>
                  <span className="text-[10px] font-mono bg-[#FEF5E7] text-[#E07F0A] border border-[#FBD194] px-1.5 py-0.5 font-bold rounded-md">
                    UNASSIGNED
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-[#1A1A1A]">{queue.length}</div>
                <p className="text-[11px] text-[#888888] mt-1">Policies waiting for reviewer claim</p>
              </div>

              <div className="bg-white border border-[#E8E8E8] p-4 shadow-nbe-card rounded-xl">
                <div className="text-xs font-medium flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
                  <span className="flex items-center gap-1.5 font-bold text-[#333333]">
                    <span className="w-6 h-6 rounded-lg bg-[#E8F5EE] flex items-center justify-center">
                      <UserCheck className="w-3.5 h-3.5 text-[#00693E]" />
                    </span>
                    In My Evaluation
                  </span>
                  <span className="text-[10px] font-mono bg-[#E8F5EE] text-[#005C36] border border-[#9FCFB3] px-1.5 py-0.5 font-bold rounded-md">
                    ACTIVE
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-[#00693E]">
                  {myReviews.filter((r) => r.decision === 'PENDING').length}
                </div>
                <p className="text-[11px] text-[#888888] mt-1">Policies currently under your active review</p>
              </div>

              <div className="bg-white border border-[#E8E8E8] p-4 shadow-nbe-card rounded-xl">
                <div className="text-xs font-medium flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
                  <span className="flex items-center gap-1.5 font-bold text-[#333333]">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    </span>
                    Completed Reviews
                  </span>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 font-bold rounded-md">
                    HISTORY
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-800">
                  {myReviews.filter((r) => r.decision !== 'PENDING').length}
                </div>
                <p className="text-[11px] text-[#888888] mt-1">Approved or changes requested policies</p>
              </div>
            </>
          )}
        </div>

        {/* Tab Navigation Controls */}
        <div className="border-b border-[#E8E8E8] bg-white shadow-nbe-card rounded-t-xl overflow-hidden">
          <div className="flex space-x-8 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`py-3.5 px-1 border-b-2 font-bold text-xs flex items-center gap-2 transition-colors ${
                activeTab === 'queue'
                  ? 'border-[#00693E] text-[#00693E]'
                  : 'border-transparent text-[#888888] hover:text-[#555555] hover:border-[#D0D0D0]'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Unassigned Review Queue ({queue.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mine')}
              className={`py-3.5 px-1 border-b-2 font-bold text-xs flex items-center gap-2 transition-colors ${
                activeTab === 'mine'
                  ? 'border-[#00693E] text-[#00693E]'
                  : 'border-transparent text-[#888888] hover:text-[#555555] hover:border-[#D0D0D0]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>My Reviews ({myReviews.length})</span>
            </button>
          </div>
        </div>

        {/* Tab Content Tables */}
        {activeTab === 'queue' ? (
          <section className="bg-white border border-[#E8E8E8] shadow-nbe-card rounded-b-xl overflow-hidden">
            <div className="p-4 border-b border-[#E8E8E8] flex items-center justify-between bg-[#F8F8F8]">
              <h3 className="text-xs font-bold text-[#00693E] uppercase tracking-wider">
                Policies Awaiting Reviewer Assignment ({queue.length})
              </h3>
              <span className="text-[11px] text-[#888888]">
                Click &ldquo;Assign to Me&rdquo; to atomically claim review ownership
              </span>
            </div>

            {isLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E8E8] bg-[#F5F5F5] text-[#555555] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Document Code</th>
                      <th className="py-3 px-4">Policy Title & Category</th>
                      <th className="py-3 px-4">Submitted By</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Live SLA Countdown</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                  </tbody>
                </table>
              </div>
            ) : queue.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 mx-auto flex items-center justify-center border border-slate-200 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Queue is Clear</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No policy submissions are currently waiting for assignment in the unassigned queue.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E8E8] bg-[#F5F5F5] text-[#555555] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Document Code</th>
                      <th className="py-3 px-4">Policy Title & Category</th>
                      <th className="py-3 px-4">Submitted By</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Review SLA Window</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {queue.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F8F8F8] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {item.documentCode}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{item.policyTitle}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{item.category}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{item.submitterName}</div>
                          <div className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            {item.submitterDepartment || 'Banking Operations'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(item.queuedAt).toLocaleDateString()} {new Date(item.queuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded">
                              {item.slaHours}h Target
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">Starts on claim</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {user?.role === 'CHECKER' ? (
                            <button
                              type="button"
                              onClick={() => handleAssignToMe(item.id)}
                              disabled={isAssigning === item.id}
                              className="px-3.5 py-1.5 bg-[#00693E] hover:bg-[#005C36] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 rounded-lg"
                            >
                              {isAssigning === item.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Claiming...</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Assign to Me</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Checker only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="bg-white border border-[#E8E8E8] shadow-nbe-card rounded-b-xl overflow-hidden">
            <div className="p-4 border-b border-[#E8E8E8] flex items-center justify-between bg-[#F8F8F8]">
              <h3 className="text-xs font-bold text-[#00693E] uppercase tracking-wider">
                My Assigned Reviews ({myReviews.length})
              </h3>
              <span className="text-[11px] text-[#888888]">
                Policies under your active evaluation
              </span>
            </div>

            {isLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E8E8] bg-[#F5F5F5] text-[#555555] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Document Code</th>
                      <th className="py-3 px-4">Policy Title & Category</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4">Assigned Date</th>
                      <th className="py-3 px-4">Live SLA Countdown</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                  </tbody>
                </table>
              </div>
            ) : myReviews.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 mx-auto flex items-center justify-center border border-slate-200 rounded-full">
                  <UserCheck className="w-6 h-6 text-slate-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Reviews Assigned</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You currently have no assigned policy reviews. Switch to the Unassigned Queue to claim a pending policy.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('queue')}
                  className="px-4 py-2 bg-[#00693E] hover:bg-[#005C36] text-white text-xs font-semibold inline-flex items-center gap-1.5 rounded-lg transition"
                >
                  <Inbox className="w-4 h-4" />
                  <span>View Unassigned Queue</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E8E8] bg-[#F5F5F5] text-[#555555] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Document Code</th>
                      <th className="py-3 px-4">Policy Title & Category</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4">Assigned Date</th>
                      <th className="py-3 px-4">Live SLA Countdown</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {myReviews.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#F8F8F8] transition-colors cursor-pointer"
                        onClick={() => navigate(`/checker/reviews/${item.id}`)}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {item.documentCode}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{item.policyTitle}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{item.category}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{item.submitterName}</div>
                          <div className="text-slate-500 text-[10px] mt-0.5">
                            {item.submitterDepartment || 'General Banking'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : 'Just now'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <SlaStatusBadge
                            deadline={item.slaDeadline}
                            decision={item.decision}
                            serverStatus={item.slaStatus}
                            size="sm"
                          />
                        </td>

                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => navigate(`/checker/reviews/${item.id}`)}
                            className="px-3 py-1.5 bg-[#00693E] hover:bg-[#005C36] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors rounded-lg"
                          >
                            <span>Open Review</span>
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
        )}
      </main>
    </div>
  );
};
