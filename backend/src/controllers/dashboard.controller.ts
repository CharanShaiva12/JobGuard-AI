/**
 * JobGuard AI - Dashboard & Telemetry Controller
 * Module: backend.src.controllers.dashboard.controller
 * Purpose: Provides real user statistics, threat telemetry, and service health checks.
 * Policy: Strictly ZERO fake statistics or dummy demonstration records.
 */

import { Response } from 'express';
import { query, testDbConnection } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import axios from 'axios';
import { config } from '../config/env.js';

export class DashboardController {
  public static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;

      // Query real scan stats from MySQL 8.4 database
      let totalScans = 0;
      let highRiskCount = 0;
      let moderateRiskCount = 0;
      let lowRiskCount = 0;
      let avgRiskScore = 0;

      try {
        const rows = await query<any[]>(
          `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN risk_level = 'High Risk' THEN 1 ELSE 0 END) as high_risk,
            SUM(CASE WHEN risk_level = 'Moderate Risk' THEN 1 ELSE 0 END) as moderate_risk,
            SUM(CASE WHEN risk_level = 'Low Risk' THEN 1 ELSE 0 END) as low_risk,
            AVG(overall_risk_score) as avg_score
           FROM scan_history
           ${userId ? 'WHERE user_id = ?' : ''}`,
          userId ? [userId] : []
        );

        if (rows && rows.length > 0) {
          totalScans = parseInt(rows[0].total || '0', 10);
          highRiskCount = parseInt(rows[0].high_risk || '0', 10);
          moderateRiskCount = parseInt(rows[0].moderate_risk || '0', 10);
          lowRiskCount = parseInt(rows[0].low_risk || '0', 10);
          avgRiskScore = Math.round(parseFloat(rows[0].avg_score || '0'));
        }
      } catch (err: any) {
        console.warn(`[DashboardController] MySQL stats notice: ${err.message}`);
      }

      res.status(200).json({
        success: true,
        data: {
          totalScans,
          highRiskCount,
          moderateRiskCount,
          lowRiskCount,
          averageRiskScore: avgRiskScore,
          isUserSpecific: !!userId,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    const dbStatus = await testDbConnection();

    let mlStatus = false;
    try {
      const mlRes = await axios.get(`${config.mlServiceUrl}/health`, { timeout: 2000 });
      mlStatus = mlRes.status === 200;
    } catch {
      mlStatus = false;
    }

    const geminiConfigured = Boolean(config.geminiApiKey);

    res.status(200).json({
      success: true,
      service: 'JobGuard AI API Gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        database_mysql8: dbStatus.connected ? 'healthy' : 'offline',
        ml_fastapi_microservice: mlStatus ? 'healthy' : 'offline',
        gemini_contextual_ai: geminiConfigured ? 'configured' : 'offline_fallback',
      },
    });
  }

  public static async getIntelligenceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // 1. Query threat intel domains from MySQL
      const threatDomains = await query<any[]>(
        `SELECT id, domain_name, category, threat_level, notes, source, created_at FROM threat_intel_domains ORDER BY category, threat_level DESC`
      );

      // 2. Query scan history statistics for threat categories from MySQL
      const categoryRows = await query<any[]>(
        `SELECT 
           id,
           risk_level, 
           input_type,
           overall_risk_score,
           job_title,
           company_name,
           matched_rules_json,
           created_at
         FROM scan_history
         ORDER BY created_at DESC LIMIT 200`
      );

      // Aggregate rule frequency and category matrix
      const ruleCounts: Record<string, { count: number; category: string; severity: string }> = {};
      const matrixCounts: Record<string, Record<string, number>> = {};
      let totalHigh = 0;
      let totalMod = 0;
      let totalLow = 0;

      for (const row of categoryRows) {
        const risk = row.risk_level || 'Low Risk';
        if (risk === 'High Risk') totalHigh++;
        else if (risk === 'Moderate Risk') totalMod++;
        else totalLow++;

        try {
          const rules = JSON.parse(row.matched_rules_json || '[]');
          if (Array.isArray(rules)) {
            for (const r of rules) {
              const phrase = r.phrase || 'Uncategorized';
              const cat = r.category || 'General';
              const sev = r.severity || 'MEDIUM';

              if (!ruleCounts[phrase]) {
                ruleCounts[phrase] = { count: 0, category: cat, severity: sev };
              }
              ruleCounts[phrase].count++;

              if (!matrixCounts[cat]) {
                matrixCounts[cat] = { 'High Risk': 0, 'Moderate Risk': 0, 'Low Risk': 0 };
              }
              matrixCounts[cat][risk] = (matrixCounts[cat][risk] || 0) + 1;
            }
          }
        } catch {}
      }

      const topViolations = Object.entries(ruleCounts)
        .map(([phrase, info]) => ({ phrase, ...info }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const recentThreats = categoryRows
        .filter((r) => r.risk_level === 'High Risk' || r.risk_level === 'Moderate Risk')
        .slice(0, 6)
        .map((r) => ({
          id: r.id,
          jobTitle: r.job_title || 'Untitled Assessment',
          companyName: r.company_name || 'Unspecified Employer',
          riskLevel: r.risk_level,
          overallRiskScore: r.overall_risk_score,
          createdAt: r.created_at,
        }));

      res.status(200).json({
        success: true,
        data: {
          threatDomains,
          totalThreatDomains: threatDomains.length,
          topViolations,
          matrixCounts,
          recentThreats,
          distribution: {
            highRisk: totalHigh,
            moderateRisk: totalMod,
            lowRisk: totalLow,
            totalScans: categoryRows.length,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
