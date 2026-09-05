import { prisma } from '../../database/prisma';
import { NotificationItem, NotificationType } from './notification.types';
import { mockUsers } from '../auth/auth.service';
import { UserRole } from '../auth/auth.types';
import { mockReviews } from '../review/review.service';
import { ReviewDecision } from '../review/review.types';
import { mockPolicies } from '../policy/policy.service';

export const mockNotifications: NotificationItem[] = [];

export class NotificationService {
  private static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Create an in-app notification for a single user
   */
  public static async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    relatedEntityId: string,
    relatedEntityType: 'Policy' | 'PolicyReview' = 'PolicyReview',
  ): Promise<NotificationItem> {
    const item: NotificationItem = {
      id: this.uuid(),
      userId,
      type,
      message,
      relatedEntityId,
      relatedEntityType,
      isRead: false,
      createdAt: new Date(),
    };

    mockNotifications.unshift(item);
    return item;
  }

  /**
   * Broadcast/Send notification to multiple users
   */
  public static async notifyUsers(
    userIds: string[],
    type: NotificationType,
    message: string,
    relatedEntityId: string,
    relatedEntityType: 'Policy' | 'PolicyReview' = 'PolicyReview',
  ): Promise<NotificationItem[]> {
    const items: NotificationItem[] = [];
    for (const userId of userIds) {
      const item = await this.createNotification(
        userId,
        type,
        message,
        relatedEntityId,
        relatedEntityType,
      );
      items.push(item);
    }
    return items;
  }

  /**
   * Send notification to all ADMIN users
   */
  public static async notifyAdmins(
    type: NotificationType,
    message: string,
    relatedEntityId: string,
    relatedEntityType: 'Policy' | 'PolicyReview' = 'Policy',
  ): Promise<NotificationItem[]> {
    let adminUserIds: string[] = [];
    try {
      const dbAdmins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      adminUserIds = dbAdmins.map((u) => u.id);
    } catch {
      // Fallback
    }

    if (adminUserIds.length === 0) {
      adminUserIds = mockUsers.filter((u) => u.role === UserRole.ADMIN).map((u) => u.id);
    }

    return this.notifyUsers(adminUserIds, type, message, relatedEntityId, relatedEntityType);
  }

  /**
   * GET user's notifications (newest first)
   */
  public static async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    return mockNotifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Count unread notifications for a user
   */
  public static async getUnreadCount(userId: string): Promise<number> {
    return mockNotifications.filter((n) => n.userId === userId && !n.isRead).length;
  }

  /**
   * Mark a single notification as read
   */
  public static async markAsRead(notificationId: string, userId: string): Promise<NotificationItem> {
    const notif = mockNotifications.find((n) => n.id === notificationId && n.userId === userId);
    if (!notif) {
      const err = new Error('Notification not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    notif.isRead = true;
    return notif;
  }

  /**
   * Mark all notifications for a user as read
   */
  public static async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const userNotifs = mockNotifications.filter((n) => n.userId === userId && !n.isRead);
    userNotifs.forEach((n) => {
      n.isRead = true;
    });
    return { updatedCount: userNotifs.length };
  }

  /**
   * Check SLA status across all active reviews and generate alerts if AT_RISK or BREACHED
   */
  public static async checkSlaAndNotify(): Promise<{ atRiskNotified: number; breachedNotified: number }> {
    const pendingReviews = mockReviews.filter((r) => r.decision === ReviewDecision.PENDING);
    const now = Date.now();
    const adminUsers = mockUsers.filter((u) => u.role === UserRole.ADMIN);

    let atRiskNotified = 0;
    let breachedNotified = 0;

    for (const r of pendingReviews) {
      if (!r.assignedAt) continue; // Evaluation SLA clock starts only when claimed
      const clockStart = new Date(r.assignedAt);
      const deadline = clockStart.getTime() + r.slaHours * 3600 * 1000;
      const remainingMs = deadline - now;
      const policy = mockPolicies.find((p) => p.id === r.policyId);
      const docCode = policy ? policy.documentCode : 'POL-UNKNOWN';

      if (remainingMs <= 0) {
        // SLA BREACHED alert
        // Check if already notified about BREACH for this review
        const existingBreachedNotif = mockNotifications.find(
          (n) => n.relatedEntityId === r.id && n.type === 'SLA_BREACHED',
        );

        if (!existingBreachedNotif) {
          const message = `🚨 SLA BREACH: Compliance review for ${docCode} has exceeded the ${r.slaHours}h deadline!`;
          const recipients = [...adminUsers.map((a) => a.id)];
          if (r.checkerId && !recipients.includes(r.checkerId)) {
            recipients.push(r.checkerId);
          }

          await this.notifyUsers(recipients, 'SLA_BREACHED', message, r.id, 'PolicyReview');
          breachedNotified += recipients.length;
        }
      } else if (remainingMs <= 4 * 3600 * 1000) {
        // SLA AT_RISK alert (< 4h remaining)
        const existingAtRiskNotif = mockNotifications.find(
          (n) => n.relatedEntityId === r.id && n.type === 'SLA_AT_RISK',
        );

        if (!existingAtRiskNotif) {
          const remainingHours = Math.max(1, Math.round(remainingMs / (3600 * 1000)));
          const message = `⚠️ SLA Warning: Compliance review for ${docCode} is AT RISK with ${remainingHours}h remaining.`;
          const recipients = [...adminUsers.map((a) => a.id)];
          if (r.checkerId && !recipients.includes(r.checkerId)) {
            recipients.push(r.checkerId);
          }

          await this.notifyUsers(recipients, 'SLA_AT_RISK', message, r.id, 'PolicyReview');
          atRiskNotified += recipients.length;
        }
      }
    }

    return { atRiskNotified, breachedNotified };
  }
}
