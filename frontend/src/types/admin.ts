import { UserRole } from './auth';
import { PolicyStatus, VersionStatus } from './policy';

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
  assignedAt?: string | null;
  decisionAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlaConfigItem {
  id: string;
  category: string;
  slaHours: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  department?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  department?: string;
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
  submittedAt: string | null;
  // Checker (Reviewer) details
  checkerId: string;
  checkerName: string;
  checkerEmail: string;
  checkerDepartment: string | null;
  claimedAt: string | null;
  approvedAt: string | null;
  // SLA Evaluation Metrics
  slaHours: number;
  turnaroundHours: number;
  turnaroundFormatted: string;
  isSlaBreached: boolean;
  slaStatus: 'COMPLETED_ON_TIME' | 'COMPLETED_BREACHED';
  feedback: string | null;
}
