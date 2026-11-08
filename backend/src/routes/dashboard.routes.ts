/**
 * JobGuard AI - Dashboard & Health Routes
 * Module: backend.src.routes.dashboard.routes
 */

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/stats', optionalAuth, DashboardController.getStats);
router.get('/health', DashboardController.getHealth);
router.get('/intelligence', DashboardController.getIntelligenceStats);

export default router;
