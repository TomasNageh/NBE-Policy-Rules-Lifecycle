import { AuditService } from '../modules/audit/audit.service';
import { PolicyService } from '../modules/policy/policy.service';
import { ReviewService } from '../modules/review/review.service';
import { AdminService } from '../modules/admin/admin.service';
import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/auth/auth.types';

async function runAuditReportingTests() {
  console.log('🧪 Starting Audit Logging Visibility & Reporting Tests...');

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
    // 0. Seed Users
    const owner = await AuthService.findUserByEmail('owner@nbe.com.eg');
    const checker = await AuthService.findUserByEmail('checker@nbe.com.eg');
    const admin = await AuthService.findUserByEmail('admin@nbe.com.eg');

    assert(!!owner && !!checker && !!admin, 'Seed users retrieved');
    const ownerId = owner!.id;
    const checkerId = checker!.id;
    const adminId = admin!.id;

    // --- TEST 1: State-Changing Lifecycle Actions Write to Audit Log ---
    console.log('\n--- Test 1: State-Changing Lifecycle Actions Audit Coverage ---');

    // 1. Create Policy
    const pol = await PolicyService.createPolicy(ownerId, {
      title: 'Anti-Money Laundering & Sanctions Manual 2026',
      documentCode: 'POL-EGY-AML-777',
      category: 'Risk Management & AML',
      description: 'Comprehensive customer due diligence standards',
    });

    const createLogs = await AuditService.getLogsForEntity('Policy', pol.id);
    assert(createLogs.length > 0, 'Audit log recorded for created policy');
    const createEntry = createLogs.find((l) => l.action === 'policy_created');
    assert(!!createEntry, 'Action is policy_created');
    assert(
      (createEntry?.metadata as Record<string, unknown>)?.documentCode === 'POL-EGY-AML-777',
      'Audit log metadata captures documentCode',
    );

    // 2. Add Section
    const sec = await PolicyService.addSection(pol.id, ownerId, {
      sectionNumber: 2,
      title: 'PEP Verification & Enhanced Screening',
      policyStatement: 'Politically Exposed Persons must undergo senior management approval.',
    });
    assert(!!sec.id, 'Section added to policy');

    const secLogs = await AuditService.getLogsForEntity('PolicySection', sec.id);
    const secAddEntry = secLogs.find((l) => l.action === 'policy_section_added');
    assert(!!secAddEntry, 'Action policy_section_added recorded to audit trail');

    // 3. Update Policy Metadata
    await PolicyService.updatePolicy(pol.id, ownerId, {
      title: 'Anti-Money Laundering & Sanctions Master Manual 2026',
    });
    const updateLogs = await AuditService.getLogsForEntity('Policy', pol.id);
    const polUpdateEntry = updateLogs.find((l) => l.action === 'policy_updated');
    assert(!!polUpdateEntry, 'Action policy_updated recorded to audit trail');

    // 4. Submit Policy for Review
    const submitRes = await ReviewService.submitPolicy(pol.id, ownerId);
    const reviewId = submitRes.id;
    assert(!!reviewId, 'Policy submitted for review');

    const revLogs = await AuditService.getLogsForEntity('PolicyReview', reviewId);
    const submitEntry = revLogs.find((l) => l.action === 'policy_submitted');
    assert(!!submitEntry, 'Action policy_submitted recorded to audit trail');

    // 5. Claim Review
    await ReviewService.assignReview(reviewId, checkerId);
    const claimLogs = await AuditService.getLogsForEntity('PolicyReview', reviewId);
    const claimEntry = claimLogs.find((l) => l.action === 'review_claimed');
    assert(!!claimEntry, 'Action review_claimed recorded to audit trail');

    // 6. Approve Review
    await ReviewService.approveReview(reviewId, checkerId, UserRole.CHECKER);
    const approveLogs = await AuditService.getLogsForEntity('PolicyVersion', pol.activeVersion.id);
    const approveEntry = approveLogs.find((l) => l.action === 'policy_approved');
    assert(!!approveEntry, 'Action policy_approved recorded to audit trail');

    // 7. Update User Role
    await AdminService.updateUser(adminId, ownerId, {
      department: 'Enterprise Compliance Division',
    });
    const userLogs = await AuditService.getLogsForEntity('User', ownerId);
    const userUpdateEntry = userLogs.find((l) => l.action === 'user_updated');
    assert(!!userUpdateEntry, 'Action user_updated recorded to audit trail');

    // 8. Update SLA Config
    await AdminService.updateSlaConfig('Risk Management & AML', 20, adminId);
    const allAudit = await AuditService.getAuditLogs({ action: 'sla_config_updated' });
    assert(allAudit.logs.length > 0, 'Action sla_config_updated recorded to audit trail');

    // --- TEST 2: Paginated & Filterable Audit Log Query ---
    console.log('\n--- Test 2: Paginated & Filterable Audit Log Query ---');

    // Paginated query
    const page1 = await AuditService.getAuditLogs({}, { page: 1, limit: 5 });
    assert(page1.logs.length <= 5, 'Pagination limit strictly respected (<= 5)');
    assert(page1.totalCount >= 5, 'totalCount reflects entire audit trail size');
    assert(page1.currentPage === 1, 'Current page is 1');
    assert(page1.totalPages >= 1, 'totalPages accurately calculated');

    // Filter by entityType
    const polFilterLogs = await AuditService.getAuditLogs({ entityType: 'Policy' });
    assert(
      polFilterLogs.logs.every((l) => l.entityType === 'Policy'),
      'Entity type filter returns only Policy records',
    );

    // Filter by userId
    const checkerFilterLogs = await AuditService.getAuditLogs({ userId: checkerId });
    assert(
      checkerFilterLogs.logs.every((l) => l.userId === checkerId),
      'User ID filter returns only actions performed by Checker',
    );

    // User details populated
    const sampleLog = page1.logs[0];
    assert(!!sampleLog.userName && sampleLog.userName.length > 0, 'Audit item has populated userName');
    assert(!!sampleLog.userEmail && sampleLog.userEmail.includes('@'), 'Audit item has populated userEmail');
    assert(!!sampleLog.userRole, 'Audit item has populated userRole');

    // --- TEST 3: Regulatory CSV Export ---
    console.log('\n--- Test 3: Regulatory CSV Export Formatting ---');

    const csvContent = await AuditService.exportAuditLogsToCsv();
    assert(csvContent.length > 100, 'CSV export generated non-empty content');
    assert(csvContent.includes('Timestamp (UTC)'), 'CSV header includes Timestamp (UTC)');
    assert(csvContent.includes('Audit Log ID'), 'CSV header includes Audit Log ID');
    assert(csvContent.includes('Action Performed'), 'CSV header includes Action Performed');
    assert(csvContent.includes('Target Entity Type'), 'CSV header includes Target Entity Type');
    assert(csvContent.includes('Metadata & Details'), 'CSV header includes Metadata & Details');
    assert(csvContent.includes('policy_created'), 'CSV rows include recorded actions');

    // --- TEST 4: Aggregate Governance Metrics ---
    console.log('\n--- Test 4: Aggregate Governance Metrics & Monthly Series ---');

    const metrics = await AuditService.getGovernanceMetrics();
    assert(metrics.totalPolicies > 0, 'totalPolicies count is greater than 0');
    assert(typeof metrics.averageTurnaroundHours === 'number', 'averageTurnaroundHours is a number');
    assert(metrics.averageTurnaroundHours >= 0, 'averageTurnaroundHours is non-negative');
    assert(typeof metrics.slaBreachRate === 'number', 'slaBreachRate is a number');
    assert(typeof metrics.approvalRatio === 'number', 'approvalRatio is a number');
    assert(metrics.approvalRatio >= 0 && metrics.approvalRatio <= 100, 'approvalRatio is valid percentage');
    assert(metrics.totalAuditEntriesCount >= 5, 'totalAuditEntriesCount accurately aggregates logs');
    assert(metrics.monthlyTrends.length >= 6, 'monthlyTrends contains at least 6 monthly historical data points');
    assert(!!metrics.monthlyTrends[0].month, 'Monthly data point has month string (e.g. 2026-03)');
    assert(typeof metrics.monthlyTrends[0].approvedCount === 'number', 'Monthly data point has approvedCount');
    assert(typeof metrics.monthlyTrends[0].avgTurnaroundHours === 'number', 'Monthly data point has avgTurnaroundHours');

    // Summary
    console.log(`\n📊 Audit Logging & Reporting Test Results: ${passed} Passed, ${failed} Failed\n`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite failed with unexpected error:', error);
    process.exit(1);
  }
}

runAuditReportingTests();
