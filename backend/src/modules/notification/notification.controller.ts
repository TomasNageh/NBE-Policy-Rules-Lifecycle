import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';

export class NotificationController {
  /**
   * GET /api/notifications
   * Return current authenticated user's notifications and unread count
   */
  public static async getMyNotifications(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const notifications = await NotificationService.getUserNotifications(userId);
      const unreadCount = await NotificationService.getUnreadCount(userId);

      res.status(200).json({
        status: 'success',
        notifications,
        unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/:id/read
   * Mark a specific notification as read
   */
  public static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await NotificationService.markAsRead(id, userId);

      res.status(200).json({
        status: 'success',
        notification,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/read-all
   * Mark all notifications for the authenticated user as read
   */
  public static async markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await NotificationService.markAllAsRead(userId);

      res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}
