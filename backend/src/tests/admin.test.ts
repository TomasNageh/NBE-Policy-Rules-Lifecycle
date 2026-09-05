import { AdminService } from '../modules/admin/admin.service';
import { PolicyService } from '../modules/policy/policy.service';
import { ReviewService } from '../modules/review/review.service';
import { AuditService } from '../modules/audit/audit.service';
import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/auth/auth.types';
import { PolicyStatus } from '../modules/policy/policy.types';

async function runAdminTests() {
  console.log('🧪 Starting Admin Oversight & Governance Tests...');

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

    assert(!!owner, 'Seed Owner user found');
    assert(!!checker, 'Seed Checker user found');
    assert(!!admin, 'Seed Admin user found');

    const adminId = admin!.id;
    const ownerId = owner!.id;
    const checkerId = checker!.id;

    // --- TEST 1: Admin Policies Overview & Filtering ---
    console.log('\n--- Test 1: Admin All Policies Overview & Filtering ---');

    // Create test policies with different categories & statuses
    const p1 = await PolicyService.createPolicy(ownerId, {
      title: 'Digital Payments Security Directive 2026',
      documentCode: 'POL-EGY-PAY-001',
      category: 'Digital Banking & Payments',
      description: 'Regulatory standards for Instant Payment Network',
    });

    const p2 = await PolicyService.createPolicy(ownerId, {
      title: 'Branch Operations Cash Settlement Manual',
      documentCode: 'POL-EGY-OPS-002',
      category: 'Operations & Settlement',
      description: 'Daily cash balance reconciliation standards',
    });

    assert(!!p1.id && !!p2.id, 'Created 2 distinct test policies');

    const allPolicies = await AdminService.getAllPolicies();
    assert(allPolicies.length >= 2, 'Admin can list all policies across owners');
    const hasP1 = allPolicies.some((p) => p.documentCode === 'POL-EGY-PAY-001');
    const hasP2 = allPolicies.some((p) => p.documentCode === 'POL-EGY-OPS-002');
    assert(hasP1 && hasP2, 'All created test policies are included in admin overview');

    // Filter by category
    const paymentsPolicies = await AdminService.getAllPolicies({
      category: 'Digital Banking & Payments',
    });
    assert(
      paymentsPolicies.every((p) => p.category === 'Digital Banking & Payments'),
      'Category filter correctly restricts results to Digital Banking & Payments',
    );
    assert(
      paymentsPolicies.some((p) => p.documentCode === 'POL-EGY-PAY-001'),
      'Filtered results include target category policy',
    );

    // Filter by status (DRAFT)
    const draftPolicies = await AdminService.getAllPolicies({
      status: PolicyStatus.DRAFT,
    });
    assert(
      draftPolicies.every((p) => p.currentStatus === PolicyStatus.DRAFT),
      'Status filter correctly restricts results to DRAFT policies',
    );

    // Search by title keyword
    const searchResults = await AdminService.getAllPolicies({
      search: 'Settlement',
    });
    assert(
      searchResults.some((p) => p.documentCode === 'POL-EGY-OPS-002'),
      'Search filter finds policy by title keyword',
    );

    // --- TEST 2: Category SLA Configuration ---
    console.log('\n--- Test 2: SLA Configuration Matrix ---');

    const slaConfigs = await AdminService.getSlaConfigs();
    assert(slaConfigs.length >= 5, 'Retrieved standard banking category SLA configs');
    const digitalSla = slaConfigs.find((s) => s.category === 'Digital Banking & Payments');
    assert(!!digitalSla, 'Digital Banking & Payments SLA config exists');
    assert(digitalSla?.slaHours === 12, 'Default SLA for Digital Banking is 12h');

    // Update SLA for a category
    const updatedSla = await AdminService.updateSlaConfig(
      'Digital Banking & Payments',
      16,
      adminId,
    );
    assert(updatedSla.slaHours === 16, 'SLA hours successfully updated to 16h');

    // Verify retrieval after update
    const refreshedConfigs = await AdminService.getSlaConfigs();
    const refreshedDigital = refreshedConfigs.find(
      (s) => s.category === 'Digital Banking & Payments',
    );
    assert(refreshedDigital?.slaHours === 16, 'Updated SLA hours persisted');

    // Verify invalid hours rejection
    let rejectedInvalidHours = false;
    try {
      await AdminService.updateSlaConfig('Digital Banking & Payments', 0, adminId);
    } catch {
      rejectedInvalidHours = true;
    }
    assert(rejectedInvalidHours, 'Rejected invalid SLA hours (0 <= 0)');

    // --- TEST 3: Review Reassignment ---
    console.log('\n--- Test 3: Admin Review Reassignment ---');

    // Create a 2nd checker
    const secondChecker = await AdminService.createUser(adminId, {
      email: 'checker2@nbe.com.eg',
      password: 'Checker2Password123!',
      fullName: 'Tarek Compliance Checker 2',
      role: UserRole.CHECKER,
      department: 'Compliance & Risk',
    });
    assert(!!secondChecker.id, 'Second checker account created');

    // Add section to p1 and submit policy for review
    await PolicyService.addSection(p1.id, ownerId, {
      sectionNumber: 1,
      title: 'Payment Gateway Security',
      policyStatement: 'All API integrations must enforce TLS 1.3 encryption.',
    });

    const submitResult = await ReviewService.submitPolicy(p1.id, ownerId);
    const reviewId = submitResult.id;
    assert(!!reviewId, 'Policy submitted for review');

    // Initial claim by checker 1
    const claimed = await ReviewService.assignReview(reviewId, checkerId);
    assert(claimed.checkerId === checkerId, 'Review initially assigned to Checker 1');

    // Admin reassigns review to Checker 2
    const reassigned = await ReviewService.reassignReview(
      reviewId,
      secondChecker.id,
      adminId,
    );
    assert(
      reassigned.checkerId === secondChecker.id,
      'Review successfully reassigned to Checker 2',
    );
    assert(
      reassigned.checkerName === 'Tarek Compliance Checker 2',
      'Checker name updated on reassigned review detail',
    );

    // Verify AuditLog for review reassignment
    const logs = await AuditService.getLogsForEntity('PolicyReview', reviewId);
    const reassignLog = logs.find((l) => l.action === 'review_reassigned');
    assert(!!reassignLog, 'Audit log recorded review_reassigned action');
    assert(
      (reassignLog?.metadata as Record<string, unknown>)?.newCheckerId === secondChecker.id,
      'Audit log metadata records newCheckerId',
    );

    // --- TEST 4: User Governance (List, Create, Update Role) ---
    console.log('\n--- Test 4: User Governance & Inline Role Mutation ---');

    const users = await AdminService.getAllUsers();
    assert(users.length >= 4, 'Admin listed all system users');
    const targetUser = users.find((u) => u.email === 'checker2@nbe.com.eg');
    assert(!!targetUser, 'Created user found in users list');

    // Update user role to ADMIN
    const updatedUser = await AdminService.updateUser(adminId, secondChecker.id, {
      role: UserRole.ADMIN,
      department: 'Executive Governance',
    });
    assert(updatedUser.role === UserRole.ADMIN, 'User role successfully mutated to ADMIN');
    assert(
      updatedUser.department === 'Executive Governance',
      'User department updated successfully',
    );

    // Verify AuditLog for user update
    const userLogs = await AuditService.getLogsForEntity('User', secondChecker.id);
    const userUpdateLog = userLogs.find((l) => l.action === 'user_updated');
    assert(!!userUpdateLog, 'Audit log recorded user_updated event');

    // Summary
    console.log(`\n📊 Admin Oversight Test Results: ${passed} Passed, ${failed} Failed\n`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite failed with unexpected error:', error);
    process.exit(1);
  }
}

runAdminTests();
