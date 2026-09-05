import { Router } from 'express';
import multer from 'multer';
import { PolicyController } from './policy.controller';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { UserRole } from '../auth/auth.types';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents (.pdf) are supported'));
    }
  },
});

// All policy endpoints require valid authentication
router.use(authenticate);

// PDF Upload & Extraction Staging (USER only — Admin does not create policies)
router.post(
  '/upload',
  requireRole(UserRole.USER),
  upload.single('file'),
  PolicyController.uploadPolicyPdf,
);

// Confirm and Commit Uploaded PDF Draft into DB (USER only)
router.post(
  '/confirm-upload',
  requireRole(UserRole.USER),
  PolicyController.confirmUpload,
);

// Policy Collection
router.post(
  '/',
  requireRole(UserRole.USER),
  PolicyController.createPolicy,
);

router.get(
  '/',
  requireRole(UserRole.USER),
  PolicyController.getPolicies,
);

// Policy Submission for Compliance Review (USER only)
router.post(
  '/:id/submit',
  requireRole(UserRole.USER),
  PolicyController.submitPolicy,
);

// Create new revision from an APPROVED policy (USER only — the policy owner)
router.post(
  '/:id/revisions',
  requireRole(UserRole.USER),
  PolicyController.createRevision,
);

// Save current DRAFT sections as a NEW version snapshot (USER only — the policy owner)
router.post(
  '/:id/save-draft',
  requireRole(UserRole.USER),
  PolicyController.saveDraftAsNewVersion,
);

// Policy Version History & Historical Snapshot Endpoints
// All authenticated roles can read version history (ADMIN for oversight, CHECKER via review)
router.get(
  '/:id/versions',
  PolicyController.getPolicyVersions,
);

router.get(
  '/:id/versions/:versionId',
  PolicyController.getPolicyVersionById,
);

// Policy Section-Level Diff Comparison
router.get(
  '/:id/diff',
  PolicyController.getPolicyDiff,
);

// Specific Policy Document Detail
router.get(
  '/:id',
  PolicyController.getPolicyById,
);

router.put(
  '/:id',
  requireRole(UserRole.USER),
  PolicyController.updatePolicy,
);

router.delete(
  '/:id',
  requireRole(UserRole.USER),
  PolicyController.deletePolicy,
);

// Structured Section Endpoints (Draft Mutation — USER only)
router.post(
  '/:id/sections',
  requireRole(UserRole.USER),
  PolicyController.addSection,
);

router.put(
  '/:id/sections/:sectionId',
  requireRole(UserRole.USER),
  PolicyController.updateSection,
);

router.delete(
  '/:id/sections/:sectionId',
  requireRole(UserRole.USER),
  PolicyController.deleteSection,
);

export const policyRoutes = router;
