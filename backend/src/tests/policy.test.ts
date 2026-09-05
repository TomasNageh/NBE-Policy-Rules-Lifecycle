import { PolicyService } from '../modules/policy/policy.service';
import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/auth/auth.types';
import { PolicyStatus } from '../modules/policy/policy.types';

async function runPolicyTests() {
  console.info('🧪 Starting NBE Policy Creation & Section Editing Verification Tests...');
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

  const owner1 = await AuthService.findUserByEmail('owner@nbe.com.eg');
  const owner2 = await AuthService.findUserByEmail('checker@nbe.com.eg');
  const owner1Id = owner1!.id;
  const owner2Id = owner2!.id;

  let createdPolicyId = '';
  let initialSectionId = '';
  let secondSectionId = '';

  // Test 1: Create Policy in DRAFT status
  try {
    const docCode = `POL-TEST-${Date.now().toString().slice(-4)}`;
    const policy = await PolicyService.createPolicy(owner1Id, {
      title: 'Retail Credit Underwriting & Risk Governance Policy',
      documentCode: docCode,
      category: 'Credit Risk',
      description: 'Comprehensive policy guidelines for consumer and retail loan underwriting.',
    });

    createdPolicyId = policy.id;
    initialSectionId = policy.activeVersion.sections[0].id;

    assert(policy.currentStatus === PolicyStatus.DRAFT, 'Created policy status is DRAFT');
    assert(policy.activeVersion.versionNumber === 1, 'Initial version number is 1');
    assert(policy.activeVersion.sections.length === 1, 'Contains default initial section');
    assert(policy.ownerId === owner1Id, 'Policy is owned by owner1');
  } catch (e) {
    assert(false, `Policy creation failed: ${(e as Error).message}`);
  }

  // Test 2: List Policies for Owner
  try {
    const list = await PolicyService.getPoliciesByOwner(owner1Id);
    assert(list.length > 0, 'Owner policy list returns created policy');
    assert(list.some((p) => p.id === createdPolicyId), 'Created policy exists in owner listing');
  } catch (e) {
    assert(false, `Policy listing failed: ${(e as Error).message}`);
  }

  // Test 3: Get Full Policy Detail
  try {
    const detail = await PolicyService.getPolicyById(createdPolicyId, owner1Id, UserRole.USER);
    assert(detail.id === createdPolicyId, 'Fetched policy ID matches');
    assert(detail.activeVersion.sections.length >= 1, 'Active version has sections populated');
  } catch (e) {
    assert(false, `Get policy detail failed: ${(e as Error).message}`);
  }

  // Test 4: Add New Section to Draft
  try {
    const newSection = await PolicyService.addSection(createdPolicyId, owner1Id, {
      title: 'Credit Score & Eligibility Matrix',
      controlArea: 'Credit Underwriting',
      policyStatement: 'All retail applicants must meet minimum credit Bureau I-Score thresholds of 650.',
      rolesAndResponsibilities: 'Credit Analysts perform verification; Branch Managers sign off.',
      procedures: '1. Ingest I-Score report. 2. Verify debt-to-income ratio <= 50%.',
      complianceNotes: 'Mandated under CBE Retail Lending Regulations.',
      exceptions: 'Exceptions require Executive Committee approval.',
    });

    secondSectionId = newSection.id;
    assert(newSection.sectionNumber === 2, 'Added section has sectionNumber 2');
    assert(newSection.title === 'Credit Score & Eligibility Matrix', 'Added section title matches');

    const detailAfterAdd = await PolicyService.getPolicyById(createdPolicyId, owner1Id, UserRole.USER);
    assert(detailAfterAdd.activeVersion.sections.length === 2, 'Policy now contains 2 sections');
  } catch (e) {
    assert(false, `Add section failed: ${(e as Error).message}`);
  }

  // Test 5: Update Existing Section
  try {
    const updatedSec = await PolicyService.updateSection(
      createdPolicyId,
      secondSectionId,
      owner1Id,
      {
        policyStatement: 'UPDATED: Minimum credit Bureau I-Score is strictly 680 for unsecured facilities.',
        controlArea: 'Risk Controls',
      },
    );

    assert(updatedSec.policyStatement.includes('UPDATED: Minimum'), 'Section policyStatement updated successfully');
    assert(updatedSec.controlArea === 'Risk Controls', 'Section controlArea updated successfully');
  } catch (e) {
    assert(false, `Update section failed: ${(e as Error).message}`);
  }

  // Test 6: Ownership Verification (IDOR Protection)
  try {
    // owner2 attempts to update section of owner1's policy
    await PolicyService.updateSection(
      createdPolicyId,
      initialSectionId,
      owner2Id,
      { policyStatement: 'Unauthorized modification attempt' },
    );
    assert(false, 'Unauthorized user should have been blocked from editing section');
  } catch (e) {
    assert((e as Error).message.includes('Access denied'), 'Unauthorized edit blocked with 403 Access Denied');
  }

  // Test 7: Remove Section from Draft
  try {
    const delRes = await PolicyService.deleteSection(createdPolicyId, secondSectionId, owner1Id);
    assert(delRes.remainingSectionsCount === 1, 'Section removed and section count reduced to 1');
  } catch (e) {
    assert(false, `Delete section failed: ${(e as Error).message}`);
  }

  console.info(`\n📊 Policy Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPolicyTests().catch((err) => {
  console.error('Fatal error during policy test run:', err);
  process.exit(1);
});
