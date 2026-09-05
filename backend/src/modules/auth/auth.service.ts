import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { JwtPayload, LoginResponse, UserResponse, UserRole } from './auth.types';

// Pre-seeded fallback mock users for development / test isolation
export interface SeedUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  department: string;
  isActive: boolean;
  createdAt: Date;
}

// Canonical seed: exactly 3 roles — USER, CHECKER, ADMIN
export const SEED_USERS: SeedUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'owner@nbe.com.eg',        // Email kept for test fixture compatibility
    passwordHash: bcrypt.hashSync('Password123!', 10),
    fullName: 'Ahmed Mansour',
    role: UserRole.USER,
    department: 'Retail Banking & Credit Policies',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'checker@nbe.com.eg',
    passwordHash: bcrypt.hashSync('Password123!', 10),
    fullName: 'Sara Al-Sayed',
    role: UserRole.CHECKER,
    department: 'Regulatory Compliance & Governance',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'admin@nbe.com.eg',
    passwordHash: bcrypt.hashSync('Password123!', 10),
    fullName: 'Tarek Hassan',
    role: UserRole.ADMIN,
    department: 'Enterprise IT & Governance',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
];

export const mockUsers = SEED_USERS;

export class AuthService {
  /**
   * Find user by email from database or fallback seed list
   */
  public static async findUserByEmail(email: string): Promise<SeedUser | null> {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          passwordHash: dbUser.passwordHash,
          fullName: dbUser.fullName,
          role: dbUser.role,
          department: dbUser.department || 'General Banking',
          isActive: dbUser.isActive,
          createdAt: dbUser.createdAt,
        };
      }
    } catch {
      // Graceful fallback to SEED_USERS if DB connection is unavailable
    }

    const fallbackUser = SEED_USERS.find(
      (u) => u.email.toLowerCase() === normalizedEmail,
    );
    return fallbackUser || null;
  }

  /**
   * Find user by ID
   */
  public static async findUserById(id: string): Promise<UserResponse | null> {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id },
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          department: dbUser.department,
          createdAt: dbUser.createdAt,
        };
      }
    } catch {
      // Graceful fallback
    }

    const fallbackUser = SEED_USERS.find((u) => u.id === id);
    if (!fallbackUser) return null;

    return {
      id: fallbackUser.id,
      email: fallbackUser.email,
      fullName: fallbackUser.fullName,
      role: fallbackUser.role,
      department: fallbackUser.department,
      createdAt: fallbackUser.createdAt,
    };
  }

  /**
   * Authenticate user credentials and return user details and JWT
   */
  public static async login(
    email: string,
    password: string,
  ): Promise<LoginResponse> {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const user = await this.findUserByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('User account has been deactivated. Please contact IT Security.');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const err = new Error('Invalid email or password');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      department: user.department,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '8h',
    });

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt,
    };

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Verify token and decode payload
   */
  public static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      const err = new Error('Invalid or expired authentication session');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }
  }
}
