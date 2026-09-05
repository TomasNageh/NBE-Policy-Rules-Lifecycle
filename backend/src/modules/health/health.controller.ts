import { Request, Response, NextFunction } from 'express';
import { HealthService } from './health.service';

export class HealthController {
  public static async checkHealth(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const status = await HealthService.getHealthStatus();
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }
}
