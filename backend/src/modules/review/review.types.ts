import { ReviewDecision } from '@prisma/client';
import { PolicySectionItem } from '../policy/policy.types';

export { ReviewDecision };

export enum SlaStatus {
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  BREACHED = 'BREACHED',
  COMPLETED = 'COMPLETED',
}

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
  queuedAt: Date;
  assignedAt: Date | null;
  decisionAt: Date | null;
  slaDeadline: Date;
  slaRemainingMs: number;
  slaRemainingHours: number;
  slaStatus: SlaStatus;
  isSlaBreached: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyReviewDetail extends PolicyReviewItem {
  policyDescription: string | null;
  policyCurrentStatus: string;
  sourceFileUrl: string | null;
  changeSummary: string | null;
  submittedAt: Date | null;
  sections: PolicySectionItem[];
}

export interface AssignReviewResult {
  review: PolicyReviewItem;
  message: string;
}

export interface RequestChangesInput {
  feedback: string;
}
