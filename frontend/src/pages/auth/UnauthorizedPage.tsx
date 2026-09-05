import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ShieldX, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { AppHeader } from '../../components/layout/AppHeader';

export const UnauthorizedPage: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    currentRole?: string;
    allowedRoles?: string[];
    attemptedPath?: string;
  } | undefined;

  const currentRole = state?.currentRole || role || 'UNASSIGNED';
  const allowedRoles = state?.allowedRoles || [];
  const attemptedPath = state?.attemptedPath || location.pathname;

  const handleReturnHome = () => {
    switch (role) {
      case 'USER':
        navigate('/owner/dashboard');
        break;
      case 'CHECKER':
        navigate('/checker/dashboard');
        break;
      case 'ADMIN':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/login');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <AppHeader currentModule="Access Control / Unauthorized" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 flex items-center justify-center">
        <div className="bg-white border border-slate-300 shadow-enterprise-lg w-full">
          {/* Red Alert Strip */}
          <div className="h-1.5 bg-[#8B1D2C] w-full" />

          <div className="p-8 space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-100 border border-red-200 text-[#8B1D2C]">
                <ShieldX className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8B1D2C]">
                  <Lock className="w-3.5 h-3.5" />
                  HTTP 403 Forbidden
                </div>
                <h2 className="text-xl font-bold text-[#0F2042]">
                  Access Denied: Insufficient Privileges
                </h2>
                <p className="text-xs text-slate-600">
                  Your current role credentials do not permit access to the requested enterprise module.
                </p>
              </div>
            </div>

            {/* Diagnostic Information */}
            <div className="bg-slate-50 border border-slate-200 p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Authenticated User:</span>
                  <span className="font-semibold text-slate-900">{user?.fullName || 'N/A'}</span>
                  <span className="text-slate-400 block text-[11px] font-mono">{user?.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Assigned Role:</span>
                  <span className="inline-block px-2 py-0.5 bg-[#0F2042] text-white font-mono text-[11px] font-bold">
                    {currentRole}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Attempted Resource:</span>
                  <span className="font-mono text-slate-800 text-[11px] break-all">{attemptedPath}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Required Role(s):</span>
                  <span className="font-mono text-[#8B1D2C] font-semibold text-[11px]">
                    {allowedRoles.length > 0 ? allowedRoles.join(' | ') : 'Elevated Privileges'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReturnHome}
                className="w-full sm:w-auto px-4 py-2 bg-[#0F2042] hover:bg-[#1A2B4C] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to My Role Dashboard
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                Sign In with Different Credentials
              </button>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-200 text-center text-[10px] text-slate-500">
            Security Incident Logged • National Bank of Egypt Policy Governance System
          </div>
        </div>
      </main>
    </div>
  );
};
