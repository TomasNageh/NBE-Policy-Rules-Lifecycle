import { PolicyStatus, VersionStatus } from '@prisma/client';

export { PolicyStatus, VersionStatus };

export interface PolicySectionItem {
  id: string;
  versionId: string;
  sectionNumber: number;
  title: string;
  controlArea: string | null;
  policyStatement: string;
  rolesAndResponsibilities: string | null;
  procedures: string | null;
  standardProcedure?: string | null;
  requiredRecords?: string | null;
  controlsAndChecks?: string | null;
  exceptionsAndEscalation?: string | null;
  kpiExamples?: string | null;
  testingScenario?: string | null;
  complianceNotes: string | null;
  exceptions: string | null;
  unmatchedContent?: string | null;
  orderIndex: number;
  parseStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyVersionDetail {
  id: string;
  policyId: string;
  versionNumber: number;
  status: VersionStatus;
  changeSummary: string | null;
  sourceFileUrl?: string | null;
  sections: PolicySectionItem[];
  submittedAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyDetail {
  id: string;
  title: string;
  documentCode: string;
  category: string;
  description: string | null;
  ownerId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerDepartment?: string | null;
  assignedCheckerId?: string | null;
  assignedCheckerName?: string | null;
  assignedCheckerEmail?: string | null;
  assignedCheckerDepartment?: string | null;
  currentStatus: PolicyStatus;
  activeVersion: PolicyVersionDetail;
  versionsCount: number;
  sectionsCount: number;
  reviewerFeedback?: string | null;
  reviewerFeedbackDate?: Date | null;
  reviewerName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicySummary {
  id: string;
  title: string;
  documentCode: string;
  category: string;
  description: string | null;
  ownerId: string;
  currentStatus: PolicyStatus;
  currentVersionNumber: number;
  sectionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePolicyInput {
  title: string;
  documentCode: string;
  category: string;
  description?: string;
  sourceFileUrl?: string;
}

export interface UpdatePolicyInput {
  title?: string;
  category?: string;
  description?: string;
}

export interface CreateSectionInput {
  sectionNumber?: number;
  title: string;
  controlArea?: string;
  policyStatement: string;
  rolesAndResponsibilities?: string;
  procedures?: string;
  standardProcedure?: string;
  requiredRecords?: string;
  controlsAndChecks?: string;
  exceptionsAndEscalation?: string;
  kpiExamples?: string;
  testingScenario?: string;
  complianceNotes?: string;
  exceptions?: string;
  unmatchedContent?: string;
  orderIndex?: number;
}

export interface UpdateSectionInput {
  title?: string;
  controlArea?: string;
  policyStatement?: string;
  rolesAndResponsibilities?: string;
  procedures?: string;
  standardProcedure?: string;
  requiredRecords?: string;
  controlsAndChecks?: string;
  exceptionsAndEscalation?: string;
  kpiExamples?: string;
  testingScenario?: string;
  complianceNotes?: string;
  exceptions?: string;
  unmatchedContent?: string;
  orderIndex?: number;
}



export interface SaveDraftInput {
  /** Map of sectionId -> field updates to apply in the new version */
  sectionChanges: Record<string, UpdateSectionInput>;
  /** Optional human-readable summary of what changed in this save */
  changeSummary?: string;
}
export interface PolicyVersionSummary {
  id: string;
  policyId: string;
  versionNumber: number;
  status: VersionStatus;
  changeSummary: string | null;
  sourceFileUrl?: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submittedBy?: {
    id: string;
    fullName: string;
    email: string;
    department?: string | null;
    role?: string;
  } | null;
  sectionsCount: number;
}

export type SectionChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

export interface SectionDiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface FieldDiff {
  fieldKey: string;
  fieldLabel: string;
  fromValue: string | null;
  toValue: string | null;
  hasChanges: boolean;
  diffParts: SectionDiffPart[];
}

export interface SectionDiffResult {
  sectionNumber: number;
  title: string;
  changeType: SectionChangeType;
  fromSection: PolicySectionItem | null;
  toSection: PolicySectionItem | null;
  hasChanges: boolean;
  fieldDiffs: FieldDiff[];
}

export interface PolicyDiffResponse {
  policyId: string;
  policyTitle: string;
  documentCode: string;
  fromVersion: PolicyVersionSummary;
  toVersion: PolicyVersionSummary;
  summary: {
    totalSections: number;
    addedSections: number;
    removedSections: number;
    modifiedSections: number;
    unchangedSections: number;
    totalFieldChanges: number;
  };
  sections: SectionDiffResult[];
}

