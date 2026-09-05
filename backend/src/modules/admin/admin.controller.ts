import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { PolicyStatus, UserRole } from '@prisma/client';

export class AdminController {
  /**
   * GET /api/admin/policies
   * Return all policies across all owners and statuses
   */
  public static async getAllPolicies(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { status, category, search } = req.query;

      const filters = {
        ...(status ? { status: status as PolicyStatus } : {}),
        ...(category ? { category: category as string } : {}),
        ...(search ? { search: search as string } : {}),
      };

      const policies = await AdminService.getAllPolicies(filters);

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
   * GET /api/admin/sla-config
   * Return configured turnaround SLA hours per policy category
   */
  public static async getSlaConfigs(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const configs = await AdminService.getSlaConfigs();
      res.status(200).json({
        status: 'success',
        count: configs.length,
        configs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/sla-config
   * Update or create SLA turnaround target hours for a category
   */
  public static async updateSlaConfig(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { category, slaHours } = req.body;
      const adminId = req.user!.userId;

      const config = await AdminService.updateSlaConfig(category, Number(slaHours), adminId);

      res.status(200).json({
        status: 'success',
        message: `SLA turnaround target for category '${category}' successfully set to ${config.slaHours} hours`,
        config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users
   * Return all registered users with role and activity metrics
   */
  public static async getAllUsers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { search, role } = req.query;
      const users = await AdminService.getAllUsers(
        search as string | undefined,
        role as UserRole | undefined,
      );

      res.status(200).json({
        status: 'success',
        count: users.length,
        users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users
   * Create a new enterprise user account
   */
  public static async createUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { email, password, fullName, role, department } = req.body;

      const user = await AdminService.createUser(adminId, {
        email,
        password,
        fullName,
        role: role as UserRole,
        department,
      });

      res.status(201).json({
        status: 'success',
        message: `User '${user.fullName}' (${user.role}) created successfully`,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id
   * Update an existing user's role, department, or active status
   */
  public static async updateUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;
      const { fullName, role, department, isActive } = req.body;

      const user = await AdminService.updateUser(adminId, targetUserId, {
        ...(fullName ? { fullName } : {}),
        ...(role ? { role: role as UserRole } : {}),
        ...(department !== undefined ? { department } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      });

      res.status(200).json({
        status: 'success',
        message: `User '${user.fullName}' successfully updated`,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/final-approvals
   * Return all finalized approved policies with author, checker, SLA turnaround, and feedback details
   */
  public static async getFinalApprovedPolicies(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const approvals = await AdminService.getFinalApprovedPolicies();
      res.status(200).json({
        status: 'success',
        count: approvals.length,
        approvals,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/policies/:id/unlock
   * Reset a QUEUED or UNDER_REVIEW policy back to DRAFT (admin override)
   */
  public static async unlockPolicy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policyId = req.params.id;
      const adminId = req.user!.userId;
      const { reason } = req.body;

      const result = await AdminService.unlockPolicy(policyId, adminId, reason);

      res.status(200).json({
        status: 'success',
        message: result.message,
        policyId: result.policyId,
      });
    } catch (error) {
      next(error);
    }
  }
}

