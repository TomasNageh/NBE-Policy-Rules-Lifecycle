import { ReviewService } from '../modules/review/review.service';
import { PolicyService } from '../modules/policy/policy.service';
import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/auth/auth.types';
import { ReviewDecision, SlaStatus } from '../modules/review/review.types';

async function runSlaTests() {
  console.log('🧪 Starting Live SLA Computation (Count from assignment to decision) Tests...');

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

  const owner = await AuthService.findUserByEmail('owner@nbe.com.eg');
  const checker = await AuthService.findUserByEmail('checker@nbe.com.eg');
  const admin = await AuthService.findUserByEmail('admin@nbe.com.eg');

  assert(!!owner, 'User found');
  assert(!!checker, 'Checker user found');
  assert(!!admin, 'Admin user found');

  const ownerId = owner!.id;
  const checkerId = checker!.id;
  const adminId = admin!.id;

  // Test 1: New Review Submission -> In queue awaiting assignment (category SLA = 12h)
  let normalReviewId = '';
  let policyId = '';
  try {
    const policy = await PolicyService.createPolicy(ownerId, {
      title: 'SLA Lifecycle Test Policy',
      documentCode: `POL-SLA-${Date.now().toString().slice(-4)}`,
      category: 'Digital Banking & Payments', // 12h SLA configured
      description: 'Verifying real-time SLA calculation',
    });
    policyId = policy.id;

    const review = await ReviewService.submitPolicy(policyId, ownerId);
    normalReviewId = review.id;

    assert(review.decision === ReviewDecision.PENDING, 'New review is in PENDING decision');
    assert(review.checkerId === null, 'New review is initially unassigned in queue');
    assert(review.slaHours === 12, 'Category SLA for Digital Banking is 12 hours');
    assert(review.slaStatus === SlaStatus.ON_TRACK, 'Unassigned review status is ON_TRACK');
    assert(review.isSlaBreached === false, 'isSlaBreached is false');
  } catch (e) {
    assert(false, `Test 1 failed: ${(e as Error).message}`);
  }

  // Test 2: Assignment starts the SLA clock from assignedAt
  let assignedDeadline: Date;
  try {
    const assignedReview = await ReviewService.assignReview(normalReviewId, checkerId);
    assignedDeadline = new Date(assignedReview.slaDeadline);

    assert(assignedReview.checkerId === checkerId, 'Review assigned to checker');
    assert(assignedReview.assignedAt !== null, 'assignedAt timestamp is populated');
    assert(
      assignedDeadline.getTime() > new Date(assignedReview.assignedAt!).getTime(),
      'SLA deadline is anchored from the moment the checker claims the review (assignedAt)',
    );
    assert(assignedReview.slaRemainingHours > 11.5, 'SLA remaining hours is ~12h from assignment');
    assert(assignedReview.slaStatus === SlaStatus.ON_TRACK, 'Assigned review is ON_TRACK');
    assert(assignedReview.isSlaBreached === false, 'Assigned review is not breached');
  } catch (e) {
    assert(false, `Test 2 failed: ${(e as Error).message}`);
  }

  // Test 3: Admin Reassignment resets assignment clock for new checker
  try {
    const newChecker = await AuthService.findUserByEmail('checker@nbe.com.eg');
    const reassigned = await ReviewService.reassignReview(
      normalReviewId,
      newChecker!.id,
      adminId,
      'Workload balancing across compliance officers',
    );
    assert(reassigned.assignedAt !== null, 'Reassigned review has new assignedAt timestamp');
    assert(reassigned.checkerId === newChecker!.id, 'Reassigned to new checker');
  } catch (e) {
    assert(false, `Test 3 (Reassignment SLA) failed: ${(e as Error).message}`);
  }

  // Test 4: Completing review (Approval) -> Status becomes COMPLETED, clock finishes at decisionAt
  try {
    const approvedReview = await ReviewService.approveReview(normalReviewId, checkerId, UserRole.CHECKER);
    assert(approvedReview.decision === ReviewDecision.APPROVED, 'Review decision is APPROVED');
    assert(approvedReview.slaStatus === SlaStatus.COMPLETED, 'Approved review status is COMPLETED');
    assert(approvedReview.decisionAt !== null, 'decisionAt is recorded when review finishes');
    assert(approvedReview.isSlaBreached === false, 'On-time approved review is not breached');
  } catch (e) {
    assert(false, `Test 4 failed: ${(e as Error).message}`);
  }

  // Test 5: Breached Review Detection (when assignedAt was 30 hours ago)
  let breachReviewId = '';
  try {
    const breachPolicy = await PolicyService.createPolicy(ownerId, {
      title: 'Breached SLA Test Policy',
      documentCode: `POL-BREACH-${Date.now().toString().slice(-4)}`,
      category: 'Risk Management',
    });

    const breachReview = await ReviewService.submitPolicy(breachPolicy.id, ownerId);
    await ReviewService.assignReview(breachReview.id, checkerId);
    breachReviewId = breachReview.id;

    // Simulate SLA breach by mutating assignedAt to 30 hours in the past
    const mockRev = ReviewService.getLatestMockReview(breachPolicy.id);
    if (mockRev) {
      const pastTime = new Date(Date.now() - 30 * 60 * 60 * 1000); // 30 hours ago
      mockRev.assignedAt = pastTime;
    }

    const fetchedBreached = await ReviewService.getReviewById(breachReview.id, checkerId, UserRole.CHECKER);
    assert(fetchedBreached.slaStatus === SlaStatus.BREACHED, '30h past assignment evaluates to SlaStatus.BREACHED');
    assert(fetchedBreached.isSlaBreached === true, 'isSlaBreached is true for overdue review');
    assert(fetchedBreached.slaRemainingMs < 0, 'slaRemainingMs is negative for overdue review');
    assert(fetchedBreached.slaRemainingHours < 0, 'slaRemainingHours is negative for overdue review');

    // Query getBreachedReviews()
    const allBreached = await ReviewService.getBreachedReviews();
    assert(allBreached.length >= 1, 'getBreachedReviews returns at least 1 breached review');
    const matched = allBreached.find((b) => b.id === breachReview.id);
    assert(!!matched, 'Breached test review is included in getBreachedReviews response');
  } catch (e) {
    assert(false, `Test 5 failed: ${(e as Error).message}`);
  }

  // Test 6: Late Decision Preserves isSlaBreached=true (when decisionAt > slaDeadline)
  try {
    const approvedLate = await ReviewService.approveReview(breachReviewId, checkerId, UserRole.CHECKER);
    assert(approvedLate.decision === ReviewDecision.APPROVED, 'Review is APPROVED');
    assert(approvedLate.slaStatus === SlaStatus.COMPLETED, 'Review is COMPLETED');
    assert(approvedLate.isSlaBreached === true, 'Late review permanently preserves isSlaBreached=true');
  } catch (e) {
    assert(false, `Test 6 (Preserved breach history) failed: ${(e as Error).message}`);
  }

  console.log(`\n📊 Live SLA Computation Test Results: ${passed} Passed, ${failed} Failed\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSlaTests().catch((err) => {
  console.error('Fatal error running SLA tests:', err);
  process.exit(1);
});
