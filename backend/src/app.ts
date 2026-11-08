/**
 * JobGuard AI - Express Application Entry & Middleware Setup
 * Module: backend.src.app
 * Security: Helmet OWASP headers, CORS origin controls, rate-limiting, cookie parsing,
 *          and centralized error handling.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import captchaRoutes from './routes/captcha.routes.js';
import scanRoutes from './routes/scan.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import userPreferencesRoutes from './routes/user_preferences.routes.js';
import systemRoutes from './routes/system.routes.js';

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cookie Parser for HTTP-only JWT sessions
app.use(cookieParser());

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);

// Rate Limiting (300 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this client. Please retry later.' },
});
app.use('/api/', limiter);

// Body Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/captcha', captchaRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/user/preferences', userPreferencesRoutes);
app.use('/api/system', systemRoutes);

// Root Health Probe
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', service: 'JobGuard AI Node Gateway' });
});

// Custom 404 Interceptor for Unmatched API Endpoints
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.path}` });
});

// Global Centralized Error Handling Interceptor
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[JobGuard API Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
  });
});

export default app;
