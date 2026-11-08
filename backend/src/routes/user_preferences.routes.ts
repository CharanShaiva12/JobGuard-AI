/**
 * JobGuard AI - User Preferences Routes
 * Module: backend.src.routes.user_preferences.routes
 */

import { Router } from 'express';
import { UserPreferencesController } from '../controllers/user_preferences.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', optionalAuth, UserPreferencesController.getPreferences);
router.put('/', requireAuth, UserPreferencesController.updatePreferences);

export default router;
