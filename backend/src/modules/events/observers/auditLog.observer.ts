import { IPolicyLifecycleObserver, PolicyLifecycleEventPayload } from '../policyLifecycle.types';
import { AuditService } from '../../audit/audit.service';

/**
 * 📋 AuditLogObserver (Concrete Observer)
 * Decouples regulatory audit logging from policy and review operations.
 * Captures an immutable compliance trail for every lifecycle transition.
 */
export class AuditLogObserver implements IPolicyLifecycleObserver {
  public readonly name = 'AuditLogObserver';

  public async onLifecycleEvent(event: PolicyLifecycleEventPayload): Promise<void> {
    let action = 'policy_action';

    switch (event.eventType) {
      case 'POLICY_CREATED':
        action = 'policy_created';
        break;
      case 'POLICY_VERSION_CREATED':
        action = 'policy_version_created';
        break;
      case 'POLICY_SUBMITTED':
        action = 'policy_submitted';
        break;
      case 'POLICY_CLAIMED':
        action = 'review_claimed';
        break;
      case 'POLICY_APPROVED':
        action = 'policy_approved';
        break;
      case 'POLICY_CHANGES_REQUESTED':
        action = 'policy_changes_requested';
        break;
      case 'POLICY_SLA_BREACHED':
        action = 'sla_breached';
        break;
      default:
        action = 'policy_action';
        break;
    }

    try {
      await AuditService.logAction(
        event.actorId,
        action,
        event.versionId ? 'PolicyVersion' : 'Policy',
        event.versionId || event.policyId,
        {
          policyId: event.policyId,
          versionNumber: event.versionNumber,
          documentCode: event.documentCode,
          title: event.title,
          category: event.category,
          ownerId: event.ownerId,
          checkerId: event.checkerId,
          turnaroundHours: event.turnaroundHours,
          isSlaBreached: event.isSlaBreached,
          feedback: event.feedback,
          ...(event.metadata || {}),
        },
      );
    } catch (error) {
      console.error(`[AuditLogObserver] Failed to record audit log for '${action}':`, error);
    }
  }
}
