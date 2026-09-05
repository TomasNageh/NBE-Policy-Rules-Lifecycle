import pdfParse from 'pdf-parse';
import { ParsedPolicyDraft, ParsedSection } from './parser.types';

export class PdfParserService {
  /**
   * Strip repeated page headers and footers from multi-page text
   * Header/footer lines are isolated page numbers, confidentiality watermarks, or repeating running header lines.
   */
  public static stripHeadersAndFooters(rawText: string): string {
    const lines = rawText.split(/\r?\n/);

    const cleanedLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;

      // 1. Page number patterns
      if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(trimmed)) return false;
      if (/^\d+\s*\/\s*\d+$/.test(trimmed)) return false;
      if (/^-\s*\d+\s*-$/.test(trimmed)) return false;

      // 2. Running headers / footers with specific watermark / test tokens
      if (/^organization\s+development\s+policy.*dummy/i.test(trimmed)) return false;
      if (/^fictional\s+hr\s+policy\s+for\s+testing/i.test(trimmed)) return false;
      if (/^national\s+bank\s+of\s+egypt\s*-\s*confidential/i.test(trimmed)) return false;
      if (/^confidential\s*-\s*internal\s+use\s+only/i.test(trimmed)) return false;

      return true;
    });

    return cleanedLines.join('\n');
  }

  /**
   * Cleans raw PDF table noise from extracted section titles
   */
  public static cleanExtractedTitle(rawTitle: string, sectionNumber: number, bodyText?: string): string {
    if (!rawTitle) return `Section ${sectionNumber} Mandate`;

    let cleaned = rawTitle.trim();

    // Table matrix header tokens to strip
    const tableNoiseRegex = /(?:OWNER\s*HR\s*FUNCTION|HR\s*FUNCTION|PROCESS\s*OWNER|APPROVAL\s*PER|DOCUMENTED\s*AUTHORITY\s*MATRIX|AUTHORITY\s*MATRIX|EVIDENCE\s*SYSTEM\s*RECORD|EVIDENCE\s*SYSTEM|AUDIT\s*TRAIL|EXCEPTION\s*DOCUMENTED|TIME\s*BOUND\s*APPROVAL|APPROVAL\s*REVIEW|PERIODIC\s*CONTROL\s*AND\s*PROCESS\s*REVIEW|PERIODIC\s*CONTROL)/gi;

    if (tableNoiseRegex.test(cleaned) || (cleaned.length > 60 && cleaned === cleaned.toUpperCase())) {
      if (bodyText) {
        const bodyHeadingMatch = bodyText.match(/(?:Control Area|Policy Scope|Domain|Focus Area|Objective)[:\s]*([^\n\r.]+)/i);
        if (bodyHeadingMatch && bodyHeadingMatch[1].trim().length > 4 && bodyHeadingMatch[1].trim().length < 80) {
          cleaned = bodyHeadingMatch[1].trim();
        } else {
          cleaned = cleaned.replace(tableNoiseRegex, '').replace(/[|•\-_:]+/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } else {
        cleaned = cleaned.replace(tableNoiseRegex, '').replace(/[|•\-_:]+/g, ' ').replace(/\s+/g, ' ').trim();
      }

      if (cleaned.length < 4) {
        cleaned = `Policy Control Framework — Section ${sectionNumber}`;
      }
    }

    // Capitalize Title Case if all uppercase
    if (cleaned === cleaned.toUpperCase() && cleaned.length > 4) {
      cleaned = cleaned
        .toLowerCase()
        .replace(/(?:^|\s|\/|[-(])\w/g, (m) => m.toUpperCase());
    }

    return cleaned.slice(0, 100).trim();
  }

  /**
   * Split raw text into numbered sections, intelligently ignoring Table of Contents (TOC) stubs
   */
  public static splitIntoNumberedSections(
    text: string,
  ): { sectionNumber: number; title: string; body: string }[] {
    const lines = text.split(/\r?\n/);
    const headingRegex = /^(?:section\s+)?(\d+)[.:]\s+([A-Za-z0-9\s,\-&/()'"\u201C\u201D]{3,120})$/i;

    const sectionsAccumulator: { sectionNumber: number; title: string; body: string }[] = [];
    let currentSection: { sectionNumber: number; title: string; bodyLines: string[] } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(headingRegex);

      if (match) {
        const num = parseInt(match[1], 10);
        const rawTitle = match[2].trim();

        if (currentSection) {
          const body = currentSection.bodyLines.join('\n').trim();
          sectionsAccumulator.push({
            sectionNumber: currentSection.sectionNumber,
            title: this.cleanExtractedTitle(currentSection.title, currentSection.sectionNumber, body),
            body,
          });
        }

        currentSection = {
          sectionNumber: num,
          title: rawTitle,
          bodyLines: [],
        };
      } else if (currentSection) {
        currentSection.bodyLines.push(lines[i]);
      }
    }

    if (currentSection) {
      const body = currentSection.bodyLines.join('\n').trim();
      sectionsAccumulator.push({
        sectionNumber: currentSection.sectionNumber,
        title: this.cleanExtractedTitle(currentSection.title, currentSection.sectionNumber, body),
        body,
      });
    }

    // Filter out Table of Contents stubs (stubs where body is < 150 chars and has later duplicate sectionNumber)
    const finalSections: { sectionNumber: number; title: string; body: string }[] = [];
    for (let i = 0; i < sectionsAccumulator.length; i++) {
      const sec = sectionsAccumulator[i];
      const hasLaterDuplicate = sectionsAccumulator
        .slice(i + 1)
        .some((other) => other.sectionNumber === sec.sectionNumber);

      if (hasLaterDuplicate && sec.body.length < 200) {
        continue; // Skip TOC stub
      }

      finalSections.push(sec);
    }

    // Fallback: If no numbered sections matched, treat entire text as single section
    if (finalSections.length === 0 && text.trim().length > 0) {
      finalSections.push({
        sectionNumber: 1,
        title: 'General Policy Mandate',
        body: text.trim(),
      });
    }

    return finalSections;
  }

  /**
   * Parse sub-headings within an individual section body
   */
  public static parseSectionSubheadings(
    sectionNumber: number,
    sectionTitle: string,
    sectionBody: string,
  ): ParsedSection {
    const subHeadingPatterns = [
      { key: 'controlArea', regex: /^(?:control\s*area(?:\s*\/?\s*illustrative\s*requirement)?|control\s*area\s*requirement)[:\s]*/i },
      { key: 'policyStatement', regex: /^(?:policy\s*statement|mandatory\s*policy\s*statement|core\s*policy\s*statement)[:\s]*/i },
      { key: 'rolesAndResponsibilities', regex: /^(?:roles\s*(?:and|&)?\s*responsibilities|responsibilities)[:\s]*/i },
      { key: 'standardProcedure', regex: /^(?:standard\s*procedure|standard\s*operating\s*procedures?|procedures?)[:\s]*/i },
      { key: 'requiredRecords', regex: /^(?:required\s*records|records\s*(?:and|&)?\s*evidence|evidence\s*records)[:\s]*/i },
      { key: 'controlsAndChecks', regex: /^(?:controls\s*(?:and|&)?\s*quality\s*checks|quality\s*checks|internal\s*controls)[:\s]*/i },
      { key: 'exceptionsAndEscalation', regex: /^(?:exceptions\s*(?:and|&)?\s*escalation|exceptions|escalations)[:\s]*/i },
      { key: 'kpiExamples', regex: /^(?:illustrative\s*kpi\s*examples|kpi\s*examples|key\s*performance\s*indicators?|illustrative\s*kpis?)[:\s]*/i },
      { key: 'testingScenario', regex: /^(?:testing\s*scenarios?|audit\s*testing\s*scenario)[:\s]*/i },
      { key: 'complianceNotes', regex: /^(?:compliance\s*notes?|regulatory\s*notes?|cbe\s*compliance\s*notes?)[:\s]*/i },
      { key: 'examplesOrDummyData', regex: /^(?:dummy\s*data\s*example|field\s*sample\s*value|illustrative\s*example)[:\s]*/i },
    ];

    const lines = sectionBody.split(/\r?\n/);
    const parsedFields: Record<string, string[]> = {
      preamble: [],
      controlArea: [],
      policyStatement: [],
      rolesAndResponsibilities: [],
      standardProcedure: [],
      requiredRecords: [],
      controlsAndChecks: [],
      exceptionsAndEscalation: [],
      kpiExamples: [],
      testingScenario: [],
      complianceNotes: [],
      examplesOrDummyData: [],
      unmatchedContent: [],
    };

    let currentKey: string = 'preamble';

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      // Check if line matches any known subheading
      let matchedKey: string | null = null;
      for (const pattern of subHeadingPatterns) {
        if (pattern.regex.test(trimmed)) {
          matchedKey = pattern.key;
          break;
        }
      }

      if (matchedKey) {
        currentKey = matchedKey;
        // Check if there is inline text after the matched subheading
        const cleanContent = trimmed.replace(
          subHeadingPatterns.find((p) => p.key === matchedKey)!.regex,
          '',
        ).trim();
        if (cleanContent) {
          parsedFields[currentKey].push(cleanContent);
        }
      } else {
        parsedFields[currentKey].push(trimmed);
      }
    }

    const preamble = parsedFields.preamble;
    let controlAreaText = parsedFields.controlArea.join('\n').trim();
    const policyStatementText = parsedFields.policyStatement.join('\n').trim();

    // Table matrix header tokens to strip
    const tableNoiseRegex = /(?:OWNER\s*HR\s*FUNCTION|HR\s*FUNCTION|PROCESS\s*OWNER|APPROVAL\s*PER|DOCUMENTED\s*AUTHORITY\s*MATRIX|AUTHORITY\s*MATRIX|EVIDENCE\s*SYSTEM\s*RECORD|EVIDENCE\s*SYSTEM|AUDIT\s*TRAIL|EXCEPTION\s*DOCUMENTED|TIME\s*BOUND\s*APPROVAL|APPROVAL\s*REVIEW|PERIODIC\s*CONTROL\s*AND\s*PROCESS\s*REVIEW|PERIODIC\s*CONTROL)/gi;

    // Clean control area if it contains table noise
    if (controlAreaText) {
      if (tableNoiseRegex.test(controlAreaText) || controlAreaText.length > 50) {
        controlAreaText = controlAreaText.replace(tableNoiseRegex, '').replace(/[|•\-_:]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 45);
      }
    }

    // If preamble text exists before Control Area and no clean control area, extract a concise summary
    if (preamble.length > 0 && !controlAreaText) {
      const cleanPreamble = preamble.join(' ').replace(tableNoiseRegex, '').replace(/[|•\-_:]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanPreamble.length > 3) {
        controlAreaText = cleanPreamble.slice(0, 40);
      }
    }

    const warnings: string[] = [];
    const unmatched = parsedFields.unmatchedContent;

    if (unmatched.length > 0) {
      warnings.push(`Section contains ${unmatched.length} unassigned paragraph(s).`);
    }

    if (!policyStatementText) {
      warnings.push('Policy Statement heading was not detected.');
    }

    let parseStatus: 'MATCHED' | 'PARTIAL' | 'UNMATCHED' = 'MATCHED';
    if (warnings.length > 0 || !policyStatementText) {
      parseStatus = policyStatementText ? 'PARTIAL' : 'UNMATCHED';
    }

    return {
      sectionNumber,
      title: sectionTitle,
      controlArea: controlAreaText || null,
      policyStatement: policyStatementText || (preamble.length > 0 ? preamble.join('\n').trim() : 'Policy statement pending review.'),
      rolesAndResponsibilities: parsedFields.rolesAndResponsibilities.join('\n').trim() || null,
      standardProcedure: parsedFields.standardProcedure.join('\n').trim() || null,
      requiredRecords: parsedFields.requiredRecords.join('\n').trim() || null,
      controlsAndChecks: parsedFields.controlsAndChecks.join('\n').trim() || null,
      exceptionsAndEscalation: parsedFields.exceptionsAndEscalation.join('\n').trim() || null,
      kpiExamples: parsedFields.kpiExamples.join('\n').trim() || null,
      testingScenario: parsedFields.testingScenario.join('\n').trim() || null,
      complianceNotes: parsedFields.complianceNotes.join('\n').trim() || null,
      unmatchedContent: unmatched,
      parseStatus,
      parseWarnings: warnings,
    };
  }

  /**
   * Parse PDF buffer into structured draft
   */
  public static async parsePdfBuffer(
    buffer: Buffer,
    fileName: string,
    fileUrl: string,
  ): Promise<ParsedPolicyDraft> {
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text || '';
    const totalPages = pdfData.numpages || 1;

    // 1. Clean headers and footers
    const cleanedText = this.stripHeadersAndFooters(rawText);

    // 2. Extract Document Title and Metadata if present in first page
    let documentCode = `POL-DOC-${Date.now().toString().slice(-4)}`;
    let title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    let category = 'Human Resources & Organization Development';
    let description = '';

    // Search for explicit metadata patterns (e.g. Code: POL-..., Title: ...)
    const codeMatch = cleanedText.match(/(?:document\s+code|policy\s+code|code)\s*[:-]\s*([A-Z0-9-]+)/i);
    if (codeMatch) documentCode = codeMatch[1].trim().toUpperCase();

    const titleMatch = cleanedText.match(/(?:policy\s+title|title)\s*[:-]\s*([^\n\r]+)/i);
    if (titleMatch) title = titleMatch[1].trim();

    const catMatch = cleanedText.match(/(?:category|domain|department)\s*[:-]\s*([^\n\r]+)/i);
    if (catMatch) category = catMatch[1].trim();

    const descMatch = cleanedText.match(/(?:executive\s+summary|purpose|scope)\s*[:-]\s*([^\n\r]+(?:\n[^\n\r]+){0,2})/i);
    if (descMatch) description = descMatch[1].trim();

    // 3. Split into numbered sections
    const rawSections = this.splitIntoNumberedSections(cleanedText);

    // 4. Parse sub-headings for each section
    const sections: ParsedSection[] = rawSections.map((s) =>
      this.parseSectionSubheadings(s.sectionNumber, s.title, s.body),
    );

    return {
      documentCode,
      title,
      category,
      description,
      sourceFileUrl: fileUrl,
      fileName,
      totalPages,
      sections,
      globalUnmatched: [],
    };
  }
}
