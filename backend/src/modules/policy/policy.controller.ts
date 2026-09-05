import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { PolicyService } from './policy.service';
import { PdfParserService } from '../parser/pdfParser.service';
import { ReviewService } from '../review/review.service';

export class PolicyController {
  /**
   * POST /api/policies/upload
   * Accepts multipart PDF, parses structure, saves PDF to local storage, returns staging draft
   */
  public static async uploadPolicyPdf(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.file) {
        const err = new Error('No PDF file was uploaded');
        (err as unknown as { statusCode: number }).statusCode = 400;
        throw err;
      }

      // Ensure storage directory exists
      const uploadDir = path.join(process.cwd(), 'uploads', 'policies');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(req.file.originalname) || '.pdf';
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExtension}`;
      const targetFilePath = path.join(uploadDir, uniqueFileName);

      // Save file buffer to local disk
      fs.writeFileSync(targetFilePath, req.file.buffer);

      const fileUrl = `/uploads/policies/${uniqueFileName}`;

      // Parse PDF buffer using deterministic parser
      const parsedDraft = await PdfParserService.parsePdfBuffer(
        req.file.buffer,
        req.file.originalname,
        fileUrl,
      );

      res.status(200).json({
        status: 'success',
        message: 'PDF extracted and structured successfully',
        draft: parsedDraft,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/policies/confirm-upload
   * Commits the reviewed PDF staging draft to database in DRAFT status
   */
  public static async confirmUpload(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ownerId = req.user!.userId;
      const { title, documentCode, category, description, sourceFileUrl, sections } = req.body;

      const policy = await PolicyService.confirmUploadedPolicy(ownerId, {
        title,
        documentCode,
        category,
        description,
        sourceFileUrl,
        sections,
      });

      res.status(201).json({
        status: 'success',
        message: 'Policy document created from PDF extraction',
        policy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/policies/:id/submit
   * Submits draft for Checker compliance review
   */
  public static async submitPolicy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const ownerId = req.user!.userId;

      const review = await ReviewService.submitPolicy(policyId, ownerId);

      res.status(200).json({
        status: 'success',
        message: 'Policy successfully submitted for compliance review',
        review,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/policies/:id/revisions
   * Creates a new DRAFT revision from an APPROVED policy
   */
  public static async createRevision(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const ownerId = req.user!.userId;

      const policy = await PolicyService.createRevisionFromApproved(policyId, ownerId);

      res.status(201).json({
        status: 'success',
        message: 'New draft revision created from approved policy',
        policy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/policies/:id/save-draft
   * Saves all pending section changes as a NEW version snapshot.
   * The current DRAFT version is cloned with versionNumber + 1
   * and the provided sectionChanges are applied to the new version's sections.
   */
  public static async saveDraftAsNewVersion(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const ownerId = req.user!.userId;
      const { sectionChanges, changeSummary } = req.body;

      if (!sectionChanges || typeof sectionChanges !== 'object') {
        const err = new Error('sectionChanges is required and must be an object mapping sectionId to field updates');
        (err as unknown as { statusCode: number }).statusCode = 400;
        throw err;
      }

      const policy = await PolicyService.saveDraftAsNewVersion(policyId, ownerId, {
        sectionChanges,
        changeSummary,
      });

      res.status(200).json({
        status: 'success',
        message: `Draft saved as version v${policy.activeVersion.versionNumber}.0`,
        policy,
        newVersionNumber: policy.activeVersion.versionNumber,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/policies
   */
  public static async createPolicy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ownerId = req.user!.userId;
      const { title, documentCode, category, description, sourceFileUrl } = req.body;

      const policy = await PolicyService.createPolicy(ownerId, {
        title,
        documentCode,
        category,
        description,
        sourceFileUrl,
      });

      res.status(201).json({
        status: 'success',
        message: 'Policy draft created successfully',
        policy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/policies
   */
  public static async getPolicies(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ownerId = req.user!.userId;
      const policies = await PolicyService.getPoliciesByOwner(ownerId);

      res.status(200).json({
        status: 'success',
        count: policies.length,
        policies,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/policies/:id
   */
  public static async getPolicyById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const requestingUserId = req.user!.userId;
      const requestingRole = req.user!.role;

      const policy = await PolicyService.getPolicyById(
        policyId,
        requestingUserId,
        requestingRole,
      );

      res.status(200).json({
        status: 'success',
        policy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/policies/:id
   */
  public static async updatePolicy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const ownerId = req.user!.userId;
      const { title, category, description } = req.body;

      const updated = await PolicyService.updatePolicy(policyId, ownerId, {
        title,
        category,
        description,
      });

      res.status(200).json({
        status: 'success',
        message: 'Policy updated successfully',
        policy: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/policies/:id/sections
   */
  public static async addSection(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const ownerId = req.user!.userId;
      const {
        title,
        controlArea,
        policyStatement,
        rolesAndResponsibilities,
        procedures,
        standardProcedure,
        requiredRecords,
        controlsAndChecks,
        exceptionsAndEscalation,
        kpiExamples,
        testingScenario,
        complianceNotes,
        exceptions,
        unmatchedContent,
        orderIndex,
        sectionNumber,
      } = req.body;

      const section = await PolicyService.addSection(policyId, ownerId, {
        title,
        controlArea,
        policyStatement,
        rolesAndResponsibilities,
        procedures,
        standardProcedure,
        requiredRecords,
        controlsAndChecks,
        exceptionsAndEscalation,
        kpiExamples,
        testingScenario,
        complianceNotes,
        exceptions,
        unmatchedContent,
        orderIndex,
        sectionNumber,
      });

      res.status(201).json({
        status: 'success',
        message: 'Section added to draft successfully',
        section,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/policies/:id/sections/:sectionId
   */
  public static async updateSection(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const sectionId = req.params.sectionId;
      const ownerId = req.user!.userId;
      const {
        title,
        controlArea,
        policyStatement,
        rolesAndResponsibilities,
        procedures,
        standardProcedure,
        requiredRecords,
        controlsAndChecks,
        exceptionsAndEscalation,
        kpiExamples,
        testingScenario,
        complianceNotes,
        exceptions,
        unmatchedContent,
        orderIndex,
      } = req.body;

      const section = await PolicyService.updateSection(
        policyId,
        sectionId,
        ownerId,
        {
          title,
          controlArea,
          policyStatement,
          rolesAndResponsibilities,
          procedures,
          standardProcedure,
          requiredRecords,
          controlsAndChecks,
          exceptionsAndEscalation,
          kpiExamples,
          testingScenario,
          complianceNotes,
          exceptions,
          unmatchedContent,
          orderIndex,
        },
      );

      res.status(200).json({
        status: 'success',
        message: 'Section updated successfully',
        section,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/policies/:id/sections/:sectionId
   */
  public static async deleteSection(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const sectionId = req.params.sectionId;
      const ownerId = req.user!.userId;

      const result = await PolicyService.deleteSection(
        policyId,
        sectionId,
        ownerId,
      );

      res.status(200).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/policies/:id
   */
  public static async deletePolicy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const ownerId = req.user!.userId;

      const result = await PolicyService.deletePolicy(policyId, ownerId);

      res.status(200).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/policies/:id/versions
   * List all PolicyVersions for a policy with versionNumber, submittedAt, status, submittedBy
   */
  public static async getPolicyVersions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const requestingUserId = req.user!.userId;
      const requestingRole = req.user!.role;

      const versions = await PolicyService.getPolicyVersions(
        policyId,
        requestingUserId,
        requestingRole,
      );

      res.status(200).json({
        status: 'success',
        count: versions.length,
        versions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/policies/:id/versions/:versionId
   * Full sections for one specific version (read-only, for historical viewing)
   */
  public static async getPolicyVersionById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const versionId = req.params.versionId;
      const requestingUserId = req.user!.userId;
      const requestingRole = req.user!.role;

      const version = await PolicyService.getPolicyVersionById(
        policyId,
        versionId,
        requestingUserId,
        requestingRole,
      );

      res.status(200).json({
        status: 'success',
        version,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/policies/:id/diff?from=:versionIdA&to=:versionIdB
   * Compares two versions section-by-section and returns field-by-field diff
   */
  public static async getPolicyDiff(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const fromVersion = req.query.from as string;
      const toVersion = req.query.to as string;
      const requestingUserId = req.user!.userId;
      const requestingRole = req.user!.role;

      if (!fromVersion || !toVersion) {
        const err = new Error('Both "from" and "to" version query parameters are required for diff comparison');
        (err as unknown as { statusCode: number }).statusCode = 400;
        throw err;
      }

      const diff = await PolicyService.comparePolicyVersions(
        policyId,
        fromVersion,
        toVersion,
        requestingUserId,
        requestingRole,
      );

      res.status(200).json({
        status: 'success',
        diff,
      });
    } catch (error) {
      next(error);
    }
  }
}

