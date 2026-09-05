import { UserRole, PolicyStatus, VersionStatus } from '@prisma/client';

export interface AdminPolicyItem {
  id: string;
  title: string;
  documentCode: string;
  category: string;
  description: string | null;
  currentStatus: PolicyStatus;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerDepartment: string | null;
  assignedCheckerId?: string | null;
  assignedCheckerName?: string | null;
  assignedCheckerEmail?: string | null;
  activeVersionNumber: number;
  activeVersionStatus: VersionStatus;
  sectionsCount: number;
  slaHours?: number;
  turnaroundHours?: number | null;
  turnaroundFormatted?: string | null;
  isSlaBreached?: boolean | null;
  assignedAt?: Date | string | null;
  decisionAt?: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPolicyFilter {
  status?: PolicyStatus;
  category?: string;
  search?: string;
}

export interface SlaConfigItem {
  id: string;
  category: string;
  slaHours: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSlaConfigInput {
  category: string;
  slaHours: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string | null;
  isActive: boolean;
  authoredPoliciesCount: number;
  assignedReviewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  department?: string | null;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  department?: string | null;
  isActive?: boolean;
}

export interface FinalApprovedPolicyItem {
  id: string;
  policyId: string;
  policyTitle: string;
  documentCode: string;
  category: string;
  versionNumber: number;
  sourceFileUrl: string | null;
  // User (Author) details
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorDepartment: string | null;
  submittedAt: Date | null;
  // Checker (Reviewer) details
  checkerId: string;
  checkerName: string;
  checkerEmail: string;
  checkerDepartment: string | null;
  claimedAt: Date | null;
  approvedAt: Date | null;
  // SLA Evaluation Metrics
  slaHours: number;
  turnaroundHours: number;
  turnaroundFormatted: string;
  isSlaBreached: boolean;
  slaStatus: 'COMPLETED_ON_TIME' | 'COMPLETED_BREACHED';
  feedback: string | null;
}
