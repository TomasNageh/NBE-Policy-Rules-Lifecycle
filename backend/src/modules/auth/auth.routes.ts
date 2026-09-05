import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { UserRole } from './auth.types';

const router = Router();

// Public auth endpoints
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/demo-users', AuthController.getDemoUsers);

// Protected session check
router.get('/me', authenticate, AuthController.getCurrentUser);

// Verification routes for RBAC guards (used by automated tests & health checks)
router.get('/test/user-only', authenticate, requireRole(UserRole.USER), (req, res) => {
  res.json({ status: 'success', message: 'User access granted', user: req.user });
});

router.get('/test/checker-only', authenticate, requireRole(UserRole.CHECKER), (req, res) => {
  res.json({ status: 'success', message: 'Checker access granted', user: req.user });
});

router.get('/test/admin-only', authenticate, requireRole(UserRole.ADMIN), (req, res) => {
  res.json({ status: 'success', message: 'Admin access granted', user: req.user });
});

export const authRoutes = router;
