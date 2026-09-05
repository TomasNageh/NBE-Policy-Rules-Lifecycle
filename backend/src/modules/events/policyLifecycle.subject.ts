import { IPolicyLifecycleObserver, PolicyLifecycleEventPayload } from './policyLifecycle.types';

/**
 * 🏛️ PolicyLifecycleSubject (Observer Pattern - Subject / Observable)
 * Central event bus and dispatcher for all National Bank of Egypt policy lifecycle transitions.
 * Allows decoupled observers (Notifications, Audit Trail, Executive Alerts) to react autonomously.
 */
export class PolicyLifecycleSubject {
  private static observers: Map<string, IPolicyLifecycleObserver> = new Map();

  /**
   * Register a new observer to receive policy lifecycle events
   */
  public static attach(observer: IPolicyLifecycleObserver): void {
    if (!this.observers.has(observer.name)) {
      this.observers.set(observer.name, observer);
      console.info(`[PolicyLifecycleSubject] 📡 Attached observer: '${observer.name}'`);
    }
  }

  /**
   * Unregister an observer by name
   */
  public static detach(observerName: string): void {
    if (this.observers.has(observerName)) {
      this.observers.delete(observerName);
      console.info(`[PolicyLifecycleSubject] 🔌 Detached observer: '${observerName}'`);
    }
  }

  /**
   * Get all currently attached observers
   */
  public static getObservers(): IPolicyLifecycleObserver[] {
    return Array.from(this.observers.values());
  }

  /**
   * Notify all registered observers of a policy lifecycle event
   */
  public static async notify(event: PolicyLifecycleEventPayload): Promise<void> {
    const observerList = Array.from(this.observers.values());
    if (observerList.length === 0) return;

    const dispatchPromises = observerList.map(async (observer) => {
      try {
        await observer.onLifecycleEvent(event);
      } catch (error) {
        console.error(
          `[PolicyLifecycleSubject] ❌ Error executing observer '${observer.name}' for event '${event.eventType}':`,
          error,
        );
      }
    });

    await Promise.all(dispatchPromises);
  }
}
