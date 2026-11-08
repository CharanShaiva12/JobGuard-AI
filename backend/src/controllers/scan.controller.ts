/**
 * JobGuard AI - Scan & Investigation Controller
 * Module: backend.src.controllers.scan.controller
 * Purpose: Handles job analysis requests, URL evaluations, document parsing,
 *          dossier retrieval, and PDF/DOCX report exports.
 */

import { Response } from 'express';
import crypto from 'crypto';
import { ScanService } from '../services/scan.service.js';
import { MLClientService } from '../services/ml_client.service.js';
import { DocumentParserService } from '../services/document_parser.service.js';
import { ReportExportService } from '../services/report_export.service.js';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class ScanController {
  /**
   * Method 1 & 2: Analyzes pasted job description or recruitment message.
   */
  public static async analyzeJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        jobTitle,
        companyName,
        recruiterName,
        jobLocation,
        jobDescription,
        applicationUrl,
        requirements,
        benefits,
        companyProfile,
        inputType,
      } = req.body;

      const dossier = await ScanService.analyzeJob({
        userId: req.user ? req.user.id : null,
        jobTitle: jobTitle || '',
        companyName: companyName || '',
        recruiterName: recruiterName || '',
        jobLocation: jobLocation || '',
        jobDescription: jobDescription || '',
        applicationUrl: applicationUrl || null,
        requirements,
        benefits,
        companyProfile,
        inputType: inputType || 'manual',
      });

      res.status(200).json({
        success: true,
        data: dossier,
      });
    } catch (error: any) {
      if (error.code === 'SCAN_IN_PROGRESS' || error.statusCode === 409) {
        res.status(409).json({ success: false, code: 'SCAN_IN_PROGRESS', error: error.message });
        return;
      }
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Method 1: Dedicated URL analysis.
   */
  public static async analyzeUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { url } = req.body;
      if (!url) {
        res.status(400).json({ success: false, error: 'URL parameter is required.' });
        return;
      }

      const dossier = await ScanService.analyzeJob({
        userId: req.user ? req.user.id : null,
        applicationUrl: url,
        inputType: 'url',
      });

      res.status(200).json({
        success: true,
        data: dossier,
      });
    } catch (error: any) {
      if (error.code === 'SCAN_IN_PROGRESS' || error.statusCode === 409) {
        res.status(409).json({ success: false, code: 'SCAN_IN_PROGRESS', error: error.message });
        return;
      }
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Method 3: Dedicated company verification.
   */
  public static async verifyCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyName } = req.body;
      if (!companyName || !companyName.trim()) {
        res.status(400).json({ success: false, error: 'Company name is required.' });
        return;
      }

      const dossier = await ScanService.analyzeJob({
        userId: req.user ? req.user.id : null,
        companyName: companyName.trim(),
        inputType: 'company',
      });

      res.status(200).json({
        success: true,
        data: dossier,
      });
    } catch (error: any) {
      if (error.code === 'SCAN_IN_PROGRESS' || error.statusCode === 409) {
        res.status(409).json({ success: false, code: 'SCAN_IN_PROGRESS', error: error.message });
        return;
      }
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Method 4: Uploaded document or screenshot analysis (PDF, DOCX, TXT, PNG, JPG).
   */
  public static async uploadAndAnalyze(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ success: false, error: 'No file uploaded. Please upload a PDF, DOCX, TXT, or image file.' });
        return;
      }

      // Extract text content using DocumentParserService
      const extracted = await DocumentParserService.parseDocument({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
      });

      const userDesc = (req.body?.jobDescription || '').trim();
      const combinedText = [extracted.text, userDesc].filter(Boolean).join('\n\n').trim();

      if (!combinedText || combinedText.length < 10) {
        res.status(400).json({
          success: false,
          error: `Could not extract legible text from '${file.originalname}'. Please ensure the image or document is clear and readable, or paste the job details directly.`,
        });
        return;
      }

      const fileId = crypto.randomUUID();
      const userId = req.user ? req.user.id : null;

      // Track uploaded file record in MySQL
      try {
        await query(
          `INSERT INTO uploaded_files (id, user_id, filename_orig, filename_disk, mime_type, file_size_bytes, extracted_text_preview)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            fileId,
            userId,
            file.originalname,
            `mem_${fileId}`,
            file.mimetype,
            file.size,
            combinedText.slice(0, 500),
          ]
        );
      } catch (e: any) {
        console.warn(`[ScanController] File record tracking notice: ${e.message}`);
      }

      const userTitle = req.body?.jobTitle?.trim();
      const userCompany = req.body?.companyName?.trim();
      const userLocation = req.body?.jobLocation?.trim();
      const userRecruiter = req.body?.recruiterName?.trim();
      const userUrl = req.body?.applicationUrl?.trim();

      const finalTitle = userTitle || extracted.inferredJobTitle || `Posting in ${file.originalname}`;
      const finalCompany = userCompany || extracted.inferredCompanyName || '';
      const finalUrl = userUrl || (extracted.extractedUrls.length > 0 ? extracted.extractedUrls[0] : null);

      const isImg = file.mimetype.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.originalname);
      const determinedInputType = userDesc ? 'combined' : (isImg ? 'image' : 'document');

      const dossier = await ScanService.analyzeJob({
        userId,
        jobTitle: finalTitle,
        companyName: finalCompany,
        jobLocation: userLocation,
        recruiterName: userRecruiter,
        jobDescription: combinedText,
        applicationUrl: finalUrl,
        inputType: determinedInputType,
        uploadedFileId: fileId,
      });

      res.status(200).json({
        success: true,
        data: {
          ...dossier,
          documentMetadata: extracted.metadata,
        },
      });
    } catch (error: any) {
      if (error.code === 'SCAN_IN_PROGRESS' || error.statusCode === 409) {
        res.status(409).json({ success: false, code: 'SCAN_IN_PROGRESS', error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Retrieves individual dossier by ID.
   */
  public static async getScanById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const scanId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');
      const dossier = await ScanService.getScanById(scanId);

      if (!dossier) {
        res.status(404).json({ success: false, error: 'Scan dossier not found.' });
        return;
      }

      res.status(200).json({ success: true, data: dossier });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Retrieves user-isolated scan history.
   */
  public static async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required to access scan history.' });
        return;
      }

      const riskLevel = req.query.riskLevel as string | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await ScanService.getUserHistory({
        userId: req.user.id,
        riskLevel,
        search,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: result.scans,
        pagination: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Aggregates personal scan analytics for the authenticated user.
   */
  public static async getUserAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required for personal scan analytics.' });
        return;
      }
      const userId = req.user.id;

      const userScans = await query<any[]>(
        `SELECT id, job_title, company_name, overall_risk_score, risk_level, input_type, matched_rules_json, created_at
         FROM scan_history
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
      );

      const totalScans = userScans ? userScans.length : 0;
      let highRisk = 0;
      let moderateRisk = 0;
      let lowRisk = 0;
      let sumRisk = 0;
      const inputModeCounts: Record<string, number> = { text: 0, url: 0, image: 0, document: 0, company: 0 };
      const categoryFrequency: Record<string, number> = {};

      if (userScans) {
        for (const scan of userScans) {
          sumRisk += scan.overall_risk_score || 0;
          if (scan.risk_level === 'High Risk') highRisk++;
          else if (scan.risk_level === 'Moderate Risk') moderateRisk++;
          else lowRisk++;

          const mode = scan.input_type || 'text';
          inputModeCounts[mode] = (inputModeCounts[mode] || 0) + 1;

          try {
            const rules = JSON.parse(scan.matched_rules_json || '[]');
            if (Array.isArray(rules)) {
              for (const r of rules) {
                const cat = r.category || 'Advance Fee';
                categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
              }
            }
          } catch {}
        }
      }

      res.status(200).json({
        success: true,
        data: {
          totalScans,
          averageRiskScore: totalScans > 0 ? Math.round(sumRisk / totalScans) : 0,
          riskBreakdown: {
            highRisk,
            moderateRisk,
            lowRisk,
          },
          inputModeBreakdown: inputModeCounts,
          topFlaggedCategories: Object.entries(categoryFrequency)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count),
          recentScans: (userScans || []).slice(0, 10),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Deletes a user scan.
   */
  public static async deleteScan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Authentication required to delete scans.' });
        return;
      }

      const scanId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');
      const deleted = await ScanService.deleteUserScan(scanId, req.user.id);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Scan not found or unauthorized.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Scan deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Exports scan report as publication-grade PDF.
   */
  public static async exportPdf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const scanId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');
      const dossier = await ScanService.getScanById(scanId);

      if (!dossier) {
        res.status(404).json({ success: false, error: 'Scan not found.' });
        return;
      }

      const pdfBuffer = await ReportExportService.generatePdf(dossier);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="JobGuard_Report_${scanId.slice(0, 8)}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Exports scan report as Microsoft Word (.docx).
   */
  public static async exportDocx(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const scanId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');
      const dossier = await ScanService.getScanById(scanId);

      if (!dossier) {
        res.status(404).json({ success: false, error: 'Scan not found.' });
        return;
      }

      const docxBuffer = await ReportExportService.generateDocx(dossier);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="JobGuard_Report_${scanId.slice(0, 8)}.docx"`);
      res.send(docxBuffer);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
