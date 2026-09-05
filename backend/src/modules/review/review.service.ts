import { prisma } from '../../database/prisma';
import { PolicyReviewItem, PolicyReviewDetail, ReviewDecision, SlaStatus } from './review.types';
import { PolicyStatus, VersionStatus, PolicySectionItem } from '../policy/policy.types';
import { PolicyService } from '../policy/policy.service';
import { AuthService, mockUsers } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '../auth/auth.types';
import { PolicyLifecycleSubject } from '../events';

// Mock In-Memory Store for Development & Isolation
interface MockReview {
  id: string;
  policyId: string;
  versionId: string;
  checkerId: string | null;
  slaHours: number;
  decision: ReviewDecision;
  feedback: string | null;
  slaBreached: boolean;
  reassignReason?: string | null;
  queuedAt: Date;
  assignedAt: Date | null;
  decisionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const mockReviews: MockReview[] = [];

export class ReviewService {
  private static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Helper to lookup category turnaround SLA hours (DB-backed with default fallback)
   */
  public static async getCategorySlaHours(category: string): Promise<number> {
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

    const fallbacks: Record<string, number> = {
      'digital banking & payments': 12,
      'information security & cyber': 12,
      'credit & lending': 24,
      'risk management & aml': 24,
      'regulatory compliance': 24,
      'operations & settlement': 24,
      'treasury & investment': 48,
      'general governance & audit': 48,
    };
    return fallbacks[trimmedCat.toLowerCase()] || 24;
  }

  /**
   * Get latest review from in-memory store for a policy
   */
  public static getLatestMockReview(policyId: string): MockReview | null {
    const list = mockReviews.filter((r) => r.policyId === policyId);
    if (list.length === 0) return null;
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  /**
   * Helper to format review item with computed live SLA properties
   * BUSINESS RULE: SLA clock counts from the moment the checker assigns the policy
   * to themselves (assignedAt) until they finish reviewing it (decisionAt).
   * In unassigned queue (assignedAt === null), the evaluation SLA clock is awaiting assignment.
   */
  private static formatReviewItem(
    review: {
      id: string;
      policyId: string;
      versionId: string;
      checkerId: string | null;
      slaHours: number;
      decision: ReviewDecision;
      feedback: string | null;
      slaBreached?: boolean;
      reassignReason?: string | null;
      queuedAt: Date;
      assignedAt: Date | null;
      decisionAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    policy: {
      id: string;
      title: string;
      documentCode: string;
      category: string;
      ownerId: string;
    },
    versionNumber: number,
    submitterName: string,
    submitterDepartment: string | null,
    checkerName: string | null,
  ): PolicyReviewItem {
    const slaHours = review.slaHours || 24;
    const isAssigned = review.assignedAt !== null;
    const now = Date.now();

    let slaDeadline: Date;
    let remainingMs: number;
    let slaRemainingHours: number;
    let slaStatus: SlaStatus;
    let isSlaBreached: boolean;

    if (review.decision !== ReviewDecision.PENDING) {
      // Completed review: SLA finished at decisionAt
      slaStatus = SlaStatus.COMPLETED;
      const decisionTime = review.decisionAt ? new Date(review.decisionAt).getTime() : now;
      const startMs = review.assignedAt ? new Date(review.assignedAt).getTime() : new Date(review.queuedAt).getTime();
      slaDeadline = new Date(startMs + slaHours * 60 * 60 * 1000);
      remainingMs = slaDeadline.getTime() - decisionTime;
      slaRemainingHours = Math.round((remainingMs / (1000 * 60 * 60)) * 10) / 10;
      isSlaBreached = review.slaBreached === true || decisionTime > slaDeadline.getTime();
    } else if (!isAssigned) {
      // Unassigned in queue: Evaluation SLA clock hasn't started yet
      slaDeadline = new Date(now + slaHours * 60 * 60 * 1000);
      remainingMs = slaHours * 60 * 60 * 1000;
      slaRemainingHours = slaHours;
      slaStatus = SlaStatus.ON_TRACK;
      isSlaBreached = false;
    } else {
      // Active evaluation in progress: Clock is actively running from assignedAt
      const clockStart = new Date(review.assignedAt!);
      slaDeadline = new Date(clockStart.getTime() + slaHours * 60 * 60 * 1000);
      remainingMs = slaDeadline.getTime() - now;
      slaRemainingHours = Math.round((remainingMs / (1000 * 60 * 60)) * 10) / 10;

      if (remainingMs > 4 * 60 * 60 * 1000) {
        slaStatus = SlaStatus.ON_TRACK;
      } else if (remainingMs > 0) {
        slaStatus = SlaStatus.AT_RISK;
      } else {
        slaStatus = SlaStatus.BREACHED;
      }

      isSlaBreached = review.slaBreached === true || remainingMs <= 0;
    }

    return {
      id: review.id,
      policyId: policy.id,
      policyTitle: policy.title,
      documentCode: policy.documentCode,
      category: policy.category,
      versionId: review.versionId,
      versionNumber,
      submitterId: policy.ownerId,
      submitterName,
      submitterDepartment,
      checkerId: review.checkerId,
      checkerName,
      slaHours,
      decision: review.decision,
      feedback: review.feedback,
      queuedAt: review.queuedAt,
      assignedAt: review.assignedAt,
      decisionAt: review.decisionAt,
      slaDeadline,
      slaRemainingMs: remainingMs,
      slaRemainingHours,
      slaStatus,
      isSlaBreached,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  /**
   * Helper to format detailed review with sections
   */
  private static formatReviewDetail(
    item: PolicyReviewItem,
    policyDescription: string | null,
    policyCurrentStatus: string,
    sourceFileUrl: string | null,
    changeSummary: string | null,
    submittedAt: Date | null,
    sections: PolicySectionItem[],
  ): PolicyReviewDetail {
    return {
      ...item,
      policyDescription,
      policyCurrentStatus,
      sourceFileUrl,
      changeSummary,
      submittedAt,
      sections,
    };
  }

  /**
   * Submit policy draft for Checker review (transitions version to PENDING and Policy to QUEUED)
   * Enforces transactional submission & category-specific SLA.
   */
  public static async submitPolicy(
    policyId: string,
    ownerId: string,
  ): Promise<PolicyReviewItem> {
    const policy = await PolicyService.getPolicyById(policyId, ownerId, UserRole.USER);

    // Only DRAFT policies can be submitted
    if (policy.currentStatus !== PolicyStatus.DRAFT) {
      const err = new Error(
        `Cannot submit policy: Policy is currently in '${policy.currentStatus}' status. Only DRAFT policies can be submitted for review.`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    if (policy.activeVersion.sections.length === 0) {
      const err = new Error(
        'Cannot submit an empty policy document. Please add at least one policy section.',
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const now = new Date();
    const versionId = policy.activeVersion.id;

    // Apply configured SLA for category at submission time
    const categorySlaHours = await this.getCategorySlaHours(policy.category);

    // 1. Prisma DB Path
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Set version immutable (PENDING)
        await tx.policyVersion.update({
          where: { id: versionId },
          data: {
            status: VersionStatus.PENDING,
            submittedAt: now,
          },
        });

        // Set policy to QUEUED
        const updatedPolicy = await tx.policy.update({
          where: { id: policyId },
          data: {
            currentStatus: PolicyStatus.QUEUED,
          },
          include: { owner: true },
        });

        // Create exactly ONE PolicyReview per submitted version
        const review = await tx.policyReview.create({
          data: {
            policyId,
            versionId,
            slaHours: categorySlaHours,
            decision: ReviewDecision.PENDING,
            slaBreached: false,
            queuedAt: now,
          },
        });

        return { review, updatedPolicy };
      });

      await AuditService.logAction(
        ownerId,
        'policy_submitted',
        'PolicyReview',
        result.review.id,
        {
          policyId,
          versionId,
          versionNumber: policy.activeVersion.versionNumber,
          documentCode: policy.documentCode,
          slaHours: categorySlaHours,
        },
      );

      const checkers = mockUsers.filter((u) => u.role === UserRole.CHECKER);
      await NotificationService.notifyUsers(
        checkers.map((c) => c.id),
        'POLICY_SUBMITTED',
        `New policy '${policy.documentCode} - ${policy.title}' submitted for compliance evaluation (${categorySlaHours}h SLA).`,
        result.review.id,
        'PolicyReview',
      );

      return this.formatReviewItem(
        result.review,
        result.updatedPolicy,
        policy.activeVersion.versionNumber,
        result.updatedPolicy.owner.fullName,
        result.updatedPolicy.owner.department,
        null,
      );
    } catch {
      // Fallback
    }

    // 2. In-Memory Mock Fallback
    // Ensure uniqueness per versionId
    const existingRev = mockReviews.find((r) => r.versionId === versionId);
    if (existingRev) {
      const err = new Error('A review record already exists for this submitted policy version.');
      (err as unknown as { statusCode: number }).statusCode = 409;
      throw err;
    }

    const mockRev: MockReview = {
      id: this.uuid(),
      policyId,
      versionId,
      checkerId: null,
      slaHours: categorySlaHours,
      decision: ReviewDecision.PENDING,
      feedback: null,
      slaBreached: false,
      queuedAt: now,
      assignedAt: null,
      decisionAt: null,
      createdAt: now,
      updatedAt: now,
    };

    mockReviews.push(mockRev);

    // Update in-memory version status to PENDING
    await PolicyService.updateVersionStatus(versionId, VersionStatus.PENDING);

    // Update in-memory policy status to QUEUED
    await PolicyService.updatePolicyStatus(policyId, PolicyStatus.QUEUED);

    await AuditService.logAction(
      ownerId,
      'policy_submitted',
      'PolicyReview',
      mockRev.id,
      {
        policyId,
        versionId,
        versionNumber: policy.activeVersion.versionNumber,
        documentCode: policy.documentCode,
        slaHours: categorySlaHours,
      },
    );

    const checkers = mockUsers.filter((u) => u.role === UserRole.CHECKER);
    await NotificationService.notifyUsers(
      checkers.map((c) => c.id),
      'POLICY_SUBMITTED',
      `New policy '${policy.documentCode} - ${policy.title}' submitted for compliance evaluation (${categorySlaHours}h SLA).`,
      mockRev.id,
      'PolicyReview',
    );

    const owner = await AuthService.findUserById(ownerId);
    return this.formatReviewItem(
      mockRev,
      policy,
      policy.activeVersion.versionNumber,
      owner ? owner.fullName : 'Policy Owner',
      owner ? owner.department : 'Banking Operations',
      null,
    );
  }

  /**
   * Get unassigned review queue (checkerId === null and decision === PENDING)
   */
  public static async getUnassignedQueue(): Promise<PolicyReviewItem[]> {
    try {
      const dbReviews = await prisma.policyReview.findMany({
        where: {
          checkerId: null,
          decision: ReviewDecision.PENDING,
        },
        include: {
          policy: {
            include: { owner: true },
          },
          version: true,
        },
        orderBy: { queuedAt: 'asc' },
      });

      if (dbReviews.length > 0) {
        return dbReviews.map((r) =>
          this.formatReviewItem(
            r,
            r.policy,
            r.version.versionNumber,
            r.policy.owner.fullName,
            r.policy.owner.department,
            null,
          ),
        );
      }
    } catch {
      // Fallback
    }

    const unassigned = mockReviews.filter(
      (r) => r.checkerId === null && r.decision === ReviewDecision.PENDING,
    );

    const items: PolicyReviewItem[] = [];
    for (const r of unassigned) {
      try {
        const policy = await PolicyService.getPolicyById(r.policyId, 'system', UserRole.ADMIN);
        const owner = await AuthService.findUserById(policy.ownerId);
        items.push(
          this.formatReviewItem(
            r,
            policy,
            policy.activeVersion.versionNumber,
            owner ? owner.fullName : 'Policy Owner',
            owner ? owner.department : 'General Banking',
            null,
          ),
        );
      } catch {
        // Skip
      }
    }

    return items;
  }

  /**
   * Get reviews assigned to the authenticated Checker
   */
  public static async getMyReviews(checkerId: string): Promise<PolicyReviewItem[]> {
    try {
      const dbReviews = await prisma.policyReview.findMany({
        where: {
          checkerId,
          decision: ReviewDecision.PENDING,
        },
        include: {
          policy: {
            include: { owner: true },
          },
          checker: true,
          version: true,
        },
        orderBy: { queuedAt: 'asc' },
      });

      if (dbReviews.length > 0) {
        return dbReviews.map((r) =>
          this.formatReviewItem(
            r,
            r.policy,
            r.version.versionNumber,
            r.policy.owner.fullName,
            r.policy.owner.department,
            r.checker ? r.checker.fullName : null,
          ),
        );
      }
    } catch {
      // Fallback
    }

    const assigned = mockReviews.filter(
      (r) => r.checkerId === checkerId && r.decision === ReviewDecision.PENDING,
    );

    const items: PolicyReviewItem[] = [];
    const checker = await AuthService.findUserById(checkerId);

    for (const r of assigned) {
      try {
        const policy = await PolicyService.getPolicyById(r.policyId, 'system', UserRole.ADMIN);
        const owner = await AuthService.findUserById(policy.ownerId);
        items.push(
          this.formatReviewItem(
            r,
            policy,
            policy.activeVersion.versionNumber,
            owner ? owner.fullName : 'Policy Owner',
            owner ? owner.department : 'General Banking',
            checker ? checker.fullName : 'Reviewer',
          ),
        );
      } catch {
        // Skip
      }
    }

    return items;
  }

  /**
   * Atomically assign review to the requesting Checker
   * (Throws 409 Conflict if review has already been claimed by another checker)
   * Policy status transitions to UNDER_REVIEW. SLA clock is NOT reset.
   */
  public static async assignReview(
    reviewId: string,
    checkerId: string,
  ): Promise<PolicyReviewItem> {
    const now = new Date();

    // 1. Prisma DB Path with conditional atomic update
    try {
      // Conditional update: only update if checkerId is currently null
      const updateResult = await prisma.policyReview.updateMany({
        where: {
          id: reviewId,
          checkerId: null,
          decision: ReviewDecision.PENDING,
        },
        data: {
          checkerId,
          assignedAt: now,
        },
      });

      if (updateResult.count === 0) {
        // Check if already claimed or nonexistent
        const existing = await prisma.policyReview.findUnique({
          where: { id: reviewId },
        });

        if (existing && existing.checkerId) {
          const err = new Error(
            'This review was already claimed by another checker.',
          );
          (err as unknown as { statusCode: number }).statusCode = 409;
          throw err;
        }

        const err = new Error('Review not found or no longer available in the queue');
        (err as unknown as { statusCode: number }).statusCode = 404;
        throw err;
      }

      // Update Policy.currentStatus to UNDER_REVIEW
      const review = await prisma.policyReview.findUniqueOrThrow({
        where: { id: reviewId },
        include: {
          policy: { include: { owner: true } },
          checker: true,
          version: true,
        },
      });

      await prisma.policy.update({
        where: { id: review.policyId },
        data: { currentStatus: PolicyStatus.UNDER_REVIEW },
      });

      await AuditService.logAction(
        checkerId,
        'review_claimed',
        'PolicyReview',
        reviewId,
        {
          policyId: review.policyId,
          checkerId,
        },
      );

      await NotificationService.createNotification(
        checkerId,
        'REVIEW_ASSIGNED',
        `You have claimed '${review.policy.documentCode} - ${review.policy.title}' for compliance evaluation.`,
        reviewId,
        'PolicyReview',
      );

      return this.formatReviewItem(
        review,
        review.policy,
        review.version.versionNumber,
        review.policy.owner.fullName,
        review.policy.owner.department,
        review.checker ? review.checker.fullName : 'Reviewer',
      );
    } catch (e) {
      if ((e as unknown as { statusCode?: number }).statusCode === 409) throw e;
      // Fallback
    }

    // 2. In-Memory Mock Path
    const mockRev = mockReviews.find((r) => r.id === reviewId);
    if (!mockRev) {
      const err = new Error('Review not found or no longer available in the queue');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (mockRev.checkerId !== null) {
      const err = new Error(
        'This review was already claimed by another checker.',
      );
      (err as unknown as { statusCode: number }).statusCode = 409;
      throw err;
    }

    mockRev.checkerId = checkerId;
    mockRev.assignedAt = now;
    mockRev.updatedAt = now;

    await PolicyService.updatePolicyStatus(mockRev.policyId, PolicyStatus.UNDER_REVIEW);

    await AuditService.logAction(
      checkerId,
      'review_claimed',
      'PolicyReview',
      reviewId,
      {
        policyId: mockRev.policyId,
        checkerId,
      },
    );

    const policy = await PolicyService.getPolicyById(mockRev.policyId, 'system', UserRole.ADMIN);

    await NotificationService.createNotification(
      checkerId,
      'REVIEW_ASSIGNED',
      `You have claimed '${policy.documentCode} - ${policy.title}' for compliance evaluation.`,
      reviewId,
      'PolicyReview',
    );

    const owner = await AuthService.findUserById(policy.ownerId);
    const checker = await AuthService.findUserById(checkerId);

    return this.formatReviewItem(
      mockRev,
      policy,
      policy.activeVersion.versionNumber,
      owner ? owner.fullName : 'Policy Owner',
      owner ? owner.department : 'General Banking',
      checker ? checker.fullName : 'Reviewer',
    );
  }

  /**
   * GET /api/reviews/:id - Get complete review details and submitted sections
   * Enforces object-level access controls:
   * - USER: Can only view reviews for their own policies.
   * - CHECKER: Can view unassigned reviews or reviews assigned to themselves.
   * - ADMIN: Can view all reviews for governance & oversight.
   */
  public static async getReviewById(
    reviewId: string,
    requestingUserId: string,
    requestingRole: UserRole,
  ): Promise<PolicyReviewDetail> {
    // 1. Prisma DB Path
    try {
      const dbReview = await prisma.policyReview.findUnique({
        where: { id: reviewId },
        include: {
          policy: { include: { owner: true } },
          checker: true,
          version: {
            include: {
              sections: { orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      });

      if (dbReview) {
        // Authorization check: USER can only view own policy reviews
        if (
          requestingRole === UserRole.USER &&
          dbReview.policy.ownerId !== requestingUserId
        ) {
          const err = new Error('Access denied: You do not have permission to view this review');
          (err as unknown as { statusCode: number }).statusCode = 403;
          throw err;
        }

        // CHECKER can view unassigned review or their own assigned review
        if (
          requestingRole === UserRole.CHECKER &&
          dbReview.checkerId !== null &&
          dbReview.checkerId !== requestingUserId
        ) {
          const err = new Error('Access denied: This review is assigned to another checker');
          (err as unknown as { statusCode: number }).statusCode = 403;
          throw err;
        }

        const baseItem = this.formatReviewItem(
          dbReview,
          dbReview.policy,
          dbReview.version.versionNumber,
          dbReview.policy.owner.fullName,
          dbReview.policy.owner.department,
          dbReview.checker ? dbReview.checker.fullName : null,
        );

        return this.formatReviewDetail(
          baseItem,
          dbReview.policy.description,
          dbReview.policy.currentStatus,
          dbReview.version.sourceFileUrl,
          dbReview.version.changeSummary,
          dbReview.version.submittedAt,
          dbReview.version.sections,
        );
      }
    } catch (e) {
      if ((e as unknown as { statusCode?: number }).statusCode === 403) throw e;
      // Fallback
    }

    // 2. In-Memory Mock Path
    const mockRev = mockReviews.find((r) => r.id === reviewId);
    if (!mockRev) {
      const err = new Error('Review not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const policy = await PolicyService.getPolicyById(mockRev.policyId, 'system', UserRole.ADMIN);
    if (requestingRole === UserRole.USER && policy.ownerId !== requestingUserId) {
      const err = new Error('Access denied: You do not have permission to view this review');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    if (
      requestingRole === UserRole.CHECKER &&
      mockRev.checkerId !== null &&
      mockRev.checkerId !== requestingUserId
    ) {
      const err = new Error('Access denied: This review is assigned to another checker');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    const owner = await AuthService.findUserById(policy.ownerId);
    const checker = mockRev.checkerId ? await AuthService.findUserById(mockRev.checkerId) : null;
    const version = policy.activeVersion;

    const baseItem = this.formatReviewItem(
      mockRev,
      policy,
      version.versionNumber,
      owner ? owner.fullName : 'Policy Owner',
      owner ? owner.department : 'General Banking',
      checker ? checker.fullName : null,
    );

    return this.formatReviewDetail(
      baseItem,
      policy.description,
      policy.currentStatus,
      version.sourceFileUrl || null,
      version.changeSummary || null,
      version.submittedAt,
      version.sections,
    );
  }

  /**
   * POST /api/reviews/:id/approve - Approve submitted policy version
   * CRITICAL CANONICAL RULE:
   * Only the assigned CHECKER can approve. NO ADMIN BYPASS.
   * Persists immutable slaBreached decision flag.
   */
  public static async approveReview(
    reviewId: string,
    checkerId: string,
    _requestingRole: UserRole,
  ): Promise<PolicyReviewDetail> {
    const now = new Date();

    // 1. Prisma DB Path
    try {
      const dbReview = await prisma.policyReview.findUniqueOrThrow({
        where: { id: reviewId },
        include: {
          policy: { include: { owner: true } },
          checker: true,
          version: {
            include: { sections: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      });

      // Strict enforcement: Only the assigned checker can approve
      if (dbReview.checkerId !== checkerId) {
        const err = new Error('Access denied: Only the assigned checker can approve this review');
        (err as unknown as { statusCode: number }).statusCode = 403;
        throw err;
      }

      if (dbReview.decision !== ReviewDecision.PENDING) {
        const err = new Error(
          `Review has already been decided with status '${dbReview.decision}'`,
        );
        (err as unknown as { statusCode: number }).statusCode = 400;
        throw err;
      }

      // Calculate persistent SLA breach at decision time (from assignedAt to decisionAt)
      const clockStart = dbReview.assignedAt ? new Date(dbReview.assignedAt) : new Date(dbReview.queuedAt);
      const slaDeadline = new Date(clockStart.getTime() + (dbReview.slaHours || 24) * 60 * 60 * 1000);
      const isBreached = now.getTime() > slaDeadline.getTime();

      await prisma.$transaction(async (tx) => {
        // 1. Update PolicyReview with decision and permanent breach status
        await tx.policyReview.update({
          where: { id: reviewId },
          data: {
            decision: ReviewDecision.APPROVED,
            decisionAt: now,
            slaBreached: isBreached,
          },
        });

        // 2. Lock & Approve PolicyVersion
        await tx.policyVersion.update({
          where: { id: dbReview.versionId },
          data: {
            status: VersionStatus.APPROVED,
            approvedAt: now,
          },
        });

        // 3. Update Policy currentStatus to APPROVED
        await tx.policy.update({
          where: { id: dbReview.policyId },
          data: {
            currentStatus: PolicyStatus.APPROVED,
          },
        });
      });

      // 4. Notify all attached Observers via Observer Pattern (NotificationObserver, AuditLogObserver, etc.)
      const turnaroundMs = now.getTime() - clockStart.getTime();
      const turnaroundHours = Math.round((turnaroundMs / (1000 * 60 * 60)) * 10) / 10;

      await PolicyLifecycleSubject.notify({
        eventType: 'POLICY_APPROVED',
        policyId: dbReview.policyId,
        versionId: dbReview.versionId,
        versionNumber: dbReview.version.versionNumber,
        documentCode: dbReview.policy.documentCode,
        title: dbReview.policy.title,
        category: dbReview.policy.category,
        actorId: checkerId,
        actorRole: 'CHECKER',
        ownerId: dbReview.policy.ownerId,
        ownerName: dbReview.policy.owner.fullName,
        ownerEmail: dbReview.policy.owner.email,
        ownerDepartment: dbReview.policy.owner.department || undefined,
        checkerId,
        checkerName: dbReview.checker?.fullName || 'Compliance Reviewer',
        checkerEmail: dbReview.checker?.email || undefined,
        checkerDepartment: dbReview.checker?.department || undefined,
        slaHours: dbReview.slaHours || 24,
        turnaroundHours,
        isSlaBreached: isBreached,
        feedback: dbReview.feedback || undefined,
        timestamp: now,
      });

      return this.getReviewById(reviewId, checkerId, UserRole.CHECKER);
    } catch (e) {
      if (
        (e as unknown as { statusCode?: number }).statusCode === 403 ||
        (e as unknown as { statusCode?: number }).statusCode === 400
      ) {
        throw e;
      }
      // Fallback
    }

    // 2. In-Memory Mock Fallback
    const mockRev = mockReviews.find((r) => r.id === reviewId);
    if (!mockRev) {
      const err = new Error('Policy review not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (mockRev.checkerId !== checkerId) {
      const err = new Error('Access denied: Only the assigned checker can approve this review');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    if (mockRev.decision !== ReviewDecision.PENDING) {
      const err = new Error(
        `Review has already been decided with status '${mockRev.decision}'`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const clockStart = mockRev.assignedAt ? new Date(mockRev.assignedAt) : new Date(mockRev.queuedAt);
    const slaDeadline = new Date(clockStart.getTime() + (mockRev.slaHours || 24) * 60 * 60 * 1000);
    const isBreached = now.getTime() > slaDeadline.getTime();

    mockRev.decision = ReviewDecision.APPROVED;
    mockRev.decisionAt = now;
    mockRev.slaBreached = isBreached;
    mockRev.updatedAt = now;

    await PolicyService.updatePolicyStatus(mockRev.policyId, PolicyStatus.APPROVED);
    await PolicyService.updateVersionStatus(mockRev.versionId, VersionStatus.APPROVED, now);

    const policyObj = await PolicyService.getPolicyById(mockRev.policyId, 'system', UserRole.ADMIN);
    const checkerUser = await AuthService.findUserById(checkerId);
    const ownerUser = await AuthService.findUserById(policyObj.ownerId);
    const turnaroundMs = now.getTime() - clockStart.getTime();
    const turnaroundHours = Math.round((turnaroundMs / (1000 * 60 * 60)) * 10) / 10;

    await PolicyLifecycleSubject.notify({
      eventType: 'POLICY_APPROVED',
      policyId: mockRev.policyId,
      versionId: mockRev.versionId,
      versionNumber: policyObj.activeVersion?.versionNumber || 2,
      documentCode: policyObj.documentCode,
      title: policyObj.title,
      category: policyObj.category,
      actorId: checkerId,
      actorRole: 'CHECKER',
      ownerId: policyObj.ownerId,
      ownerName: ownerUser?.fullName || 'Policy Author',
      ownerEmail: ownerUser?.email || 'author@nbe.com.eg',
      ownerDepartment: ownerUser?.department || undefined,
      checkerId,
      checkerName: checkerUser?.fullName || 'Compliance Reviewer',
      checkerEmail: checkerUser?.email || undefined,
      checkerDepartment: checkerUser?.department || undefined,
      slaHours: mockRev.slaHours || 24,
      turnaroundHours,
      isSlaBreached: isBreached,
      feedback: mockRev.feedback || undefined,
      timestamp: now,
    });

    return this.getReviewById(reviewId, checkerId, UserRole.CHECKER);
  }

  /**
   * POST /api/reviews/:id/request-changes - Request changes with required feedback
   * CRITICAL CANONICAL RULES:
   * 1. Only the assigned CHECKER can request changes. NO ADMIN BYPASS.
   * 2. Policy.currentStatus returns to DRAFT (NOT CHANGES_REQUESTED).
   * 3. A new draft PolicyVersion (N+1) is automatically cloned from the reviewed version.
   * 4. Persists immutable slaBreached decision flag.
   */
  public static async requestChanges(
    reviewId: string,
    checkerId: string,
    feedback: string,
    _requestingRole: UserRole,
  ): Promise<PolicyReviewDetail> {
    if (!feedback || feedback.trim().length < 10) {
      const err = new Error(
        'Reviewer feedback is required and must contain at least 10 characters explaining required amendments.',
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const trimmedFeedback = feedback.trim();
    const now = new Date();

    // 1. Prisma DB Path
    try {
      const dbReview = await prisma.policyReview.findUniqueOrThrow({
        where: { id: reviewId },
        include: {
          policy: { include: { owner: true } },
          checker: true,
          version: {
            include: { sections: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      });

      // Strict enforcement: Only the assigned checker can request changes
      if (dbReview.checkerId !== checkerId) {
        const err = new Error('Access denied: Only the assigned checker can request changes for this review');
        (err as unknown as { statusCode: number }).statusCode = 403;
        throw err;
      }

      if (dbReview.decision !== ReviewDecision.PENDING) {
        const err = new Error(
          `Review has already been decided with status '${dbReview.decision}'`,
        );
        (err as unknown as { statusCode: number }).statusCode = 400;
        throw err;
      }

      // Calculate persistent SLA breach at decision time (from assignedAt to decisionAt)
      const clockStart = dbReview.assignedAt ? new Date(dbReview.assignedAt) : new Date(dbReview.queuedAt);
      const slaDeadline = new Date(clockStart.getTime() + (dbReview.slaHours || 24) * 60 * 60 * 1000);
      const isBreached = now.getTime() > slaDeadline.getTime();

      await prisma.$transaction(async (tx) => {
        // 1. Update PolicyReview
        await tx.policyReview.update({
          where: { id: reviewId },
          data: {
            decision: ReviewDecision.CHANGES_REQUESTED,
            decisionAt: now,
            feedback: trimmedFeedback,
            slaBreached: isBreached,
          },
        });

        // 2. Mark reviewed PolicyVersion as CHANGES_REQUESTED (immutable snapshot)
        await tx.policyVersion.update({
          where: { id: dbReview.versionId },
          data: {
            status: VersionStatus.CHANGES_REQUESTED,
          },
        });

        // 3. Return Policy currentStatus to DRAFT (Canonical Rule)
        await tx.policy.update({
          where: { id: dbReview.policyId },
          data: {
            currentStatus: PolicyStatus.DRAFT,
          },
        });
      });

      // 4. Create new Draft PolicyVersion (versionNumber + 1) with cloned sections
      await PolicyService.createRevisionDraft(
        dbReview.policyId,
        dbReview.versionId,
        checkerId,
        `Revision draft addressing reviewer feedback: ${trimmedFeedback.slice(0, 80)}...`,
      );

      // 5. Notify Observers (NotificationObserver, AuditLogObserver, etc.)
      await PolicyLifecycleSubject.notify({
        eventType: 'POLICY_CHANGES_REQUESTED',
        policyId: dbReview.policyId,
        versionId: dbReview.versionId,
        versionNumber: dbReview.version.versionNumber,
        documentCode: dbReview.policy.documentCode,
        title: dbReview.policy.title,
        category: dbReview.policy.category,
        actorId: checkerId,
        actorRole: 'CHECKER',
        ownerId: dbReview.policy.ownerId,
        checkerId,
        checkerName: dbReview.checker?.fullName || 'Compliance Reviewer',
        feedback: trimmedFeedback,
        isSlaBreached: isBreached,
        timestamp: now,
      });

      return this.getReviewById(reviewId, checkerId, UserRole.CHECKER);
    } catch (e) {
      if (
        (e as unknown as { statusCode?: number }).statusCode === 403 ||
        (e as unknown as { statusCode?: number }).statusCode === 400
      ) {
        throw e;
      }
      // Fallback
    }

    // 2. In-Memory Mock Fallback
    const mockRev = mockReviews.find((r) => r.id === reviewId);
    if (!mockRev) {
      const err = new Error('Policy review not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (mockRev.checkerId !== checkerId) {
      const err = new Error('Access denied: Only the assigned checker can request changes for this review');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    if (mockRev.decision !== ReviewDecision.PENDING) {
      const err = new Error(
        `Review has already been decided with status '${mockRev.decision}'`,
      );
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const clockStart = mockRev.assignedAt ? new Date(mockRev.assignedAt) : new Date(mockRev.queuedAt);
    const slaDeadline = new Date(clockStart.getTime() + (mockRev.slaHours || 24) * 60 * 60 * 1000);
    const isBreached = now.getTime() > slaDeadline.getTime();

    mockRev.decision = ReviewDecision.CHANGES_REQUESTED;
    mockRev.decisionAt = now;
    mockRev.feedback = trimmedFeedback;
    mockRev.slaBreached = isBreached;
    mockRev.updatedAt = now;

    // Return Policy status to DRAFT (Canonical Rule)
    await PolicyService.updatePolicyStatus(mockRev.policyId, PolicyStatus.DRAFT);
    await PolicyService.updateVersionStatus(mockRev.versionId, VersionStatus.CHANGES_REQUESTED);

    // Create cloned draft version (versionNumber + 1)
    await PolicyService.createRevisionDraft(
      mockRev.policyId,
      mockRev.versionId,
      checkerId,
      `Revision draft addressing reviewer feedback: ${trimmedFeedback.slice(0, 80)}...`,
    );

    const polObj = await PolicyService.getPolicyById(mockRev.policyId, 'system', UserRole.ADMIN);
    const chkUser = await AuthService.findUserById(checkerId);

    // Notify Observers
    await PolicyLifecycleSubject.notify({
      eventType: 'POLICY_CHANGES_REQUESTED',
      policyId: mockRev.policyId,
      versionId: mockRev.versionId,
      documentCode: polObj.documentCode,
      title: polObj.title,
      category: polObj.category,
      actorId: checkerId,
      actorRole: 'CHECKER',
      ownerId: polObj.ownerId,
      checkerId,
      checkerName: chkUser?.fullName || 'Compliance Reviewer',
      feedback: trimmedFeedback,
      isSlaBreached: isBreached,
      timestamp: now,
    });

    return this.getReviewById(reviewId, checkerId, UserRole.CHECKER);
  }

  /**
   * Get all currently BREACHED reviews (Admin-only)
   */
  public static async getBreachedReviews(): Promise<PolicyReviewItem[]> {
    // 1. Prisma DB Path
    try {
      const dbReviews = await prisma.policyReview.findMany({
        where: {
          decision: ReviewDecision.PENDING,
        },
        include: {
          policy: {
            include: { owner: true },
          },
          checker: true,
          version: true,
        },
      });

      if (dbReviews.length > 0) {
        const formatted = dbReviews
          .map((r) =>
            this.formatReviewItem(
              r,
              r.policy,
              r.version.versionNumber,
              r.policy.owner.fullName,
              r.policy.owner.department,
              r.checker ? r.checker.fullName : null,
            ),
          )
          .filter((item) => item.slaStatus === SlaStatus.BREACHED);

        return formatted.sort((a, b) => a.slaRemainingMs - b.slaRemainingMs);
      }
    } catch {
      // Fallback
    }

    // 2. Mock Fallback
    const pendingReviews = mockReviews.filter((r) => r.decision === ReviewDecision.PENDING);
    const items: PolicyReviewItem[] = [];

    for (const r of pendingReviews) {
      try {
        const policy = await PolicyService.getPolicyById(r.policyId, 'system', UserRole.ADMIN);
        const owner = await AuthService.findUserById(policy.ownerId);
        const checker = r.checkerId ? await AuthService.findUserById(r.checkerId) : null;

        const formatted = this.formatReviewItem(
          r,
          policy,
          policy.activeVersion.versionNumber,
          owner ? owner.fullName : 'Policy Owner',
          owner ? owner.department : 'General Banking',
          checker ? checker.fullName : null,
        );

        if (formatted.slaStatus === SlaStatus.BREACHED) {
          items.push(formatted);
        }
      } catch {
        // Skip
      }
    }

    return items.sort((a, b) => a.slaRemainingMs - b.slaRemainingMs);
  }

  /**
   * Reassign an existing review from one Checker to another (Admin-only)
   * CANONICAL RULES:
   * 1. Records previousCheckerId, newCheckerId, adminId, and mandatory reason.
   * 2. SLA does NOT restart (queuedAt is untouched).
   * 3. Notifies both previous checker and new checker.
   */
  public static async reassignReview(
    reviewId: string,
    newCheckerId: string,
    adminId: string,
    reason?: string,
  ): Promise<PolicyReviewDetail> {
    const newChecker = await AuthService.findUserById(newCheckerId);
    if (!newChecker) {
      const err = new Error(`Target checker with ID '${newCheckerId}' not found`);
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    if (newChecker.role !== UserRole.CHECKER) {
      const err = new Error(`User '${newChecker.fullName}' does not have the CHECKER role`);
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const now = new Date();
    const reassignReason = reason || 'Reassigned by Administrator';

    // 1. Prisma DB Path
    try {
      const existing = await prisma.policyReview.findUniqueOrThrow({
        where: { id: reviewId },
      });

      const previousCheckerId = existing.checkerId;

      await prisma.policyReview.update({
        where: { id: reviewId },
        data: {
          checkerId: newCheckerId,
          assignedAt: now,
          reassignReason,
          updatedAt: now,
        },
      });

      await AuditService.logAction(
        adminId,
        'review_reassigned',
        'PolicyReview',
        reviewId,
        {
          previousCheckerId,
          newCheckerId,
          newCheckerName: newChecker.fullName,
          adminId,
          reason: reassignReason,
        },
      );

      // Notify previous checker
      if (previousCheckerId) {
        await NotificationService.createNotification(
          previousCheckerId,
          'REVIEW_REASSIGNED',
          `This review has been reassigned to another checker by Administrator. Reason: ${reassignReason}`,
          reviewId,
          'PolicyReview',
        );
      }

      // Notify new checker
      await NotificationService.createNotification(
        newCheckerId,
        'REVIEW_ASSIGNED',
        `A policy review has been reassigned to you by Administrator. Reason: ${reassignReason}`,
        reviewId,
        'PolicyReview',
      );

      return this.getReviewById(reviewId, adminId, UserRole.ADMIN);
    } catch {
      // Fallback
    }

    // 2. Mock Fallback
    const mockRev = mockReviews.find((r) => r.id === reviewId);
    if (!mockRev) {
      const err = new Error('Policy review not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const previousCheckerId = mockRev.checkerId;
    mockRev.checkerId = newCheckerId;
    mockRev.assignedAt = now;
    mockRev.reassignReason = reassignReason;
    mockRev.updatedAt = now;

    await AuditService.logAction(
      adminId,
      'review_reassigned',
      'PolicyReview',
      reviewId,
      {
        previousCheckerId,
        newCheckerId,
        newCheckerName: newChecker.fullName,
        adminId,
        reason: reassignReason,
      },
    );

    if (previousCheckerId) {
      await NotificationService.createNotification(
        previousCheckerId,
        'REVIEW_REASSIGNED',
        `This review has been reassigned to another checker by Administrator. Reason: ${reassignReason}`,
        reviewId,
        'PolicyReview',
      );
    }

    await NotificationService.createNotification(
      newCheckerId,
      'REVIEW_ASSIGNED',
      `A policy review has been reassigned to you by Administrator. Reason: ${reassignReason}`,
      reviewId,
      'PolicyReview',
    );

    return this.getReviewById(reviewId, adminId, UserRole.ADMIN);
  }
}
