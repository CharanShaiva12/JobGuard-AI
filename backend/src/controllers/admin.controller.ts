/**
 * JobGuard AI - Administrator Controller
 * Module: backend.src.controllers.admin.controller
 * Purpose: Provides administrative surveillance, account status management, and audit inspection.
 * Security: Strictly excludes password hashes from all outputs. Never hardcodes credentials.
 */

import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { EvaluationService } from '../services/evaluation.service.js';

export class AdminController {
  /**
   * Returns measured benchmark evaluation metrics from 70:30 train/test split.
   */
  public static async getModelEvaluation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await EvaluationService.getEvaluationMetrics();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  /**
   * Retrieves registered users without exposing password hashes.
   */
  public static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rows = await query<any[]>(
        `SELECT id, username, email, full_name, organization, role, is_active, created_at, updated_at
         FROM users
         ORDER BY created_at DESC`
      );
      res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Aggregates real system telemetry directly from MySQL database tables.
   */
  public static async getSystemMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [userStats] = await query<any[]>(
        `SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users
         FROM users`
      );

      const [scanStats] = await query<any[]>(
        `SELECT 
          COUNT(*) as total_scans,
          SUM(CASE WHEN risk_level = 'High Risk' THEN 1 ELSE 0 END) as high_risk_scans,
          SUM(CASE WHEN risk_level = 'Moderate Risk' THEN 1 ELSE 0 END) as moderate_risk_scans,
          SUM(CASE WHEN risk_level = 'Low Risk' THEN 1 ELSE 0 END) as low_risk_scans,
          AVG(overall_risk_score) as average_risk_score
         FROM scan_history`
      );

      const [feedbackStats] = await query<any[]>(
        `SELECT 
          COUNT(*) as total_feedback,
          SUM(CASE WHEN feedback_type = 'correct_detection' THEN 1 ELSE 0 END) as correct_detections,
          SUM(CASE WHEN feedback_type = 'false_positive' THEN 1 ELSE 0 END) as false_positives,
          SUM(CASE WHEN feedback_type = 'false_negative' THEN 1 ELSE 0 END) as false_negatives
         FROM feedback`
      );

      res.status(200).json({
        success: true,
        data: {
          users: {
            total: parseInt(userStats?.total_users || '0', 10),
            active: parseInt(userStats?.active_users || '0', 10),
            admins: parseInt(userStats?.admin_users || '0', 10),
          },
          scans: {
            total: parseInt(scanStats?.total_scans || '0', 10),
            highRisk: parseInt(scanStats?.high_risk_scans || '0', 10),
            moderateRisk: parseInt(scanStats?.moderate_risk_scans || '0', 10),
            lowRisk: parseInt(scanStats?.low_risk_scans || '0', 10),
            averageScore: Math.round(parseFloat(scanStats?.average_risk_score || '0')),
          },
          feedback: {
            total: parseInt(feedbackStats?.total_feedback || '0', 10),
            correct: parseInt(feedbackStats?.correct_detections || '0', 10),
            falsePositives: parseInt(feedbackStats?.false_positives || '0', 10),
            falseNegatives: parseInt(feedbackStats?.false_negatives || '0', 10),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Retrieves security audit events.
   */
  public static async getActivityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rows = await query<any[]>(
        `SELECT id, user_id, action, details, ip_address, user_agent, created_at
         FROM audit_logs
         ORDER BY created_at DESC
         LIMIT 50`
      );
      res.status(200).json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Activates or deactivates a user account.
   */
  public static async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const targetUserId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || ''), 10);
      const { isActive, role } = req.body;

      if (isNaN(targetUserId)) {
        res.status(400).json({ success: false, error: 'Invalid user ID.' });
        return;
      }

      // Prevent admin from deactivating themselves
      if (req.user && req.user.id === targetUserId && isActive === false) {
        res.status(400).json({ success: false, error: 'Administrators cannot deactivate their own account.' });
        return;
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (typeof isActive === 'boolean') {
        updates.push('is_active = ?');
        values.push(isActive ? 1 : 0);
      }
      if (role && ['user', 'analyst', 'admin'].includes(role)) {
        updates.push('role = ?');
        values.push(role);
      }

      if (updates.length === 0) {
        res.status(400).json({ success: false, error: 'No valid fields provided for update.' });
        return;
      }

      values.push(targetUserId);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

      // Log in audit trail
      await query(
        `INSERT INTO audit_logs (user_id, action, details, ip_address)
         VALUES (?, ?, ?, ?)`,
        [req.user?.id, 'ADMIN_USER_UPDATE', JSON.stringify({ targetUserId, isActive, role }), req.ip || '']
      );

      res.status(200).json({ success: true, message: 'User updated successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Bootstrap administrator: Promotes the current user to 'admin' IF AND ONLY IF
   * no administrator currently exists in the database.
   */
  public static async bootstrapAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required to bootstrap administrator.' });
        return;
      }

      const [existingAdmins] = await query<any[]>(
        "SELECT COUNT(*) as admin_count FROM users WHERE role = 'admin'"
      );

      const adminCount = parseInt(existingAdmins?.admin_count || '0', 10);
      if (adminCount > 0) {
        res.status(403).json({
          success: false,
          error: 'An administrator already exists. Bootstrap is disabled.',
        });
        return;
      }

      // Promote the calling user to administrator
      await query("UPDATE users SET role = 'admin' WHERE id = ?", [userId]);

      await query(
        `INSERT INTO audit_logs (user_id, action, details, ip_address)
         VALUES (?, ?, ?, ?)`,
        [userId, 'ADMIN_BOOTSTRAP', JSON.stringify({ message: 'First administrator initialized' }), req.ip || '']
      );

      res.status(200).json({
        success: true,
        message: 'Administrator successfully initialized. Please refresh your session.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Retrieves current model lifecycle status and feedback queue stats.
   */
  public static async getModelLifecycle(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [feedbackCounts] = await query<any[]>(
        `SELECT 
           COUNT(*) as total_feedback,
           SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_feedback,
           SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) as pending_verification
         FROM feedback`
      );

      const rootDir = process.cwd();
      const versionFile = path.resolve(rootDir, 'ml/artifacts/model_version.json');
      let versionData: any = {
        version: '1.0.0',
        model_type: 'LogisticRegression + Sublinear TF-IDF',
        dataset: 'EMSCAD Baseline',
        promoted_at: 'Initial System Deployment',
        status: 'production',
        has_backup: fs.existsSync(path.resolve(rootDir, 'ml/artifacts/text_model_backup.joblib')),
      };

      if (fs.existsSync(versionFile)) {
        try {
          versionData = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
          versionData.has_backup = fs.existsSync(path.resolve(rootDir, 'ml/artifacts/text_model_backup.joblib'));
        } catch {}
      }

      const candidateExists = fs.existsSync(path.resolve(rootDir, 'ml/artifacts/text_model_candidate.joblib'));

      res.status(200).json({
        success: true,
        data: {
          currentModel: versionData,
          candidateAvailable: candidateExists,
          feedbackStats: {
            total: parseInt(feedbackCounts?.total_feedback || '0', 10),
            verified: parseInt(feedbackCounts?.verified_feedback || '0', 10),
            pending: parseInt(feedbackCounts?.pending_verification || '0', 10),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Reviews and marks candidate feedback sample as verified with ground-truth label.
   */
  public static async verifyFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const feedbackId = req.params.id;
      const { verifiedLabel } = req.body; // 0 = Legitimate, 1 = Fraudulent

      if (verifiedLabel !== 0 && verifiedLabel !== 1) {
        res.status(400).json({ success: false, error: 'verifiedLabel must be 0 (legitimate) or 1 (fraudulent).' });
        return;
      }

      await query(
        `UPDATE feedback 
         SET is_verified = 1, verified_label = ?, verified_at = CURRENT_TIMESTAMP, verified_by = ?
         WHERE id = ?`,
        [verifiedLabel, req.user?.id || null, feedbackId]
      );

      res.status(200).json({ success: true, message: 'Feedback verified and labeled for candidate training pool.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Triggers candidate model retraining using verified feedback pool.
   * Produces an evaluated candidate artifact without replacing production.
   */
  public static async triggerCandidateRetrain(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const rootDir = process.cwd();

      exec('python ml/model_lifecycle.py retrain', { cwd: rootDir }, (err, stdout, stderr) => {
        if (err) {
          console.error('[ModelLifecycle Retrain Error]:', stderr || err.message);
          res.status(500).json({ success: false, error: 'Candidate model retraining failed.', details: stderr });
          return;
        }

        try {
          const results = JSON.parse(stdout.trim());
          res.status(200).json({
            success: true,
            message: 'Candidate model successfully trained and evaluated against holdout benchmark.',
            evaluation: results,
          });
        } catch {
          res.status(200).json({
            success: true,
            message: 'Candidate model trained.',
            output: stdout,
          });
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Promotes candidate model to production after benchmark verification.
   */
  public static async promoteCandidate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const rootDir = process.cwd();

      exec('python ml/model_lifecycle.py promote', { cwd: rootDir }, (err, stdout, stderr) => {
        if (err) {
          res.status(500).json({ success: false, error: 'Promotion failed.', details: stderr });
          return;
        }

        try {
          const versionData = JSON.parse(stdout.trim());
          res.status(200).json({
            success: true,
            message: 'Candidate model promoted to production. Previous model safely backed up.',
            version: versionData,
          });
        } catch {
          res.status(200).json({ success: true, message: 'Candidate model promoted.', output: stdout });
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Rolls back production model to previous backup artifact.
   */
  public static async rollbackModel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const rootDir = process.cwd();

      exec('python ml/model_lifecycle.py rollback', { cwd: rootDir }, (err, stdout, stderr) => {
        if (err) {
          res.status(500).json({ success: false, error: 'Rollback failed.', details: stderr });
          return;
        }

        try {
          const rollbackData = JSON.parse(stdout.trim());
          res.status(200).json({
            success: true,
            message: 'Rollback successful. Previous model artifact restored.',
            version: rollbackData,
          });
        } catch {
          res.status(200).json({ success: true, message: 'Rollback complete.', output: stdout });
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
