import { PolicyLifecycleSubject } from './policyLifecycle.subject';
import { NotificationObserver } from './observers/notification.observer';
import { AuditLogObserver } from './observers/auditLog.observer';

export * from './policyLifecycle.types';
export * from './policyLifecycle.subject';
export * from './observers/notification.observer';
export * from './observers/auditLog.observer';

/**
 * Initialize default observers on application boot
 */
export function initializePolicyEventObservers(): void {
  PolicyLifecycleSubject.attach(new NotificationObserver());
  PolicyLifecycleSubject.attach(new AuditLogObserver());
  console.info('🏛️ [NBE Observer System] Policy lifecycle observers registered successfully.');
}

// Auto-initialize upon import
initializePolicyEventObservers();
