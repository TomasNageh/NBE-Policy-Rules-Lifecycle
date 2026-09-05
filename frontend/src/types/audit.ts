import { UserRole } from './auth';

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
  createdAt: string | Date;
}

export interface AuditLogFilter {
  entityType?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AuditLogResponse {
  status: string;
  logs: AuditLogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface MonthlyMetricPoint {
  month: string;
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
  slaBreachRate: number;
  approvalRatio: number;
  totalAuditEntriesCount: number;
  monthlyTrends: MonthlyMetricPoint[];
}

export interface GovernanceMetricsResponse {
  status: string;
  metrics: GovernanceMetrics;
}
