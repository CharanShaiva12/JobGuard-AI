/**
 * JobGuard AI - Administrator Routes
 * Module: backend.src.routes.admin.routes
 */

import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Bootstrap endpoint (requires authentication, but only works if 0 admins exist)
router.post('/bootstrap', requireAuth, AdminController.bootstrapAdmin);

// Protected admin endpoints
router.get('/users', requireAdmin, AdminController.getUsers);
router.get('/metrics', requireAdmin, AdminController.getSystemMetrics);
router.get('/logs', requireAdmin, AdminController.getActivityLogs);
router.patch('/users/:id', requireAdmin, AdminController.updateUserStatus);
router.get('/models/evaluation', requireAdmin, AdminController.getModelEvaluation);

// Governed Model Lifecycle & Retraining Endpoints
router.get('/model-lifecycle', requireAdmin, AdminController.getModelLifecycle);
router.post('/feedback/:id/verify', requireAdmin, AdminController.verifyFeedback);
router.post('/model-lifecycle/retrain', requireAdmin, AdminController.triggerCandidateRetrain);
router.post('/model-lifecycle/promote', requireAdmin, AdminController.promoteCandidate);
router.post('/model-lifecycle/rollback', requireAdmin, AdminController.rollbackModel);

export default router;
