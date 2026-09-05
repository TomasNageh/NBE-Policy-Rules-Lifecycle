export type PolicyLifecycleEventType =
  | 'POLICY_CREATED'
  | 'POLICY_VERSION_CREATED'
  | 'POLICY_SUBMITTED'
  | 'POLICY_CLAIMED'
  | 'POLICY_APPROVED'
  | 'POLICY_CHANGES_REQUESTED'
  | 'POLICY_SLA_BREACHED';

export interface PolicyLifecycleEventPayload {
  eventType: PolicyLifecycleEventType;
  policyId: string;
  versionId?: string;
  versionNumber?: number;
  documentCode: string;
  title: string;
  category: string;
  actorId: string;
  actorName?: string;
  actorRole: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerDepartment?: string;
  checkerId?: string;
  checkerName?: string;
  checkerEmail?: string;
  checkerDepartment?: string;
  slaHours?: number;
  turnaroundHours?: number;
  isSlaBreached?: boolean;
  feedback?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IPolicyLifecycleObserver {
  readonly name: string;
  onLifecycleEvent(event: PolicyLifecycleEventPayload): Promise<void> | void;
}
