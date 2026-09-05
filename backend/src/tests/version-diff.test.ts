import { PolicyService } from '../modules/policy/policy.service';
import { AuthService } from '../modules/auth/auth.service';
import { ReviewService } from '../modules/review/review.service';
import { UserRole } from '../modules/auth/auth.types';
import { PolicyStatus, VersionStatus } from '../modules/policy/policy.types';

async function runVersionDiffTests() {
  console.info('🧪 Starting NBE Policy Version History & Section-Level Diff Verification Tests...');
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
  const checker = await AuthService.findUserByEmail('checker@nbe.com.eg');
  const otherOwner = await AuthService.findUserByEmail('admin@nbe.com.eg');

  const ownerId = owner!.id;
  const checkerId = checker!.id;
  const otherOwnerId = otherOwner!.id;

  let policyId = '';
  let version1Id = '';
  let version2Id = '';

  // Step 1: Create Initial Policy (Version 1)
  try {
    const docCode = `POL-DIFF-${Date.now().toString().slice(-4)}`;
    const policy = await PolicyService.createPolicy(ownerId, {
      title: 'Digital Payments & Instant Transfer Network Governance',
      documentCode: docCode,
      category: 'Digital Banking & Payments',
      description: 'Operating limits, real-time settlement, and fraud monitoring for IPN / InstaPay.',
    });

    policyId = policy.id;
    version1Id = policy.activeVersion.id;

    assert(policy.activeVersion.versionNumber === 1, 'Policy initialized at version 1');
    assert(policy.activeVersion.sections.length === 1, 'Version 1 contains initial section');
  } catch (e) {
    assert(false, `Policy creation failed: ${(e as Error).message}`);
  }

  // Step 2: List Versions for Policy (Initial State)
  try {
    const versions = await PolicyService.getPolicyVersions(policyId, ownerId, UserRole.USER);
    assert(versions.length === 1, 'Returns 1 version initially');
    assert(versions[0].versionNumber === 1, 'Version 1 is listed');
    assert(versions[0].status === VersionStatus.DRAFT, 'Version 1 status is DRAFT');
    assert(versions[0].submittedBy?.fullName === owner!.fullName, 'SubmittedBy metadata contains owner name');
    assert(versions[0].sectionsCount === 1, 'SectionsCount matches active sections');
  } catch (e) {
    assert(false, `Get versions failed: ${(e as Error).message}`);
  }

  // Step 3: Get Full Snapshot for Version 1 (GET /api/policies/:id/versions/:versionId)
  try {
    const v1Snapshot = await PolicyService.getPolicyVersionById(policyId, version1Id, ownerId, UserRole.USER);
    assert(v1Snapshot.id === version1Id, 'Snapshot ID matches version 1');
    assert(v1Snapshot.versionNumber === 1, 'Snapshot version number is 1');
    assert(v1Snapshot.sections.length === 1, 'Snapshot contains full sections list');
    assert(v1Snapshot.policyTitle.includes('Digital Payments'), 'Snapshot contains policy metadata title');

    // Also verify lookup by versionNumber string ("1")
    const v1ByNum = await PolicyService.getPolicyVersionById(policyId, '1', ownerId, UserRole.USER);
    assert(v1ByNum.id === version1Id, 'Version lookup by versionNumber integer works');
  } catch (e) {
    assert(false, `Version snapshot retrieval failed: ${(e as Error).message}`);
  }

  // Step 4: Submit Version 1 & Request Changes to trigger Version 2 Draft creation
  try {
    const review = await ReviewService.submitPolicy(policyId, ownerId);
    await ReviewService.assignReview(review.id, checkerId);
    await ReviewService.requestChanges(
      review.id,
      checkerId,
      'Please increase transaction limits from 50,000 EGP to 70,000 EGP per circular and add dispute handling section.',
      UserRole.CHECKER,
    );

    const updatedPolicy = await PolicyService.getPolicyById(policyId, ownerId, UserRole.USER);
    version2Id = updatedPolicy.activeVersion.id;

    assert(updatedPolicy.activeVersion.versionNumber === 2, 'Version 2 draft was created after change request');
    assert(updatedPolicy.activeVersion.status === VersionStatus.DRAFT, 'Version 2 status is DRAFT');
    assert(updatedPolicy.currentStatus === PolicyStatus.DRAFT, 'Policy status is CHANGES_REQUESTED');
  } catch (e) {
    assert(false, `Review cycle failed: ${(e as Error).message}`);
  }

  // Step 5: Mutate Version 2 Sections (Modify section 1 and Add section 2)
  try {
    // 5a. Modify Section 1 Statement (Word-level change)
    const v2Sec1 = (await PolicyService.getPolicyById(policyId, ownerId, UserRole.USER)).activeVersion.sections[0];
    await PolicyService.updateSection(policyId, v2Sec1.id, ownerId, {
      policyStatement: 'Define the core mandate, objective, and applicability of instant payments up to 70,000 EGP across all NBE divisions.',
      controlArea: 'Digital Payments Governance',
    });

    // 5b. Add Section 2 (Dispute Handling)
    const newSec = await PolicyService.addSection(policyId, ownerId, {
      sectionNumber: 2,
      title: 'Dispute Resolution & Chargeback Operations',
      controlArea: 'Operations & Settlement',
      policyStatement: 'All customer instant payment dispute claims must be registered within 48 hours and investigated within 5 banking days.',
      rolesAndResponsibilities: 'Contact Center Agents log claims; Dispute Unit investigates.',
      procedures: '1. Ingest dispute via Core Banking. 2. Request logs from IPN Switch.',
      complianceNotes: 'Mandated by CBE IPN Operating Regulations.',
    });

    assert(newSec.sectionNumber === 2, 'Section 2 added to Version 2 draft');
  } catch (e) {
    assert(false, `Section mutation in version 2 failed: ${(e as Error).message}`);
  }

  // Step 6: Verify Version Listing contains both versions (v2 desc, v1)
  try {
    const versions = await PolicyService.getPolicyVersions(policyId, ownerId, UserRole.USER);
    assert(versions.length === 2, 'Version listing returns both v1 and v2');
    assert(versions[0].versionNumber === 2, 'First item in list is v2 (descending order)');
    assert(versions[1].versionNumber === 1, 'Second item in list is v1');
    assert(versions[0].sectionsCount === 2, 'v2 has 2 sections');
    assert(versions[1].sectionsCount === 1, 'v1 has 1 section');
  } catch (e) {
    assert(false, `Multi-version listing failed: ${(e as Error).message}`);
  }

  // Step 7: Compare Versions (GET /api/policies/:id/diff?from=v1&to=v2)
  try {
    const diff = await PolicyService.comparePolicyVersions(
      policyId,
      version1Id,
      version2Id,
      ownerId,
      UserRole.USER,
    );

    assert(diff.policyId === policyId, 'Diff response policyId matches');
    assert(diff.fromVersion.versionNumber === 1, 'FromVersion is v1');
    assert(diff.toVersion.versionNumber === 2, 'ToVersion is v2');
    assert(diff.summary.totalSections === 2, 'Total 2 distinct sections compared');
    assert(diff.summary.addedSections === 1, 'Summary reports 1 added section (Section 2)');
    assert(diff.summary.modifiedSections === 1, 'Summary reports 1 modified section (Section 1)');
    assert(diff.summary.removedSections === 0, 'Summary reports 0 removed sections');
    assert(diff.summary.unchangedSections === 0, 'Summary reports 0 unchanged sections');
    assert(diff.summary.totalFieldChanges > 0, 'Total field changes is positive');

    // Section 1 Verification (MODIFIED)
    const sec1Diff = diff.sections.find((s) => s.sectionNumber === 1);
    assert(sec1Diff !== undefined, 'Section 1 diff exists');
    assert(sec1Diff!.changeType === 'MODIFIED', 'Section 1 changeType is MODIFIED');
    assert(sec1Diff!.hasChanges === true, 'Section 1 hasChanges is true');

    const statementDiff = sec1Diff!.fieldDiffs.find((f) => f.fieldKey === 'policyStatement');
    assert(statementDiff !== undefined, 'Statement field diff exists');
    assert(statementDiff!.hasChanges === true, 'Statement field has changes');
    assert(
      statementDiff!.diffParts.some((p) => p.added && p.value.includes('70,000 EGP')),
      'Statement diff part contains added words ("70,000 EGP")',
    );

    // Section 2 Verification (ADDED)
    const sec2Diff = diff.sections.find((s) => s.sectionNumber === 2);
    assert(sec2Diff !== undefined, 'Section 2 diff exists');
    assert(sec2Diff!.changeType === 'ADDED', 'Section 2 changeType is ADDED');
    assert(sec2Diff!.fromSection === null, 'Section 2 fromSection is null');
    assert(sec2Diff!.toSection !== null, 'Section 2 toSection exists');
  } catch (e) {
    assert(false, `Diff comparison failed: ${(e as Error).message}`);
  }

  // Step 8: Diff with Unchanged Section
  try {
    // Add third version with identical sections
    const v3Draft = await PolicyService.createRevisionDraft(policyId, version2Id, ownerId, 'Version 3 duplicate draft');
    const diffV2V3 = await PolicyService.comparePolicyVersions(
      policyId,
      version2Id,
      v3Draft.id,
      checkerId,
      UserRole.CHECKER,
    );

    assert(diffV2V3.summary.unchangedSections === 2, 'Identical version comparison has 2 unchanged sections');
    assert(diffV2V3.summary.modifiedSections === 0, 'Identical version comparison has 0 modified sections');
    assert(diffV2V3.sections[0].changeType === 'UNCHANGED', 'Section 1 changeType is UNCHANGED');
    assert(diffV2V3.sections[1].changeType === 'UNCHANGED', 'Section 2 changeType is UNCHANGED');
  } catch (e) {
    assert(false, `Unchanged diff test failed: ${(e as Error).message}`);
  }

  // Step 9: Security Check - Cross-tenant/Ownership Access Control
  try {
    // Checker/Admin can access, but unrelated Owner cannot access policy they don't own
    await PolicyService.getPolicyVersions(policyId, otherOwnerId, UserRole.USER);
    assert(false, 'Unrelated owner should be blocked with 403');
  } catch (e) {
    assert(
      (e as unknown as { statusCode?: number }).statusCode === 403,
      'Unrelated owner blocked with 403 Forbidden',
    );
  }

  console.info(`\n📊 Version History & Diff Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runVersionDiffTests().catch((err) => {
  console.error('Fatal error in version-diff test:', err);
  process.exit(1);
});

