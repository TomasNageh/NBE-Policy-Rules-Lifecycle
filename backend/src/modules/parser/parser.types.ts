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
