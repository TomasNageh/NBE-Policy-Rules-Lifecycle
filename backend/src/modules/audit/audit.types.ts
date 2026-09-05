import { UserRole } from '../auth/auth.types';

export interface AuditLogItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  userDepartment: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AuditLogFilter {
  entityType?: string;
  userId?: string;
  action?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  search?: string;
}

export interface AuditLogPagination {
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  logs: AuditLogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface MonthlyMetricPoint {
  month: string; // '2026-01', '2026-02', etc.
  approvedCount: number;
  changesRequestedCount: number;
  totalSubmissions: number;
  avgTurnaroundHours: number;
}

export interface GovernanceMetrics {
  totalPolicies: number;
  activeDrafts: number;
  underReviewCount: number;
  approvedCount: number;
  changesRequestedCount: number;
  averageTurnaroundHours: number;
  slaBreachRate: number; // percentage (e.g. 8.5)
  approvalRatio: number; // percentage (e.g. 75.0)
  totalAuditEntriesCount: number;
  monthlyTrends: MonthlyMetricPoint[];
}
