/**
 * JobGuard AI - Feedback Routes
 * Module: backend.src.routes.feedback.routes
 */

import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { validateBody, submitFeedbackSchema } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/', optionalAuth, validateBody(submitFeedbackSchema), FeedbackController.submit);
router.get('/scan/:scanId', optionalAuth, FeedbackController.getByScan);

export default router;
