export type UserRole = 'USER' | 'CHECKER' | 'ADMIN';

/**
 * Human-readable display labels for each role.
 * The DB/API keeps the canonical enum (USER/CHECKER/ADMIN).
 * All UI should use this map to display role names.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Owner',
  CHECKER: 'Checker',
  ADMIN: 'Admin',
};

/**
 * Role-to-dashboard-path mapping for navigation.
 */
export const ROLE_HOME_PATHS: Record<UserRole, string> = {
  USER: '/owner/dashboard',
  CHECKER: '/checker/dashboard',
  ADMIN: '/admin/dashboard',
};

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  status: 'success' | 'error';
  message?: string;
  user: User;
  token?: string;
}

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
}
