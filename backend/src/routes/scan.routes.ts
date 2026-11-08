/**
 * JobGuard AI - Scan & Investigation Routes
 * Module: backend.src.routes.scan.routes
 * Purpose: Routes for multi-mode job scam analysis, file uploads, and dossier exports.
 */

import { Router } from 'express';
import multer from 'multer';
import { ScanController } from '../controllers/scan.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Configure memory storage for uploaded documents and screenshots (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];
    if (allowedMimes.includes(file.mimetype) || /\.(pdf|docx|txt|png|jpe?g)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload a PDF, DOCX, TXT, PNG, or JPG file.'));
    }
  },
});

// Analysis Endpoints - Guarded by Mandatory Authentication
router.post('/', requireAuth, ScanController.analyzeJob);
router.post('/url', requireAuth, ScanController.analyzeUrl);
router.post('/company', requireAuth, ScanController.verifyCompany);
router.post('/upload', requireAuth, upload.single('file'), ScanController.uploadAndAnalyze);

// Scan History, Personal Analytics & Management
router.get('/history', requireAuth, ScanController.getHistory);
router.get('/analytics', requireAuth, ScanController.getUserAnalytics);
router.get('/:id', requireAuth, ScanController.getScanById);
router.delete('/:id', requireAuth, ScanController.deleteScan);

// Export Dossier Reports
router.get('/:id/export/pdf', requireAuth, ScanController.exportPdf);
router.get('/:id/export/docx', requireAuth, ScanController.exportDocx);

export default router;
