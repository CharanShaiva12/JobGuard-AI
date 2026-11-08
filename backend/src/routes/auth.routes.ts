/**
 * JobGuard AI - Authentication Routes
 * Module: backend.src.routes.auth.routes
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/admin-login', AuthController.adminLogin);
router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.me);
router.put('/profile', requireAuth, AuthController.updateProfile);
router.post('/change-password', requireAuth, AuthController.changePassword);

export default router;
