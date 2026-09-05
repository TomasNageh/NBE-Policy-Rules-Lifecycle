import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole, ROLE_HOME_PATHS } from '../types/auth';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 1. Loading state with formal banking spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center space-x-3 text-[#0F2042]">
          <Loader2 className="w-6 h-6 animate-spin text-[#8B1D2C]" />
          <span className="text-sm font-semibold tracking-wide">
            Verifying Enterprise Credentials...
          </span>
        </div>
        <p className="text-xs text-slate-500 font-mono">
          NBE Security Gateway / SSL Tier-1
        </p>
      </div>
    );
  }

  // 2. Not Authenticated -> Redirect to /login with return location
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated but role not allowed -> Redirect to /unauthorized
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          currentRole: role,
          allowedRoles,
          attemptedPath: location.pathname,
        }}
        replace
      />
    );
  }

  // 4. Authorized -> Render child components
  return <>{children}</>;
};

/**
 * Helper component that directs an already authenticated user to their role-designated dashboard
 */
export const RoleBasedRedirect: React.FC = () => {
  const { user, role, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B1D2C]" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !role) {
    return <Navigate to="/login" replace />;
  }

  switch (role) {
    case 'USER':
      return <Navigate to={ROLE_HOME_PATHS.USER} replace />;
    case 'CHECKER':
      return <Navigate to={ROLE_HOME_PATHS.CHECKER} replace />;
    case 'ADMIN':
      return <Navigate to={ROLE_HOME_PATHS.ADMIN} replace />;
    default:
      return (
        <div className="p-8 text-center">
          <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm font-semibold">Unrecognized role assignment</p>
        </div>
      );
  }
};
