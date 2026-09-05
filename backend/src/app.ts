import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { policyRoutes } from './modules/policy/policy.routes';
import { reviewRoutes } from './modules/review/review.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { notificationRoutes } from './modules/notification/notification.routes';
import { initSeedData } from './database/seed';
import './modules/events';

// Initialize pre-seeded realistic policies, reviews, audit logs, and SLA configurations
initSeedData().catch((err) => console.error('Failed to initialize seed data:', err));

const app: Application = express();

// Security and utility middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static files for uploaded policy source documents
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Core API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
