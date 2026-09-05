import { UserRole } from '@prisma/client';

export { UserRole };

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  department?: string | null;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string | null;
  createdAt: Date;
}

export interface LoginResponse {
  user: UserResponse;
  token: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
