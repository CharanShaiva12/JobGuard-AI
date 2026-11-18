/**
 * JobGuard AI - Authentication Routes
 * Module: backend.src.routes.auth.routes
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../middleware/validate.middleware.js';

const router = Router();

// Dedicated brute-force rate limiters for authentication endpoints
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many failed login attempts. Please retry after 15 minutes.' },
});

const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many failed administrator login attempts. Please retry after 15 minutes.' },
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many registration attempts from this IP. Please retry later.' },
});

router.post('/register', registerRateLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', loginRateLimiter, validateBody(loginSchema), AuthController.login);
router.post('/admin-login', adminLoginRateLimiter, validateBody(loginSchema), AuthController.adminLogin);
router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.me);
router.put('/profile', requireAuth, AuthController.updateProfile);
router.post('/change-password', requireAuth, validateBody(changePasswordSchema), AuthController.changePassword);

export default router;
