import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute, RoleBasedRedirect } from './auth/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { PolicyEditorPage } from './pages/owner/PolicyEditorPage';
import { ParsedPolicyReviewPage } from './pages/owner/ParsedPolicyReviewPage';
import { CheckerDashboard } from './pages/checker/CheckerDashboard';
import { ReviewDetailPage } from './pages/checker/ReviewDetailPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { PolicyDiffPage } from './pages/owner/PolicyDiffPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Root Route: Redirects based on user role */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />

            {/* Redirect /overview to role dashboard */}
            <Route
              path="/overview"
              element={<Navigate to="/" replace />}
            />

            {/* ─── 1. OWNER Workspace (Policy Author) ────────────────────────── */}
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute allowedRoles={['USER']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/policies"
              element={
                <ProtectedRoute allowedRoles={['USER']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/policies/review-upload"
              element={
                <ProtectedRoute allowedRoles={['USER']}>
                  <ParsedPolicyReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/policies/:id"
              element={
                <ProtectedRoute allowedRoles={['USER']}>
                  <PolicyEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/policies/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['USER']}>
                  <PolicyEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/policies/:id/diff"
              element={
                <ProtectedRoute allowedRoles={['USER', 'CHECKER', 'ADMIN']}>
                  <PolicyDiffPage />
                </ProtectedRoute>
              }
            />

            {/* Legacy /user/* — redirect to /owner/* */}
            <Route path="/user/dashboard" element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="/user/policies" element={<Navigate to="/owner/policies" replace />} />
            <Route path="/user/policies/review-upload" element={<Navigate to="/owner/policies/review-upload" replace />} />
            <Route path="/user/policies/:id" element={<Navigate to="/owner/policies/:id" replace />} />
            <Route path="/user/policies/:id/edit" element={<Navigate to="/owner/policies/:id/edit" replace />} />
            <Route path="/user/policies/:id/diff" element={<Navigate to="/owner/policies/:id/diff" replace />} />

            {/* ─── 2. CHECKER Workspace (Review & Decision) ─────────────────── */}
            <Route
              path="/checker/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CHECKER']}>
                  <CheckerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checker/reviews/:id"
              element={
                <ProtectedRoute allowedRoles={['CHECKER']}>
                  <ReviewDetailPage />
                </ProtectedRoute>
              }
            />

            {/* ─── 3. ADMIN Workspace (Supervision & Governance) ────────────── */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/policies"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reviews"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sla"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/metrics"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* ─── Shared & Canonical Aliases ────────────────────────────────── */}
            <Route
              path="/policies/:id"
              element={
                <ProtectedRoute allowedRoles={['USER', 'ADMIN']}>
                  <PolicyEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/policies/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['USER']}>
                  <PolicyEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/policies/:id/diff"
              element={
                <ProtectedRoute allowedRoles={['USER', 'CHECKER', 'ADMIN']}>
                  <PolicyDiffPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviews/:id"
              element={
                <ProtectedRoute allowedRoles={['USER', 'CHECKER', 'ADMIN']}>
                  <ReviewDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Role Shortcuts & Legacy Redirects */}
            <Route path="/user" element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="/checker" element={<Navigate to="/checker/dashboard" replace />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
