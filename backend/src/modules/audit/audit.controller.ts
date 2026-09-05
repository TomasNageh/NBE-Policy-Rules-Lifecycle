import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  /**
   * GET /api/admin/audit-log
   * Returns paginated, filterable audit logs
   */
  public static async getAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { entityType, userId, action, startDate, endDate, search, page, limit } = req.query;

      const filters = {
        ...(entityType ? { entityType: entityType as string } : {}),
        ...(userId ? { userId: userId as string } : {}),
        ...(action ? { action: action as string } : {}),
        ...(startDate ? { startDate: startDate as string } : {}),
        ...(endDate ? { endDate: endDate as string } : {}),
        ...(search ? { search: search as string } : {}),
      };

      const pagination = {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      };

      const result = await AuditService.getAuditLogs(filters, pagination);

      res.status(200).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/audit-log/export
   * Generates and downloads a CSV export of the audit trail
   */
  public static async exportAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { entityType, userId, action, startDate, endDate, search } = req.query;

      const filters = {
        ...(entityType ? { entityType: entityType as string } : {}),
        ...(userId ? { userId: userId as string } : {}),
        ...(action ? { action: action as string } : {}),
        ...(startDate ? { startDate: startDate as string } : {}),
        ...(endDate ? { endDate: endDate as string } : {}),
        ...(search ? { search: search as string } : {}),
      };

      const csvData = await AuditService.exportAuditLogsToCsv(filters);
      const filename = `nbe-compliance-audit-log-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/metrics
   * Returns aggregate turnaround time, breach rates, approval ratio, and monthly trends
   */
  public static async getMetrics(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const metrics = await AuditService.getGovernanceMetrics();
      res.status(200).json({
        status: 'success',
        metrics,
      });
    } catch (error) {
      next(error);
    }
  }
}
