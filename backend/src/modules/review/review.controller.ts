import { Request, Response, NextFunction } from 'express';
import { ReviewService } from './review.service';
import { UserRole } from '../auth/auth.types';

export class ReviewController {
  /**
   * GET /api/reviews/queue
   * Returns unassigned policy reviews awaiting a compliance reviewer
   */
  public static async getUnassignedQueue(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const queue = await ReviewService.getUnassignedQueue();
      res.status(200).json({
        status: 'success',
        count: queue.length,
        queue,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reviews/mine
   * Returns policy reviews currently assigned to the authenticated reviewer
   */
  public static async getMyReviews(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const checkerId = req.user!.userId;
      const reviews = await ReviewService.getMyReviews(checkerId);
      res.status(200).json({
        status: 'success',
        count: reviews.length,
        reviews,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reviews/breached
   * Returns all reviews that have breached their SLA timeline (Admin / Auditor only)
   */
  public static async getBreachedReviews(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const reviews = await ReviewService.getBreachedReviews();
      res.status(200).json({
        status: 'success',
        count: reviews.length,
        reviews,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reviews/:id
   * Returns complete details and sections of a policy review
   */
  public static async getReviewById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const reviewId = req.params.id;
      const userId = req.user!.userId;
      const userRole = req.user!.role as UserRole;

      const review = await ReviewService.getReviewById(reviewId, userId, userRole);

      res.status(200).json({
        status: 'success',
        review,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/reviews/:id/assign
   * Atomically claims a policy review for the requesting Checker
   */
  public static async assignReview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const reviewId = req.params.id;
      const checkerId = req.user!.userId;

      const review = await ReviewService.assignReview(reviewId, checkerId);

      res.status(200).json({
        status: 'success',
        message: 'Policy review successfully assigned to you',
        review,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/reviews/:id/approve
   * Approves a policy submission (assigned Checker only)
   */
  public static async approveReview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const reviewId = req.params.id;
      const checkerId = req.user!.userId;
      const userRole = req.user!.role as UserRole;

      const review = await ReviewService.approveReview(reviewId, checkerId, userRole);

      res.status(200).json({
        status: 'success',
        message: 'Policy review approved successfully. Document version is now locked and active.',
        review,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/reviews/:id/request-changes
   * Requests amendments with mandatory feedback (assigned Checker only)
   */
  public static async requestChanges(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const reviewId = req.params.id;
      const checkerId = req.user!.userId;
      const userRole = req.user!.role as UserRole;
      const { feedback } = req.body;

      const review = await ReviewService.requestChanges(
        reviewId,
        checkerId,
        feedback,
        userRole,
      );

      res.status(200).json({
        status: 'success',
        message: 'Review completed. Policy has been returned to owner with feedback for revision.',
        review,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/reviews/:id/reassign
   * Admin-only: Reassigns an assigned review to a different Checker
   */
  public static async reassignReview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const reviewId = req.params.id;
      const adminId = req.user!.userId;
      const { newCheckerId, reason } = req.body;

      if (!newCheckerId) {
        const err = new Error('newCheckerId is required');
        (err as unknown as { statusCode: number }).statusCode = 400;
        throw err;
      }

      const review = await ReviewService.reassignReview(reviewId, newCheckerId, adminId, reason);

      res.status(200).json({
        status: 'success',
        message: `Review successfully reassigned to ${review.checkerName || 'new reviewer'}`,
        review,
      });
    } catch (error) {
      next(error);
    }
  }
}
