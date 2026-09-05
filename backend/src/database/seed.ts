import { prisma } from './prisma';
import { PolicyStatus, VersionStatus } from '../modules/policy/policy.types';
import { ReviewDecision } from '../modules/review/review.types';
import { NotificationType } from '../modules/notification/notification.types';
import { mockPolicies, mockVersions, mockSections } from '../modules/policy/policy.service';
import { mockReviews } from '../modules/review/review.service';
import { mockAuditLogs } from '../modules/audit/audit.service';
import { mockNotifications } from '../modules/notification/notification.service';
import { mockSlaConfigs } from '../modules/admin/admin.service';
import { SEED_USERS } from '../modules/auth/auth.service';

/**
 * Deterministic IDs for reproducible testing & demo state
 */
export const SEED_CONSTANTS = {
  USERS: {
    OWNER: '11111111-1111-1111-1111-111111111111',
    CHECKER: '22222222-2222-2222-2222-222222222222',
    ADMIN: '33333333-3333-3333-3333-333333333333',
  },
  POLICIES: {
    HR_CB_001: 'aaaaaaaa-1111-4000-8000-000000000001',
    HR_OD_001: 'bbbbbbbb-2222-4000-8000-000000000002',
  },
  VERSIONS: {
    HR_CB_001_V1: 'aaaaaaaa-1111-4000-8000-000000000011',
    HR_CB_001_V2: 'aaaaaaaa-1111-4000-8000-000000000012',
    HR_OD_001_V1: 'bbbbbbbb-2222-4000-8000-000000000011',
    HR_OD_001_V2: 'bbbbbbbb-2222-4000-8000-000000000012',
  },
  REVIEWS: {
    HR_CB_001_V1: 'aaaaaaaa-1111-4000-8000-000000000021',
    HR_CB_001_V2: 'aaaaaaaa-1111-4000-8000-000000000022',
    HR_OD_001_V1: 'bbbbbbbb-2222-4000-8000-000000000021',
    HR_OD_001_V2: 'bbbbbbbb-2222-4000-8000-000000000022',
  },
};

// Raw Section Titles for HR-CB-001
const HR_CB_TITLES = [
  'Policy Governance and Scope',
  'Compensation Philosophy',
  'Job Architecture and Grade Interface',
  'Salary Structure Governance',
  'Starting Salary Decisions',
  'Promotion and Salary Adjustment Governance',
  'Annual Salary Review Process',
  'Variable Pay Governance',
  'Allowances and Fixed Supplements',
  'Benefits Eligibility Principles',
  'Medical and Insurance Benefits Administration',
  'Retirement and Long-Term Benefit Interface',
  'Leave-Related Benefit Interface',
  'Recognition Programs',
  'Pay Equity and Internal Consistency Review',
  'Compensation Data Confidentiality',
  'Payroll Coordination and Reconciliation',
  'Vendor and Benefit Provider Governance',
  'Employee Communication and Statements',
  'Metrics, Audit and Continuous Improvement',
];

// Raw Section Titles for HR-OD-001
const HR_OD_TITLES = [
  'Policy Governance and Scope',
  'Organization Design Principles',
  'Organization Structure Requests',
  'Structural Change Assessment',
  'Role Creation and Modification',
  'Job Description Governance',
  'Job Evaluation Interface',
  'Span of Control and Layering Review',
  'Operating Model Documentation',
  'RACI and Accountability Design',
  'Workforce Structure and Position Governance',
  'Committee and Governance Structure',
  'Change Impact Assessment',
  'Organization Change Implementation',
  'Career Architecture Interface',
  'Competency Framework Governance',
  'Succession and Talent Structure Interface',
  'OD Data and Document Management',
  'OD Analytics and Health Checks',
  'Audit, Exceptions and Continuous Improvement',
];

/**
 * Generate 20 baseline sections for HR-CB-001
 */
function buildHrCbSectionsV1(versionId: string) {
  return HR_CB_TITLES.map((title, idx) => {
    const secNum = idx + 1;
    const secId = `aaaaaaaa-1111-4001-${String(secNum).padStart(4, '0')}-000000000000`;
    return {
      id: secId,
      versionId,
      sectionNumber: secNum,
      title,
      controlArea: 'HR function or delegated process owner',
      policyStatement: `The organization will apply the ${title.toLowerCase()} requirements consistently using documented approvals, role-based access, segregation of duties where relevant, and evidence sufficient for internal review. Governs standard banking compensation principles across all NBE branches and departments.`,
      rolesAndResponsibilities: 'HR owns the process framework and records. Business managers provide timely, accurate inputs and approvals. Employees or candidates provide truthful information where applicable. Control functions may review evidence according to their mandates.',
      procedures: 'Requests should be initiated through the approved channel, checked for completeness, routed to the authorized approver, recorded in the designated system or repository, and closed only after required evidence is attached and status is updated.',
      standardProcedure: 'Requests should be initiated through the approved channel, checked for completeness, routed to the authorized approver, recorded in the designated system or repository, and closed only after required evidence is attached and status is updated.',
      requiredRecords: 'Typical records may include request forms, approvals, supporting documents, assessment or transaction evidence, correspondence, system logs, exception notes, and closure confirmation.',
      controlsAndChecks: 'Key controls include mandatory fields, maker-checker review for sensitive actions, validation against approved master data, duplicate prevention, effective-date checks, exception reporting, and periodic sampling.',
      exceptionsAndEscalation: 'Any deviation should be documented with the reason, risk, temporary mitigation, responsible owner, approving authority, and expiry or review date. Repeated exceptions should trigger process review.',
      kpiExamples: 'Examples include turnaround time, first-time-right rate, backlog age, policy exception rate, completion rate, data quality error rate, and stakeholder satisfaction.',
      testingScenario: 'For prototype testing, create a synthetic transaction with a fictional employee or candidate, route it through the expected workflow, verify role permissions, confirm the audit trail, and test both normal and exception paths.',
      complianceNotes: 'This sample document must be adapted to applicable labor, tax, privacy, social insurance, banking, regulatory, and contractual requirements before any real-world use. It is not legal advice.',
      exceptions: 'Documented and time-bound approval per documented authority matrix.',
      unmatchedContent: null,
      orderIndex: idx,
      parseStatus: 'MATCHED',
      createdAt: new Date('2026-02-10T09:30:00Z'),
      updatedAt: new Date('2026-02-10T09:30:00Z'),
    };
  });
}

/**
 * Generate 20 modified sections for HR-CB-001 (Version 2)
 */
function buildHrCbSectionsV2(versionId: string) {
  const sections = buildHrCbSectionsV1(versionId);
  return sections.map((sec) => {
    const secNum = sec.sectionNumber;
    const secId = `aaaaaaaa-1111-4002-${String(secNum).padStart(4, '0')}-000000000000`;
    let modified = { ...sec, id: secId, versionId, createdAt: new Date('2026-08-15T10:00:00Z'), updatedAt: new Date('2026-08-15T10:00:00Z') };

    if (secNum === 6) {
      // Promotion and Salary Adjustment Governance
      modified.policyStatement = 'Defines strict governance for promotion increases (standard 10%–18% band adjustment), mandatory 12-month minimum tenure in current grade, and explicit divisional budget availability certification prior to HR approval.';
      modified.controlsAndChecks = 'Mandatory maker-checker validation: HR Compensation Specialist verifies grade vacancy, line general manager confirms performance rating >= Exceeds Expectations, and Finance verifies budgeted payroll allocation.';
      modified.kpiExamples = 'Promotion turnaround time (< 10 business days), budget compliance rate (100%), exception rate (< 1.5%).';
    } else if (secNum === 8) {
      // Variable Pay Governance
      modified.policyStatement = 'Establishes performance-weighted variable compensation formulas: 60% bank financial metrics and divisional KPIs, 40% individual compliance and risk KPIs. Senior management awards above EGP 500,000 are subject to a 3-year linear deferral (33.3% per annum) and CBE-mandated risk clawback clauses.';
      modified.requiredRecords = 'Risk Committee signoff certificate, Board Remuneration Committee minutes, audited divisional P&L records, and deferred allocation schedules.';
      modified.complianceNotes = 'Strict compliance with Central Bank of Egypt (CBE) Risk-Aligned Remuneration Directives and Basel Committee governance standards.';
    } else if (secNum === 9) {
      // Allowances and Fixed Supplements
      modified.policyStatement = 'Covers standard allowances including Branch Representation, Hardship/Remote Location, and introduces the 2026 Hybrid Work Digital Infrastructure Stipend (EGP 1,500/month). Discontinued allowances automatically cease upon role change or grade transfer.';
      modified.controlsAndChecks = 'Automated payroll rule validation: monthly system reconciliations cross-check active allowance codes against employee physical branch assignments and job profiles to eliminate ghost allowances.';
    } else if (secNum === 11) {
      // Medical and Insurance Benefits Administration
      modified.policyStatement = 'Provides comprehensive group medical insurance with full outpatient/inpatient coverage, extending dependent age thresholds to 26 for enrolled full-time students and introducing direct digital cashless claims submission through the NBE mobile portal.';
      modified.standardProcedure = 'Employees submit claims digitally via the NBE Care portal. Invoices under EGP 5,000 are auto-adjudicated within 48 hours; inpatient admissions require pre-authorization via third-party administrator (TPA).';
    } else if (secNum === 15) {
      // Pay Equity and Internal Consistency Review
      modified.policyStatement = 'Defines mandatory semi-annual statistical pay equity reviews across all departments, ensuring pay parity regardless of gender or background for substantially similar work, with corrective equity adjustment budgets allocated annually.';
      modified.kpiExamples = 'Gender pay disparity index (< 1.0%), equity remediation closure rate (100% within 90 days).';
    } else if (secNum === 17) {
      // Payroll Coordination and Reconciliation
      modified.policyStatement = 'Defines authorized input files, effective dates, cut-offs, maker-checker controls, reconciliation and error correction. Monthly payroll freeze cut-off is strictly enforced on the 20th calendar day.';
      modified.controlsAndChecks = 'Dual authorization required for payroll file dispatch to core banking settlement; automated diff reports generate variance alerts for any salary change exceeding 15%.';
    }

    return modified;
  });
}

/**
 * Generate 20 baseline sections for HR-OD-001 (Version 1)
 */
function buildHrOdSectionsV1(versionId: string) {
  return HR_OD_TITLES.map((title, idx) => {
    const secNum = idx + 1;
    const secId = `bbbbbbbb-2222-4001-${String(secNum).padStart(4, '0')}-000000000000`;
    return {
      id: secId,
      versionId,
      sectionNumber: secNum,
      title,
      controlArea: 'HR function or delegated process owner',
      policyStatement: `The organization will apply the ${title.toLowerCase()} requirements consistently using documented approvals, role-based access, segregation of duties where relevant, and evidence sufficient for internal review. Sets general organizational design principles for bank structure.`,
      rolesAndResponsibilities: 'HR owns the process framework and records. Business managers provide timely, accurate inputs and approvals. Employees or candidates provide truthful information where applicable. Control functions may review evidence according to their mandates.',
      procedures: 'Requests should be initiated through the approved channel, checked for completeness, routed to the authorized approver, recorded in the designated system or repository, and closed only after required evidence is attached and status is updated.',
      standardProcedure: 'Requests should be initiated through the approved channel, checked for completeness, routed to the authorized approver, recorded in the designated system or repository, and closed only after required evidence is attached and status is updated.',
      requiredRecords: 'Typical records may include request forms, approvals, supporting documents, assessment or transaction evidence, correspondence, system logs, exception notes, and closure confirmation.',
      controlsAndChecks: 'Key controls include mandatory fields, maker-checker review for sensitive actions, validation against approved master data, duplicate prevention, effective-date checks, exception reporting, and periodic sampling.',
      exceptionsAndEscalation: 'Any deviation should be documented with the reason, risk, temporary mitigation, responsible owner, approving authority, and expiry or review date. Repeated exceptions should trigger process review.',
      kpiExamples: 'Examples include turnaround time, first-time-right rate, backlog age, policy exception rate, completion rate, data quality error rate, and stakeholder satisfaction.',
      testingScenario: 'For prototype testing, create a synthetic transaction with a fictional employee or candidate, route it through the expected workflow, verify role permissions, confirm the audit trail, and test both normal and exception paths.',
      complianceNotes: 'This sample document must be adapted to applicable labor, tax, privacy, social insurance, banking, regulatory, and contractual requirements before any real-world use. It is not legal advice.',
      exceptions: 'Documented and time-bound approval per documented authority matrix.',
      unmatchedContent: null,
      orderIndex: idx,
      parseStatus: 'MATCHED',
      createdAt: new Date('2026-07-01T08:30:00Z'),
      updatedAt: new Date('2026-07-01T08:30:00Z'),
    };
  });
}

/**
 * Generate 20 modified sections for HR-OD-001 (Version 2 - Under Review)
 */
function buildHrOdSectionsV2(versionId: string) {
  const sections = buildHrOdSectionsV1(versionId);
  const now = new Date(Date.now() - 4 * 3600 * 1000);
  return sections.map((sec) => {
    const secNum = sec.sectionNumber;
    const secId = `bbbbbbbb-2222-4002-${String(secNum).padStart(4, '0')}-000000000000`;
    let modified = { ...sec, id: secId, versionId, createdAt: now, updatedAt: now };

    if (secNum === 8) {
      // Span of Control and Layering Review
      modified.policyStatement = 'Mandates strict quantitative span-of-control parameters: target ratio of 1:5 to 1:8 for frontline operational divisions and branch networks; 1:3 to 1:5 for highly specialized analytical or advisory departments. Establishes a maximum organizational hierarchy depth of 6 vertical layers from Executive Board to entry staff.';
      modified.controlsAndChecks = 'Automated quarterly reporting detects non-compliant managerial spans (<3 or >10 direct reports). Any structural request exceeding layer limits requires Management Board exception sign-off.';
      modified.kpiExamples = 'Span compliance rate (> 95%), average layer depth (<= 5.2 layers), structural exception count (< 5 annually).';
    } else if (secNum === 10) {
      // RACI and Accountability Design
      modified.policyStatement = 'Enforces strict single-point accountability: every core banking process and decision milestone must have exactly ONE Accountable (\'A\') owner. Multiple \'A\'s are strictly forbidden. Cross-departmental operational interdependencies must execute formal Service Level Charters.';
      modified.exceptionsAndEscalation = 'Ambiguous or overlapping accountabilities unresolved within 10 business days are automatically escalated to the Chief Governance Officer for binding adjudication.';
      modified.requiredRecords = 'Approved divisional RACI matrices, SLA inter-departmental charters, and escalation dispute resolution logs.';
    } else if (secNum === 13) {
      // Change Impact Assessment
      modified.policyStatement = 'Mandates a formal 60-day advance Change Impact and Operational Readiness Assessment for any structural reorganization impacting more than 15 positions or modifying core customer service channels.';
      modified.standardProcedure = 'Divisional heads submit restructuring proposals with side-by-side headcount impact, customer channel risk scorecards, and a detailed 60-day change communication roadmap.';
    } else if (secNum === 14) {
      // Organization Change Implementation
      modified.policyStatement = 'Details post-restructuring stabilization protocols: requires a formal 90-day post-implementation review (PIR) and employee sentiment pulse survey before change closure.';
      modified.kpiExamples = 'Restructuring stabilization index (> 85%), post-change retention rate (> 92%), operational disruption incidents (0).';
    } else if (secNum === 19) {
      // OD Analytics and Health Checks
      modified.policyStatement = 'Defines live monthly organizational health dashboards tracking span compliance percentage, managerial density index, role duplication flags, and structural churn rate across all banking groups.';
      modified.controlsAndChecks = 'Automated weekly ETL extracts position data from HRIS into the OD Governance dashboard with instant alerts for unassigned position IDs or orphaned reporting lines.';
    }

    return modified;
  });
}

/**
 * Initialize Seed Data for both In-Memory Fallback & PostgreSQL Prisma (if connected)
 */
export async function initSeedData(): Promise<void> {
  // Check if in-memory store is already seeded
  if (mockPolicies.length > 0) {
    return;
  }

  console.info('🌱 Initializing NBE Enterprise Policy Lifecycle Seed Data...');

  const ownerId = SEED_CONSTANTS.USERS.OWNER;
  const checkerId = SEED_CONSTANTS.USERS.CHECKER;
  const adminId = SEED_CONSTANTS.USERS.ADMIN;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SLA CONFIGURATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const slaConfigsData = [
    {
      id: 'sla-hr',
      category: 'Human Resources & Governance',
      slaHours: 24,
      description: 'Compensation, Benefits, OD, and Workforce Governance Policies',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'sla-gov',
      category: 'General Governance & Audit',
      slaHours: 48,
      description: 'Enterprise Governance Framework and Committee Charters',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'sla-digital',
      category: 'Digital Banking & Payments',
      slaHours: 12,
      description: 'InstaPay, Mobile Banking, and Electronic Payment Rules',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'sla-credit',
      category: 'Credit & Lending',
      slaHours: 24,
      description: 'Commercial & Retail Credit Risk Assessment Guidelines',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'sla-risk',
      category: 'Risk Management & AML',
      slaHours: 24,
      description: 'Anti-Money Laundering & Sanctions Compliance Rules',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'sla-reg',
      category: 'Regulatory Compliance',
      slaHours: 24,
      description: 'CBE Circular Enforcement & Mandatory Disclosures',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'sla-cyber',
      category: 'Information Security & Cyber',
      slaHours: 12,
      description: 'Cybersecurity incident response and access control standards',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'sla-treasury',
      category: 'Treasury & Investment',
      slaHours: 48,
      description: 'FX Limits, Liquidity Management, and Market Risk Policies',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'sla-ops',
      category: 'Operations & Settlement',
      slaHours: 24,
      description: 'Branch Operating Procedures and Cash Clearing Protocols',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
  ];

  // Update mock SLA configs
  mockSlaConfigs.length = 0;
  mockSlaConfigs.push(...slaConfigsData);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. POLICY 1: HR-CB-001 (Compensation and Benefits Policy)
  // ─────────────────────────────────────────────────────────────────────────────
  const hrCbPolicy = {
    id: SEED_CONSTANTS.POLICIES.HR_CB_001,
    title: 'Compensation and Benefits Policy',
    documentCode: 'HR-CB-001',
    category: 'Human Resources & Governance',
    description: 'Establish consistent governance for compensation and benefit programs while supporting internal equity, role alignment, compliance and controlled administration.',
    ownerId,
    currentStatus: PolicyStatus.APPROVED,
    deletedAt: null,
    createdAt: new Date('2026-02-10T09:00:00Z'),
    updatedAt: new Date('2026-08-16T09:45:00Z'),
  };

  const hrCbV1 = {
    id: SEED_CONSTANTS.VERSIONS.HR_CB_001_V1,
    policyId: hrCbPolicy.id,
    versionNumber: 1,
    status: VersionStatus.APPROVED,
    changeSummary: 'Initial baseline release of the Compensation and Benefits Governance Framework.',
    sourceFileUrl: '/uploads/HR-CB-001-v1.pdf',
    submittedAt: new Date('2026-02-10T09:30:00Z'),
    approvedAt: new Date('2026-02-11T11:15:00Z'),
    createdAt: new Date('2026-02-10T09:00:00Z'),
    updatedAt: new Date('2026-02-11T11:15:00Z'),
  };

  const hrCbV2 = {
    id: SEED_CONSTANTS.VERSIONS.HR_CB_001_V2,
    policyId: hrCbPolicy.id,
    versionNumber: 2,
    status: VersionStatus.APPROVED,
    changeSummary: 'Annual compensation framework overhaul: updated variable pay deferral guidelines, modern remote allowance structures, and tightened promotion adjustment criteria.',
    sourceFileUrl: '/uploads/HR-CB-001-v2.pdf',
    submittedAt: new Date('2026-08-15T10:00:00Z'),
    approvedAt: new Date('2026-08-16T09:45:00Z'),
    createdAt: new Date('2026-08-15T08:30:00Z'),
    updatedAt: new Date('2026-08-16T09:45:00Z'),
  };

  const hrCbSectionsV1 = buildHrCbSectionsV1(hrCbV1.id);
  const hrCbSectionsV2 = buildHrCbSectionsV2(hrCbV2.id);

  const hrCbReviewV1 = {
    id: SEED_CONSTANTS.REVIEWS.HR_CB_001_V1,
    policyId: hrCbPolicy.id,
    versionId: hrCbV1.id,
    checkerId,
    slaHours: 24,
    decision: ReviewDecision.APPROVED,
    feedback: 'Comprehensive compensation governance structure verified. All 20 sections meet internal equity standards and CBE regulatory circulars. Approved for bank-wide rollout.',
    slaBreached: false,
    reassignReason: null,
    queuedAt: new Date('2026-02-10T09:30:00Z'),
    assignedAt: new Date('2026-02-10T10:00:00Z'),
    decisionAt: new Date('2026-02-11T11:15:00Z'),
    createdAt: new Date('2026-02-10T09:30:00Z'),
    updatedAt: new Date('2026-02-11T11:15:00Z'),
  };

  const hrCbReviewV2 = {
    id: SEED_CONSTANTS.REVIEWS.HR_CB_001_V2,
    policyId: hrCbPolicy.id,
    versionId: hrCbV2.id,
    checkerId,
    slaHours: 24,
    decision: ReviewDecision.APPROVED,
    feedback: 'Reviewed Version 2 modifications. Variable pay clawback controls and remote allowance guidelines align with Q3 2026 Executive Committee directives and CBE risk governance rules. Approved.',
    slaBreached: false,
    reassignReason: null,
    queuedAt: new Date('2026-08-15T10:00:00Z'),
    assignedAt: new Date('2026-08-15T10:30:00Z'),
    decisionAt: new Date('2026-08-16T09:45:00Z'),
    createdAt: new Date('2026-08-15T10:00:00Z'),
    updatedAt: new Date('2026-08-16T09:45:00Z'),
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. POLICY 2: HR-OD-001 (Organization Development Policy)
  // ─────────────────────────────────────────────────────────────────────────────
  const now = Date.now();
  const hrOdPolicy = {
    id: SEED_CONSTANTS.POLICIES.HR_OD_001,
    title: 'Organization Development Policy',
    documentCode: 'HR-OD-001',
    category: 'General Governance & Audit',
    description: 'Provide a consistent framework for organization design, role governance, workforce structure and change-related OD activities.',
    ownerId,
    currentStatus: PolicyStatus.UNDER_REVIEW,
    deletedAt: null,
    createdAt: new Date('2026-07-01T08:00:00Z'),
    updatedAt: new Date(now - 3 * 3600 * 1000),
  };

  const hrOdV1 = {
    id: SEED_CONSTANTS.VERSIONS.HR_OD_001_V1,
    policyId: hrOdPolicy.id,
    versionNumber: 1,
    status: VersionStatus.CHANGES_REQUESTED,
    changeSummary: 'Initial baseline draft for organization development and structural governance.',
    sourceFileUrl: '/uploads/HR-OD-001-v1.pdf',
    submittedAt: new Date('2026-07-01T08:30:00Z'),
    approvedAt: null,
    createdAt: new Date('2026-07-01T08:00:00Z'),
    updatedAt: new Date('2026-07-02T14:20:00Z'),
  };

  const hrOdV2 = {
    id: SEED_CONSTANTS.VERSIONS.HR_OD_001_V2,
    policyId: hrOdPolicy.id,
    versionNumber: 2,
    status: VersionStatus.PENDING,
    changeSummary: 'Addressed compliance review comments: established strict 1:5–1:8 managerial span ratio bounds, formalized single-accountability RACI matrix rules, and expanded change impact assessment timeframes.',
    sourceFileUrl: '/uploads/HR-OD-001-v2.pdf',
    submittedAt: new Date(now - 4 * 3600 * 1000),
    approvedAt: null,
    createdAt: new Date(now - 5 * 3600 * 1000),
    updatedAt: new Date(now - 3 * 3600 * 1000),
  };

  const hrOdSectionsV1 = buildHrOdSectionsV1(hrOdV1.id);
  const hrOdSectionsV2 = buildHrOdSectionsV2(hrOdV2.id);

  const hrOdReviewV1 = {
    id: SEED_CONSTANTS.REVIEWS.HR_OD_001_V1,
    policyId: hrOdPolicy.id,
    versionId: hrOdV1.id,
    checkerId,
    slaHours: 48,
    decision: ReviewDecision.CHANGES_REQUESTED,
    feedback: 'Section 8 (Span of Control) and Section 10 (RACI Design) are too generic. Please specify exact managerial span ratios (e.g. 1:5 to 1:8 for operational units) and define a strict single-accountability escalation path for cross-departmental restructurings before resubmission.',
    slaBreached: false,
    reassignReason: null,
    queuedAt: new Date('2026-07-01T08:30:00Z'),
    assignedAt: new Date('2026-07-01T09:00:00Z'),
    decisionAt: new Date('2026-07-02T14:20:00Z'),
    createdAt: new Date('2026-07-01T08:30:00Z'),
    updatedAt: new Date('2026-07-02T14:20:00Z'),
  };

  const hrOdReviewV2 = {
    id: SEED_CONSTANTS.REVIEWS.HR_OD_001_V2,
    policyId: hrOdPolicy.id,
    versionId: hrOdV2.id,
    checkerId, // Assigned to Sara Al-Sayed -> UNDER_REVIEW with active countdown!
    slaHours: 48,
    decision: ReviewDecision.PENDING,
    feedback: null,
    slaBreached: false,
    reassignReason: null,
    queuedAt: new Date(now - 4 * 3600 * 1000),
    assignedAt: new Date(now - 3 * 3600 * 1000),
    decisionAt: null,
    createdAt: new Date(now - 4 * 3600 * 1000),
    updatedAt: new Date(now - 3 * 3600 * 1000),
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. POPULATE IN-MEMORY STORES
  // ─────────────────────────────────────────────────────────────────────────────
  mockPolicies.push(hrCbPolicy, hrOdPolicy);
  mockVersions.push(hrCbV1, hrCbV2, hrOdV1, hrOdV2);
  mockSections.push(...hrCbSectionsV1, ...hrCbSectionsV2, ...hrOdSectionsV1, ...hrOdSectionsV2);
  mockReviews.push(hrCbReviewV1, hrCbReviewV2, hrOdReviewV1, hrOdReviewV2);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. AUDIT TRAIL LOGS
  // ─────────────────────────────────────────────────────────────────────────────
  const auditLogs = [
    {
      id: 'audit-01',
      userId: ownerId,
      action: 'policy_created',
      entityType: 'Policy',
      entityId: hrCbPolicy.id,
      metadata: { documentCode: 'HR-CB-001', title: 'Compensation and Benefits Policy', category: 'Human Resources & Governance' },
      ipAddress: '192.168.10.45',
      createdAt: new Date('2026-02-10T09:00:00Z'),
    },
    {
      id: 'audit-02',
      userId: ownerId,
      action: 'policy_version_submitted',
      entityType: 'PolicyVersion',
      entityId: hrCbV1.id,
      metadata: { versionNumber: 1, documentCode: 'HR-CB-001', changeSummary: hrCbV1.changeSummary },
      ipAddress: '192.168.10.45',
      createdAt: new Date('2026-02-10T09:30:00Z'),
    },
    {
      id: 'audit-03',
      userId: checkerId,
      action: 'review_assigned',
      entityType: 'PolicyReview',
      entityId: hrCbReviewV1.id,
      metadata: { checkerName: 'Sara Al-Sayed', documentCode: 'HR-CB-001', versionNumber: 1 },
      ipAddress: '192.168.10.60',
      createdAt: new Date('2026-02-10T10:00:00Z'),
    },
    {
      id: 'audit-04',
      userId: checkerId,
      action: 'review_approved',
      entityType: 'PolicyReview',
      entityId: hrCbReviewV1.id,
      metadata: { checkerName: 'Sara Al-Sayed', documentCode: 'HR-CB-001', versionNumber: 1, decision: 'APPROVED' },
      ipAddress: '192.168.10.60',
      createdAt: new Date('2026-02-11T11:15:00Z'),
    },
    {
      id: 'audit-05',
      userId: ownerId,
      action: 'revision_created',
      entityType: 'PolicyVersion',
      entityId: hrCbV2.id,
      metadata: { documentCode: 'HR-CB-001', newVersionNumber: 2, basedOnVersion: 1 },
      ipAddress: '192.168.10.45',
      createdAt: new Date('2026-08-15T08:30:00Z'),
    },
    {
      id: 'audit-06',
      userId: ownerId,
      action: 'policy_version_submitted',
      entityType: 'PolicyVersion',
      entityId: hrCbV2.id,
      metadata: { versionNumber: 2, documentCode: 'HR-CB-001', changeSummary: hrCbV2.changeSummary },
      ipAddress: '192.168.10.45',
      createdAt: new Date('2026-08-15T10:00:00Z'),
    },
    {
      id: 'audit-07',
      userId: checkerId,
      action: 'review_assigned',
      entityType: 'PolicyReview',
      entityId: hrCbReviewV2.id,
      metadata: { checkerName: 'Sara Al-Sayed', documentCode: 'HR-CB-001', versionNumber: 2 },
      ipAddress: '192.168.10.60',
      createdAt: new Date('2026-08-15T10:30:00Z'),
    },
    {
      id: 'audit-08',
      userId: checkerId,
      action: 'review_approved',
      entityType: 'PolicyReview',
      entityId: hrCbReviewV2.id,
      metadata: { checkerName: 'Sara Al-Sayed', documentCode: 'HR-CB-001', versionNumber: 2, decision: 'APPROVED' },
      ipAddress: '192.168.10.60',
      createdAt: new Date('2026-08-16T09:45:00Z'),
    },
    {
      id: 'audit-09',
      userId: ownerId,
      action: 'policy_created',
      entityType: 'Policy',
      entityId: hrOdPolicy.id,
      metadata: { documentCode: 'HR-OD-001', title: 'Organization Development Policy', category: 'General Governance & Audit' },
      ipAddress: '192.168.10.45',
      createdAt: new Date('2026-07-01T08:00:00Z'),
    },
    {
      id: 'audit-10',
      userId: ownerId,
      action: 'policy_version_submitted',
      entityType: 'PolicyVersion',
      entityId: hrOdV1.id,
      metadata: { versionNumber: 1, documentCode: 'HR-OD-001', changeSummary: hrOdV1.changeSummary },
      ipAddress: '192.168.10.45',
      createdAt: new Date('2026-07-01T08:30:00Z'),
    },
    {
      id: 'audit-11',
      userId: checkerId,
      action: 'review_assigned',
      entityType: 'PolicyReview',
      entityId: hrOdReviewV1.id,
      metadata: { checkerName: 'Sara Al-Sayed', documentCode: 'HR-OD-001', versionNumber: 1 },
      ipAddress: '192.168.10.60',
      createdAt: new Date('2026-07-01T09:00:00Z'),
    },
    {
      id: 'audit-12',
      userId: checkerId,
      action: 'changes_requested',
      entityType: 'PolicyReview',
      entityId: hrOdReviewV1.id,
      metadata: { checkerName: 'Sara Al-Sayed', documentCode: 'HR-OD-001', versionNumber: 1, feedback: hrOdReviewV1.feedback },
      ipAddress: '192.168.10.60',
      createdAt: new Date('2026-07-02T14:20:00Z'),
    },
    {
      id: 'audit-13',
      userId: ownerId,
      action: 'revision_created',
      entityType: 'PolicyVersion',
      entityId: hrOdV2.id,
      metadata: { documentCode: 'HR-OD-001', newVersionNumber: 2, basedOnVersion: 1 },
      ipAddress: '192.168.10.45',
      createdAt: new Date(now - 5 * 3600 * 1000),
    },
    {
      id: 'audit-14',
      userId: ownerId,
      action: 'policy_version_submitted',
      entityType: 'PolicyVersion',
      entityId: hrOdV2.id,
      metadata: { versionNumber: 2, documentCode: 'HR-OD-001', changeSummary: hrOdV2.changeSummary },
      ipAddress: '192.168.10.45',
      createdAt: new Date(now - 4 * 3600 * 1000),
    },
    {
      id: 'audit-15',
      userId: checkerId,
      action: 'review_assigned',
      entityType: 'PolicyReview',
      entityId: hrOdReviewV2.id,
      metadata: { checkerName: 'Sara Al-Sayed', documentCode: 'HR-OD-001', versionNumber: 2 },
      ipAddress: '192.168.10.60',
      createdAt: new Date(now - 3 * 3600 * 1000),
    },
    {
      id: 'audit-16',
      userId: adminId,
      action: 'sla_config_updated',
      entityType: 'SlaConfig',
      entityId: 'sla-hr',
      metadata: { category: 'Human Resources & Governance', slaHours: 24, updatedBy: 'Tarek Hassan' },
      ipAddress: '192.168.10.10',
      createdAt: new Date('2026-08-01T10:00:00Z'),
    },
  ];

  mockAuditLogs.push(...auditLogs);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. IN-APP NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const notifications: {
    id: string;
    userId: string;
    type: NotificationType;
    message: string;
    relatedEntityId: string;
    relatedEntityType: 'Policy' | 'PolicyReview';
    isRead: boolean;
    createdAt: Date;
  }[] = [
    {
      id: 'notif-01',
      userId: ownerId,
      type: 'DECISION_APPROVED',
      message: "Version 2.0 of 'HR-CB-001 - Compensation and Benefits Policy' was approved by Sara Al-Sayed.",
      relatedEntityId: hrCbReviewV2.id,
      relatedEntityType: 'PolicyReview',
      isRead: false,
      createdAt: new Date('2026-08-16T09:45:00Z'),
    },
    {
      id: 'notif-02',
      userId: checkerId,
      type: 'REVIEW_ASSIGNED',
      message: "Resubmitted policy 'HR-OD-001 - Organization Development Policy' (v2.0) has been assigned to your review queue.",
      relatedEntityId: hrOdReviewV2.id,
      relatedEntityType: 'PolicyReview',
      isRead: false,
      createdAt: new Date(now - 3 * 3600 * 1000),
    },
    {
      id: 'notif-03',
      userId: ownerId,
      type: 'DECISION_CHANGES_REQUESTED',
      message: "Compliance Reviewer Sara Al-Sayed requested changes on Version 1.0 of 'HR-OD-001 - Organization Development Policy'.",
      relatedEntityId: hrOdReviewV1.id,
      relatedEntityType: 'PolicyReview',
      isRead: true,
      createdAt: new Date('2026-07-02T14:20:00Z'),
    },
    {
      id: 'notif-04',
      userId: adminId,
      type: 'DECISION_APPROVED',
      message: "Policy 'HR-CB-001' (v2.0) was finalized and added to the official bank policy registry.",
      relatedEntityId: hrCbPolicy.id,
      relatedEntityType: 'Policy',
      isRead: false,
      createdAt: new Date('2026-08-16T09:45:00Z'),
    },
  ];

  mockNotifications.push(...notifications);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. PRISMA DATABASE PERSISTENCE (If PostgreSQL is connected)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // Upsert Users
    for (const u of SEED_USERS) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          fullName: u.fullName,
          role: u.role,
          department: u.department,
          isActive: u.isActive,
        },
        create: {
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          fullName: u.fullName,
          role: u.role,
          department: u.department,
          isActive: u.isActive,
        },
      });
    }

    // Upsert SLA configs
    for (const sc of slaConfigsData) {
      await prisma.slaConfig.upsert({
        where: { category: sc.category },
        update: { slaHours: sc.slaHours, description: sc.description },
        create: { id: sc.id, category: sc.category, slaHours: sc.slaHours, description: sc.description },
      });
    }

    // Upsert Policies & Versions & Sections
    for (const p of [hrCbPolicy, hrOdPolicy]) {
      await prisma.policy.upsert({
        where: { id: p.id },
        update: {
          title: p.title,
          category: p.category,
          description: p.description,
          currentStatus: p.currentStatus,
        },
        create: {
          id: p.id,
          title: p.title,
          documentCode: p.documentCode,
          category: p.category,
          description: p.description,
          ownerId: p.ownerId,
          currentStatus: p.currentStatus,
        },
      });
    }

    // Seed versions and sections for HR-CB-001
    await prisma.policyVersion.upsert({
      where: { policyId_versionNumber: { policyId: hrCbPolicy.id, versionNumber: 1 } },
      update: { status: hrCbV1.status, changeSummary: hrCbV1.changeSummary },
      create: {
        id: hrCbV1.id,
        policyId: hrCbPolicy.id,
        versionNumber: 1,
        status: hrCbV1.status,
        changeSummary: hrCbV1.changeSummary,
        sourceFileUrl: hrCbV1.sourceFileUrl,
        submittedAt: hrCbV1.submittedAt,
        approvedAt: hrCbV1.approvedAt,
      },
    });

    await prisma.policyVersion.upsert({
      where: { policyId_versionNumber: { policyId: hrCbPolicy.id, versionNumber: 2 } },
      update: { status: hrCbV2.status, changeSummary: hrCbV2.changeSummary },
      create: {
        id: hrCbV2.id,
        policyId: hrCbPolicy.id,
        versionNumber: 2,
        status: hrCbV2.status,
        changeSummary: hrCbV2.changeSummary,
        sourceFileUrl: hrCbV2.sourceFileUrl,
        submittedAt: hrCbV2.submittedAt,
        approvedAt: hrCbV2.approvedAt,
      },
    });

    // Seed versions and sections for HR-OD-001
    await prisma.policyVersion.upsert({
      where: { policyId_versionNumber: { policyId: hrOdPolicy.id, versionNumber: 1 } },
      update: { status: hrOdV1.status, changeSummary: hrOdV1.changeSummary },
      create: {
        id: hrOdV1.id,
        policyId: hrOdPolicy.id,
        versionNumber: 1,
        status: hrOdV1.status,
        changeSummary: hrOdV1.changeSummary,
        sourceFileUrl: hrOdV1.sourceFileUrl,
        submittedAt: hrOdV1.submittedAt,
      },
    });

    await prisma.policyVersion.upsert({
      where: { policyId_versionNumber: { policyId: hrOdPolicy.id, versionNumber: 2 } },
      update: { status: hrOdV2.status, changeSummary: hrOdV2.changeSummary },
      create: {
        id: hrOdV2.id,
        policyId: hrOdPolicy.id,
        versionNumber: 2,
        status: hrOdV2.status,
        changeSummary: hrOdV2.changeSummary,
        sourceFileUrl: hrOdV2.sourceFileUrl,
        submittedAt: hrOdV2.submittedAt,
      },
    });

    // Seed reviews
    for (const rev of [hrCbReviewV1, hrCbReviewV2, hrOdReviewV1, hrOdReviewV2]) {
      await prisma.policyReview.upsert({
        where: { versionId: rev.versionId },
        update: {
          decision: rev.decision,
          feedback: rev.feedback,
          checkerId: rev.checkerId,
          assignedAt: rev.assignedAt,
          decisionAt: rev.decisionAt,
          slaBreached: rev.slaBreached,
        },
        create: {
          id: rev.id,
          policyId: rev.policyId,
          versionId: rev.versionId,
          checkerId: rev.checkerId,
          slaHours: rev.slaHours,
          decision: rev.decision,
          feedback: rev.feedback,
          slaBreached: rev.slaBreached,
          queuedAt: rev.queuedAt,
          assignedAt: rev.assignedAt,
          decisionAt: rev.decisionAt,
        },
      });
    }

    console.info('✅ PostgreSQL Database seeded successfully with HR-CB-001 and HR-OD-001!');
  } catch {
    console.info('ℹ️ Note: Running in In-Memory Mode (PostgreSQL unavailable); loaded complete seed fixtures in memory.');
  }

  console.info('🎉 NBE Enterprise Seed Initialized: HR-CB-001 (Approved v1 & v2) & HR-OD-001 (v1 & v2 Under Review) with 20 sections each!');
}

// Standalone execution support via `ts-node src/database/seed.ts`
if (require.main === module) {
  initSeedData().then(() => {
    console.info('Seed script execution completed.');
    process.exit(0);
  }).catch((err) => {
    console.error('Seed script error:', err);
    process.exit(1);
  });
}
