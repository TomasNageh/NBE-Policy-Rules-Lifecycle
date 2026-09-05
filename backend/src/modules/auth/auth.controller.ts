import { Request, Response, NextFunction } from 'express';
import { AuthService, SEED_USERS } from './auth.service';
import { AUTH_COOKIE_NAME } from '../../middlewares/auth.middleware';
import { env } from '../../config/env';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  public static async login(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, token } = await AuthService.login(email, password);

      // Set httpOnly session cookie with 8-hour maxAge
      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: '/',
      });

      res.status(200).json({
        status: 'success',
        message: 'Authentication successful',
        user,
        token, // Included for authorization headers in API testing
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  public static async logout(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      res.status(200).json({
        status: 'success',
        message: 'Session closed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  public static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Not authenticated' });
        return;
      }

      res.status(200).json({
        status: 'success',
        user: {
          id: req.user.userId,
          email: req.user.email,
          fullName: req.user.fullName,
          role: req.user.role,
          department: req.user.department,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/demo-users
   * Returns list of configured demo accounts for test convenience
   */
  public static async getDemoUsers(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const users = SEED_USERS.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        department: u.department,
      }));

      res.status(200).json({
        status: 'success',
        users,
      });
    } catch (error) {
      next(error);
    }
  }
}
