/**
 * JobGuard AI - Scan & Investigation Routes
 * Module: backend.src.routes.scan.routes
 * Purpose: Routes for multi-mode job scam analysis, file uploads, and dossier exports.
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ScanController } from '../controllers/scan.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  analyzeJobSchema,
  analyzeUrlSchema,
  verifyCompanySchema,
} from '../middleware/validate.middleware.js';

const router = Router();

const ALLOWED_EXTENSION_MIMES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/octet-stream',
  ],
  '.txt': ['text/plain'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg', 'image/jpg'],
  '.jpeg': ['image/jpeg', 'image/jpg'],
};

/**
 * Validates actual file magic-byte signatures so spoofed extensions/MIME types are rejected.
 */
export function isValidFileMagicBytes(buffer: Buffer, ext: string): boolean {
  if (!buffer || buffer.length === 0) return false;
  switch (ext) {
    case '.pdf':
      return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    case '.docx':
      // DOCX is a ZIP container starting with PK\x03\x04
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      );
    case '.png':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case '.jpg':
    case '.jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case '.txt': {
      // Reject binary files containing NUL bytes in the first 4KB
      const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
      return !sample.includes(0x00);
    }
    default:
      return false;
  }
}

function validateUploadedFileSignature(req: Request, res: Response, next: NextFunction): void {
  const file = req.file;
  if (!file) {
    next();
    return;
  }
  const match = file.originalname.toLowerCase().match(/\.(pdf|docx|txt|png|jpe?g)$/);
  const ext = match ? `.${match[1]}` : '';
  if (!ext || !isValidFileMagicBytes(file.buffer, ext)) {
    res.status(400).json({
      success: false,
      error: 'Uploaded file signature does not match its declared file type. Please upload a valid PDF, DOCX, TXT, PNG, or JPG file.',
    });
    return;
  }
  next();
}

// Configure memory storage for uploaded documents and screenshots (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const match = file.originalname.toLowerCase().match(/\.(pdf|docx|txt|png|jpe?g)$/);
    const ext = match ? `.${match[1]}` : '';
    const allowedMimes = ext ? ALLOWED_EXTENSION_MIMES[ext] : undefined;
    if (ext && allowedMimes && allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Both file extension and MIME type must be a valid PDF, DOCX, TXT, PNG, or JPG file.'));
    }
  },
});

// Analysis Endpoints - Guarded by Mandatory Authentication & Schema Validation
router.post('/', requireAuth, validateBody(analyzeJobSchema), ScanController.analyzeJob);
router.post('/url', requireAuth, validateBody(analyzeUrlSchema), ScanController.analyzeUrl);
router.post('/company', requireAuth, validateBody(verifyCompanySchema), ScanController.verifyCompany);
router.post('/upload', requireAuth, upload.single('file'), validateUploadedFileSignature, ScanController.uploadAndAnalyze);

// Scan History, Personal Analytics & Management
router.get('/history', requireAuth, ScanController.getHistory);
router.get('/analytics', requireAuth, ScanController.getUserAnalytics);
router.get('/:id', requireAuth, ScanController.getScanById);
router.delete('/:id', requireAuth, ScanController.deleteScan);

// Export Dossier Reports
router.get('/:id/export/pdf', requireAuth, ScanController.exportPdf);
router.get('/:id/export/docx', requireAuth, ScanController.exportDocx);

export default router;
