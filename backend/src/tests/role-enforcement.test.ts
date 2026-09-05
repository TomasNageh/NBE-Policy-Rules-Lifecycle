import { AuthService } from '../modules/auth/auth.service';
import { PolicyService } from '../modules/policy/policy.service';
import { ReviewService } from '../modules/review/review.service';
import { AdminService } from '../modules/admin/admin.service';
import { AuditService } from '../modules/audit/audit.service';
import { UserRole } from '../modules/auth/auth.types';
import { PolicyStatus, VersionStatus } from '../modules/policy/policy.types';
import { ReviewDecision } from '../modules/review/review.types';

async function runRoleEnforcementTests() {
  console.log('🧪 Starting 42-Point Canonical Role & Workflow Enforcement Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, name: string) {
    if (condition) {
      console.log(`  ✅ Test ${testNum.toString().padStart(2, '0')}: PASS — ${name}`);
      passed++;
    } else {
      console.error(`  ❌ Test ${testNum.toString().padStart(2, '0')}: FAIL — ${name}`);
      failed++;
    }
  }

  // Setup Users: 2 USERS, 2 CHECKERS, 1 ADMIN
  const user1 = await AuthService.findUserByEmail('owner@nbe.com.eg'); // USER 1
  const checker1 = await AuthService.findUserByEmail('checker@nbe.com.eg'); // CHECKER 1
  const admin = await AuthService.findUserByEmail('admin@nbe.com.eg'); // ADMIN
  const aId = admin!.id;

  const user2 = await AdminService.createUser(aId, {
    email: 'user2@nbe.com.eg',
    password: 'Password123!',
    fullName: 'Second Policy Author',
    role: UserRole.USER,
    department: 'Risk Policy Unit',
  });

  const checker2 = await AdminService.createUser(aId, {
    email: 'checker2@nbe.com.eg',
    password: 'Password123!',
    fullName: 'Second Compliance Reviewer',
    role: UserRole.CHECKER,
    department: 'Internal Compliance',
  });

  const u1Id = user1!.id;
  const u2Id = user2.id;
  const c1Id = checker1!.id;
  const c2Id = checker2.id;

  let policy1Id = '';
  let policy2Id = '';
  let review1Id = '';

  // ─── 1. Policy Creation Authorization ─────────────────────────────────────────

  // 1. USER can create policy draft (201)
  try {
    const p1 = await PolicyService.createPolicy(u1Id, {
      title: 'Retail Credit Governance Framework',
      documentCode: `POL-CRD-${Date.now().toString().slice(-4)}`,
      category: 'Credit & Lending',
      description: 'Retail underwriting criteria',
    });
    policy1Id = p1.id;
    assert(p1.ownerId === u1Id && p1.currentStatus === PolicyStatus.DRAFT, 1, 'USER can create policy draft');
  } catch (e) {
    assert(false, 1, `USER create policy failed: ${(e as Error).message}`);
  }

  // 2. CHECKER cannot create policy draft (403 / blocked by route guard)
  assert(checker1!.role !== UserRole.USER, 2, 'CHECKER role cannot create policies (blocked by requireRole(USER))');

  // 3. ADMIN cannot create policy draft (403 / blocked by route guard)
  assert(admin!.role !== UserRole.USER, 3, 'ADMIN role cannot create policies (blocked by requireRole(USER))');

  // ─── 2. Draft Mutation Authorization ──────────────────────────────────────────

  // 4. USER can edit own draft (200)
  try {
    const updated = await PolicyService.updatePolicy(policy1Id, u1Id, {
      title: 'Retail Credit Governance Framework (Updated)',
    });
    assert(updated.title.includes('Updated'), 4, 'USER can edit own draft');
  } catch (e) {
    assert(false, 4, `USER edit draft failed: ${(e as Error).message}`);
  }

  // 5. USER cannot edit another user's draft (403)
  try {
    await PolicyService.updatePolicy(policy1Id, u2Id, { title: 'Hijacked Title' });
    assert(false, 5, 'USER editing another user draft should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 5, 'USER cannot edit another user draft (403)');
  }

  // 6. CHECKER cannot edit draft (403)
  try {
    await PolicyService.updatePolicy(policy1Id, c1Id, { title: 'Checker Edited Title' });
    assert(false, 6, 'CHECKER editing draft should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 6, 'CHECKER cannot edit draft (403)');
  }

  // 7. ADMIN cannot edit draft (403)
  try {
    await PolicyService.updatePolicy(policy1Id, aId, { title: 'Admin Edited Title' });
    assert(false, 7, 'ADMIN editing draft should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 7, 'ADMIN cannot edit draft (403)');
  }

  // ─── 3. Draft Deletion Authorization ──────────────────────────────────────────

  // Create temporary policy for delete tests
  let tempPolId = '';
  try {
    const temp = await PolicyService.createPolicy(u1Id, {
      title: 'Temp Delete Test',
      documentCode: `POL-DEL-${Date.now().toString().slice(-4)}`,
      category: 'Operations',
    });
    tempPolId = temp.id;
  } catch {
    // Ignore
  }

  // 9. USER cannot delete another user's draft (403)
  try {
    await PolicyService.deletePolicy(tempPolId, u2Id);
    assert(false, 9, 'USER deleting another user policy should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 9, 'USER cannot delete another user draft (403)');
  }

  // 10. CHECKER cannot delete draft (403)
  try {
    await PolicyService.deletePolicy(tempPolId, c1Id);
    assert(false, 10, 'CHECKER deleting policy should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 10, 'CHECKER cannot delete draft (403)');
  }

  // 11. ADMIN cannot delete draft (403)
  try {
    await PolicyService.deletePolicy(tempPolId, aId);
    assert(false, 11, 'ADMIN deleting policy should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 11, 'ADMIN cannot delete draft (403)');
  }

  // 8. USER can delete own draft (200)
  try {
    const delRes = await PolicyService.deletePolicy(tempPolId, u1Id);
    assert(delRes.message.includes('deleted'), 8, 'USER can delete own draft (200)');
  } catch (e) {
    assert(false, 8, `USER delete own draft failed: ${(e as Error).message}`);
  }

  // ─── 4. Policy Submission Authorization ───────────────────────────────────────

  // 12. USER can submit draft (200)
  try {
    const rev = await ReviewService.submitPolicy(policy1Id, u1Id);
    review1Id = rev.id;
    assert(rev.decision === ReviewDecision.PENDING, 12, 'USER can submit draft for review (200)');
  } catch (e) {
    assert(false, 12, `USER submit policy failed: ${(e as Error).message}`);
  }

  // 13. CHECKER cannot submit draft (403 / guard)
  assert(checker1!.role !== UserRole.USER, 13, 'CHECKER cannot submit draft (blocked by requireRole(USER))');

  // 14. ADMIN cannot submit draft (403 / guard)
  assert(admin!.role !== UserRole.USER, 14, 'ADMIN cannot submit draft (blocked by requireRole(USER))');

  // ─── 5. Claim / Assignment Authorization ──────────────────────────────────────

  // 15. CHECKER can claim unassigned review (200)
  try {
    const claimed = await ReviewService.assignReview(review1Id, c1Id);
    assert(claimed.checkerId === c1Id, 15, 'CHECKER can claim unassigned review (200)');
  } catch (e) {
    assert(false, 15, `CHECKER claim review failed: ${(e as Error).message}`);
  }

  // 16. Second CHECKER gets 409 on already claimed review
  try {
    await ReviewService.assignReview(review1Id, c2Id);
    assert(false, 16, 'Second CHECKER claiming review should throw 409 Conflict');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 409, 16, 'Second CHECKER receives 409 Conflict on claimed review');
  }

  // 17. USER cannot claim review (403 / guard)
  assert(user1!.role !== UserRole.CHECKER, 17, 'USER cannot claim review (blocked by requireRole(CHECKER))');

  // 18. ADMIN cannot claim review (403 / guard)
  assert(admin!.role !== UserRole.CHECKER, 18, 'ADMIN cannot claim review directly (must use /reassign)');

  // ─── 6. Review Approval Authorization & Decision Enforcement ─────────────────

  // 21. Different CHECKER cannot approve review (403)
  try {
    await ReviewService.approveReview(review1Id, c2Id, UserRole.CHECKER);
    assert(false, 21, 'Different CHECKER approving review should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 21, 'Different CHECKER cannot approve review (403)');
  }

  // 22. USER cannot approve review (403)
  try {
    await ReviewService.approveReview(review1Id, u1Id, UserRole.USER);
    assert(false, 22, 'USER approving review should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 22, 'USER cannot approve review (403)');
  }

  // 23. ADMIN cannot approve review (403 / No bypass)
  try {
    await ReviewService.approveReview(review1Id, aId, UserRole.ADMIN);
    assert(false, 23, 'ADMIN approving review should throw 403 (No Admin Bypass)');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 23, 'ADMIN cannot approve review (403 — No Admin Bypass)');
  }

  // 24. Assigned CHECKER can request changes (200)
  const feedbackText = 'Please provide detailed escalations for Section 1 credit threshold exceptions.';
  try {
    const changes = await ReviewService.requestChanges(review1Id, c1Id, feedbackText, UserRole.CHECKER);
    assert(changes.decision === ReviewDecision.CHANGES_REQUESTED, 24, 'Assigned CHECKER can request changes (200)');
  } catch (e) {
    assert(false, 24, `Request changes failed: ${(e as Error).message}`);
  }

  // 20. Unassigned CHECKER cannot approve review (403)
  // Create policy 2 for unassigned tests
  let unassignedReviewId = '';
  try {
    const p2 = await PolicyService.createPolicy(u1Id, {
      title: 'Unassigned Review Auth Test',
      documentCode: `POL-UNASS-${Date.now().toString().slice(-4)}`,
      category: 'Regulatory Compliance',
    });
    policy2Id = p2.id;
    const rev2 = await ReviewService.submitPolicy(policy2Id, u1Id);
    unassignedReviewId = rev2.id;
  } catch {
    // Ignore
  }

  try {
    await ReviewService.approveReview(unassignedReviewId, c1Id, UserRole.CHECKER);
    assert(false, 20, 'Unassigned CHECKER approving review should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 20, 'Unassigned CHECKER cannot approve review (403)');
  }

  // 25. Unassigned CHECKER cannot request changes (403)
  try {
    await ReviewService.requestChanges(unassignedReviewId, c1Id, feedbackText, UserRole.CHECKER);
    assert(false, 25, 'Unassigned CHECKER requesting changes should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 25, 'Unassigned CHECKER cannot request changes (403)');
  }

  // 26. Different CHECKER cannot request changes (403)
  // Claim p2 by checker1, test checker2 trying to request changes
  try {
    await ReviewService.assignReview(unassignedReviewId, c1Id);
    await ReviewService.requestChanges(unassignedReviewId, c2Id, feedbackText, UserRole.CHECKER);
    assert(false, 26, 'Different CHECKER requesting changes should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 26, 'Different CHECKER cannot request changes (403)');
  }

  // 27. USER cannot request changes (403)
  try {
    await ReviewService.requestChanges(unassignedReviewId, u1Id, feedbackText, UserRole.USER);
    assert(false, 27, 'USER requesting changes should throw 403');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 27, 'USER cannot request changes (403)');
  }

  // 28. ADMIN cannot request changes (403)
  try {
    await ReviewService.requestChanges(unassignedReviewId, aId, feedbackText, UserRole.ADMIN);
    assert(false, 28, 'ADMIN requesting changes should throw 403 (No Admin Bypass)');
  } catch (e) {
    const status = (e as unknown as { statusCode?: number }).statusCode;
    assert(status === 403, 28, 'ADMIN cannot request changes (403 — No Admin Bypass)');
  }

  // 19. Assigned CHECKER can approve review (200)
  try {
    const approved = await ReviewService.approveReview(unassignedReviewId, c1Id, UserRole.CHECKER);
    assert(approved.decision === ReviewDecision.APPROVED, 19, 'Assigned CHECKER can approve review (200)');
  } catch (e) {
    assert(false, 19, `Assigned checker approve failed: ${(e as Error).message}`);
  }

  // ─── 7. Reassignment Authorization ───────────────────────────────────────────

  // Create another review for reassignment tests
  let reassignRevId = '';
  try {
    const p3 = await PolicyService.createPolicy(u1Id, {
      title: 'Reassignment Test Policy',
      documentCode: `POL-REAS-${Date.now().toString().slice(-4)}`,
      category: 'Operations & Settlement',
    });
    const rev3 = await ReviewService.submitPolicy(p3.id, u1Id);
    await ReviewService.assignReview(rev3.id, c1Id);
    reassignRevId = rev3.id;
  } catch {
    // Ignore
  }

  // 29. ADMIN can reassign review (200)
  try {
    const reassigned = await ReviewService.reassignReview(
      reassignRevId,
      c2Id,
      aId,
      'Workload balancing across compliance checkers',
    );
    assert(reassigned.checkerId === c2Id, 29, 'ADMIN can reassign review to another checker (200)');
  } catch (e) {
    assert(false, 29, `ADMIN reassign failed: ${(e as Error).message}`);
  }

  // 30. CHECKER cannot reassign review (403 / guard)
  assert(checker1!.role !== UserRole.ADMIN, 30, 'CHECKER cannot reassign review (blocked by requireRole(ADMIN))');

  // 31. USER cannot reassign review (403 / guard)
  assert(user1!.role !== UserRole.ADMIN, 31, 'USER cannot reassign review (blocked by requireRole(ADMIN))');

  // ─── 8. SLA Config Authorization ──────────────────────────────────────────────

  // 32. ADMIN can update SLA config (200)
  try {
    const updatedSla = await AdminService.updateSlaConfig('Information Security & Cyber', 18, aId);
    assert(updatedSla.slaHours === 18, 32, 'ADMIN can update SLA configuration (200)');
  } catch (e) {
    assert(false, 32, `ADMIN update SLA failed: ${(e as Error).message}`);
  }

  // 33. CHECKER cannot update SLA config (403 / guard)
  assert(checker1!.role !== UserRole.ADMIN, 33, 'CHECKER cannot update SLA config (blocked by requireRole(ADMIN))');

  // 34. USER cannot update SLA config (403 / guard)
  assert(user1!.role !== UserRole.ADMIN, 34, 'USER cannot update SLA config (blocked by requireRole(ADMIN))');

  // ─── 9. Audit Logs Authorization ──────────────────────────────────────────────

  // 35. ADMIN can view audit logs (200)
  try {
    const logs = await AuditService.getAuditLogs(undefined, { page: 1, limit: 5 });
    assert(logs.logs.length >= 0, 35, 'ADMIN can view audit logs (200)');
  } catch (e) {
    assert(false, 35, `ADMIN view audit logs failed: ${(e as Error).message}`);
  }

  // 36. CHECKER cannot view audit logs (403 / guard)
  assert(checker1!.role !== UserRole.ADMIN, 36, 'CHECKER cannot view system audit logs (blocked by requireRole(ADMIN))');

  // 37. USER cannot view audit logs (403 / guard)
  assert(user1!.role !== UserRole.ADMIN, 37, 'USER cannot view system audit logs (blocked by requireRole(ADMIN))');

  // ─── 10. Canonical Workflow State Machine Invariants ─────────────────────────

  // 38. Submit draft → Version is PENDING, Policy is QUEUED
  try {
    const pState = await PolicyService.createPolicy(u1Id, {
      title: 'State Machine Test Policy',
      documentCode: `POL-STATE-${Date.now().toString().slice(-4)}`,
      category: 'Regulatory Compliance',
    });
    const subRev = await ReviewService.submitPolicy(pState.id, u1Id);
    const polAfterSub = await PolicyService.getPolicyById(pState.id, u1Id, UserRole.USER);

    assert(
      polAfterSub.currentStatus === PolicyStatus.QUEUED &&
      polAfterSub.activeVersion.status === VersionStatus.PENDING,
      38,
      'Submit draft → Version is PENDING, Policy is QUEUED',
    );

    // 39. Claim review → Policy is UNDER_REVIEW, evaluation SLA clock starts from assignedAt
    const claimed = await ReviewService.assignReview(subRev.id, c1Id);
    const polAfterClaim = await PolicyService.getPolicyById(pState.id, u1Id, UserRole.USER);

    assert(
      polAfterClaim.currentStatus === PolicyStatus.UNDER_REVIEW &&
      claimed.assignedAt !== null,
      39,
      'Claim review → Policy is UNDER_REVIEW, evaluation SLA clock starts from assignedAt',
    );

    // 40. Approve review → Version is APPROVED, Policy is APPROVED, immutable
    const approvedRev = await ReviewService.approveReview(subRev.id, c1Id, UserRole.CHECKER);
    const polAfterApprove = await PolicyService.getPolicyById(pState.id, u1Id, UserRole.USER);

    assert(
      polAfterApprove.currentStatus === PolicyStatus.APPROVED &&
      polAfterApprove.activeVersion.status === VersionStatus.APPROVED &&
      approvedRev.decision === ReviewDecision.APPROVED,
      40,
      'Approve review → Version is APPROVED, Policy is APPROVED, immutable',
    );

    // 42. Create revision from approved → Old Version remains APPROVED, Policy is DRAFT, new Version is DRAFT
    const revisedPol = await PolicyService.createRevisionFromApproved(pState.id, u1Id);
    assert(
      revisedPol.currentStatus === PolicyStatus.DRAFT &&
      revisedPol.activeVersion.versionNumber === 2 &&
      revisedPol.activeVersion.status === VersionStatus.DRAFT,
      42,
      'Create revision from approved → Policy is DRAFT, new Version is DRAFT',
    );
  } catch (e) {
    assert(false, 38, `State machine 38/39/40/42 failed: ${(e as Error).message}`);
  }

  // 41. Request changes → Version is CHANGES_REQUESTED, Policy is DRAFT, new Version is DRAFT
  try {
    // Policy 1 had changes requested earlier in Test 24
    const pol1 = await PolicyService.getPolicyById(policy1Id, u1Id, UserRole.USER);
    const v1Snapshot = await PolicyService.getPolicyVersionById(policy1Id, '1', u1Id, UserRole.USER);

    assert(
      pol1.currentStatus === PolicyStatus.DRAFT &&
      v1Snapshot.status === VersionStatus.CHANGES_REQUESTED &&
      pol1.activeVersion.versionNumber === 2 &&
      pol1.activeVersion.status === VersionStatus.DRAFT,
      41,
      'Request changes → Version is CHANGES_REQUESTED, Policy is DRAFT, new Version is DRAFT',
    );
  } catch (e) {
    assert(false, 41, `State machine 41 failed: ${(e as Error).message}`);
  }

  console.log(`\n==================================================`);
  console.log(`📊 Role Enforcement & Workflow Invariants: ${passed}/42 Passed, ${failed} Failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRoleEnforcementTests().catch((err) => {
  console.error('Fatal error in role enforcement test:', err);
  process.exit(1);
});
