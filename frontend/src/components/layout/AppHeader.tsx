import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Bell,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Check,
  Loader2,
  ClipboardList,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../types/auth';
import { NotificationItem } from '../../types/notification';
import nbeLogo from '../../assets/branding/National_Bank_of_Egypt.svg.webp';

interface AppHeaderProps {
  currentModule?: string;
}

// Role-specific navigation tiles
const NAV_TILES: Array<{
  id: string;
  label: string;
  icon: typeof ClipboardList;
  role: 'USER' | 'CHECKER' | 'ADMIN';
  path: string;
}> = [
    { id: 'my-policies', label: 'My Policies', icon: FileText, role: 'USER', path: '/owner/dashboard' },
    { id: 'review-queue', label: 'Review Queue', icon: ClipboardList, role: 'CHECKER', path: '/checker/dashboard' },
    { id: 'admin', label: 'Admin Panel', icon: UserCog, role: 'ADMIN', path: '/admin/dashboard' },
  ];

export const AppHeader: React.FC<AppHeaderProps> = ({ currentModule = 'Overview' }) => {
  const { user, role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // In-app notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nbe_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Fallback
    }
  }, [isAuthenticated]);

  // Initial fetch and poll every 20 seconds
  useEffect(() => {
    fetchNotifications();
    // Performance: poll every 60s instead of 20s — reduces background API traffic by 66%
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single notification as read and navigate
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Fallback
      }
    }

    setIsNotificationsOpen(false);

    // Direct routing based on entity type and user role
    if (notif.relatedEntityType === 'PolicyReview') {
      if (user?.role === 'CHECKER' || user?.role === 'ADMIN') {
        navigate(`/reviews/${notif.relatedEntityId}`);
      } else {
        navigate(`/checker`);
      }
    } else if (notif.relatedEntityType === 'Policy') {
      navigate(`/policies/${notif.relatedEntityId}`);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    setIsLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'NB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatRelativeTime = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'DECISION_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'DECISION_CHANGES_REQUESTED':
        return <AlertTriangle className="w-4 h-4 text-[#F7941D] shrink-0" />;
      case 'SLA_BREACHED':
        return <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'SLA_AT_RISK':
        return <Clock className="w-4 h-4 text-[#F7941D] shrink-0" />;
      case 'REVIEW_ASSIGNED':
        return <UserIcon className="w-4 h-4 text-[#00693E] shrink-0" />;
      case 'POLICY_SUBMITTED':
      default:
        return <FileText className="w-4 h-4 text-[#00693E] shrink-0" />;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full select-none" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' }}>
      {/* ── Main Header ── */}
      <div className="bg-white border-b border-[#E8E8E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Left: NBE Logo + App Title */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-3 py-2 hover:opacity-90 transition-opacity shrink-0"
              id="nbe-main-logo"
            >
              <img
                src={nbeLogo}
                alt="National Bank of Egypt — البنك الأهلي المصري"
                className="h-10 w-auto object-contain"
              />
              <div className="hidden lg:flex flex-col text-left border-l border-[#E8E8E8] pl-3">
                <span className="text-[11px] font-semibold text-[#888888] uppercase tracking-widest leading-tight">
                  البنك الأهلي المصري
                </span>
                <span className="text-[13px] font-bold text-[#00693E] tracking-tight leading-tight">
                  Policy Management System
                </span>
              </div>
            </button>

            {/* Center: NBE-style section nav tiles (orange icon chip on top, green label below) */}
            <nav className="hidden md:flex items-stretch gap-1 flex-1 justify-center" aria-label="Policy portal sections">
              {NAV_TILES.map((tile) => {
                // Hide role-specific tiles unless the user has that role
                if (tile.role && user?.role !== tile.role) {
                  return null;
                }
                const Icon = tile.icon;
                const isActive = currentModule?.toLowerCase().includes(tile.label.toLowerCase().replace(' ', ''));
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => navigate(tile.path)}
                    className={`flex flex-col items-center justify-center px-4 py-2 gap-1 text-center transition-all group min-w-[70px] border-b-2 ${isActive
                        ? 'border-[#00693E]'
                        : 'border-transparent hover:border-[#F7941D]'
                      }`}
                  >
                    {/* Orange icon chip (NBE tile style) */}
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isActive
                          ? 'bg-[#F7941D]'
                          : 'bg-[#FDE4BF] group-hover:bg-[#F7941D]'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </span>
                    {/* Green label */}
                    <span
                      className={`text-[10px] font-semibold leading-tight ${isActive
                          ? 'text-[#00693E]'
                          : 'text-[#555555] group-hover:text-[#00693E]'
                        }`}
                    >
                      {tile.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Right: Module breadcrumb + notifications + user menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Current module pill */}
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[#888888] bg-[#F5F5F5] border border-[#E8E8E8] px-2.5 py-1 rounded-full">
                <Building2 className="w-3 h-3 text-[#00693E]" />
                <span className="text-[#555555]">Governance</span>
                <span className="text-[#D0D0D0]">/</span>
                <span className="font-semibold text-[#00693E]">{currentModule}</span>
              </div>

              {/* Notification Bell */}
              {isAuthenticated && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2 text-[#555555] hover:text-[#00693E] hover:bg-[#E8F5EE] border border-transparent hover:border-[#9FCFB3] transition-colors rounded-lg focus:outline-none"
                    title="System Alerts & Notifications"
                    aria-label="System Alerts"
                    aria-expanded={isNotificationsOpen}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-[#F7941D] text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown Panel */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E8E8E8] shadow-nbe-card rounded-xl z-50 text-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {/* Panel header — NBE green */}
                      <div className="bg-[#00693E] text-white px-4 py-3 border-b border-[#005C36] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase tracking-wider">
                            In-App Notifications
                          </span>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F7941D] text-white">
                              {unreadCount} new
                            </span>
                          )}
                        </div>

                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllAsRead}
                            disabled={isLoadingNotifications}
                            className="text-[11px] text-green-200 hover:text-white font-medium flex items-center gap-1 transition disabled:opacity-50"
                          >
                            {isLoadingNotifications ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto divide-y divide-[#F5F5F5]">
                        {notifications.length === 0 ? (
                          <div className="py-10 px-4 text-center text-slate-400">
                            <Bell className="w-8 h-8 text-[#9FCFB3] mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-semibold text-slate-600">No Notifications</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              You're all caught up with policy updates.
                            </p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3.5 flex items-start gap-3 hover:bg-[#F8F8F8] cursor-pointer transition ${!notif.isRead ? 'bg-[#E8F5EE]/50 border-l-2 border-[#00693E]' : ''
                                }`}
                            >
                              <div className="mt-0.5 p-1.5 rounded-lg bg-[#F5F5F5] border border-[#E8E8E8] shrink-0">
                                {getNotificationIcon(notif.type)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider">
                                    {notif.type.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[10px] text-[#888888]">
                                    {formatRelativeTime(notif.createdAt)}
                                  </span>
                                </div>
                                <p
                                  className={`text-xs leading-snug line-clamp-2 ${!notif.isRead ? 'font-semibold text-slate-900' : 'text-slate-600'
                                    }`}
                                >
                                  {notif.message}
                                </p>
                              </div>

                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[#00693E] shrink-0 mt-2" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 bg-[#F8F8F8] border-t border-[#E8E8E8] text-center">
                        <span className="text-[11px] text-[#888888] font-medium">
                          National Bank of Egypt
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="h-6 w-px bg-[#E8E8E8]" />

              {/* User Profile Menu */}
              {isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    id="user-menu-button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 bg-[#F5F5F5] hover:bg-[#E8F5EE] border border-[#E8E8E8] hover:border-[#9FCFB3] transition-colors text-left rounded-lg"
                    aria-expanded={isUserMenuOpen}
                  >
                    {/* Green initials avatar */}
                    <div className="w-7 h-7 bg-[#00693E] flex items-center justify-center font-bold text-xs text-white rounded-lg">
                      {getInitials(user.fullName)}
                    </div>
                    <div className="hidden sm:flex flex-col">
                      <span className="text-xs font-semibold text-[#1A1A1A] leading-tight">
                        {user.fullName}
                      </span>
                      <span className="text-[10px] text-[#888888] leading-tight">
                        {user.role ? ROLE_LABELS[user.role] : user.role} • {user.department || 'Governance'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#888888]" />
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-64 bg-white border border-[#E8E8E8] shadow-nbe-card rounded-xl z-50 text-slate-800 py-1 overflow-hidden animate-in fade-in"
                      role="menu"
                    >
                      <div className="px-4 py-3 border-b border-[#F5F5F5] bg-[#F8F8F8]">
                        <p className="text-xs font-bold text-[#1A1A1A]">{user.fullName}</p>
                        <p className="text-[11px] text-[#888888] truncate">{user.email}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <span className="text-[10px] bg-[#00693E] text-white px-2 py-0.5 font-mono font-bold rounded-md">
                            {role ? ROLE_LABELS[role] : role}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#00693E] hover:bg-[#E8F5EE] flex items-center gap-2 font-semibold transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-4 py-1.5 bg-[#00693E] hover:bg-[#005C36] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
