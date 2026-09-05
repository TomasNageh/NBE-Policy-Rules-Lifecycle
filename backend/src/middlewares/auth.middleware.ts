import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/auth/auth.types';

export const AUTH_COOKIE_NAME = 'nbe_auth_token';

/**
 * Middleware that verifies JWT session from httpOnly cookie or Authorization Bearer header
 * and attaches req.user = { userId, email, role, fullName, department }
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    let token: string | undefined;

    // 1. Check HTTP-only cookie first (primary browser mechanism)
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }
    // 2. Check Authorization header (for API clients / tests)
    else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      const err = new Error('Authentication required. Please log in.');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    const payload = AuthService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Guard factory that restricts endpoint access to specified UserRoles.
 * Blocks unauthorized roles with HTTP 403 Forbidden.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      const err = new Error('Authentication required.');
      (err as unknown as { statusCode: number }).statusCode = 401;
      return next(err);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const err = new Error(
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required role(s): [${allowedRoles.join(', ')}].`,
      );
      (err as unknown as { statusCode: number }).statusCode = 403;
      return next(err);
    }

    next();
  };
};
