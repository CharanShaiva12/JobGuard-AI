/**
 * JobGuard AI - CAPTCHA Controller
 * Module: backend.src.controllers.captcha.controller
 * Purpose: Issues one-time cryptographic verification challenges for registration and login.
 */

import { Request, Response } from 'express';
import { CaptchaService } from '../services/captcha.service.js';

export class CaptchaController {
  public static async generate(req: Request, res: Response): Promise<void> {
    try {
      const actionParam = (req.query.action as string) || 'login';
      const validAction = actionParam === 'register' ? 'register' : actionParam === 'scan' ? 'scan' : 'login';
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const captcha = await CaptchaService.generate(validAction, clientIp);

      res.status(200).json({
        success: true,
        data: captcha,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to generate CAPTCHA challenge.' });
    }
  }
}
