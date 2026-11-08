/**
 * JobGuard AI - User Feedback Controller
 * Module: backend.src.controllers.feedback.controller
 * Purpose: Collects candidate assessment feedback (correct/incorrect detection, false positives/negatives).
 * Policy: Feedback is stored securely in MySQL 8.4; never triggers unreviewed automated retraining.
 */

import { Response } from 'express';
import crypto from 'crypto';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class FeedbackController {
  public static async submit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { scanId, feedbackType, comments } = req.body;

      if (!scanId || !feedbackType) {
        res.status(400).json({ success: false, error: 'scanId and feedbackType are required.' });
        return;
      }

      // Normalization and alias mapping for client robustness
      let normalizedType = feedbackType;
      if (feedbackType === 'accurate' || feedbackType === 'correct') {
        normalizedType = 'correct_detection';
      } else if (feedbackType === 'incorrect' || feedbackType === 'inaccurate') {
        normalizedType = 'incorrect_detection';
      }

      const validTypes = ['correct_detection', 'incorrect_detection', 'false_positive', 'false_negative'];
      if (!validTypes.includes(normalizedType)) {
        res.status(400).json({ success: false, error: `Invalid feedbackType. Allowed: ${validTypes.join(', ')}` });
        return;
      }

      const id = crypto.randomUUID();
      const userId = req.user ? req.user.id : null;
      const clientIp = req.ip || req.socket.remoteAddress || '';

      await query(
        `INSERT INTO feedback (id, scan_id, user_id, feedback_type, comments, user_ip)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, scanId, userId, normalizedType, comments || '', clientIp]
      );

      res.status(201).json({
        success: true,
        message: 'Feedback recorded successfully. Thank you for helping improve JobGuard AI accuracy.',
        data: { id, scanId, feedbackType: normalizedType },
      });
    } catch (error: any) {
      console.error('[FeedbackController Error]:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getByScan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const scanId = req.params.scanId;
      const rows = await query<any[]>('SELECT * FROM feedback WHERE scan_id = ? ORDER BY created_at DESC', [scanId]);
      res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
