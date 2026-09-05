import { prisma } from '../../database/prisma';
import { diffWordsWithSpace } from 'diff';
import { 
  PolicyDetail, 
  PolicySummary, 
  CreatePolicyInput, 
  UpdatePolicyInput, 
  CreateSectionInput, 
  UpdateSectionInput,
  SaveDraftInput,
  PolicyStatus,
  VersionStatus,
  PolicySectionItem,
  PolicyVersionDetail,
  PolicyVersionSummary,
  PolicyDiffResponse,
  SectionDiffResult,
  FieldDiff,
  SectionChangeType,
} from './policy.types';
import { ConfirmUploadInput } from '../parser/parser.types';
import { UserRole } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { ReviewService } from '../review/review.service';
import { AuditService } from '../audit/audit.service';

// In-Memory Storage for Development / Test Isolation
interface MockPolicySection {
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

interface MockPolicyVersion {
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
}

interface MockPolicy {
  id: string;
  title: string;
  documentCode: string;
  category: string;
  description: string | null;
  ownerId: string;
  currentStatus: PolicyStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const mockPolicies: MockPolicy[] = [];
export const mockVersions: MockPolicyVersion[] = [];
export const mockSections: MockPolicySection[] = [];

export class PolicyService {
  /**
   * Helper to create UUID
   */
  private static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Create a new Policy in DRAFT status with Version 1 and initial default section
   */
  public static async createPolicy(
    ownerId: string,
    input: CreatePolicyInput,
  ): Promise<PolicyDetail> {
    if (!input.title?.trim()) {
      const err = new Error('Policy title is required');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    if (!input.documentCode?.trim()) {
      const err = new Error('Document code is required');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    if (!input.category?.trim()) {
      const err = new Error('Category is required');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const documentCode = input.documentCode.trim().toUpperCase();

    // Check duplicate document code in mock store
    const existingMock = mockPolicies.find(
      (p) => p.documentCode === documentCode && !p.deletedAt,
    );
    if (existingMock) {
      const err = new Error(`Document code '${documentCode}' already exists`);
      (err as unknown as { statusCode: number }).statusCode = 409;
      throw err;
    }

    try {
      // 1. Prisma DB Path
      const dbPolicy = await prisma.policy.create({
        data: {
          title: input.title.trim(),
          documentCode,
          category: input.category.trim(),
          description: input.description?.trim() || null,
          ownerId,
          currentStatus: PolicyStatus.DRAFT,
          versions: {
            create: {
              versionNumber: 1,
              status: VersionStatus.DRAFT,
              sourceFileUrl: input.sourceFileUrl || null,
              sections: {
                create: {
                  sectionNumber: 1,
                  title: 'Purpose & Policy Scope',
                  controlArea: 'General Governance',
                  policyStatement: 'Define the core mandate, objective, and applicability of this policy across all NBE divisions.',
                  rolesAndResponsibilities: 'Department Heads and Line Managers are responsible for policy enforcement.',
                  procedures: 'All operations must align with approved operating guidelines.',
                  complianceNotes: 'Compliant with Central Bank of Egypt (CBE) Circulars.',
                  orderIndex: 0,
                  parseStatus: 'MATCHED',
                },
              },
            },
          },
        },
        include: {
          versions: {
            include: {
              sections: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
        },
      });

      const activeVer = dbPolicy.versions[0];

      await AuditService.logAction(
        ownerId,
        'policy_created',
        'Policy',
        dbPolicy.id,
        {
          title: dbPolicy.title,
          documentCode: dbPolicy.documentCode,
          category: dbPolicy.category,
        },
      );

      return {
        id: dbPolicy.id,
        title: dbPolicy.title,
        documentCode: dbPolicy.documentCode,
        category: dbPolicy.category,
        description: dbPolicy.description,
        ownerId: dbPolicy.ownerId,
        currentStatus: dbPolicy.currentStatus,
        activeVersion: {
          id: activeVer.id,
          policyId: activeVer.policyId,
          versionNumber: activeVer.versionNumber,
          status: activeVer.status,
          changeSummary: activeVer.changeSummary,
          sourceFileUrl: activeVer.sourceFileUrl,
          sections: activeVer.sections,
          submittedAt: activeVer.submittedAt,
          approvedAt: activeVer.approvedAt,
          createdAt: activeVer.createdAt,
          updatedAt: activeVer.updatedAt,
        },
        versionsCount: dbPolicy.versions.length,
        sectionsCount: activeVer.sections.length,
        createdAt: dbPolicy.createdAt,
        updatedAt: dbPolicy.updatedAt,
      };
    } catch {
      // 2. In-Memory Mock Store Fallback
    }

    const policyId = this.uuid();
    const versionId = this.uuid();
    const sectionId = this.uuid();
    const now = new Date();

    const newPolicy: MockPolicy = {
      id: policyId,
      title: input.title.trim(),
      documentCode,
      category: input.category.trim(),
      description: input.description?.trim() || null,
      ownerId,
      currentStatus: PolicyStatus.DRAFT,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const newVersion: MockPolicyVersion = {
      id: versionId,
      policyId,
      versionNumber: 1,
      status: VersionStatus.DRAFT,
      changeSummary: 'Initial policy draft',
      sourceFileUrl: input.sourceFileUrl || null,
      submittedAt: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const initialSection: MockPolicySection = {
      id: sectionId,
      versionId,
      sectionNumber: 1,
      title: 'Purpose & Policy Scope',
      controlArea: 'General Governance',
      policyStatement: 'Define the core mandate, objective, and applicability of this policy across all NBE divisions.',
      rolesAndResponsibilities: 'Department Heads and Line Managers are responsible for policy enforcement.',
      procedures: 'All operations must align with approved operating guidelines.',
      complianceNotes: 'Compliant with Central Bank of Egypt (CBE) Circulars.',
      exceptions: 'Departures require prior approval from the Risk Committee.',
      orderIndex: 0,
      parseStatus: 'MATCHED',
      createdAt: now,
      updatedAt: now,
    };

    mockPolicies.push(newPolicy);
    mockVersions.push(newVersion);
    mockSections.push(initialSection);

    await AuditService.logAction(
      ownerId,
      'policy_created',
      'Policy',
      newPolicy.id,
      {
        title: newPolicy.title,
        documentCode: newPolicy.documentCode,
        category: newPolicy.category,
      },
    );

    return {
      id: newPolicy.id,
      title: newPolicy.title,
      documentCode: newPolicy.documentCode,
      category: newPolicy.category,
      description: newPolicy.description,
      ownerId: newPolicy.ownerId,
      currentStatus: newPolicy.currentStatus,
      activeVersion: {
        ...newVersion,
        sections: [initialSection],
      },
      versionsCount: 1,
      sectionsCount: 1,
      createdAt: newPolicy.createdAt,
      updatedAt: newPolicy.updatedAt,
    };
  }

  /**
   * Confirm and commit an uploaded & parsed policy draft into DB
   */
  public static async confirmUploadedPolicy(
    ownerId: string,
    input: ConfirmUploadInput,
  ): Promise<PolicyDetail> {
    if (!input.title?.trim()) {
      const err = new Error('Policy title is required');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    if (!input.documentCode?.trim()) {
      const err = new Error('Document code is required');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const documentCode = input.documentCode.trim().toUpperCase();

    try {
      const dbPolicy = await prisma.policy.create({
        data: {
          title: input.title.trim(),
          documentCode,
          category: input.category.trim() || 'General Governance',
          description: input.description?.trim() || null,
          ownerId,
          currentStatus: PolicyStatus.DRAFT,
          versions: {
            create: [
              {
                versionNumber: 1,
                status: VersionStatus.DRAFT,
                changeSummary: 'Original Uploaded Baseline (v1.0)',
                sourceFileUrl: input.sourceFileUrl || null,
                sections: {
                  create: input.sections.map((sec, idx) => ({
                    sectionNumber: sec.sectionNumber || idx + 1,
                    title: sec.title.trim(),
                    controlArea: sec.controlArea?.trim() || null,
                    policyStatement: sec.policyStatement.trim(),
                    rolesAndResponsibilities: sec.rolesAndResponsibilities?.trim() || null,
                    procedures: sec.standardProcedure?.trim() || null,
                    standardProcedure: sec.standardProcedure?.trim() || null,
                    requiredRecords: sec.requiredRecords?.trim() || null,
                    controlsAndChecks: sec.controlsAndChecks?.trim() || null,
                    exceptionsAndEscalation: sec.exceptionsAndEscalation?.trim() || null,
                    kpiExamples: sec.kpiExamples?.trim() || null,
                    testingScenario: sec.testingScenario?.trim() || null,
                    complianceNotes: sec.complianceNotes?.trim() || null,
                    exceptions: sec.exceptionsAndEscalation?.trim() || null,
                    unmatchedContent: sec.unmatchedContent || null,
                    orderIndex: sec.orderIndex !== undefined ? sec.orderIndex : idx,
                    parseStatus: sec.parseStatus || 'MATCHED',
                  })),
                },
              },
              {
                versionNumber: 2,
                status: VersionStatus.DRAFT,
                changeSummary: 'Author Working Draft (v2.0)',
                sourceFileUrl: input.sourceFileUrl || null,
                sections: {
                  create: input.sections.map((sec, idx) => ({
                    sectionNumber: sec.sectionNumber || idx + 1,
                    title: sec.title.trim(),
                    controlArea: sec.controlArea?.trim() || null,
                    policyStatement: sec.policyStatement.trim(),
                    rolesAndResponsibilities: sec.rolesAndResponsibilities?.trim() || null,
                    procedures: sec.standardProcedure?.trim() || null,
                    standardProcedure: sec.standardProcedure?.trim() || null,
                    requiredRecords: sec.requiredRecords?.trim() || null,
                    controlsAndChecks: sec.controlsAndChecks?.trim() || null,
                    exceptionsAndEscalation: sec.exceptionsAndEscalation?.trim() || null,
                    kpiExamples: sec.kpiExamples?.trim() || null,
                    testingScenario: sec.testingScenario?.trim() || null,
                    complianceNotes: sec.complianceNotes?.trim() || null,
                    exceptions: sec.exceptionsAndEscalation?.trim() || null,
                    unmatchedContent: sec.unmatchedContent || null,
                    orderIndex: sec.orderIndex !== undefined ? sec.orderIndex : idx,
                    parseStatus: sec.parseStatus || 'MATCHED',
                  })),
                },
              },
            ],
          },
        },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: {
              sections: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
        },
      });

      const activeVer = dbPolicy.versions[0]; // v2
      return {
        id: dbPolicy.id,
        title: dbPolicy.title,
        documentCode: dbPolicy.documentCode,
        category: dbPolicy.category,
        description: dbPolicy.description,
        ownerId: dbPolicy.ownerId,
        currentStatus: dbPolicy.currentStatus,
        activeVersion: {
          id: activeVer.id,
          policyId: activeVer.policyId,
          versionNumber: activeVer.versionNumber,
          status: activeVer.status,
          changeSummary: activeVer.changeSummary,
          sourceFileUrl: activeVer.sourceFileUrl,
          sections: activeVer.sections,
          submittedAt: activeVer.submittedAt,
          approvedAt: activeVer.approvedAt,
          createdAt: activeVer.createdAt,
          updatedAt: activeVer.updatedAt,
        },
        versionsCount: dbPolicy.versions.length,
        sectionsCount: activeVer.sections.length,
        createdAt: dbPolicy.createdAt,
        updatedAt: dbPolicy.updatedAt,
      };
    } catch {
      // In-memory fallback
    }

    const policyId = this.uuid();
    const v1Id = this.uuid();
    const v2Id = this.uuid();
    const now = new Date();

    const newPolicy: MockPolicy = {
      id: policyId,
      title: input.title.trim(),
      documentCode,
      category: input.category.trim() || 'General Governance',
      description: input.description?.trim() || null,
      ownerId,
      currentStatus: PolicyStatus.DRAFT,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const v1Version: MockPolicyVersion = {
      id: v1Id,
      policyId,
      versionNumber: 1,
      status: VersionStatus.DRAFT,
      changeSummary: 'Original Uploaded Baseline (v1.0)',
      sourceFileUrl: input.sourceFileUrl || null,
      submittedAt: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const v2Version: MockPolicyVersion = {
      id: v2Id,
      policyId,
      versionNumber: 2,
      status: VersionStatus.DRAFT,
      changeSummary: 'Author Working Draft (v2.0)',
      sourceFileUrl: input.sourceFileUrl || null,
      submittedAt: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const v1Sections: MockPolicySection[] = input.sections.map((sec, idx) => ({
      id: this.uuid(),
      versionId: v1Id,
      sectionNumber: sec.sectionNumber || idx + 1,
      title: sec.title.trim(),
      controlArea: sec.controlArea?.trim() || null,
      policyStatement: sec.policyStatement.trim(),
      rolesAndResponsibilities: sec.rolesAndResponsibilities?.trim() || null,
      procedures: sec.standardProcedure?.trim() || null,
      standardProcedure: sec.standardProcedure?.trim() || null,
      requiredRecords: sec.requiredRecords?.trim() || null,
      controlsAndChecks: sec.controlsAndChecks?.trim() || null,
      exceptionsAndEscalation: sec.exceptionsAndEscalation?.trim() || null,
      kpiExamples: sec.kpiExamples?.trim() || null,
      testingScenario: sec.testingScenario?.trim() || null,
      complianceNotes: sec.complianceNotes?.trim() || null,
      exceptions: sec.exceptionsAndEscalation?.trim() || null,
      unmatchedContent: sec.unmatchedContent || null,
      orderIndex: sec.orderIndex !== undefined ? sec.orderIndex : idx,
      parseStatus: sec.parseStatus || 'MATCHED',
      createdAt: now,
      updatedAt: now,
    }));

    const v2Sections: MockPolicySection[] = input.sections.map((sec, idx) => ({
      id: this.uuid(),
      versionId: v2Id,
      sectionNumber: sec.sectionNumber || idx + 1,
      title: sec.title.trim(),
      controlArea: sec.controlArea?.trim() || null,
      policyStatement: sec.policyStatement.trim(),
      rolesAndResponsibilities: sec.rolesAndResponsibilities?.trim() || null,
      procedures: sec.standardProcedure?.trim() || null,
      standardProcedure: sec.standardProcedure?.trim() || null,
      requiredRecords: sec.requiredRecords?.trim() || null,
      controlsAndChecks: sec.controlsAndChecks?.trim() || null,
      exceptionsAndEscalation: sec.exceptionsAndEscalation?.trim() || null,
      kpiExamples: sec.kpiExamples?.trim() || null,
      testingScenario: sec.testingScenario?.trim() || null,
      complianceNotes: sec.complianceNotes?.trim() || null,
      exceptions: sec.exceptionsAndEscalation?.trim() || null,
      unmatchedContent: sec.unmatchedContent || null,
      orderIndex: sec.orderIndex !== undefined ? sec.orderIndex : idx,
      parseStatus: sec.parseStatus || 'MATCHED',
      createdAt: now,
      updatedAt: now,
    }));

    mockPolicies.push(newPolicy);
    mockVersions.push(v1Version, v2Version);
    mockSections.push(...v1Sections, ...v2Sections);

    return {
      id: newPolicy.id,
      title: newPolicy.title,
      documentCode: newPolicy.documentCode,
      category: newPolicy.category,
      description: newPolicy.description,
      ownerId: newPolicy.ownerId,
      currentStatus: newPolicy.currentStatus,
      activeVersion: {
        ...v2Version,
        sections: v2Sections,
      },
      versionsCount: 2,
      sectionsCount: v2Sections.length,
      createdAt: newPolicy.createdAt,
      updatedAt: newPolicy.updatedAt,
    };
  }

  /**
   * List policies owned by the requesting user
   */
  public static async getPoliciesByOwner(ownerId: string): Promise<PolicySummary[]> {
    try {
      const dbPolicies = await prisma.policy.findMany({
        where: {
          ownerId,
          deletedAt: null,
        },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: { sections: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbPolicies.length > 0) {
        return dbPolicies.map((p) => {
          const latestVer = p.versions[0];
          return {
            id: p.id,
            title: p.title,
            documentCode: p.documentCode,
            category: p.category,
            description: p.description,
            ownerId: p.ownerId,
            currentStatus: p.currentStatus,
            currentVersionNumber: latestVer ? latestVer.versionNumber : 1,
            sectionsCount: latestVer ? latestVer.sections.length : 0,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          };
        });
      }
    } catch {
      // Fallback to in-memory
    }

    const filtered = mockPolicies.filter(
      (p) => p.ownerId === ownerId && !p.deletedAt,
    );

    return filtered.map((p) => {
      const versions = mockVersions.filter((v) => v.policyId === p.id);
      const latestVer = versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
      const sections = latestVer
        ? mockSections.filter((s) => s.versionId === latestVer.id)
        : [];

      return {
        id: p.id,
        title: p.title,
        documentCode: p.documentCode,
        category: p.category,
        description: p.description,
        ownerId: p.ownerId,
        currentStatus: p.currentStatus,
        currentVersionNumber: latestVer ? latestVer.versionNumber : 1,
        sectionsCount: sections.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  }

  /**
   * Get complete policy detail including active version's sections
   */
  public static async getPolicyById(
    policyId: string,
    requestingUserId: string,
    requestingRole: UserRole,
  ): Promise<PolicyDetail> {
    try {
      const dbPolicy = await prisma.policy.findUnique({
        where: { id: policyId },
        include: {
          owner: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: {
              sections: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
          reviews: {
            orderBy: { createdAt: 'desc' },
            include: { checker: true },
            take: 1,
          },
        },
      });

      if (dbPolicy && !dbPolicy.deletedAt) {
        if (requestingRole === UserRole.USER && dbPolicy.ownerId !== requestingUserId) {
          const err = new Error('Access denied: You do not own this policy document');
          (err as unknown as { statusCode: number }).statusCode = 403;
          throw err;
        }

        const activeVer = dbPolicy.versions[0];
        const latestReview = dbPolicy.reviews && dbPolicy.reviews.length > 0 ? dbPolicy.reviews[0] : null;

        return {
          id: dbPolicy.id,
          title: dbPolicy.title,
          documentCode: dbPolicy.documentCode,
          category: dbPolicy.category,
          description: dbPolicy.description,
          ownerId: dbPolicy.ownerId,
          ownerName: dbPolicy.owner?.fullName || null,
          ownerEmail: dbPolicy.owner?.email || null,
          ownerDepartment: dbPolicy.owner?.department || null,
          assignedCheckerId: latestReview?.checkerId || null,
          assignedCheckerName: latestReview?.checker?.fullName || null,
          assignedCheckerEmail: latestReview?.checker?.email || null,
          assignedCheckerDepartment: latestReview?.checker?.department || null,
          currentStatus: dbPolicy.currentStatus,
          activeVersion: {
            id: activeVer.id,
            policyId: activeVer.policyId,
            versionNumber: activeVer.versionNumber,
            status: activeVer.status,
            changeSummary: activeVer.changeSummary,
            sourceFileUrl: activeVer.sourceFileUrl,
            sections: activeVer.sections,
            submittedAt: activeVer.submittedAt,
            approvedAt: activeVer.approvedAt,
            createdAt: activeVer.createdAt,
            updatedAt: activeVer.updatedAt,
          },
          versionsCount: dbPolicy.versions.length,
          sectionsCount: activeVer.sections.length,
          reviewerFeedback: latestReview?.feedback || null,
          reviewerFeedbackDate: latestReview?.decisionAt || null,
          reviewerName: latestReview?.checker?.fullName || null,
          createdAt: dbPolicy.createdAt,
          updatedAt: dbPolicy.updatedAt,
        };
      }
    } catch (e) {
      if ((e as unknown as { statusCode?: number }).statusCode === 403) throw e;
      // Fallback
    }

    const mockPol = mockPolicies.find((p) => p.id === policyId && !p.deletedAt);
    if (!mockPol) {
      const err = new Error('Policy not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (requestingRole === UserRole.USER && mockPol.ownerId !== requestingUserId) {
      const err = new Error('Access denied: You do not own this policy document');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    const owner = await AuthService.findUserById(mockPol.ownerId);
    const versions = mockVersions.filter((v) => v.policyId === policyId);
    const activeVer = versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
    const sections = activeVer
      ? mockSections
          .filter((s) => s.versionId === activeVer.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
      : [];

    const latestReview = ReviewService.getLatestMockReview(mockPol.id);
    let reviewerName: string | null = null;
    let reviewerEmail: string | null = null;
    let reviewerDept: string | null = null;
    if (latestReview && latestReview.checkerId) {
      const checker = await AuthService.findUserById(latestReview.checkerId);
      reviewerName = checker ? checker.fullName : null;
      reviewerEmail = checker ? checker.email : null;
      reviewerDept = checker ? checker.department : null;
    }

    return {
      id: mockPol.id,
      title: mockPol.title,
      documentCode: mockPol.documentCode,
      category: mockPol.category,
      description: mockPol.description,
      ownerId: mockPol.ownerId,
      ownerName: owner ? owner.fullName : null,
      ownerEmail: owner ? owner.email : null,
      ownerDepartment: owner ? owner.department : null,
      assignedCheckerId: latestReview?.checkerId || null,
      assignedCheckerName: reviewerName,
      assignedCheckerEmail: reviewerEmail,
      assignedCheckerDepartment: reviewerDept,
      currentStatus: mockPol.currentStatus,
      activeVersion: {
        id: activeVer ? activeVer.id : 'v-default',
        policyId: mockPol.id,
        versionNumber: activeVer ? activeVer.versionNumber : 1,
        status: activeVer ? activeVer.status : VersionStatus.DRAFT,
        changeSummary: activeVer ? activeVer.changeSummary : null,
        sourceFileUrl: activeVer ? activeVer.sourceFileUrl : null,
        sections,
        submittedAt: activeVer ? activeVer.submittedAt : null,
        approvedAt: activeVer ? activeVer.approvedAt : null,
        createdAt: activeVer ? activeVer.createdAt : mockPol.createdAt,
        updatedAt: activeVer ? activeVer.updatedAt : mockPol.updatedAt,
      },
      versionsCount: versions.length,
      sectionsCount: sections.length,
      reviewerFeedback: latestReview?.feedback || null,
      reviewerFeedbackDate: latestReview?.decisionAt || null,
      reviewerName,
      createdAt: mockPol.createdAt,
      updatedAt: mockPol.updatedAt,
    };
  }

  /**
   * Clone a reviewed PolicyVersion into a new DRAFT PolicyVersion (versionNumber + 1)
   * with all sections copied for owner editing.
   */
  public static async createRevisionDraft(
    policyId: string,
    sourceVersionId: string,
    actorId: string,
    changeSummary: string = 'Revision draft incorporating reviewer feedback',
  ): Promise<PolicyVersionDetail> {
    const now = new Date();

    // 1. Prisma DB Path
    try {
      const sourceVersion = await prisma.policyVersion.findUniqueOrThrow({
        where: { id: sourceVersionId },
        include: { sections: true },
      });

      const nextVersionNumber = sourceVersion.versionNumber + 1;

      const newVersion = await prisma.$transaction(async (tx) => {
        const createdVer = await tx.policyVersion.create({
          data: {
            policyId,
            versionNumber: nextVersionNumber,
            status: VersionStatus.DRAFT,
            changeSummary,
            sourceFileUrl: sourceVersion.sourceFileUrl,
          },
        });

        if (sourceVersion.sections.length > 0) {
          await tx.policySection.createMany({
            data: sourceVersion.sections.map((sec) => ({
              versionId: createdVer.id,
              sectionNumber: sec.sectionNumber,
              title: sec.title,
              controlArea: sec.controlArea,
              policyStatement: sec.policyStatement,
              rolesAndResponsibilities: sec.rolesAndResponsibilities,
              procedures: sec.procedures,
              standardProcedure: sec.standardProcedure,
              requiredRecords: sec.requiredRecords,
              controlsAndChecks: sec.controlsAndChecks,
              exceptionsAndEscalation: sec.exceptionsAndEscalation,
              kpiExamples: sec.kpiExamples,
              testingScenario: sec.testingScenario,
              complianceNotes: sec.complianceNotes,
              exceptions: sec.exceptions,
              unmatchedContent: sec.unmatchedContent,
              orderIndex: sec.orderIndex,
              parseStatus: sec.parseStatus,
            })),
          });
        }

        return tx.policyVersion.findUniqueOrThrow({
          where: { id: createdVer.id },
          include: { sections: { orderBy: { orderIndex: 'asc' } } },
        });
      });

      await AuditService.logAction(
        actorId,
        'revision_draft_created',
        'PolicyVersion',
        newVersion.id,
        {
          policyId,
          versionNumber: newVersion.versionNumber,
          changeSummary,
        },
      );

      return {
        id: newVersion.id,
        policyId: newVersion.policyId,
        versionNumber: newVersion.versionNumber,
        status: newVersion.status,
        changeSummary: newVersion.changeSummary,
        sourceFileUrl: newVersion.sourceFileUrl,
        sections: newVersion.sections,
        submittedAt: newVersion.submittedAt,
        approvedAt: newVersion.approvedAt,
        createdAt: newVersion.createdAt,
        updatedAt: newVersion.updatedAt,
      };
    } catch {
      // Fallback
    }

    // 2. In-Memory Mock Fallback
    const sourceVer = mockVersions.find((v) => v.id === sourceVersionId);
    const sourceSections = mockSections.filter((s) => s.versionId === sourceVersionId);
    const nextVersionNumber = sourceVer ? sourceVer.versionNumber + 1 : 2;
    const newVersionId = this.uuid();

    const newMockVer: MockPolicyVersion = {
      id: newVersionId,
      policyId,
      versionNumber: nextVersionNumber,
      status: VersionStatus.DRAFT,
      changeSummary,
      sourceFileUrl: sourceVer ? sourceVer.sourceFileUrl : null,
      submittedAt: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    mockVersions.push(newMockVer);

    const clonedSections: MockPolicySection[] = sourceSections.map((sec) => ({
      ...sec,
      id: this.uuid(),
      versionId: newVersionId,
      createdAt: now,
      updatedAt: now,
    }));

    mockSections.push(...clonedSections);

    await AuditService.logAction(
      actorId,
      'revision_draft_created',
      'PolicyVersion',
      newMockVer.id,
      {
        policyId,
        versionNumber: newMockVer.versionNumber,
        changeSummary,
      },
    );

    return {
      id: newMockVer.id,
      policyId: newMockVer.policyId,
      versionNumber: newMockVer.versionNumber,
      status: newMockVer.status,
      changeSummary: newMockVer.changeSummary,
      sourceFileUrl: newMockVer.sourceFileUrl,
      sections: clonedSections,
      submittedAt: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create a new revision draft from an APPROVED policy.
   * Only the policy owner (USER role) can initiate this.
   * The APPROVED version remains immutable.
   * Policy.currentStatus returns to DRAFT.
   */
  public static async createRevisionFromApproved(
    policyId: string,
    ownerId: string,
  ): Promise<PolicyDetail> {
    const policyDetail = await this.getPolicyById(policyId, ownerId, UserRole.USER);

    if (policyDetail.currentStatus !== PolicyStatus.APPROVED) {
      const err = new Error(
        `Cannot create revision: Policy is in '${policyDetail.currentStatus}' status. Only APPROVED policies can be revised.`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    // Must be the policy owner
    if (policyDetail.ownerId !== ownerId) {
      const err = new Error('Access denied: Only the policy owner can create a new revision.');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    const sourceVersionId = policyDetail.activeVersion.id;

    // Create the next draft version
    await this.createRevisionDraft(
      policyId,
      sourceVersionId,
      ownerId,
      'New revision from approved policy',
    );

    // Return policy to DRAFT status
    // 1. Prisma DB Path
    try {
      await prisma.policy.update({
        where: { id: policyId },
        data: { currentStatus: PolicyStatus.DRAFT },
      });
    } catch {
      // Fallback
      const mockPol = mockPolicies.find((p) => p.id === policyId);
      if (mockPol) {
        mockPol.currentStatus = PolicyStatus.DRAFT;
        mockPol.updatedAt = new Date();
      }
    }

    await AuditService.logAction(
      ownerId,
      'revision_draft_created',
      'Policy',
      policyId,
      { policyId, trigger: 'user_initiated_from_approved' },
    );

    return this.getPolicyById(policyId, ownerId, UserRole.USER);
  }

  /**
   * Update policy metadata (only allowed in DRAFT status)
   */
  public static async updatePolicy(
    policyId: string,
    ownerId: string,
    input: UpdatePolicyInput,
  ): Promise<PolicyDetail> {
    const policyDetail = await this.getPolicyById(policyId, ownerId, UserRole.USER);

    if (
      policyDetail.currentStatus !== PolicyStatus.DRAFT) {
      const err = new Error(
        `Cannot edit policy metadata: Policy is currently in '${policyDetail.currentStatus}' status. Editing is only permitted for DRAFT policies.`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const mockPol = mockPolicies.find((p) => p.id === policyId);
    if (mockPol) {
      if (input.title !== undefined) mockPol.title = input.title.trim();
      if (input.category !== undefined) mockPol.category = input.category.trim();
      if (input.description !== undefined) mockPol.description = input.description?.trim() || null;
      mockPol.updatedAt = new Date();
    }

    try {
      await prisma.policy.update({
        where: { id: policyId },
        data: {
          ...(input.title ? { title: input.title.trim() } : {}),
          ...(input.category ? { category: input.category.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        },
      });
    } catch {
      // Fallback
    }

    await AuditService.logAction(
      ownerId,
      'policy_updated',
      'Policy',
      policyId,
      {
        title: input.title,
        category: input.category,
        description: input.description,
      },
    );

    return this.getPolicyById(policyId, ownerId, UserRole.USER);
  }

  /**
   * Add a new section to the current DRAFT version
   */
  public static async addSection(
    policyId: string,
    ownerId: string,
    input: CreateSectionInput,
  ): Promise<PolicySectionItem> {
    const policy = await this.getPolicyById(policyId, ownerId, UserRole.USER);

    if (
      policy.currentStatus !== PolicyStatus.DRAFT) {
      const err = new Error(
        `Cannot add section: Policy is currently in '${policy.currentStatus}' status. Editing is only permitted for DRAFT policies.`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const activeVersion = policy.activeVersion;
    const currentSections = activeVersion.sections;
    const nextSectionNumber = input.sectionNumber || currentSections.length + 1;
    const nextOrderIndex = input.orderIndex !== undefined ? input.orderIndex : currentSections.length;

    const sectionData = {
      sectionNumber: nextSectionNumber,
      title: input.title?.trim() || `Section ${nextSectionNumber}: Untitled Section`,
      controlArea: input.controlArea?.trim() || 'General Governance',
      policyStatement: input.policyStatement?.trim() || '',
      rolesAndResponsibilities: input.rolesAndResponsibilities?.trim() || null,
      procedures: input.procedures?.trim() || input.standardProcedure?.trim() || null,
      standardProcedure: input.standardProcedure?.trim() || null,
      requiredRecords: input.requiredRecords?.trim() || null,
      controlsAndChecks: input.controlsAndChecks?.trim() || null,
      exceptionsAndEscalation: input.exceptionsAndEscalation?.trim() || null,
      kpiExamples: input.kpiExamples?.trim() || null,
      testingScenario: input.testingScenario?.trim() || null,
      complianceNotes: input.complianceNotes?.trim() || null,
      exceptions: input.exceptions?.trim() || input.exceptionsAndEscalation?.trim() || null,
      unmatchedContent: input.unmatchedContent || null,
      orderIndex: nextOrderIndex,
      parseStatus: 'MATCHED',
    };

    try {
      const dbSection = await prisma.policySection.create({
        data: {
          versionId: activeVersion.id,
          ...sectionData,
        },
      });

      await AuditService.logAction(
        ownerId,
        'policy_section_added',
        'PolicySection',
        dbSection.id,
        {
          policyId,
          versionId: activeVersion.id,
          sectionNumber: nextSectionNumber,
          title: sectionData.title,
        },
      );

      return dbSection;
    } catch {
      // Fallback
    }

    const newSection: MockPolicySection = {
      id: this.uuid(),
      versionId: activeVersion.id,
      ...sectionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSections.push(newSection);

    await AuditService.logAction(
      ownerId,
      'policy_section_added',
      'PolicySection',
      newSection.id,
      {
        policyId,
        versionId: activeVersion.id,
        sectionNumber: nextSectionNumber,
        title: sectionData.title,
      },
    );

    return newSection;
  }

  /**
   * Update a specific section in the current DRAFT version
   */
  public static async updateSection(
    policyId: string,
    sectionId: string,
    ownerId: string,
    input: UpdateSectionInput,
  ): Promise<PolicySectionItem> {
    const policy = await this.getPolicyById(policyId, ownerId, UserRole.USER);

    if (
      policy.currentStatus !== PolicyStatus.DRAFT) {
      const err = new Error(
        `Cannot update section: Policy is currently in '${policy.currentStatus}' status. Editing is only permitted for DRAFT policies.`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const section = policy.activeVersion.sections.find((s) => s.id === sectionId);
    if (!section) {
      const err = new Error(`Section with ID '${sectionId}' not found in current draft`);
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const mockSec = mockSections.find((s) => s.id === sectionId);
    if (mockSec) {
      if (input.title !== undefined) mockSec.title = input.title.trim();
      if (input.controlArea !== undefined) mockSec.controlArea = input.controlArea?.trim() || null;
      if (input.policyStatement !== undefined) mockSec.policyStatement = input.policyStatement.trim();
      if (input.rolesAndResponsibilities !== undefined) mockSec.rolesAndResponsibilities = input.rolesAndResponsibilities?.trim() || null;
      if (input.procedures !== undefined) mockSec.procedures = input.procedures?.trim() || null;
      if (input.standardProcedure !== undefined) mockSec.standardProcedure = input.standardProcedure?.trim() || null;
      if (input.requiredRecords !== undefined) mockSec.requiredRecords = input.requiredRecords?.trim() || null;
      if (input.controlsAndChecks !== undefined) mockSec.controlsAndChecks = input.controlsAndChecks?.trim() || null;
      if (input.exceptionsAndEscalation !== undefined) mockSec.exceptionsAndEscalation = input.exceptionsAndEscalation?.trim() || null;
      if (input.kpiExamples !== undefined) mockSec.kpiExamples = input.kpiExamples?.trim() || null;
      if (input.testingScenario !== undefined) mockSec.testingScenario = input.testingScenario?.trim() || null;
      if (input.complianceNotes !== undefined) mockSec.complianceNotes = input.complianceNotes?.trim() || null;
      if (input.exceptions !== undefined) mockSec.exceptions = input.exceptions?.trim() || null;
      if (input.unmatchedContent !== undefined) mockSec.unmatchedContent = input.unmatchedContent || null;
      if (input.orderIndex !== undefined) mockSec.orderIndex = input.orderIndex;
      mockSec.updatedAt = new Date();
    }

    try {
      const updated = await prisma.policySection.update({
        where: { id: sectionId },
        data: {
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.controlArea !== undefined ? { controlArea: input.controlArea?.trim() || null } : {}),
          ...(input.policyStatement !== undefined ? { policyStatement: input.policyStatement.trim() } : {}),
          ...(input.rolesAndResponsibilities !== undefined ? { rolesAndResponsibilities: input.rolesAndResponsibilities?.trim() || null } : {}),
          ...(input.procedures !== undefined ? { procedures: input.procedures?.trim() || null } : {}),
          ...(input.standardProcedure !== undefined ? { standardProcedure: input.standardProcedure?.trim() || null } : {}),
          ...(input.requiredRecords !== undefined ? { requiredRecords: input.requiredRecords?.trim() || null } : {}),
          ...(input.controlsAndChecks !== undefined ? { controlsAndChecks: input.controlsAndChecks?.trim() || null } : {}),
          ...(input.exceptionsAndEscalation !== undefined ? { exceptionsAndEscalation: input.exceptionsAndEscalation?.trim() || null } : {}),
          ...(input.kpiExamples !== undefined ? { kpiExamples: input.kpiExamples?.trim() || null } : {}),
          ...(input.testingScenario !== undefined ? { testingScenario: input.testingScenario?.trim() || null } : {}),
          ...(input.complianceNotes !== undefined ? { complianceNotes: input.complianceNotes?.trim() || null } : {}),
          ...(input.exceptions !== undefined ? { exceptions: input.exceptions?.trim() || null } : {}),
          ...(input.unmatchedContent !== undefined ? { unmatchedContent: input.unmatchedContent || null } : {}),
          ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
        },
      });

      await AuditService.logAction(
        ownerId,
        'policy_section_updated',
        'PolicySection',
        sectionId,
        {
          policyId,
          title: input.title,
        },
      );

      return updated;
    } catch {
      // Fallback
    }

    await AuditService.logAction(
      ownerId,
      'policy_section_updated',
      'PolicySection',
      sectionId,
      {
        policyId,
        title: input.title,
      },
    );

    return mockSec!;
  }

  /**
   * Delete a section from the current DRAFT version
   */
  public static async deleteSection(
    policyId: string,
    sectionId: string,
    ownerId: string,
  ): Promise<{ message: string; remainingSectionsCount: number }> {
    const policy = await this.getPolicyById(policyId, ownerId, UserRole.USER);

    if (
      policy.currentStatus !== PolicyStatus.DRAFT) {
      const err = new Error(
        `Cannot delete section: Policy is currently in '${policy.currentStatus}' status. Editing is only permitted for DRAFT policies.`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const sectionExists = policy.activeVersion.sections.some((s) => s.id === sectionId);
    if (!sectionExists) {
      const err = new Error(`Section with ID '${sectionId}' not found in current draft`);
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const secIndex = mockSections.findIndex((s) => s.id === sectionId);
    if (secIndex !== -1) {
      mockSections.splice(secIndex, 1);
    }

    try {
      await prisma.policySection.delete({
        where: { id: sectionId },
      });
    } catch {
      // Fallback
    }

    await AuditService.logAction(
      ownerId,
      'policy_section_deleted',
      'PolicySection',
      sectionId,
      {
        policyId,
      },
    );

    const updated = await this.getPolicyById(policyId, ownerId, UserRole.USER);
    return {
      message: 'Section removed successfully',
      remainingSectionsCount: updated.activeVersion.sections.length,
    };
  }

  /**
   * Save the current DRAFT as a NEW version snapshot.
   * Clones the active draft version → increments versionNumber → applies
   * all provided sectionChanges to the cloned sections → returns updated PolicyDetail.
   *
   * POST /api/policies/:id/save-draft
   */
  public static async saveDraftAsNewVersion(
    policyId: string,
    ownerId: string,
    input: SaveDraftInput,
  ): Promise<PolicyDetail> {
    const policy = await this.getPolicyById(policyId, ownerId, UserRole.USER);

    if (policy.currentStatus !== PolicyStatus.DRAFT) {
      const err = new Error(
        `Cannot save draft: Policy is currently in '${policy.currentStatus}' status. Versioned save is only permitted for DRAFT policies.`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const sourceVersion = policy.activeVersion;
    const nextVersionNumber = sourceVersion.versionNumber + 1;
    const changeSummaryText =
      input.changeSummary?.trim() ||
      `Draft save – v${nextVersionNumber}.0 (${new Date().toISOString().slice(0, 10)})`;

    const now = new Date();

    // ── 1. Prisma DB path ──────────────────────────────────────────────────────
    try {
      const newVersion = await prisma.$transaction(async (tx) => {
        // a) Create the new version row
        const createdVer = await tx.policyVersion.create({
          data: {
            policyId,
            versionNumber: nextVersionNumber,
            status: VersionStatus.DRAFT,
            changeSummary: changeSummaryText,
            sourceFileUrl: sourceVersion.sourceFileUrl,
          },
        });

        // b) Clone each section, applying any pending changes
        if (sourceVersion.sections.length > 0) {
          await tx.policySection.createMany({
            data: sourceVersion.sections.map((sec) => {
              const overrides = input.sectionChanges[sec.id] || {};
              return {
                versionId: createdVer.id,
                sectionNumber: overrides.orderIndex !== undefined ? sec.sectionNumber : sec.sectionNumber,
                title: (overrides.title ?? sec.title).trim(),
                controlArea: overrides.controlArea !== undefined ? (overrides.controlArea?.trim() || null) : sec.controlArea,
                policyStatement: (overrides.policyStatement ?? sec.policyStatement).trim(),
                rolesAndResponsibilities: overrides.rolesAndResponsibilities !== undefined ? (overrides.rolesAndResponsibilities?.trim() || null) : sec.rolesAndResponsibilities,
                procedures: overrides.procedures !== undefined ? (overrides.procedures?.trim() || null) : (sec.procedures ?? null),
                standardProcedure: overrides.standardProcedure !== undefined ? (overrides.standardProcedure?.trim() || null) : (sec.standardProcedure ?? null),
                requiredRecords: overrides.requiredRecords !== undefined ? (overrides.requiredRecords?.trim() || null) : (sec.requiredRecords ?? null),
                controlsAndChecks: overrides.controlsAndChecks !== undefined ? (overrides.controlsAndChecks?.trim() || null) : (sec.controlsAndChecks ?? null),
                exceptionsAndEscalation: overrides.exceptionsAndEscalation !== undefined ? (overrides.exceptionsAndEscalation?.trim() || null) : (sec.exceptionsAndEscalation ?? null),
                kpiExamples: overrides.kpiExamples !== undefined ? (overrides.kpiExamples?.trim() || null) : (sec.kpiExamples ?? null),
                testingScenario: overrides.testingScenario !== undefined ? (overrides.testingScenario?.trim() || null) : (sec.testingScenario ?? null),
                complianceNotes: overrides.complianceNotes !== undefined ? (overrides.complianceNotes?.trim() || null) : sec.complianceNotes,
                exceptions: overrides.exceptions !== undefined ? (overrides.exceptions?.trim() || null) : sec.exceptions,
                unmatchedContent: overrides.unmatchedContent !== undefined ? (overrides.unmatchedContent || null) : (sec.unmatchedContent ?? null),
                orderIndex: overrides.orderIndex !== undefined ? overrides.orderIndex : sec.orderIndex,
                parseStatus: sec.parseStatus,
              };
            }),
          });
        }

        return tx.policyVersion.findUniqueOrThrow({
          where: { id: createdVer.id },
          include: { sections: { orderBy: { orderIndex: 'asc' } } },
        });
      });

      await AuditService.logAction(ownerId, 'draft_saved_as_new_version', 'PolicyVersion', newVersion.id, {
        policyId,
        versionNumber: newVersion.versionNumber,
        changeSummary: changeSummaryText,
        sectionCount: newVersion.sections.length,
      });

      return this.getPolicyById(policyId, ownerId, UserRole.USER);
    } catch (e) {
      if ((e as unknown as { statusCode?: number }).statusCode) throw e;
      // Fallback to in-memory mock
    }

    // ── 2. In-Memory Mock Fallback ────────────────────────────────────────────
    const newVersionId = this.uuid();

    const newMockVer: MockPolicyVersion = {
      id: newVersionId,
      policyId,
      versionNumber: nextVersionNumber,
      status: VersionStatus.DRAFT,
      changeSummary: changeSummaryText,
      sourceFileUrl: sourceVersion.sourceFileUrl ?? null,
      submittedAt: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    // Clone sections with changes applied
    const clonedSections = sourceVersion.sections.map((sec) => {
      const overrides = input.sectionChanges[sec.id] || {};
      return {
        id: this.uuid(),
        versionId: newVersionId,
        sectionNumber: sec.sectionNumber,
        title: (overrides.title ?? sec.title).trim(),
        controlArea: overrides.controlArea !== undefined ? (overrides.controlArea?.trim() || null) : sec.controlArea,
        policyStatement: (overrides.policyStatement ?? sec.policyStatement).trim(),
        rolesAndResponsibilities: overrides.rolesAndResponsibilities !== undefined ? (overrides.rolesAndResponsibilities?.trim() || null) : sec.rolesAndResponsibilities,
        procedures: overrides.procedures !== undefined ? (overrides.procedures?.trim() || null) : (sec.procedures ?? null),
        standardProcedure: overrides.standardProcedure !== undefined ? (overrides.standardProcedure?.trim() || null) : (sec.standardProcedure ?? null),
        requiredRecords: overrides.requiredRecords !== undefined ? (overrides.requiredRecords?.trim() || null) : (sec.requiredRecords ?? null),
        controlsAndChecks: overrides.controlsAndChecks !== undefined ? (overrides.controlsAndChecks?.trim() || null) : (sec.controlsAndChecks ?? null),
        exceptionsAndEscalation: overrides.exceptionsAndEscalation !== undefined ? (overrides.exceptionsAndEscalation?.trim() || null) : (sec.exceptionsAndEscalation ?? null),
        kpiExamples: overrides.kpiExamples !== undefined ? (overrides.kpiExamples?.trim() || null) : (sec.kpiExamples ?? null),
        testingScenario: overrides.testingScenario !== undefined ? (overrides.testingScenario?.trim() || null) : (sec.testingScenario ?? null),
        complianceNotes: overrides.complianceNotes !== undefined ? (overrides.complianceNotes?.trim() || null) : sec.complianceNotes,
        exceptions: overrides.exceptions !== undefined ? (overrides.exceptions?.trim() || null) : sec.exceptions,
        unmatchedContent: overrides.unmatchedContent !== undefined ? (overrides.unmatchedContent || null) : (sec.unmatchedContent ?? null),
        orderIndex: overrides.orderIndex !== undefined ? overrides.orderIndex : sec.orderIndex,
        parseStatus: sec.parseStatus,
        createdAt: now,
        updatedAt: now,
      };
    });

    mockVersions.push(newMockVer);
    mockSections.push(...clonedSections);

    await AuditService.logAction(ownerId, 'draft_saved_as_new_version', 'PolicyVersion', newMockVer.id, {
      policyId,
      versionNumber: newMockVer.versionNumber,
      changeSummary: changeSummaryText,
      sectionCount: clonedSections.length,
    });

    return this.getPolicyById(policyId, ownerId, UserRole.USER);
  }

  /**
   * Soft-delete a policy
   */
  public static async deletePolicy(
    policyId: string,
    ownerId: string,
  ): Promise<{ message: string }> {
    const policy = await this.getPolicyById(policyId, ownerId, UserRole.USER);

    if (policy.currentStatus !== PolicyStatus.DRAFT) {
      const err = new Error(
        `Cannot delete policy in '${policy.currentStatus}' status. Only DRAFT policies can be removed.`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const mockPol = mockPolicies.find((p) => p.id === policyId);
    if (mockPol) {
      mockPol.deletedAt = new Date();
    }

    try {
      await prisma.policy.update({
        where: { id: policyId },
        data: { deletedAt: new Date() },
      });
    } catch {
      // Fallback
    }

    await AuditService.logAction(
      ownerId,
      'policy_deleted',
      'Policy',
      policyId,
      {
        documentCode: policy.documentCode,
        title: policy.title,
      },
    );

    return { message: `Policy '${policy.documentCode}' has been deleted.` };
  }

  /**
   * Update policy lifecycle status
   */
  public static async updatePolicyStatus(
    policyId: string,
    newStatus: PolicyStatus,
  ): Promise<void> {
    const mockPol = mockPolicies.find((p) => p.id === policyId);
    if (mockPol) {
      mockPol.currentStatus = newStatus;
      mockPol.updatedAt = new Date();
    }

    try {
      await prisma.policy.update({
        where: { id: policyId },
        data: { currentStatus: newStatus },
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Update version lifecycle status
   */
  public static async updateVersionStatus(
    versionId: string,
    newStatus: VersionStatus,
    approvedAt?: Date,
  ): Promise<void> {
    const mockVer = mockVersions.find((v) => v.id === versionId);
    if (mockVer) {
      mockVer.status = newStatus;
      if (approvedAt) mockVer.approvedAt = approvedAt;
      mockVer.updatedAt = new Date();
    }

    try {
      await prisma.policyVersion.update({
        where: { id: versionId },
        data: {
          status: newStatus,
          approvedAt: approvedAt || undefined,
        },
      });
    } catch {
      // Fallback
    }
  }

  /**
   * List all PolicyVersions for a policy with versionNumber, submittedAt, status, submittedBy
   * GET /api/policies/:id/versions
   */
  public static async getPolicyVersions(
    policyId: string,
    requestingUserId: string,
    requestingRole: UserRole,
  ): Promise<PolicyVersionSummary[]> {
    // 1. Prisma DB Path
    try {
      const dbPolicy = await prisma.policy.findUnique({
        where: { id: policyId },
        include: {
          owner: {
            select: { id: true, fullName: true, email: true, department: true, role: true },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: {
              sections: { select: { id: true } },
            },
          },
        },
      });

      if (dbPolicy && !dbPolicy.deletedAt) {
        if (requestingRole === UserRole.USER && dbPolicy.ownerId !== requestingUserId) {
          const err = new Error('Access denied: You do not own this policy document');
          (err as unknown as { statusCode: number }).statusCode = 403;
          throw err;
        }

        return dbPolicy.versions.map((ver) => ({
          id: ver.id,
          policyId: ver.policyId,
          versionNumber: ver.versionNumber,
          status: ver.status,
          changeSummary: ver.changeSummary,
          sourceFileUrl: ver.sourceFileUrl,
          submittedAt: ver.submittedAt,
          approvedAt: ver.approvedAt,
          createdAt: ver.createdAt,
          updatedAt: ver.updatedAt,
          submittedBy: dbPolicy.owner
            ? {
                id: dbPolicy.owner.id,
                fullName: dbPolicy.owner.fullName,
                email: dbPolicy.owner.email,
                department: dbPolicy.owner.department,
                role: dbPolicy.owner.role,
              }
            : null,
          sectionsCount: ver.sections.length,
        }));
      }
    } catch (e) {
      if ((e as unknown as { statusCode?: number }).statusCode === 403) throw e;
      // Fallback
    }

    // 2. In-Memory Mock Store Fallback
    const mockPol = mockPolicies.find((p) => p.id === policyId && !p.deletedAt);
    if (!mockPol) {
      const err = new Error('Policy not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (requestingRole === UserRole.USER && mockPol.ownerId !== requestingUserId) {
      const err = new Error('Access denied: You do not own this policy document');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    const owner = await AuthService.findUserById(mockPol.ownerId);
    const versions = mockVersions
      .filter((v) => v.policyId === policyId)
      .sort((a, b) => b.versionNumber - a.versionNumber);

    return versions.map((ver) => {
      const secCount = mockSections.filter((s) => s.versionId === ver.id).length;
      return {
        id: ver.id,
        policyId: ver.policyId,
        versionNumber: ver.versionNumber,
        status: ver.status,
        changeSummary: ver.changeSummary,
        sourceFileUrl: ver.sourceFileUrl || null,
        submittedAt: ver.submittedAt,
        approvedAt: ver.approvedAt,
        createdAt: ver.createdAt,
        updatedAt: ver.updatedAt,
        submittedBy: owner
          ? {
              id: owner.id,
              fullName: owner.fullName,
              email: owner.email,
              department: owner.department,
              role: owner.role,
            }
          : null,
        sectionsCount: secCount,
      };
    });
  }

  /**
   * Get full sections for one specific version (read-only, for historical viewing)
   * GET /api/policies/:id/versions/:versionId
   */
  public static async getPolicyVersionById(
    policyId: string,
    versionId: string,
    requestingUserId: string,
    requestingRole: UserRole,
  ): Promise<
    PolicyVersionDetail & {
      policyTitle: string;
      documentCode: string;
      category: string;
      description: string | null;
      ownerId: string;
    }
  > {
    // 1. Prisma DB Path
    try {
      const dbPolicy = await prisma.policy.findUnique({
        where: { id: policyId },
      });

      if (dbPolicy && !dbPolicy.deletedAt) {
        if (requestingRole === UserRole.USER && dbPolicy.ownerId !== requestingUserId) {
          const err = new Error('Access denied: You do not own this policy document');
          (err as unknown as { statusCode: number }).statusCode = 403;
          throw err;
        }

        const isNum = !isNaN(Number(versionId)) && Number(versionId) > 0;
        const dbVer = await prisma.policyVersion.findFirst({
          where: {
            policyId,
            ...(isNum ? { OR: [{ id: versionId }, { versionNumber: Number(versionId) }] } : { id: versionId }),
          },
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        });

        if (dbVer) {
          return {
            id: dbVer.id,
            policyId: dbVer.policyId,
            policyTitle: dbPolicy.title,
            documentCode: dbPolicy.documentCode,
            category: dbPolicy.category,
            description: dbPolicy.description,
            ownerId: dbPolicy.ownerId,
            versionNumber: dbVer.versionNumber,
            status: dbVer.status,
            changeSummary: dbVer.changeSummary,
            sourceFileUrl: dbVer.sourceFileUrl,
            sections: dbVer.sections,
            submittedAt: dbVer.submittedAt,
            approvedAt: dbVer.approvedAt,
            createdAt: dbVer.createdAt,
            updatedAt: dbVer.updatedAt,
          };
        }
      }
    } catch (e) {
      if ((e as unknown as { statusCode?: number }).statusCode === 403) throw e;
      // Fallback
    }

    // 2. In-Memory Mock Store Fallback
    const mockPol = mockPolicies.find((p) => p.id === policyId && !p.deletedAt);
    if (!mockPol) {
      const err = new Error('Policy not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (requestingRole === UserRole.USER && mockPol.ownerId !== requestingUserId) {
      const err = new Error('Access denied: You do not own this policy document');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    const mockVer = mockVersions.find(
      (v) =>
        v.policyId === policyId &&
        (v.id === versionId || (!isNaN(Number(versionId)) && v.versionNumber === Number(versionId))),
    );

    if (!mockVer) {
      const err = new Error(`Policy version '${versionId}' not found for policy '${mockPol.documentCode}'`);
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const sections = mockSections
      .filter((s) => s.versionId === mockVer.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      id: mockVer.id,
      policyId: mockVer.policyId,
      policyTitle: mockPol.title,
      documentCode: mockPol.documentCode,
      category: mockPol.category,
      description: mockPol.description,
      ownerId: mockPol.ownerId,
      versionNumber: mockVer.versionNumber,
      status: mockVer.status,
      changeSummary: mockVer.changeSummary,
      sourceFileUrl: mockVer.sourceFileUrl || null,
      sections,
      submittedAt: mockVer.submittedAt,
      approvedAt: mockVer.approvedAt,
      createdAt: mockVer.createdAt,
      updatedAt: mockVer.updatedAt,
    };
  }

  /**
   * Compares two versions section-by-section (match by sectionNumber) and returns
   * field-by-field word-level diffs.
   * GET /api/policies/:id/diff?from=:versionIdA&to=:versionIdB
   */
  public static async comparePolicyVersions(
    policyId: string,
    fromVersionRef: string,
    toVersionRef: string,
    requestingUserId: string,
    requestingRole: UserRole,
  ): Promise<PolicyDiffResponse> {
    if (!fromVersionRef || !toVersionRef) {
      const err = new Error('Both "from" and "to" version query parameters are required for comparison');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const [fromVerDetail, toVerDetail, allVersions] = await Promise.all([
      this.getPolicyVersionById(policyId, fromVersionRef, requestingUserId, requestingRole),
      this.getPolicyVersionById(policyId, toVersionRef, requestingUserId, requestingRole),
      this.getPolicyVersions(policyId, requestingUserId, requestingRole),
    ]);

    const fromSummary = allVersions.find((v) => v.id === fromVerDetail.id) || {
      id: fromVerDetail.id,
      policyId: fromVerDetail.policyId,
      versionNumber: fromVerDetail.versionNumber,
      status: fromVerDetail.status,
      changeSummary: fromVerDetail.changeSummary,
      sourceFileUrl: fromVerDetail.sourceFileUrl || null,
      submittedAt: fromVerDetail.submittedAt,
      approvedAt: fromVerDetail.approvedAt,
      createdAt: fromVerDetail.createdAt,
      updatedAt: fromVerDetail.updatedAt,
      sectionsCount: fromVerDetail.sections.length,
    };

    const toSummary = allVersions.find((v) => v.id === toVerDetail.id) || {
      id: toVerDetail.id,
      policyId: toVerDetail.policyId,
      versionNumber: toVerDetail.versionNumber,
      status: toVerDetail.status,
      changeSummary: toVerDetail.changeSummary,
      sourceFileUrl: toVerDetail.sourceFileUrl || null,
      submittedAt: toVerDetail.submittedAt,
      approvedAt: toVerDetail.approvedAt,
      createdAt: toVerDetail.createdAt,
      updatedAt: toVerDetail.updatedAt,
      sectionsCount: toVerDetail.sections.length,
    };

    const fromSectionsMap = new Map<number, PolicySectionItem>();
    fromVerDetail.sections.forEach((sec) => fromSectionsMap.set(sec.sectionNumber, sec));

    const toSectionsMap = new Map<number, PolicySectionItem>();
    toVerDetail.sections.forEach((sec) => toSectionsMap.set(sec.sectionNumber, sec));

    const allSectionNumbers = Array.from(
      new Set([...fromSectionsMap.keys(), ...toSectionsMap.keys()]),
    ).sort((a, b) => a - b);

    const FIELD_CONFIGS: {
      key: keyof PolicySectionItem;
      label: string;
      altKey?: keyof PolicySectionItem;
    }[] = [
      { key: 'title', label: 'Section Title' },
      { key: 'controlArea', label: 'Control Area' },
      { key: 'policyStatement', label: 'Policy Statement' },
      { key: 'rolesAndResponsibilities', label: 'Roles & Responsibilities' },
      { key: 'standardProcedure', label: 'Procedures & Operating Guidelines', altKey: 'procedures' },
      { key: 'requiredRecords', label: 'Required Records' },
      { key: 'controlsAndChecks', label: 'Controls & Monitoring Checks' },
      { key: 'exceptionsAndEscalation', label: 'Exceptions & Escalation', altKey: 'exceptions' },
      { key: 'kpiExamples', label: 'KPI Examples' },
      { key: 'testingScenario', label: 'Testing Scenario' },
      { key: 'complianceNotes', label: 'Compliance Notes' },
      { key: 'unmatchedContent', label: 'Extracted / Unmatched Content' },
    ];

    const sectionDiffResults: SectionDiffResult[] = [];
    let totalFieldChanges = 0;

    for (const secNum of allSectionNumbers) {
      const fromSec = fromSectionsMap.get(secNum) || null;
      const toSec = toSectionsMap.get(secNum) || null;

      if (!fromSec && toSec) {
        // Section was ADDED in "to" version
        const fieldDiffs: FieldDiff[] = [];
        for (const cfg of FIELD_CONFIGS) {
          const rawVal = (toSec[cfg.key] ?? (cfg.altKey ? toSec[cfg.altKey] : null)) as string | null;
          const valStr = rawVal ? rawVal.trim() : '';
          if (valStr) {
            totalFieldChanges++;
            fieldDiffs.push({
              fieldKey: String(cfg.key),
              fieldLabel: cfg.label,
              fromValue: null,
              toValue: valStr,
              hasChanges: true,
              diffParts: [{ value: valStr, added: true }],
            });
          }
        }

        sectionDiffResults.push({
          sectionNumber: secNum,
          title: toSec.title || `Section ${secNum}`,
          changeType: 'ADDED',
          fromSection: null,
          toSection: toSec,
          hasChanges: true,
          fieldDiffs,
        });
      } else if (fromSec && !toSec) {
        // Section was REMOVED in "to" version
        const fieldDiffs: FieldDiff[] = [];
        for (const cfg of FIELD_CONFIGS) {
          const rawVal = (fromSec[cfg.key] ?? (cfg.altKey ? fromSec[cfg.altKey] : null)) as string | null;
          const valStr = rawVal ? rawVal.trim() : '';
          if (valStr) {
            totalFieldChanges++;
            fieldDiffs.push({
              fieldKey: String(cfg.key),
              fieldLabel: cfg.label,
              fromValue: valStr,
              toValue: null,
              hasChanges: true,
              diffParts: [{ value: valStr, removed: true }],
            });
          }
        }

        sectionDiffResults.push({
          sectionNumber: secNum,
          title: fromSec.title || `Section ${secNum}`,
          changeType: 'REMOVED',
          fromSection: fromSec,
          toSection: null,
          hasChanges: true,
          fieldDiffs,
        });
      } else if (fromSec && toSec) {
        // Section exists in both - compare field by field
        const fieldDiffs: FieldDiff[] = [];
        let sectionHasChanges = false;

        for (const cfg of FIELD_CONFIGS) {
          const fromRaw = (fromSec[cfg.key] ?? (cfg.altKey ? fromSec[cfg.altKey] : null)) as string | null;
          const toRaw = (toSec[cfg.key] ?? (cfg.altKey ? toSec[cfg.altKey] : null)) as string | null;

          const fromStr = fromRaw ? fromRaw.trim() : '';
          const toStr = toRaw ? toRaw.trim() : '';

          // If both are empty, don't clutter the diff with empty fields
          if (!fromStr && !toStr) continue;

          if (fromStr === toStr) {
            fieldDiffs.push({
              fieldKey: String(cfg.key),
              fieldLabel: cfg.label,
              fromValue: fromStr,
              toValue: toStr,
              hasChanges: false,
              diffParts: [{ value: toStr }],
            });
          } else {
            sectionHasChanges = true;
            totalFieldChanges++;
            const rawParts = diffWordsWithSpace(fromStr, toStr);
            const diffParts = rawParts.map((p) => ({
              value: p.value,
              ...(p.added ? { added: true } : {}),
              ...(p.removed ? { removed: true } : {}),
            }));

            fieldDiffs.push({
              fieldKey: String(cfg.key),
              fieldLabel: cfg.label,
              fromValue: fromStr || null,
              toValue: toStr || null,
              hasChanges: true,
              diffParts,
            });
          }
        }

        const changeType: SectionChangeType = sectionHasChanges ? 'MODIFIED' : 'UNCHANGED';

        sectionDiffResults.push({
          sectionNumber: secNum,
          title: toSec.title || fromSec.title || `Section ${secNum}`,
          changeType,
          fromSection: fromSec,
          toSection: toSec,
          hasChanges: sectionHasChanges,
          fieldDiffs,
        });
      }
    }

    const addedSections = sectionDiffResults.filter((s) => s.changeType === 'ADDED').length;
    const removedSections = sectionDiffResults.filter((s) => s.changeType === 'REMOVED').length;
    const modifiedSections = sectionDiffResults.filter((s) => s.changeType === 'MODIFIED').length;
    const unchangedSections = sectionDiffResults.filter((s) => s.changeType === 'UNCHANGED').length;

    return {
      policyId,
      policyTitle: toVerDetail.policyTitle,
      documentCode: toVerDetail.documentCode,
      fromVersion: fromSummary,
      toVersion: toSummary,
      summary: {
        totalSections: sectionDiffResults.length,
        addedSections,
        removedSections,
        modifiedSections,
        unchangedSections,
        totalFieldChanges,
      },
      sections: sectionDiffResults,
    };
  }
}


