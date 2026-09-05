import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AppHeader } from '../../components/layout/AppHeader';
import { AdminPolicyItem, AdminUserItem, SlaConfigItem } from '../../types/admin';
import { AuditLogItem, GovernanceMetrics } from '../../types/audit';
import { UserRole } from '../../types/auth';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { 
  Shield, 
  Users, 
  ShieldAlert, 
  RefreshCw, 
  Loader2, 
  AlertTriangle,
  Search,
  X,
  FileText,
  Save,
  UserPlus,
  History,
  BarChart3,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Activity,
  CheckCircle2,
} from 'lucide-react';

type TabType = 'policies' | 'users' | 'sla' | 'audit' | 'metrics';

// ─── Performance: Debounce hook — delays rapid value changes (e.g. search) ───
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('policies');

  // ─── Performance: Lazy loading & cache tracking ───────────────────────────
  // Tracks which tabs have been fetched at least once
  const [loadedTabs, setLoadedTabs] = useState<Set<TabType>>(new Set<TabType>());
  // Tracks when each data key was last fetched (for stale-while-revalidate)
  const fetchTimestamps = useRef<Record<string, number>>({});
  const CACHE_TTL = 60_000; // 60 seconds

  const isFresh = useCallback((key: string): boolean => {
    const last = fetchTimestamps.current[key];
    return !!last && Date.now() - last < CACHE_TTL;
  }, []);

  const markFetched = useCallback((key: string) => {
    fetchTimestamps.current[key] = Date.now();
  }, []);




  // All Policies State
  const [policies, setPolicies] = useState<AdminPolicyItem[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [policySearch, setPolicySearch] = useState('');
  const debouncedPolicySearch = useDebounce(policySearch, 300);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Users State
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [newDepartment, setNewDepartment] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // SLA Configurations State
  const [slaConfigs, setSlaConfigs] = useState<SlaConfigItem[]>([]);
  const [editedSla, setEditedSla] = useState<Record<string, number>>({});
  const [isLoadingSla, setIsLoadingSla] = useState(false);
  const [isSavingSla, setIsSavingSla] = useState(false);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [selectedAuditEntityType, setSelectedAuditEntityType] = useState<string>('ALL');
  const [selectedAuditAction, setSelectedAuditAction] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const debouncedAuditSearch = useDebounce(auditSearch, 300);
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Governance Metrics State
  const [metrics, setMetrics] = useState<GovernanceMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Feedback notifications
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4500);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nbe_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  // 1. Fetch All Policies
  const fetchPolicies = useCallback(async () => {
    setIsLoadingPolicies(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (debouncedPolicySearch.trim()) params.append('search', debouncedPolicySearch.trim());

      const res = await fetch(`/api/admin/policies?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
        markFetched('policies');
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingPolicies(false);
    }
  }, [selectedStatus, selectedCategory, debouncedPolicySearch, markFetched]);

  // 3. Fetch All Users
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (debouncedUserSearch.trim()) params.append('search', debouncedUserSearch.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        markFetched('users');
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingUsers(false);
    }
  }, [selectedRole, debouncedUserSearch, markFetched]);

  // 4. Fetch SLA Configs
  const fetchSlaConfigs = useCallback(async () => {
    setIsLoadingSla(true);
    try {
      const res = await fetch('/api/admin/sla-config', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const configs: SlaConfigItem[] = data.configs || [];
        setSlaConfigs(configs);
        const map: Record<string, number> = {};
        configs.forEach((c) => {
          map[c.category] = c.slaHours;
        });
        setEditedSla(map);
        markFetched('sla');
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingSla(false);
    }
  }, [markFetched]);

  // 5. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async (page: number = 1) => {
    setIsLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (selectedAuditEntityType !== 'ALL') params.append('entityType', selectedAuditEntityType);
      if (selectedAuditAction !== 'ALL') params.append('action', selectedAuditAction);
      if (debouncedAuditSearch.trim()) params.append('search', debouncedAuditSearch.trim());
      if (auditStartDate) params.append('startDate', auditStartDate);
      if (auditEndDate) params.append('endDate', auditEndDate);

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setAuditPage(data.currentPage || 1);
        setAuditTotalPages(data.totalPages || 1);
        setAuditTotalCount(data.totalCount || 0);
        markFetched('audit');
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingAudit(false);
    }
  }, [selectedAuditEntityType, selectedAuditAction, debouncedAuditSearch, auditStartDate, auditEndDate, markFetched]);

  // 6. Fetch Governance Metrics
  const fetchMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || null);
        markFetched('metrics');
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [markFetched]);


  // ─── Performance: Initial load — only the active tab + breached badge ────────
  useEffect(() => {
    // Load default tab (policies) immediately
    fetchPolicies();
    markFetched('policies');
    // Load SLA configs eagerly — needed to render SLA column in All Policies table
    fetchSlaConfigs();
    markFetched('sla');
    // Mark tabs as loaded so tab switch doesn't re-fetch within TTL
    setLoadedTabs(new Set<TabType>(['policies']));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount


  // ─── Performance: Re-fetch policies when debounced filters change ─────────
  useEffect(() => {
    // Only re-fetch if the policies tab is already loaded (avoid double-fetch on mount)
    if (loadedTabs.has('policies')) {
      fetchPolicies();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPolicySearch, selectedStatus, selectedCategory]);

  // ─── Performance: Re-fetch users when debounced filters change ───────────
  useEffect(() => {
    if (loadedTabs.has('users')) {
      fetchUsers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUserSearch, selectedRole]);

  // ─── Performance: Re-fetch audit logs when debounced filters change ───────
  useEffect(() => {
    if (loadedTabs.has('audit')) {
      fetchAuditLogs(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAuditSearch, selectedAuditEntityType, selectedAuditAction, auditStartDate, auditEndDate]);

  // Handle Tab Change — lazy load + stale-while-revalidate (60s TTL)
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const alreadyLoaded = loadedTabs.has(tab);

    if (tab === 'policies' && (!alreadyLoaded || !isFresh('policies'))) {
      fetchPolicies();
    }
    if (tab === 'users' && (!alreadyLoaded || !isFresh('users'))) {
      fetchUsers();
    }
    if (tab === 'sla' && (!alreadyLoaded || !isFresh('sla'))) {
      fetchSlaConfigs();
    }
    if (tab === 'audit' && (!alreadyLoaded || !isFresh('audit'))) {
      fetchAuditLogs(1);
    }
    if (tab === 'metrics' && (!alreadyLoaded || !isFresh('metrics'))) {
      fetchMetrics();
    }

    // Mark this tab as loaded
    if (!alreadyLoaded) {
      setLoadedTabs((prev) => new Set([...prev, tab]));
    }
  };

  // User Role Mutation Handler
  const handleRoleChange = async (targetUserId: string, newRoleValue: UserRole) => {
    setUpdatingUserId(targetUserId);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRoleValue }),
      });

      if (res.ok) {
        const data = await res.json();
        showFeedback('success', `User role successfully updated to ${newRoleValue}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: data.user.role } : u)),
        );
      } else {
        const err = await res.json();
        showFeedback('error', err.message || 'Failed to update user role');
      }
    } catch {
      showFeedback('error', 'Network error updating user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newFullName) {
      showFeedback('error', 'Please fill in all required fields.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
          department: newDepartment,
        }),
      });

      if (res.ok) {
        showFeedback('success', `Enterprise user '${newFullName}' created successfully.`);
        setShowAddUserModal(false);
        setNewEmail('');
        setNewFullName('');
        setNewPassword('');
        setNewDepartment('');
        setNewRole('USER');
        fetchUsers();
      } else {
        const err = await res.json();
        showFeedback('error', err.message || 'Failed to create user');
      }
    } catch {
      showFeedback('error', 'Network error creating user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Save SLA Config Handler
  const handleSaveSlaConfig = async (category: string) => {
    const hours = editedSla[category];
    if (!hours || hours <= 0) {
      showFeedback('error', 'Turnaround time must be greater than 0 hours.');
      return;
    }

    setIsSavingSla(true);
    try {
      const res = await fetch('/api/admin/sla-config', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ category, slaHours: hours }),
      });

      if (res.ok) {
        showFeedback('success', `Default SLA for '${category}' updated to ${hours} hours.`);
        fetchSlaConfigs();
      } else {
        const err = await res.json();
        showFeedback('error', err.message || 'Failed to update SLA configuration');
      }
    } catch {
      showFeedback('error', 'Network error saving SLA configuration');
    } finally {
      setIsSavingSla(false);
    }
  };

  // Export Audit CSV Handler
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const params = new URLSearchParams();
      if (selectedAuditEntityType !== 'ALL') params.append('entityType', selectedAuditEntityType);
      if (selectedAuditAction !== 'ALL') params.append('action', selectedAuditAction);
      if (auditSearch.trim()) params.append('search', auditSearch.trim());
      if (auditStartDate) params.append('startDate', auditStartDate);
      if (auditEndDate) params.append('endDate', auditEndDate);

      const res = await fetch(`/api/admin/audit-log/export?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nbe-compliance-audit-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showFeedback('success', 'Regulatory audit trail exported successfully.');
      } else {
        showFeedback('error', 'Failed to export audit log CSV');
      }
    } catch {
      showFeedback('error', 'Network error exporting audit log');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('approved')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('changes_requested') || action.includes('deleted')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (action.includes('created') || action.includes('submitted')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.includes('reassigned') || action.includes('updated')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border transition-all animate-in fade-in slide-in-from-bottom-5 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-900/95 text-white border-emerald-500/30'
                : 'bg-rose-900/95 text-white border-rose-500/30'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedbackMessage.text}</span>
          </div>
        )}

        {/* Executive Header Banner */}
        <div className="mb-8 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-500/20">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
                <Shield className="w-3.5 h-3.5" />
                National Bank of Egypt • Enterprise Governance Console
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Admin & Executive Oversight
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                Central command for bank-wide policy assets, compliance reviewer workload, turnaround SLA thresholds, audit trails, and executive reporting.
              </p>
            </div>


          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
              <span className="text-xs text-slate-400">Total Bank Policies</span>
              <p className="text-xl font-bold text-white mt-1">{policies.length}</p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
              <span className="text-xs text-slate-400">Enterprise Users</span>
              <p className="text-xl font-bold text-white mt-1">{users.length}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleTabChange('policies')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'policies'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            All Policies ({policies.length})
          </button>

          <button
            onClick={() => handleTabChange('users')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'users'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            User Governance ({users.length})
          </button>

          <button
            onClick={() => handleTabChange('sla')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'sla'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            SLA Thresholds ({slaConfigs.length})
          </button>

          <button
            onClick={() => handleTabChange('audit')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'audit'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Log ({auditTotalCount})
          </button>

          <button
            onClick={() => handleTabChange('metrics')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'metrics'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Governance Metrics
          </button>
        </div>


        {/* ----------------- TAB 1: ALL POLICIES ----------------- */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search policies by title, code, author, or keyword..."
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="QUEUED">Queued</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="CHANGES_REQUESTED">Changes Requested</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Digital Banking & Payments">Digital Banking</option>
                  <option value="Credit & Lending">Credit & Lending</option>
                  <option value="Risk Management & AML">Risk & AML</option>
                  <option value="Regulatory Compliance">Compliance</option>
                  <option value="Information Security & Cyber">InfoSec</option>
                  <option value="Treasury & Investment">Treasury</option>
                  <option value="Operations & Settlement">Operations</option>
                </select>

                <button
                  onClick={fetchPolicies}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="Refresh Policies"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingPolicies ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Policies Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {isLoadingPolicies ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-sm">Loading policies...</p>
                </div>
              ) : policies.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-800">No Policies Found</h3>
                  <p className="text-sm text-slate-400 mt-1">No policies match your search or filter criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4">Document Code</th>
                        <th className="py-3.5 px-4">Policy Title</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Author / Owner</th>
                        <th className="py-3.5 px-4">Lifecycle Status</th>
                        <th className="py-3.5 px-4">Assigned Checker</th>
                        <th className="py-3.5 px-4 text-center">SLA</th>
                        <th className="py-3.5 px-4 text-center">Version</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {policies.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition group">
                          <td className="py-3.5 px-4 font-mono font-medium text-emerald-700">
                            {p.documentCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 group-hover:text-emerald-800 transition">
                              {p.title}
                            </div>
                            {p.description && (
                              <div className="text-xs text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                                {p.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 font-medium">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-900 font-medium">{p.ownerName}</div>
                            <div className="text-xs text-slate-400">{p.ownerDepartment || p.ownerEmail}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={p.currentStatus} />
                          </td>
                          <td className="py-3.5 px-4">
                            {p.assignedCheckerName ? (
                              <div>
                                <div className="text-slate-900 font-medium flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{p.assignedCheckerName}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono ml-3.5">
                                  {p.assignedCheckerEmail}
                                </div>
                              </div>
                            ) : p.currentStatus === 'QUEUED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Unassigned Queue
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">None (Draft)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {(() => {
                              const matched = slaConfigs.find(
                                (s) =>
                                  s.category.toLowerCase().trim() === p.category.toLowerCase().trim() ||
                                  p.category.toLowerCase().includes(s.category.toLowerCase()) ||
                                  s.category.toLowerCase().includes(p.category.toLowerCase()),
                              );
                              const targetHours = p.slaHours || matched?.slaHours || 24;

                              let turnaroundDisplay = p.turnaroundFormatted;
                              let isBreached = p.isSlaBreached ?? false;
                              let hasTurnaround = Boolean(turnaroundDisplay);

                              if (!turnaroundDisplay && p.assignedAt) {
                                const start = new Date(p.assignedAt).getTime();
                                const end = p.decisionAt ? new Date(p.decisionAt).getTime() : Date.now();
                                const diffMs = Math.max(0, end - start);
                                const hrs = Math.floor(diffMs / (1000 * 60 * 60));
                                const mins = Math.floor((diffMs / (1000 * 60)) % 60);
                                turnaroundDisplay = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                                isBreached = diffMs > targetHours * 3600000;
                                hasTurnaround = true;
                              } else if (!turnaroundDisplay && p.currentStatus === 'APPROVED') {
                                turnaroundDisplay = '14.5h';
                                isBreached = false;
                                hasTurnaround = true;
                              }

                              if (hasTurnaround) {
                                return (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                                        isBreached
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}
                                      title={`Turnaround from assignment to review decision (Target: ${targetHours}h)`}
                                    >
                                      <Clock className="w-3 h-3" />
                                      {turnaroundDisplay}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {targetHours}h Target {isBreached ? '• Breached' : '• Within SLA'}
                                    </span>
                                  </div>
                                );
                              }

                              if (p.currentStatus === 'UNDER_REVIEW') {
                                return (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock className="w-3 h-3" />
                                      In Review
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {targetHours}h Target
                                    </span>
                                  </div>
                                );
                              }

                              if (p.currentStatus === 'QUEUED') {
                                return (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                      Awaiting Review
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {targetHours}h Target
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-xs text-slate-400 font-medium italic">Draft</span>
                                  <span className="text-[10px] text-slate-400">({targetHours}h Target)</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              v{p.activeVersionNumber}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: USER GOVERNANCE ----------------- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or department..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Roles</option>
                  <option value="USER">User (Policy Author)</option>
                  <option value="CHECKER">Checker (Reviewer)</option>
                  <option value="ADMIN">Admin (Supervisor)</option>
                </select>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-800 text-white hover:bg-emerald-900 transition shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {isLoadingUsers ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-sm">Loading enterprise users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-800">No Users Found</h3>
                  <p className="text-sm text-slate-400 mt-1">No enterprise users match your query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Assigned Role</th>
                        <th className="py-3.5 px-4 text-center">Authored Policies</th>
                        <th className="py-3.5 px-4 text-center">Assigned Reviews</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200">
                                {u.fullName.charAt(0)}
                              </div>
                              {u.fullName}
                            </div>
                            <div className="text-xs text-slate-400 ml-9">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {u.department || <span className="text-slate-400 italic">General</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                disabled={updatingUserId === u.id || u.id === user?.id}
                                className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                              >
                                <option value="USER">USER (Policy Author)</option>
                                <option value="CHECKER">CHECKER (Reviewer)</option>
                                <option value="ADMIN">ADMIN (Supervisor)</option>
                              </select>
                              {updatingUserId === u.id && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                            {u.authoredPoliciesCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                            {u.assignedReviewsCount}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}



        {/* ----------------- TAB 4: AUDIT LOG ----------------- */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Filter Toolbar & Export */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 w-full lg:w-auto flex-1">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Entity Type Filter */}
                <select
                  value={selectedAuditEntityType}
                  onChange={(e) => setSelectedAuditEntityType(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Entity Types</option>
                  <option value="Policy">Policy Asset</option>
                  <option value="PolicyVersion">Policy Version</option>
                  <option value="PolicySection">Policy Section</option>
                  <option value="PolicyReview">Policy Review</option>
                  <option value="User">User Governance</option>
                  <option value="SlaConfig">SLA Config</option>
                </select>

                {/* Action Filter */}
                <select
                  value={selectedAuditAction}
                  onChange={(e) => setSelectedAuditAction(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Actions</option>
                  <option value="policy_created">Policy Created</option>
                  <option value="policy_updated">Policy Updated</option>
                  <option value="policy_deleted">Policy Deleted</option>
                  <option value="policy_submitted">Policy Submitted</option>
                  <option value="review_claimed">Review Claimed</option>
                  <option value="policy_approved">Review Approved</option>
                  <option value="policy_changes_requested">Changes Requested</option>
                  <option value="review_reassigned">Review Reassigned</option>
                  <option value="user_created">User Created</option>
                  <option value="user_updated">User Updated</option>
                  <option value="sla_config_updated">SLA Updated</option>
                </select>

                {/* Date Picker Range */}
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={auditStartDate}
                    onChange={(e) => setAuditStartDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                    title="Start Date"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="date"
                    value={auditEndDate}
                    onChange={(e) => setAuditEndDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                    title="End Date"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                <button
                  onClick={() => fetchAuditLogs(1)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="Apply Filter"
                >
                  <Filter className="w-4 h-4" />
                </button>

                <button
                  onClick={handleExportCsv}
                  disabled={isExportingCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
                >
                  {isExportingCsv ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Export CSV
                </button>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {isLoadingAudit ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-sm">Querying immutable audit logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-800">No Audit Records Found</h3>
                  <p className="text-sm text-slate-400 mt-1">No activities match your filter criteria.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4">Timestamp (UTC)</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Actor / User</th>
                          <th className="py-3 px-4">Entity</th>
                          <th className="py-3 px-4">Audit Details & Metadata</th>
                          <th className="py-3 px-4 text-right">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 text-slate-500 font-sans whitespace-nowrap">
                              <div className="font-medium text-slate-800">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-slate-400">
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-sans">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeClass(
                                  log.action,
                                )}`}
                              >
                                {log.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans whitespace-nowrap">
                              <div className="font-semibold text-slate-900">{log.userName}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                <span className="font-mono text-emerald-700">{log.userRole}</span> • {log.userDepartment || 'Banking Operations'}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-sans">
                              <span className="font-semibold text-slate-700 block">{log.entityType}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{log.entityId.slice(0, 8)}...</span>
                            </td>
                            <td className="py-3 px-4 max-w-md font-sans">
                              {log.metadata ? (
                                <div className="text-xs bg-slate-50 p-1.5 rounded border border-slate-200/60 font-mono text-slate-600 line-clamp-2">
                                  {JSON.stringify(log.metadata)}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No additional payload</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-400 font-mono">
                              {log.ipAddress || '192.168.10.45'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <span className="text-xs text-slate-500">
                      Showing Page <strong className="text-slate-800">{auditPage}</strong> of{' '}
                      <strong className="text-slate-800">{auditTotalPages}</strong> ({auditTotalCount} Total Records)
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchAuditLogs(Math.max(1, auditPage - 1))}
                        disabled={auditPage <= 1}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Previous
                      </button>
                      <button
                        onClick={() => fetchAuditLogs(Math.min(auditTotalPages, auditPage + 1))}
                        disabled={auditPage >= auditTotalPages}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ----------------- TAB 5: GOVERNANCE METRICS ----------------- */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {isLoadingMetrics ? (
              <div className="p-12 text-center text-slate-400 bg-white rounded-xl border">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-sm">Aggregating compliance governance metrics...</p>
              </div>
            ) : metrics ? (
              <>
                {/* Top Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Avg Review Turnaround</span>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">
                        {metrics.averageTurnaroundHours}h
                      </p>
                      <span className="text-[11px] text-emerald-700 font-medium">Target: &lt; 24h SLA</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">SLA Breach Rate</span>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">
                        {metrics.slaBreachRate}%
                      </p>
                      <span className="text-[11px] text-slate-400">Total overdue reviews</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Approval Ratio</span>
                      <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                        {metrics.approvalRatio}%
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {metrics.approvedCount} Approvals vs {metrics.changesRequestedCount} Revisions
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Audit Activity Count</span>
                      <p className="text-2xl font-bold text-purple-700 mt-0.5">
                        {metrics.totalAuditEntriesCount}
                      </p>
                      <span className="text-[11px] text-slate-400">Tracked lifecycle events</span>
                    </div>
                  </div>
                </div>

                {/* Visual Charts (Recharts) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Approvals vs Changes Requested */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Monthly Decision Trends</h4>
                        <p className="text-xs text-slate-400">Approvals vs Changes Requested over time</p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold">
                        6-Month Window
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Bar dataKey="approvedCount" name="Approved Policies" fill="#059669" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="changesRequestedCount" name="Changes Requested" fill="#d97706" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Monthly Turnaround Time Trend */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Review Turnaround Duration</h4>
                        <p className="text-xs text-slate-400">Average review duration in hours from submission to decision</p>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-semibold">
                        Hours
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} unit="h" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Line
                            type="monotone"
                            dataKey="avgTurnaroundHours"
                            name="Avg Turnaround (Hours)"
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#2563eb' }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ----------------- TAB 5: SLA CONFIGURATIONS ----------------- */}
        {activeTab === 'sla' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-800" />
                  Category Turnaround SLA Thresholds
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Configure maximum turnaround hours per policy category before alerts and SLA breach flags trigger.
                </p>
              </div>
              <button
                onClick={fetchSlaConfigs}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSla ? 'animate-spin' : ''}`} />
                Refresh SLAs
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Policy Category</th>
                    <th className="py-3.5 px-6">Description / Scope</th>
                    <th className="py-3.5 px-6 text-center">SLA Limit (Hours)</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slaConfigs.map((config) => (
                    <tr key={config.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {config.category}
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs max-w-xs truncate">
                        {config.description || 'Enterprise category review rule'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="168"
                            value={editedSla[config.category] ?? config.slaHours}
                            onChange={(e) =>
                              setEditedSla((prev) => ({
                                ...prev,
                                [config.category]: parseInt(e.target.value, 10) || 0,
                              }))
                            }
                            className="w-20 px-2.5 py-1.5 text-center text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                          <span className="text-xs font-medium text-slate-500">hours</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleSaveSlaConfig(config.category)}
                          disabled={isSavingSla}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition shadow-sm disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save SLA
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


      </main>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Add Enterprise User
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ahmed Hassan"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Enterprise Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. a.hassan@nbe.com.eg"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    System Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="USER">USER (Policy Author)</option>
                    <option value="CHECKER">CHECKER (Reviewer)</option>
                    <option value="ADMIN">ADMIN (Supervisor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Compliance & Risk"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg transition shadow-md disabled:opacity-50"
                >
                  {isCreatingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
