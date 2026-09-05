import { NotificationService } from '../modules/notification/notification.service';
import { PolicyService } from '../modules/policy/policy.service';
import { ReviewService } from '../modules/review/review.service';
import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/auth/auth.types';

async function runNotificationTests() {
  console.log('🧪 Starting In-App Notifications Verification Tests...');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Fetch seed users
    const owner = await AuthService.findUserByEmail('owner@nbe.com.eg');
    const checker = await AuthService.findUserByEmail('checker@nbe.com.eg');
    const admin = await AuthService.findUserByEmail('admin@nbe.com.eg');

    assert(!!owner && !!checker && !!admin, 'Seed users retrieved');

    const ownerId = owner!.id;
    const checkerId = checker!.id;
    const adminId = admin!.id;
    assert(!!adminId, 'Admin ID retrieved successfully');

    // --- TEST 1: Policy Submission Notification Trigger ---
    console.log('\n--- Test 1: Policy Submission Lifecycle Notification ---');

    const policy = await PolicyService.createPolicy(ownerId, {
      title: 'Branch Cash Handling & Vault Procedures',
      documentCode: 'POL-EGY-NOTIF-001',
      category: 'Operations & Settlement',
      description: 'Dual-control protocols for high-value branch vault operations',
    });

    await PolicyService.addSection(policy.id, ownerId, {
      sectionNumber: 1,
      title: 'Dual Custody Requirements',
      policyStatement: 'All vault access requires simultaneous dual-key authentication.',
    });

    const checkerNotifsBefore = await NotificationService.getUserNotifications(checkerId);
    const countBefore = checkerNotifsBefore.length;

    const submitRes = await ReviewService.submitPolicy(policy.id, ownerId);
    const reviewId = submitRes.id;
    assert(!!reviewId, 'Policy submitted for review');

    const checkerNotifsAfter = await NotificationService.getUserNotifications(checkerId);
    assert(
      checkerNotifsAfter.length > countBefore,
      'Checker received notification upon policy submission',
    );

    const submitNotif = checkerNotifsAfter.find(
      (n) => n.type === 'POLICY_SUBMITTED' && n.relatedEntityId === reviewId,
    );
    assert(!!submitNotif, 'Notification type is POLICY_SUBMITTED');
    assert(
      !!submitNotif && submitNotif.message.includes('POL-EGY-NOTIF-001'),
      'Notification message includes document code',
    );
    assert(submitNotif?.isRead === false, 'New notification is initially unread');

    // --- TEST 2: Review Assignment Notification Trigger ---
    console.log('\n--- Test 2: Review Assignment Lifecycle Notification ---');

    await ReviewService.assignReview(reviewId, checkerId);

    const checkerNotifsAssigned = await NotificationService.getUserNotifications(checkerId);
    const assignNotif = checkerNotifsAssigned.find(
      (n) => n.type === 'REVIEW_ASSIGNED' && n.relatedEntityId === reviewId,
    );
    assert(!!assignNotif, 'Checker received REVIEW_ASSIGNED notification upon claiming review');
    assert(
      !!assignNotif && assignNotif.message.includes('POL-EGY-NOTIF-001'),
      'Assignment notification includes policy code',
    );

    // --- TEST 3: Decision Notifications (Approval & Changes Requested) ---
    console.log('\n--- Test 3: Decision Notifications to Policy Owner ---');

    const ownerNotifsBefore = await NotificationService.getUserNotifications(ownerId);
    const ownerCountBefore = ownerNotifsBefore.length;

    // Approve review
    await ReviewService.approveReview(reviewId, checkerId, UserRole.CHECKER);

    const ownerNotifsAfter = await NotificationService.getUserNotifications(ownerId);
    assert(
      ownerNotifsAfter.length > ownerCountBefore,
      'Policy Owner received notification upon review approval',
    );

    const approveNotif = ownerNotifsAfter.find(
      (n) => n.type === 'DECISION_APPROVED' && n.relatedEntityId === policy.id,
    );
    assert(!!approveNotif, 'Notification type is DECISION_APPROVED');
    assert(
      !!approveNotif && approveNotif.message.includes('APPROVED'),
      'Notification message confirms APPROVED status',
    );

    // Test Changes Requested Notification
    const pol2 = await PolicyService.createPolicy(ownerId, {
      title: 'Cloud Infrastructure Compliance Standard',
      documentCode: 'POL-EGY-NOTIF-002',
      category: 'Information Security & Cyber',
      description: 'Requirements for hybrid cloud deployment in Egyptian territory',
    });
    await PolicyService.addSection(pol2.id, ownerId, {
      sectionNumber: 1,
      title: 'Data Residency',
      policyStatement: 'Customer financial records must reside within Egypt geographic boundary.',
    });
    const sub2 = await ReviewService.submitPolicy(pol2.id, ownerId);
    await ReviewService.assignReview(sub2.id, checkerId);
    await ReviewService.requestChanges(
      sub2.id,
      checkerId,
      'Please detail the data residency audit procedures and encryption key custody model.',
      UserRole.CHECKER,
    );

    const ownerNotifsRevision = await NotificationService.getUserNotifications(ownerId);
    const revisionNotif = ownerNotifsRevision.find(
      (n) => n.type === 'DECISION_CHANGES_REQUESTED' && n.relatedEntityId === pol2.id,
    );
    assert(!!revisionNotif, 'Policy Owner received DECISION_CHANGES_REQUESTED notification');
    assert(
      !!revisionNotif && revisionNotif.message.includes('encryption key'),
      'Notification preview includes reviewer feedback fragment',
    );

    // --- TEST 4: Unread Count, Mark As Read, and Mark All As Read ---
    console.log('\n--- Test 4: Unread Count & Mark-As-Read Mutation ---');

    const unreadCount = await NotificationService.getUnreadCount(ownerId);
    assert(unreadCount >= 2, 'Unread count is accurately computed (>= 2 unread)');

    // Mark single notification as read
    const targetNotif = ownerNotifsRevision[0];
    const readItem = await NotificationService.markAsRead(targetNotif.id, ownerId);
    assert(readItem.isRead === true, 'Notification marked as read');

    const newUnreadCount = await NotificationService.getUnreadCount(ownerId);
    assert(newUnreadCount === unreadCount - 1, 'Unread count decremented by 1');

    // Mark all as read
    const markAllResult = await NotificationService.markAllAsRead(ownerId);
    assert(markAllResult.updatedCount >= 1, 'Mark all as read updated remaining unread items');
    const finalUnreadCount = await NotificationService.getUnreadCount(ownerId);
    assert(finalUnreadCount === 0, 'Final unread count is exactly 0 after mark-all-as-read');

    // --- TEST 5: SLA Breach & At-Risk Notification Generator ---
    console.log('\n--- Test 5: SLA Breach & At-Risk Automatic Alerting ---');

    const slaCheckResult = await NotificationService.checkSlaAndNotify();
    assert(
      typeof slaCheckResult.atRiskNotified === 'number' &&
        typeof slaCheckResult.breachedNotified === 'number',
      'checkSlaAndNotify completed scan without errors',
    );

    // Summary
    console.log(`\n📊 Notification Test Results: ${passed} Passed, ${failed} Failed\n`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite failed with unexpected error:', error);
    process.exit(1);
  }
}

runNotificationTests();
