/**
 * JobGuard AI - CAPTCHA Routes
 * Module: backend.src.routes.captcha.routes
 */

import { Router } from 'express';
import { CaptchaController } from '../controllers/captcha.controller.js';

const router = Router();

router.get('/generate', CaptchaController.generate);

export default router;
