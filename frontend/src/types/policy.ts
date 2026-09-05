export type PolicyStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'UNDER_REVIEW'
  | 'APPROVED';

export type VersionStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'CHANGES_REQUESTED';

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
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersionDetail {
  id: string;
  policyId: string;
  versionNumber: number;
  status: VersionStatus;
  changeSummary: string | null;
  sourceFileUrl?: string | null;
  sections: PolicySectionItem[];
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  reviewerFeedbackDate?: string | null;
  reviewerName?: string | null;
  createdAt: string;
  updatedAt: string;
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
  sourceFileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyInput {
  title: string;
  documentCode: string;
  category: string;
  description?: string;
  sourceFileUrl?: string;
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

export interface ParsedSection {
  sectionNumber: number;
  title: string;
  controlArea: string | null;
  policyStatement: string;
  rolesAndResponsibilities: string | null;
  standardProcedure: string | null;
  requiredRecords: string | null;
  controlsAndChecks: string | null;
  exceptionsAndEscalation: string | null;
  kpiExamples: string | null;
  testingScenario: string | null;
  complianceNotes: string | null;
  unmatchedContent: string[];
  parseStatus: 'MATCHED' | 'PARTIAL' | 'UNMATCHED';
  parseWarnings: string[];
}

export interface ParsedPolicyDraft {
  documentCode: string;
  title: string;
  category: string;
  description: string;
  sourceFileUrl: string;
  fileName: string;
  totalPages: number;
  sections: ParsedSection[];
  globalUnmatched: { page?: number; text: string }[];
}

export interface ConfirmUploadInput {
  title: string;
  documentCode: string;
  category: string;
  description?: string;
  sourceFileUrl?: string;
  sections: {
    sectionNumber: number;
    title: string;
    controlArea?: string | null;
    policyStatement: string;
    rolesAndResponsibilities?: string | null;
    standardProcedure?: string | null;
    requiredRecords?: string | null;
    controlsAndChecks?: string | null;
    exceptionsAndEscalation?: string | null;
    kpiExamples?: string | null;
    testingScenario?: string | null;
    complianceNotes?: string | null;
    unmatchedContent?: string | null;
    parseStatus?: string | null;
    orderIndex?: number;
  }[];
}

export interface PolicyVersionSummary {
  id: string;
  policyId: string;
  versionNumber: number;
  status: VersionStatus;
  changeSummary: string | null;
  sourceFileUrl?: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

