export type NotificationType =
  | 'POLICY_SUBMITTED'
  | 'REVIEW_ASSIGNED'
  | 'REVIEW_REASSIGNED'
  | 'DECISION_APPROVED'
  | 'DECISION_CHANGES_REQUESTED'
  | 'SLA_AT_RISK'
  | 'SLA_BREACHED';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  relatedEntityId: string;
  relatedEntityType: 'Policy' | 'PolicyReview';
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}
