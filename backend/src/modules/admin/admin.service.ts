import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma';
import { UserRole, VersionStatus } from '@prisma/client';
import {
  AdminPolicyItem,
  AdminPolicyFilter,
  SlaConfigItem,
  AdminUserItem,
  CreateUserInput,
  UpdateUserInput,
  FinalApprovedPolicyItem,
} from './admin.types';
import { AuditService } from '../audit/audit.service';
import { AuthService, mockUsers } from '../auth/auth.service';
import { mockPolicies, mockVersions, mockSections } from '../policy/policy.service';
import { mockReviews } from '../review/review.service';

// In-Memory SLA Config store for development & mock fallback
export const mockSlaConfigs: SlaConfigItem[] = [
  {
    id: 'sla-1',
    category: 'Digital Banking & Payments',
    slaHours: 12,
    description: 'InstaPay, Mobile Banking, and Electronic Payment Rules',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sla-2',
    category: 'Credit & Lending',
    slaHours: 24,
    description: 'Commercial & Retail Credit Risk Assessment Guidelines',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sla-3',
    category: 'Risk Management & AML',
    slaHours: 24,
    description: 'Anti-Money Laundering & Sanctions Compliance Rules',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sla-4',
    category: 'Regulatory Compliance',
    slaHours: 24,
    description: 'CBE Circular Enforcement & Mandatory Disclosures',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sla-5',
    category: 'Information Security & Cyber',
    slaHours: 12,
    description: 'Cybersecurity incident response and access control standards',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sla-6',
    category: 'Treasury & Investment',
    slaHours: 48,
    description: 'FX Limits, Liquidity Management, and Market Risk Policies',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sla-7',
    category: 'Operations & Settlement',
    slaHours: 24,
    description: 'Branch Operating Procedures and Cash Clearing Protocols',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sla-8',
    category: 'General Governance & Audit',
    slaHours: 48,
    description: 'Enterprise Governance Framework and Committee Charters',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class AdminService {
  private static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * GET /api/admin/policies
   * Return all policies across all owners and statuses with optional filters
   */
  public static async getAllPolicies(filters?: AdminPolicyFilter): Promise<AdminPolicyItem[]> {
    // 1. Prisma DB Path
    try {
      const where: Record<string, unknown> = {
        deletedAt: null,
      };

      if (filters?.status) {
        where.currentStatus = filters.status;
      }

      if (filters?.category && filters.category !== 'ALL') {
        where.category = filters.category;
      }

      const dbPolicies = await prisma.policy.findMany({
        where,
        include: {
          owner: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: {
              sections: true,
            },
          },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              checker: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbPolicies.length > 0) {
        let results: AdminPolicyItem[] = dbPolicies.map((p) => {
          const activeVersion = p.versions[0] || {
            versionNumber: 1,
            status: VersionStatus.DRAFT,
            sections: [],
          };
          const latestReview = p.reviews && p.reviews.length > 0 ? p.reviews[0] : null;

          const slaHours = latestReview?.slaHours || 24;
          let turnaroundHours: number | null = null;
          let turnaroundFormatted: string | null = null;
          let isSlaBreached: boolean | null = null;

          if (latestReview?.assignedAt) {
            const clockStart = new Date(latestReview.assignedAt).getTime();
            const clockEnd = latestReview.decisionAt ? new Date(latestReview.decisionAt).getTime() : Date.now();
            const diffMs = Math.max(0, clockEnd - clockStart);
            turnaroundHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
            const hrs = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs / (1000 * 60)) % 60);
            turnaroundFormatted = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
            const targetMs = slaHours * 60 * 60 * 1000;
            isSlaBreached = latestReview.slaBreached === true || diffMs > targetMs;
          }

          return {
            id: p.id,
            title: p.title,
            documentCode: p.documentCode,
            category: p.category,
            description: p.description,
            currentStatus: p.currentStatus,
            ownerId: p.ownerId,
            ownerName: p.owner.fullName,
            ownerEmail: p.owner.email,
            ownerDepartment: p.owner.department,
            assignedCheckerId: latestReview?.checkerId || null,
            assignedCheckerName: latestReview?.checker?.fullName || null,
            assignedCheckerEmail: latestReview?.checker?.email || null,
            activeVersionNumber: activeVersion.versionNumber,
            activeVersionStatus: activeVersion.status,
            sectionsCount: activeVersion.sections.length,
            slaHours,
            turnaroundHours,
            turnaroundFormatted,
            isSlaBreached,
            assignedAt: latestReview?.assignedAt || null,
            decisionAt: latestReview?.decisionAt || null,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          };
        });

        if (filters?.search) {
          const q = filters.search.toLowerCase().trim();
          results = results.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.documentCode.toLowerCase().includes(q) ||
              p.ownerName.toLowerCase().includes(q) ||
              (p.assignedCheckerName && p.assignedCheckerName.toLowerCase().includes(q)) ||
              (p.description && p.description.toLowerCase().includes(q)),
          );
        }

        return results;
      }
    } catch {
      // Fallback
    }

    // 2. Mock Fallback Path
    let list = mockPolicies.filter((p) => !p.deletedAt);

    if (filters?.status) {
      list = list.filter((p) => p.currentStatus === filters.status);
    }

    if (filters?.category && filters.category !== 'ALL') {
      list = list.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
    }

    const items: AdminPolicyItem[] = [];

    for (const p of list) {
      const owner = await AuthService.findUserById(p.ownerId);
      const versions = mockVersions
        .filter((v) => v.policyId === p.id)
        .sort((a, b) => b.versionNumber - a.versionNumber);
      const activeVersion = versions[0] || {
        id: 'v1',
        versionNumber: 1,
        status: VersionStatus.DRAFT,
      };
      const sections = mockSections.filter((s) => s.versionId === activeVersion.id);
      const latestReview = mockReviews
        .filter((r) => r.policyId === p.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      let assignedCheckerName: string | null = null;
      let assignedCheckerEmail: string | null = null;
      if (latestReview && latestReview.checkerId) {
        const checkerUser = await AuthService.findUserById(latestReview.checkerId);
        if (checkerUser) {
          assignedCheckerName = checkerUser.fullName;
          assignedCheckerEmail = checkerUser.email;
        }
      }

      const slaHours = latestReview?.slaHours || 24;
      let turnaroundHours: number | null = null;
      let turnaroundFormatted: string | null = null;
      let isSlaBreached: boolean | null = null;

      if (latestReview?.assignedAt) {
        const clockStart = new Date(latestReview.assignedAt).getTime();
        const clockEnd = latestReview.decisionAt ? new Date(latestReview.decisionAt).getTime() : Date.now();
        const diffMs = Math.max(0, clockEnd - clockStart);
        turnaroundHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs / (1000 * 60)) % 60);
        turnaroundFormatted = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        const targetMs = slaHours * 60 * 60 * 1000;
        isSlaBreached = latestReview.slaBreached === true || diffMs > targetMs;
      }

      items.push({
        id: p.id,
        title: p.title,
        documentCode: p.documentCode,
        category: p.category,
        description: p.description,
        currentStatus: p.currentStatus,
        ownerId: p.ownerId,
        ownerName: owner ? owner.fullName : 'Policy Owner',
        ownerEmail: owner ? owner.email : 'owner@nbe.com.eg',
        ownerDepartment: owner ? owner.department : 'Banking Operations',
        assignedCheckerId: latestReview?.checkerId || null,
        assignedCheckerName,
        assignedCheckerEmail,
        activeVersionNumber: activeVersion.versionNumber,
        activeVersionStatus: activeVersion.status,
        sectionsCount: sections.length,
        slaHours,
        turnaroundHours,
        turnaroundFormatted,
        isSlaBreached,
        assignedAt: latestReview?.assignedAt || null,
        decisionAt: latestReview?.decisionAt || null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      });
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      return items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.documentCode.toLowerCase().includes(q) ||
          p.ownerName.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)),
      );
    }

    return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Helper to lookup SLA hours for a category with DB persistence & mock fallback
   */
  public static async getSlaHoursForCategory(category: string): Promise<number> {
    const trimmedCat = (category || '').trim();
    if (!trimmedCat) return 24;

    try {
      const config = await prisma.slaConfig.findUnique({
        where: { category: trimmedCat },
      });
      if (config) return config.slaHours;
    } catch {
      // Fallback
    }

    const mockConfig = mockSlaConfigs.find(
      (c) => c.category.toLowerCase() === trimmedCat.toLowerCase(),
    );
    return mockConfig ? mockConfig.slaHours : 24;
  }

  /**
   * GET /api/admin/sla-config
   * Return configured default turnaround SLA hours for all categories
   */
  public static async getSlaConfigs(): Promise<SlaConfigItem[]> {
    try {
      const dbConfigs = await prisma.slaConfig.findMany({
        orderBy: { category: 'asc' },
      });
      if (dbConfigs.length > 0) {
        return dbConfigs.map((c) => ({
          id: c.id,
          category: c.category,
          slaHours: c.slaHours,
          description: c.description || undefined,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
      }
    } catch {
      // Fallback
    }
    return mockSlaConfigs.sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * PUT /api/admin/sla-config
   * Configure default turnaround SLA hours for a specific category
   */
  public static async updateSlaConfig(
    category: string,
    slaHours: number,
    adminId: string,
    description?: string,
  ): Promise<SlaConfigItem> {
    if (!category || !category.trim()) {
      const err = new Error('Category name is required');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    if (!slaHours || slaHours <= 0 || slaHours > 336) {
      const err = new Error('SLA hours must be a positive integer between 1 and 336 (max 14 days)');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const trimmedCat = category.trim();
    const roundedHours = Math.round(slaHours);

    try {
      const dbConfig = await prisma.slaConfig.upsert({
        where: { category: trimmedCat },
        update: {
          slaHours: roundedHours,
          ...(description !== undefined ? { description } : {}),
        },
        create: {
          category: trimmedCat,
          slaHours: roundedHours,
          description,
        },
      });

      await AuditService.logAction(
        adminId,
        'sla_config_updated',
        'SlaConfig',
        dbConfig.id,
        {
          category: trimmedCat,
          slaHours: dbConfig.slaHours,
        },
      );

      return {
        id: dbConfig.id,
        category: dbConfig.category,
        slaHours: dbConfig.slaHours,
        description: dbConfig.description || undefined,
        createdAt: dbConfig.createdAt,
        updatedAt: dbConfig.updatedAt,
      };
    } catch {
      // Fallback
    }

    const existing = mockSlaConfigs.find(
      (s) => s.category.toLowerCase() === trimmedCat.toLowerCase(),
    );

    let updatedConfig: SlaConfigItem;

    if (existing) {
      existing.slaHours = roundedHours;
      if (description !== undefined) existing.description = description;
      existing.updatedAt = new Date();
      updatedConfig = existing;
    } else {
      updatedConfig = {
        id: this.uuid(),
        category: trimmedCat,
        slaHours: roundedHours,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSlaConfigs.push(updatedConfig);
    }

    // Log action to AuditLog
    await AuditService.logAction(
      adminId,
      'sla_config_updated',
      'SlaConfig',
      updatedConfig.id,
      {
        category: trimmedCat,
        slaHours: updatedConfig.slaHours,
      },
    );

    return updatedConfig;
  }

  /**
   * GET /api/admin/users
   * List all enterprise users with authored policy and assigned review metrics
   */
  public static async getAllUsers(search?: string, role?: UserRole): Promise<AdminUserItem[]> {
    // 1. Prisma DB Path
    try {
      const where: Record<string, unknown> = {};
      if (role) {
        where.role = role;
      }

      const dbUsers = await prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              policies: true,
              assignedReviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbUsers.length > 0) {
        let list = dbUsers.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          department: u.department,
          isActive: u.isActive,
          authoredPoliciesCount: u._count.policies,
          assignedReviewsCount: u._count.assignedReviews,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        }));

        if (search) {
          const q = search.toLowerCase().trim();
          list = list.filter(
            (u) =>
              u.fullName.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              (u.department && u.department.toLowerCase().includes(q)),
          );
        }

        return list;
      }
    } catch {
      // Fallback
    }

    // 2. Mock Fallback Path
    let list = mockUsers.map((u) => {
      const authored = mockPolicies.filter((p) => p.ownerId === u.id).length;
      const assigned = mockReviews.filter((r) => r.checkerId === u.id).length;

      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        department: u.department,
        isActive: u.isActive !== undefined ? u.isActive : true,
        authoredPoliciesCount: authored,
        assignedReviewsCount: assigned,
        createdAt: u.createdAt,
        updatedAt: u.createdAt,
      };
    });

    if (role) {
      list = list.filter((u) => u.role === role);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.department && u.department.toLowerCase().includes(q)),
      );
    }

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * POST /api/admin/users
   * Create a new enterprise user account
   */
  public static async createUser(
    adminId: string,
    input: CreateUserInput,
  ): Promise<AdminUserItem> {
    if (!input.email || !input.password || !input.fullName || !input.role) {
      const err = new Error('Email, password, fullName, and role are required fields');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    // Check if email already exists
    const existing = await AuthService.findUserByEmail(normalizedEmail);
    if (existing) {
      const err = new Error(`User with email '${normalizedEmail}' already exists`);
      (err as unknown as { statusCode: number }).statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const now = new Date();

    // 1. Prisma DB Path
    try {
      const dbUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: input.fullName.trim(),
          role: input.role,
          department: input.department?.trim() || null,
          isActive: true,
        },
      });

      await AuditService.logAction(
        adminId,
        'user_created',
        'User',
        dbUser.id,
        {
          email: dbUser.email,
          role: dbUser.role,
          department: dbUser.department,
        },
      );

      return {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        department: dbUser.department,
        isActive: dbUser.isActive,
        authoredPoliciesCount: 0,
        assignedReviewsCount: 0,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      };
    } catch {
      // Fallback
    }

    // 2. Mock Fallback Path
    const newMockUser = {
      id: this.uuid(),
      email: normalizedEmail,
      passwordHash,
      fullName: input.fullName.trim(),
      role: input.role,
      department: input.department?.trim() || '',
      isActive: true,
      createdAt: now,
    };

    mockUsers.push(newMockUser);

    await AuditService.logAction(
      adminId,
      'user_created',
      'User',
      newMockUser.id,
      {
        email: newMockUser.email,
        role: newMockUser.role,
        department: newMockUser.department,
      },
    );

    return {
      id: newMockUser.id,
      email: newMockUser.email,
      fullName: newMockUser.fullName,
      role: newMockUser.role,
      department: newMockUser.department,
      isActive: true,
      authoredPoliciesCount: 0,
      assignedReviewsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * PUT /api/admin/users/:id
   * Update an existing user's role, department, or active status
   */
  public static async updateUser(
    adminId: string,
    targetUserId: string,
    input: UpdateUserInput,
  ): Promise<AdminUserItem> {
    const user = await AuthService.findUserById(targetUserId);
    if (!user) {
      const err = new Error(`User with ID '${targetUserId}' not found`);
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const now = new Date();

    // 1. Prisma DB Path
    try {
      const dbUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          ...(input.fullName ? { fullName: input.fullName.trim() } : {}),
          ...(input.role ? { role: input.role } : {}),
          ...(input.department !== undefined ? { department: input.department?.trim() || null } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        include: {
          _count: {
            select: {
              policies: true,
              assignedReviews: true,
            },
          },
        },
      });

      await AuditService.logAction(
        adminId,
        'user_updated',
        'User',
        targetUserId,
        {
          role: dbUser.role,
          department: dbUser.department,
          isActive: dbUser.isActive,
        },
      );

      return {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        department: dbUser.department,
        isActive: dbUser.isActive,
        authoredPoliciesCount: dbUser._count.policies,
        assignedReviewsCount: dbUser._count.assignedReviews,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      };
    } catch {
      // Fallback
    }

    // 2. Mock Fallback Path
    const mockUser = mockUsers.find((u) => u.id === targetUserId);
    if (mockUser) {
      if (input.fullName) mockUser.fullName = input.fullName.trim();
      if (input.role) mockUser.role = input.role;
      if (input.department !== undefined) mockUser.department = input.department?.trim() || '';
      if (input.isActive !== undefined) mockUser.isActive = input.isActive;
    }

    await AuditService.logAction(
      adminId,
      'user_updated',
      'User',
      targetUserId,
      {
        role: mockUser?.role,
        department: mockUser?.department,
        isActive: mockUser?.isActive,
      },
    );

    const authored = mockPolicies.filter((p) => p.ownerId === targetUserId).length;
    const assigned = mockReviews.filter((r) => r.checkerId === targetUserId).length;

    return {
      id: targetUserId,
      email: mockUser ? mockUser.email : user.email,
      fullName: mockUser ? mockUser.fullName : user.fullName,
      role: mockUser ? mockUser.role : user.role,
      department: mockUser ? mockUser.department : user.department,
      isActive: mockUser && mockUser.isActive !== undefined ? mockUser.isActive : true,
      authoredPoliciesCount: authored,
      assignedReviewsCount: assigned,
      createdAt: mockUser ? mockUser.createdAt : user.createdAt,
      updatedAt: now,
    };
  }

  /**
   * GET /api/admin/final-approvals
   * Returns all completed and approved policies with full details about the Author (USER),
   * the Reviewer (CHECKER), SLA turnaround calculations, and feedback.
   */
  public static async getFinalApprovedPolicies(): Promise<FinalApprovedPolicyItem[]> {
    // 1. Prisma DB Path
    try {
      const dbReviews = await prisma.policyReview.findMany({
        where: {
          decision: 'APPROVED',
        },
        include: {
          policy: {
            include: {
              owner: true,
            },
          },
          checker: true,
          version: true,
        },
        orderBy: {
          decisionAt: 'desc',
        },
      });

      if (dbReviews.length > 0) {
        return dbReviews.map((r) => {
          const clockStart = r.assignedAt ? new Date(r.assignedAt) : new Date(r.queuedAt);
          const decisionAt = r.decisionAt ? new Date(r.decisionAt) : new Date();
          const turnaroundMs = Math.max(0, decisionAt.getTime() - clockStart.getTime());
          const turnaroundHours = Math.round((turnaroundMs / (1000 * 60 * 60)) * 10) / 10;
          const mins = Math.floor((turnaroundMs / (1000 * 60)) % 60);
          const hrs = Math.floor(turnaroundMs / (1000 * 60 * 60));
          const turnaroundFormatted = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

          return {
            id: r.id,
            policyId: r.policyId,
            policyTitle: r.policy.title,
            documentCode: r.policy.documentCode,
            category: r.policy.category,
            versionNumber: r.version.versionNumber,
            sourceFileUrl: r.version.sourceFileUrl || null,
            authorId: r.policy.ownerId,
            authorName: r.policy.owner.fullName,
            authorEmail: r.policy.owner.email,
            authorDepartment: r.policy.owner.department,
            submittedAt: r.version.submittedAt || r.queuedAt,
            checkerId: r.checkerId || '',
            checkerName: r.checker ? r.checker.fullName : 'Compliance Checker',
            checkerEmail: r.checker ? r.checker.email : '',
            checkerDepartment: r.checker ? r.checker.department : 'Compliance & Review',
            claimedAt: r.assignedAt,
            approvedAt: r.decisionAt,
            slaHours: r.slaHours || 24,
            turnaroundHours,
            turnaroundFormatted,
            isSlaBreached: Boolean(r.slaBreached),
            slaStatus: r.slaBreached ? 'COMPLETED_BREACHED' : 'COMPLETED_ON_TIME',
            feedback: r.feedback || null,
          };
        });
      }
    } catch {
      // Fallback
    }

    // 2. Mock Fallback Path
    const approvedReviews = mockReviews
      .filter((r) => r.decision === 'APPROVED')
      .sort((a, b) => {
        const timeA = a.decisionAt ? new Date(a.decisionAt).getTime() : 0;
        const timeB = b.decisionAt ? new Date(b.decisionAt).getTime() : 0;
        return timeB - timeA;
      });

    const items: FinalApprovedPolicyItem[] = [];
    for (const r of approvedReviews) {
      const policy = mockPolicies.find((p) => p.id === r.policyId);
      if (!policy) continue;

      const author = mockUsers.find((u) => u.id === policy.ownerId);
      const checker = mockUsers.find((u) => u.id === r.checkerId);
      const version = mockVersions.find((v) => v.id === r.versionId);

      const clockStart = r.assignedAt ? new Date(r.assignedAt) : new Date(r.queuedAt);
      const decisionAt = r.decisionAt ? new Date(r.decisionAt) : new Date();
      const turnaroundMs = Math.max(0, decisionAt.getTime() - clockStart.getTime());
      const turnaroundHours = Math.round((turnaroundMs / (1000 * 60 * 60)) * 10) / 10;
      const mins = Math.floor((turnaroundMs / (1000 * 60)) % 60);
      const hrs = Math.floor(turnaroundMs / (1000 * 60 * 60));
      const turnaroundFormatted = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

      items.push({
        id: r.id,
        policyId: policy.id,
        policyTitle: policy.title,
        documentCode: policy.documentCode,
        category: policy.category,
        versionNumber: version ? version.versionNumber : 1,
        sourceFileUrl: version ? version.sourceFileUrl || null : null,
        authorId: policy.ownerId,
        authorName: author ? author.fullName : 'Policy Author',
        authorEmail: author ? author.email : 'author@nbe.com.eg',
        authorDepartment: author ? author.department : 'Banking Operations',
        submittedAt: version ? version.submittedAt || r.queuedAt : r.queuedAt,
        checkerId: r.checkerId || '',
        checkerName: checker ? checker.fullName : 'Compliance Checker',
        checkerEmail: checker ? checker.email : 'checker@nbe.com.eg',
        checkerDepartment: checker ? checker.department : 'Compliance & Review',
        claimedAt: r.assignedAt,
        approvedAt: r.decisionAt,
        slaHours: r.slaHours || 24,
        turnaroundHours,
        turnaroundFormatted,
        isSlaBreached: Boolean(r.slaBreached),
        slaStatus: r.slaBreached ? 'COMPLETED_BREACHED' : 'COMPLETED_ON_TIME',
        feedback: r.feedback || null,
      });
    }

    return items;
  }

  /**
   * POST /api/admin/policies/:id/unlock
   * Reset a QUEUED or UNDER_REVIEW policy back to DRAFT so the owner can edit.
   * Cancels the active review and records an audit entry.
   */
  public static async unlockPolicy(
    policyId: string,
    adminId: string,
    reason?: string,
  ): Promise<{ message: string; policyId: string }> {
    const unlockReason = reason?.trim() || 'Admin override — policy returned to DRAFT for revision.';

    // 1. Prisma DB path
    try {
      const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        include: {
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          reviews: {
            where: { decision: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!policy) {
        const err = new Error('Policy not found');
        (err as unknown as { statusCode: number }).statusCode = 404;
        throw err;
      }

      if (!['QUEUED', 'UNDER_REVIEW'].includes(policy.currentStatus)) {
        const err = new Error(
          `Policy cannot be unlocked from status: ${policy.currentStatus}. Only QUEUED or UNDER_REVIEW policies can be unlocked.`,
        );
        (err as unknown as { statusCode: number }).statusCode = 400;
        throw err;
      }

      const activeVersion = policy.versions[0];
      const activeReview = policy.reviews[0];

      // Reset policy & version status in a transaction
      await prisma.$transaction(async (tx) => {
        // Reset policy status
        await tx.policy.update({
          where: { id: policyId },
          data: { currentStatus: 'DRAFT' },
        });

        // Reset active version status back to DRAFT
        if (activeVersion) {
          await tx.policyVersion.update({
            where: { id: activeVersion.id },
            data: { status: 'DRAFT', submittedAt: null },
          });
        }

        // Cancel the active review
        if (activeReview) {
          await tx.policyReview.update({
            where: { id: activeReview.id },
            data: {
              decision: 'CHANGES_REQUESTED',
              feedback: `[Admin Unlock] ${unlockReason}`,
              decisionAt: new Date(),
            },
          });
        }
      });

      // Log to audit trail
      await AuditService.logAction(
        adminId,
        'ADMIN_UNLOCK_POLICY',
        'Policy',
        policyId,
        { reason: unlockReason, previousStatus: policy.currentStatus },
      );

      return { message: 'Policy successfully unlocked and returned to DRAFT', policyId };
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      // If it's a business error (404/400), rethrow
      if (error.statusCode && error.statusCode < 500) throw err;
      // Otherwise fall through to in-memory path
    }

    // 2. In-memory fallback
    const mockPolicy = mockPolicies.find((p) => p.id === policyId);
    if (!mockPolicy) {
      const err = new Error('Policy not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (!['QUEUED', 'UNDER_REVIEW'].includes(mockPolicy.currentStatus)) {
      const err = new Error(
        `Policy cannot be unlocked from status: ${mockPolicy.currentStatus}`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    // Reset policy status
    mockPolicy.currentStatus = 'DRAFT' as typeof mockPolicy.currentStatus;
    mockPolicy.updatedAt = new Date();

    // Reset the latest version back to DRAFT
    const versions = mockVersions.filter((v) => v.policyId === policyId);
    const latestVersion = versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
    if (latestVersion) {
      latestVersion.status = 'DRAFT' as typeof latestVersion.status;
      latestVersion.submittedAt = null;
      latestVersion.updatedAt = new Date();
    }

    // Cancel the active review
    const activeReview = mockReviews
      .filter((r) => r.policyId === policyId && r.decision === 'PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (activeReview) {
      activeReview.decision = 'CHANGES_REQUESTED' as typeof activeReview.decision;
      activeReview.feedback = `[Admin Unlock] ${unlockReason}`;
      activeReview.decisionAt = new Date();
      activeReview.updatedAt = new Date();
    }

    return { message: 'Policy successfully unlocked and returned to DRAFT (in-memory)', policyId };
  }
}

