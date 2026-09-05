import { PolicyService } from '../modules/policy/policy.service';
import { AuthService } from '../modules/auth/auth.service';
import { ReviewService } from '../modules/review/review.service';
import { AuditService } from '../modules/audit/audit.service';
import { PolicyStatus, VersionStatus } from '../modules/policy/policy.types';
import { UserRole } from '../modules/auth/auth.types';

async function runReviewTests() {
  console.info('🧪 Starting NBE Submission Flow, Review Queue & Decision Workflow Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.info(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const owner = await AuthService.findUserByEmail('owner@nbe.com.eg');
  const checker1 = await AuthService.findUserByEmail('checker@nbe.com.eg');
  const checker2 = await AuthService.findUserByEmail('admin@nbe.com.eg');

  const ownerId = owner!.id;
  const checker1Id = checker1!.id;
  const checker2Id = checker2!.id;

  let policyId = '';
  let reviewId = '';

  // Step 1: Create a Draft Policy
  try {
    const docCode = `POL-REV-TEST-${Date.now().toString().slice(-4)}`;
    const policy = await PolicyService.createPolicy(ownerId, {
      title: 'Anti-Money Laundering (AML) Transaction Monitoring Policy',
      documentCode: docCode,
      category: 'Regulatory Compliance & AML/CFT',
      description: 'Transaction monitoring thresholds and STR filing obligations.',
    });

    policyId = policy.id;
    assert(policy.currentStatus === PolicyStatus.DRAFT, 'Policy created in DRAFT status');
  } catch (e) {
    assert(false, `Policy creation failed: ${(e as Error).message}`);
  }

  // Step 2: Submit Policy Draft
  try {
    const review = await ReviewService.submitPolicy(policyId, ownerId);
    reviewId = review.id;

    assert(review.decision === 'PENDING', 'Review record created with decision PENDING');
    assert(review.checkerId === null, 'Review initially unassigned (checkerId is null)');
    assert(review.slaHours === 24, 'Review SLA is set to 24 hours');
    assert(review.slaRemainingHours <= 24 && review.slaRemainingHours > 23.9, 'Computed SLA countdown initialized');
  } catch (e) {
    assert(false, `Policy submission failed: ${(e as Error).message}`);
  }

  // Step 3: Unassigned Queue Listing
  try {
    const queue = await ReviewService.getUnassignedQueue();
    assert(queue.length > 0, 'Unassigned review queue returns items');
    assert(queue.some((r) => r.id === reviewId), 'Submitted review appears in unassigned queue');
  } catch (e) {
    assert(false, `Unassigned queue fetch failed: ${(e as Error).message}`);
  }

  // Step 4: Atomic Assignment (Checker 1 Claims Review)
  try {
    const assigned = await ReviewService.assignReview(reviewId, checker1Id);
    assert(assigned.checkerId === checker1Id, 'Review successfully claimed by Checker 1');
  } catch (e) {
    assert(false, `Assign review failed: ${(e as Error).message}`);
  }

  // Step 5: Secondary Claim Race Condition (Checker 2 Tries to Claim Same Review) -> 409 Conflict
  try {
    await ReviewService.assignReview(reviewId, checker2Id);
    assert(false, 'Secondary claim should have been rejected with 409 Conflict');
  } catch (e) {
    const isConflict =
      (e as unknown as { statusCode?: number }).statusCode === 409 ||
      (e as Error).message.includes('already claimed');
    assert(isConflict, 'Secondary claim rejected with 409 Conflict (race condition protected)');
  }

  // Step 6: Verify My Reviews for Checker 1
  try {
    const myReviews = await ReviewService.getMyReviews(checker1Id);
    assert(myReviews.some((r) => r.id === reviewId), 'Claimed review appears in Checker 1 My Reviews');
  } catch (e) {
    assert(false, `My reviews fetch failed: ${(e as Error).message}`);
  }

  // Step 7: GET /api/reviews/:id (Full Review Detail with Sections)
  try {
    const detail = await ReviewService.getReviewById(reviewId, checker1Id, UserRole.CHECKER);
    assert(detail.id === reviewId, 'Review detail fetched successfully');
    assert(detail.sections.length > 0, 'Review detail includes submitted policy sections');
    assert(detail.submitterName === owner!.fullName, 'Review detail contains submitter info');
    assert(detail.policyTitle.includes('Anti-Money Laundering'), 'Review detail includes policy title');
  } catch (e) {
    assert(false, `Review detail fetch failed: ${(e as Error).message}`);
  }

  // Step 8: Security - Unauthorized Checker Cannot Request Changes
  try {
    await ReviewService.requestChanges(reviewId, 'unauthorized-user-id', 'Feedback text here...', UserRole.CHECKER);
    assert(false, 'Unauthorized user should not be allowed to request changes');
  } catch (e) {
    assert(
      (e as unknown as { statusCode?: number }).statusCode === 403,
      'Unauthorized user blocked from requesting changes with 403',
    );
  }

  // Step 9: Validation - Feedback Must Meet Minimum Length (>= 10 chars)
  try {
    await ReviewService.requestChanges(reviewId, checker1Id, 'Short', UserRole.CHECKER);
    assert(false, 'Short feedback should be rejected');
  } catch (e) {
    assert(
      (e as unknown as { statusCode?: number }).statusCode === 400,
      'Feedback shorter than 10 characters rejected with 400',
    );
  }

  // Step 10: Request Changes Decision & Version Cloning
  const feedbackMsg = 'Please clarify section 1 exception thresholds for high-risk accounts.';
  try {
    const changesResult = await ReviewService.requestChanges(reviewId, checker1Id, feedbackMsg, UserRole.CHECKER);
    assert(changesResult.decision === 'CHANGES_REQUESTED', 'Review decision updated to CHANGES_REQUESTED');
    assert(changesResult.feedback === feedbackMsg, 'Reviewer feedback stored successfully');

    // Verify Policy and Version state
    const policyAfterRevision = await PolicyService.getPolicyById(policyId, ownerId, UserRole.USER);
    assert(
      policyAfterRevision.currentStatus === PolicyStatus.DRAFT,
      'Policy currentStatus returns to DRAFT after changes requested (Canonical Rule)',
    );
    assert(
      policyAfterRevision.activeVersion.versionNumber === 2,
      'New draft version 2 created automatically for owner edits',
    );
    assert(
      policyAfterRevision.activeVersion.sections.length > 0,
      'Version 2 draft contains cloned sections ready for editing',
    );
    assert(
      policyAfterRevision.activeVersion.status === VersionStatus.DRAFT,
      'New version 2 status is DRAFT',
    );
    assert(
      policyAfterRevision.reviewerFeedback === feedbackMsg,
      'Reviewer feedback attached to policy detail for owner view',
    );

    // Verify AuditLog
    const auditLogs = await AuditService.getLogsForEntity('PolicyVersion', changesResult.versionId);
    assert(
      auditLogs.some((l) => l.action === 'policy_changes_requested'),
      'AuditLog recorded policy_changes_requested event',
    );
  } catch (e) {
    assert(false, `Request changes flow failed: ${(e as Error).message}`);
  }

  // Step 11: Owner Resubmits Version 2
  let secondReviewId = '';
  try {
    const resubmitReview = await ReviewService.submitPolicy(policyId, ownerId);
    secondReviewId = resubmitReview.id;
    assert(resubmitReview.versionNumber === 2, 'Owner successfully submitted version 2 for review');

    // Checker 1 Claims Review 2
    await ReviewService.assignReview(secondReviewId, checker1Id);
  } catch (e) {
    assert(false, `Resubmission flow failed: ${(e as Error).message}`);
  }

  // Step 12: Checker 1 Approves Version 2
  try {
    const approveResult = await ReviewService.approveReview(secondReviewId, checker1Id, UserRole.CHECKER);
    assert(approveResult.decision === 'APPROVED', 'Review decision updated to APPROVED');

    const approvedPolicy = await PolicyService.getPolicyById(policyId, ownerId, UserRole.USER);
    assert(approvedPolicy.currentStatus === PolicyStatus.APPROVED, 'Policy currentStatus is APPROVED');
    assert(approvedPolicy.activeVersion.status === VersionStatus.APPROVED, 'PolicyVersion status is APPROVED');

    // Verify AuditLog for approval
    const auditLogs = await AuditService.getLogsForEntity('PolicyVersion', approveResult.versionId);
    assert(
      auditLogs.some((l) => l.action === 'policy_approved'),
      'AuditLog recorded policy_approved event',
    );
  } catch (e) {
    assert(false, `Approval flow failed: ${(e as Error).message}`);
  }

  console.info(`\n📊 Review Queue & Decision Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runReviewTests().catch((err) => {
  console.error('Fatal error in review test:', err);
  process.exit(1);
});
