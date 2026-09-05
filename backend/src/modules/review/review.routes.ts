import { Router } from 'express';
import { ReviewController } from './review.controller';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { UserRole } from '../auth/auth.types';

const router = Router();

// All review routes require authentication
router.use(authenticate);

// Unassigned review queue (CHECKER and ADMIN for oversight)
router.get(
  '/queue',
  requireRole(UserRole.CHECKER, UserRole.ADMIN),
  ReviewController.getUnassignedQueue,
);

// Checker's own assigned reviews
router.get(
  '/mine',
  requireRole(UserRole.CHECKER, UserRole.ADMIN),
  ReviewController.getMyReviews,
);

// Breached SLA reviews list (ADMIN-only — governance/oversight)
router.get(
  '/breached',
  requireRole(UserRole.ADMIN),
  ReviewController.getBreachedReviews,
);

// Review detail — CHECKER (own assigned), ADMIN (oversight), USER (own policy reviews)
// Object-level authorization enforced in service layer
router.get(
  '/:id',
  requireRole(UserRole.CHECKER, UserRole.ADMIN, UserRole.USER),
  ReviewController.getReviewById,
);

// Claim review atomically (CHECKER only — Admin uses reassign, not claim)
router.post(
  '/:id/assign',
  requireRole(UserRole.CHECKER),
  ReviewController.assignReview,
);

// Approve review decision — ASSIGNED CHECKER ONLY
// Admin MUST NOT approve — use /reassign instead
router.post(
  '/:id/approve',
  requireRole(UserRole.CHECKER),
  ReviewController.approveReview,
);

// Request changes — ASSIGNED CHECKER ONLY
// Admin MUST NOT request changes — use /reassign instead
router.post(
  '/:id/request-changes',
  requireRole(UserRole.CHECKER),
  ReviewController.requestChanges,
);

// Reassign review to a different Checker (ADMIN only)
router.post(
  '/:id/reassign',
  requireRole(UserRole.ADMIN),
  ReviewController.reassignReview,
);

export const reviewRoutes = router;
