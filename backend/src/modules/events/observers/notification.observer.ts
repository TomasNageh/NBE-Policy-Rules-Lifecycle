import { IPolicyLifecycleObserver, PolicyLifecycleEventPayload } from '../policyLifecycle.types';
import { NotificationService } from '../../notification/notification.service';

/**
 * 🔔 NotificationObserver (Concrete Observer)
 * Decouples in-app notification dispatching from business logic.
 * Responds to policy lifecycle events and sends appropriate alerts to Authors, Checkers, and Admins.
 */
export class NotificationObserver implements IPolicyLifecycleObserver {
  public readonly name = 'NotificationObserver';

  public async onLifecycleEvent(event: PolicyLifecycleEventPayload): Promise<void> {
    switch (event.eventType) {
      case 'POLICY_SUBMITTED': {
        // Notify Author of successful queueing
        await NotificationService.createNotification(
          event.ownerId,
          'REVIEW_ASSIGNED',
          `Policy '${event.documentCode} - ${event.title}' (v${event.versionNumber || 1}.0) has been submitted for compliance review. Target SLA: ${event.slaHours || 24} hours.`,
          event.policyId,
          'Policy',
        );
        break;
      }

      case 'POLICY_CLAIMED': {
        // Notify Policy Author that reviewer has claimed the review
        await NotificationService.createNotification(
          event.ownerId,
          'REVIEW_ASSIGNED',
          `Compliance Reviewer ${event.checkerName || 'Checker'} has claimed policy '${event.documentCode} - ${event.title}' for review.`,
          event.policyId,
          'Policy',
        );
        break;
      }

      case 'POLICY_APPROVED': {
        const turnaroundText = event.turnaroundHours !== undefined ? `${event.turnaroundHours}h` : '';
        const slaStatusText = event.isSlaBreached ? '⚠️ SLA BREACHED' : `✅ WITHIN SLA (${turnaroundText} turnaround)`;

        // 1. Notify Author
        await NotificationService.createNotification(
          event.ownerId,
          'DECISION_APPROVED',
          `Compliance evaluation for '${event.documentCode} - ${event.title}' has been APPROVED by Checker ${event.checkerName || 'Reviewer'}.`,
          event.policyId,
          'Policy',
        );

        // 2. Broadcast Final Approval Alert to all Admins with User & Checker details
        await NotificationService.notifyAdmins(
          'DECISION_APPROVED',
          `Final Policy Approved: '${event.documentCode} - ${event.title}' (v${event.versionNumber || 2}.0) approved by Checker ${event.checkerName || 'Checker'} • Author: ${event.ownerName || 'Author'} (${event.ownerDepartment || 'Operations'}) • ${slaStatusText}`,
          event.policyId,
          'Policy',
        );
        break;
      }

      case 'POLICY_CHANGES_REQUESTED': {
        const feedbackPreview = event.feedback ? ` Reason: "${event.feedback.slice(0, 100)}..."` : '';

        // Notify Author of required revisions
        await NotificationService.createNotification(
          event.ownerId,
          'DECISION_CHANGES_REQUESTED',
          `Changes requested for '${event.documentCode} - ${event.title}' by Checker ${event.checkerName || 'Reviewer'}.${feedbackPreview}`,
          event.policyId,
          'Policy',
        );
        break;
      }

      case 'POLICY_SLA_BREACHED': {
        // Notify Admins of SLA escalation breach
        await NotificationService.notifyAdmins(
          'SLA_BREACHED',
          `⚠️ SLA Escalation: Policy '${event.documentCode} - ${event.title}' has exceeded its ${event.slaHours || 24}h turnaround SLA window.`,
          event.policyId,
          'PolicyReview',
        );
        break;
      }

      default:
        break;
    }
  }
}
