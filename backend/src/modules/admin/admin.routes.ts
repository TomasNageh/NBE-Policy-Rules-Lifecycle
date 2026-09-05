import { Router } from 'express';
import { AdminController } from './admin.controller';
import { AuditController } from '../audit/audit.controller';
import { authenticate, requireRole } from '../../middlewares/auth.middleware';
import { UserRole } from '../auth/auth.types';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);

// All policies overview (ADMIN only)
router.get(
  '/policies',
  requireRole(UserRole.ADMIN),
  AdminController.getAllPolicies,
);

// Governance Metrics & Turnaround Reporting (ADMIN only)
router.get(
  '/metrics',
  requireRole(UserRole.ADMIN),
  AuditController.getMetrics,
);

// Audit Trail CSV Export (must precede /audit-log)
router.get(
  '/audit-log/export',
  requireRole(UserRole.ADMIN),
  AuditController.exportAuditLogs,
);

// Paginated Audit Log Viewer (ADMIN only)
router.get(
  '/audit-log',
  requireRole(UserRole.ADMIN),
  AuditController.getAuditLogs,
);

// SLA Configurations (ADMIN read + write)
router.get(
  '/sla-config',
  requireRole(UserRole.ADMIN),
  AdminController.getSlaConfigs,
);

router.put(
  '/sla-config',
  requireRole(UserRole.ADMIN),
  AdminController.updateSlaConfig,
);

// User Governance (ADMIN read + write)
router.get(
  '/users',
  requireRole(UserRole.ADMIN),
  AdminController.getAllUsers,
);

router.post(
  '/users',
  requireRole(UserRole.ADMIN),
  AdminController.createUser,
);

router.put(
  '/users/:id',
  requireRole(UserRole.ADMIN),
  AdminController.updateUser,
);

// Final Approved Policies & Sign-off Dossiers (ADMIN only)
router.get(
  '/final-approvals',
  requireRole(UserRole.ADMIN),
  AdminController.getFinalApprovedPolicies,
);

// Admin: Unlock a submitted/locked policy back to DRAFT
router.post(
  '/policies/:id/unlock',
  requireRole(UserRole.ADMIN),
  AdminController.unlockPolicy,
);

export const adminRoutes = router;
