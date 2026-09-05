import { PolicySectionItem } from './policy';

export type ReviewDecision = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';

export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'COMPLETED';

export interface PolicyReviewItem {
  id: string;
  policyId: string;
  policyTitle: string;
  documentCode: string;
  category: string;
  versionId: string;
  versionNumber: number;
  submitterId: string;
  submitterName: string;
  submitterDepartment: string | null;
  checkerId: string | null;
  checkerName: string | null;
  slaHours: number;
  decision: ReviewDecision;
  feedback: string | null;
  queuedAt: string;
  assignedAt: string | null;
  decisionAt: string | null;
  slaDeadline: string;
  slaRemainingMs: number;
  slaRemainingHours: number;
  slaStatus: SlaStatus;
  isSlaBreached: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyReviewDetail extends PolicyReviewItem {
  policyDescription: string | null;
  policyCurrentStatus: string;
  sourceFileUrl: string | null;
  changeSummary: string | null;
  submittedAt: string | null;
  sections: PolicySectionItem[];
}

export interface AssignReviewResult {
  review: PolicyReviewItem;
  message: string;
}

export interface RequestChangesInput {
  feedback: string;
}
