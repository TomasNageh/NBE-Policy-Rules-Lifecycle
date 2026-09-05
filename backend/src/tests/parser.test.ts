import { PdfParserService } from '../modules/parser/pdfParser.service';

async function runParserTests() {
  console.info('🧪 Starting NBE PDF Ingestion & Section Parsing Unit Tests...');
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

  // Sample 1: Clean Template Text
  const cleanSample = `
National Bank of Egypt - Confidential
National Bank of Egypt - Confidential

1. Policy Governance and Scope
Control Area / Illustrative Requirement:
Owner: Risk Management Division
Approval: Board Risk Committee

Policy Statement:
All retail lending credit products must conform to Central Bank of Egypt prudential capital adequacy rules.

Roles and Responsibilities:
Credit Analysts evaluate loan files; Branch Managers conduct first-line review.

Standard Procedure:
1. Intake applicant documentation. 2. Verify national ID and I-Score bureau report.

Required Records:
Signed customer credit agreement and verified salary certificate.

Controls and Quality Checks:
Dual-authorization for all limits exceeding 500,000 EGP.

Exceptions and Escalation:
Exceptions require Head of Retail Credit sign-off.

Illustrative KPI Examples:
Non-performing loan (NPL) ratio under 2.5%.

Testing Scenario:
Sample 50 retail credit originations monthly.

Compliance Note:
CBE Circular No. 2024/09 on Consumer Debt Restructuring.

2. Compensation and Incentive Philosophy
Policy Statement:
Remuneration structures must not incentivize excessive risk-taking.

Roles and Responsibilities:
Human Resources and Remuneration Committee.
`;

  // Test 1: Splitting and Subheading Extraction on Clean Sample
  try {
    const cleaned = PdfParserService.stripHeadersAndFooters(cleanSample);
    const sections = PdfParserService.splitIntoNumberedSections(cleaned);

    assert(sections.length === 2, 'Split text into exactly 2 numbered sections');
    assert(sections[0].sectionNumber === 1, 'First section number is 1');
    assert(sections[0].title === 'Policy Governance and Scope', 'First section title matches');
    assert(sections[1].sectionNumber === 2, 'Second section number is 2');

    const parsedSec1 = PdfParserService.parseSectionSubheadings(
      sections[0].sectionNumber,
      sections[0].title,
      sections[0].body,
    );

    assert(
      parsedSec1.policyStatement.includes('prudential capital adequacy rules'),
      'Policy Statement extracted correctly',
    );
    assert(
      parsedSec1.rolesAndResponsibilities?.includes('Credit Analysts evaluate loan files') ?? false,
      'Roles & Responsibilities extracted correctly',
    );
    assert(
      parsedSec1.standardProcedure?.includes('Intake applicant documentation') ?? false,
      'Standard Procedure extracted correctly',
    );
    assert(
      parsedSec1.requiredRecords?.includes('Signed customer credit agreement') ?? false,
      'Required Records extracted correctly',
    );
    assert(
      parsedSec1.controlsAndChecks?.includes('Dual-authorization') ?? false,
      'Controls & Quality Checks extracted correctly',
    );
    assert(
      parsedSec1.exceptionsAndEscalation?.includes('Head of Retail Credit') ?? false,
      'Exceptions & Escalation extracted correctly',
    );
    assert(
      parsedSec1.kpiExamples?.includes('Non-performing loan') ?? false,
      'Illustrative KPI Examples mapped correctly to kpiExamples',
    );
    assert(
      parsedSec1.testingScenario?.includes('Sample 50 retail credit originations') ?? false,
      'Testing Scenario extracted correctly',
    );
    assert(
      parsedSec1.complianceNotes?.includes('CBE Circular No. 2024/09') ?? false,
      'Compliance Notes extracted correctly',
    );
    assert(parsedSec1.parseStatus === 'MATCHED', 'Clean section status is MATCHED');
  } catch (e) {
    assert(false, `Clean sample test failed: ${(e as Error).message}`);
  }

  // Test 2: Imperfect Spacing, Broken Lines & Mixed Casing
  const messySample = `
Section 1: Cybersecurity Access Control
    CONTROL AREA:
    Identity and Access Governance
  
    POLICY STATEMENT:
    All core banking application passwords must expire every 60 days
    and require multi-factor authentication (MFA).

    ROLES & RESPONSIBILITIES:
    CISO Department monitors access logs; IT Operations administers user accounts.

    procedures:
    Step 1: Admin creates temporary credentials.
    Step 2: User changes password on first login.

    COMPLIANCE NOTE:
    CBE Cybersecurity Framework v2.1.
`;

  try {
    const sections = PdfParserService.splitIntoNumberedSections(messySample);
    assert(sections.length === 1, 'Messy sample identified 1 section');
    assert(sections[0].title === 'Cybersecurity Access Control', 'Messy title parsed accurately');

    const parsedSec = PdfParserService.parseSectionSubheadings(
      sections[0].sectionNumber,
      sections[0].title,
      sections[0].body,
    );

    assert(
      parsedSec.policyStatement.includes('passwords must expire every 60 days'),
      'Messy policy statement parsed with line wrapping',
    );
    assert(
      parsedSec.controlArea?.includes('Identity and Access Governance') ?? false,
      'Uppercase CONTROL AREA parsed correctly',
    );
    assert(
      parsedSec.rolesAndResponsibilities?.includes('CISO Department') ?? false,
      'ROLES & RESPONSIBILITIES with ampersand parsed correctly',
    );
    assert(
      parsedSec.standardProcedure?.includes('Admin creates temporary credentials') ?? false,
      'Lowercase procedures parsed correctly',
    );
  } catch (e) {
    assert(false, `Messy spacing test failed: ${(e as Error).message}`);
  }

  // Test 3: Unmatched Content Capture & Warning Generation
  const unmatchedSample = `
1. Foreign Exchange Hedging Framework
[UNSTRUCTURED LEGAL PREAMBLE]: This paragraph contains arbitrary text that does not belong to standard subheadings.
Another random remark before any heading.

Policy Statement:
Treasury dealers must not execute speculative unhedged derivative positions.

Compliance Note:
CBE FX Trading Directives.
`;

  try {
    const sections = PdfParserService.splitIntoNumberedSections(unmatchedSample);
    const parsed = PdfParserService.parseSectionSubheadings(
      sections[0].sectionNumber,
      sections[0].title,
      sections[0].body,
    );

    assert(
      parsed.unmatchedContent.length >= 2,
      'Unrecognized preamble captured in unmatchedContent array',
    );
    assert(
      parsed.unmatchedContent[0].includes('UNSTRUCTURED LEGAL PREAMBLE'),
      'Unmatched content preserved without data loss',
    );
    assert(
      parsed.parseWarnings.some((w) => w.includes('unmatched content')),
      'Parse warning generated for unmatched content',
    );
    assert(parsed.parseStatus === 'PARTIAL', 'Section with unmatched content is tagged PARTIAL');
  } catch (e) {
    assert(false, `Unmatched content test failed: ${(e as Error).message}`);
  }

  // Test 4: Repeated Header and Footer Stripping
  const headerFooterText = `
National Bank of Egypt - Internal Policy Document
1. General Scope
Policy Statement:
Approved banking policy.
Page 1 of 12
National Bank of Egypt - Internal Policy Document
2. Risk Boundaries
Policy Statement:
Approved risk policy.
Page 2 of 12
National Bank of Egypt - Internal Policy Document
3. Governance
Policy Statement:
Governance guidelines.
Page 3 of 12
`;

  try {
    const stripped = PdfParserService.stripHeadersAndFooters(headerFooterText);
    assert(
      !stripped.includes('National Bank of Egypt - Internal Policy Document'),
      'Repeated header removed across pages',
    );
    assert(!stripped.includes('Page 1 of 12'), 'Page footer removed');
    assert(stripped.includes('1. General Scope'), 'Section headers preserved');
  } catch (e) {
    assert(false, `Header/footer stripping failed: ${(e as Error).message}`);
  }

  console.info(`\n📊 PDF Parser Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runParserTests().catch((err) => {
  console.error('Fatal error in parser test:', err);
  process.exit(1);
});
