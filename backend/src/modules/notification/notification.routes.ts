import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// GET /api/notifications
router.get('/', NotificationController.getMyNotifications);

// POST /api/notifications/read-all (must precede /:id/read)
router.post('/read-all', NotificationController.markAllAsRead);

// POST /api/notifications/:id/read
router.post('/:id/read', NotificationController.markAsRead);

export const notificationRoutes = router;
