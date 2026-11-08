/**
 * JobGuard AI - Document & Image Text Extraction Service
 * Module: backend.src.services.document_parser.service
 * Purpose: Securely extracts text from uploaded PDF, DOCX, TXT documents and image screenshots.
 * Technologies:
 *   - Native PDF Parser (pdf-parse)
 *   - Microsoft Word DOCX (mammoth)
 *   - Plain UTF-8 Text
 *   - Google Gemini Multimodal Vision OCR (Free Tier sequential execution)
 *   - Local Offline Tesseract OCR Engine (v5.5.3 fallback)
 * Security: Enforces file size limits, safe temp file cleanup, and structured argument execution.
 */

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { GeminiQueueService } from './gemini_queue.service.js';

const execFileAsync = promisify(execFile);

export interface ExtractedDocumentContent {
  text: string;
  wordCount: number;
  extractedUrls: string[];
  inferredJobTitle?: string;
  inferredCompanyName?: string;
  metadata: {
    filename: string;
    mimeType: string;
    fileSizeBytes: number;
    extractionMethod: 'pdf-parser' | 'mammoth-docx' | 'utf8-text' | 'gemini-vision-ocr' | 'tesseract-ocr' | 'fallback';
  };
}

export class DocumentParserService {
  private static findTesseractPath(): string | null {
    const candidates = [
      'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
      'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
      process.env.TESSERACT_PATH,
    ].filter(Boolean) as string[];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Executes local Tesseract OCR on an image buffer.
   */
  private static async runLocalTesseractOcr(buffer: Buffer, fileExt: string): Promise<string> {
    const tesseractPath = this.findTesseractPath();
    if (!tesseractPath) {
      console.warn('[DocumentParser] Local Tesseract OCR binary not found.');
      return '';
    }

    const tempFileName = `jobguard_ocr_${crypto.randomUUID()}${fileExt}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
      await fs.promises.writeFile(tempFilePath, buffer);
      // Run tesseract <image> stdout --psm 3
      const { stdout } = await execFileAsync(tesseractPath, [tempFilePath, 'stdout', '--psm', '3'], {
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout?.trim() || '';
    } catch (err: any) {
      console.warn(`[DocumentParser] Local Tesseract OCR error: ${err.message}`);
      return '';
    } finally {
      if (fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {
          // Ignore temp cleanup errors
        }
      }
    }
  }

  /**
   * Executes local PDF OCR via Python utility extracting embedded images.
   */
  private static async runLocalPdfOcr(buffer: Buffer): Promise<string> {
    const tempFileName = `jobguard_pdf_${crypto.randomUUID()}.pdf`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    const scriptPath = path.resolve(process.cwd(), 'src/utils/pdf_ocr.py');

    try {
      await fs.promises.writeFile(tempFilePath, buffer);
      const { stdout } = await execFileAsync('python', [scriptPath, tempFilePath], {
        timeout: 25000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout?.trim() || '';
    } catch (err: any) {
      console.warn(`[DocumentParser] Local PDF OCR error: ${err.message}`);
      return '';
    } finally {
      if (fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {
          // Ignore temp cleanup errors
        }
      }
    }
  }

  /**
   * Parses uploaded file buffer based on MIME type and extracts textual content.
   */
  public static async parseDocument(params: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }): Promise<ExtractedDocumentContent> {
    const { buffer, filename, mimeType } = params;
    let extractedText = '';
    let method: ExtractedDocumentContent['metadata']['extractionMethod'] = 'fallback';

    const lowerFilename = filename.toLowerCase();

    // 1. PDF Documents
    if (mimeType === 'application/pdf' || lowerFilename.endsWith('.pdf')) {
      let parser: any = null;
      try {
        const uint8Data = new Uint8Array(buffer);
        parser = new PDFParse(uint8Data);
        const parsedDoc = await parser.getText();
        extractedText = parsedDoc?.text || '';
        method = 'pdf-parser';
      } catch (pdfErr: any) {
        const errMsg = String(pdfErr?.message || pdfErr);
        if (errMsg.toLowerCase().includes('password')) {
          throw new Error('The uploaded PDF is password-protected. Please upload an unprotected recruitment document.');
        }
        console.warn(`[DocumentParser] PDFParse notice: ${errMsg}. Attempting local visual OCR pipeline...`);
        extractedText = '';
      } finally {
        if (parser && typeof parser.destroy === 'function') {
          try {
            await parser.destroy();
          } catch {
            // Ignore parser destruction errors
          }
        }
      }

      // Scanned PDF detection: little or no embedded text (< 30 characters)
      if (extractedText.trim().length < 30) {
        console.log('[DocumentParser] Scanned or image-only PDF detected, running local OCR pipeline...');

        // Step 1: Run high-performance local PDF OCR (pypdfium2 + Tesseract) - 100% offline
        const localPdfOcrText = await this.runLocalPdfOcr(buffer);
        if (localPdfOcrText && localPdfOcrText.trim().length >= 30) {
          extractedText = localPdfOcrText;
          method = 'tesseract-ocr';
        } else if (config.jobguardMode !== 'offline' && config.geminiApiKey) {
          // Step 2: Multimodal Gemini Vision fallback when online/auto
          try {
            const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
            const modelName = config.geminiModel || 'gemini-3.5-flash-lite';

            const ocrRes = await GeminiQueueService.executeSequentially(async () => {
              return await ai.models.generateContent({
                model: modelName,
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        inlineData: {
                          mimeType: 'application/pdf',
                          data: buffer.toString('base64'),
                        },
                      },
                      {
                        text: 'Transcribe all legible text from this recruitment document verbatim. Include employer, title, description, and contact details.',
                      },
                    ],
                  },
                ],
              });
            });

            const ocrText = ocrRes.text?.trim() || '';
            if (ocrText.length > extractedText.trim().length) {
              extractedText = ocrText;
              method = 'gemini-vision-ocr';
            }
          } catch (visionErr: any) {
            console.warn(`[DocumentParser] Scanned PDF Gemini Vision notice: ${visionErr.message}`);
          }
        }
      }
    }
    // 2. Microsoft Word DOCX Documents
    else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerFilename.endsWith('.docx')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
        method = 'mammoth-docx';
      } catch (err: any) {
        throw new Error(`Failed to parse DOCX document: ${err.message}`);
      }
    }
    // 3. Plain Text Documents
    else if (mimeType.startsWith('text/') || lowerFilename.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
      method = 'utf8-text';
    }
    // 4. Image Screenshots (JPG, JPEG, PNG, WEBP, GIF)
    else if (mimeType.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(lowerFilename)) {
      let normalizedMime = 'image/jpeg';
      let fileExt = '.jpg';

      if (mimeType === 'image/png' || /\.png$/i.test(lowerFilename)) {
        normalizedMime = 'image/png';
        fileExt = '.png';
      } else if (mimeType === 'image/webp' || /\.webp$/i.test(lowerFilename)) {
        normalizedMime = 'image/webp';
        fileExt = '.webp';
      } else if (mimeType === 'image/gif' || /\.gif$/i.test(lowerFilename)) {
        normalizedMime = 'image/gif';
        fileExt = '.gif';
      }

      // Step 4A: Gemini Vision Multimodal OCR (sequential execution, bypassed in offline mode)
      if (config.jobguardMode !== 'offline' && config.geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
          const modelName = config.geminiModel || 'gemini-3.5-flash-lite';
          const base64Data = buffer.toString('base64');

          const response = await GeminiQueueService.executeSequentially(async () => {
            return await ai.models.generateContent({
              model: modelName,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inlineData: {
                        mimeType: normalizedMime,
                        data: base64Data,
                      },
                    },
                    {
                      text: 'You are the recruitment document OCR engine for JobGuard AI. Carefully transcribe all legible text verbatim from this image, including employer/company name, job title, description, compensation, contact info (email, phone, Telegram), and application links. Output only the complete verbatim extracted text.',
                    },
                  ],
                },
              ],
            });
          });

          extractedText = response.text?.trim() || '';
          if (extractedText.length > 10) {
            method = 'gemini-vision-ocr';
          }
        } catch (visionErr: any) {
          console.warn(`[DocumentParser] Gemini Vision OCR notice: ${visionErr.message}`);
          extractedText = '';
        }
      }

      // Step 4B: Local Offline Tesseract OCR Fallback
      if (!extractedText || extractedText.trim().length < 10) {
        console.log('[DocumentParser] Executing local Tesseract OCR fallback for image...');
        const tesseractOutput = await this.runLocalTesseractOcr(buffer, fileExt);
        if (tesseractOutput.trim().length > 0) {
          extractedText = tesseractOutput;
          method = 'tesseract-ocr';
        }
      }
    } else {
      throw new Error(`Unsupported file type: ${mimeType}. Allowed formats: PDF, DOCX, TXT, PNG, JPG, JPEG, WEBP.`);
    }

    // Passive extraction of URLs embedded inside document text
    const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
    const matches = extractedText.match(urlRegex) || [];
    const extractedUrls = Array.from(new Set(matches.map((u) => u.replace(/[.,;!?)]+$/, ''))));

    const words = extractedText.trim().split(/\s+/).filter(Boolean);

    // Heuristic inference of Job Title and Company from first few lines of text
    let inferredJobTitle: string | undefined;
    let inferredCompanyName: string | undefined;

    const lines = extractedText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 2 && !l.startsWith('http') && !l.startsWith('[OCR'));

    if (lines.length > 0) {
      for (const line of lines.slice(0, 6)) {
        const companyMatch = line.match(/(?:at|for|company|organization|employer|hiring at)[:\s]+([A-Za-z0-9&.,\s]{3,40})/i);
        if (companyMatch && !inferredCompanyName) {
          inferredCompanyName = companyMatch[1].trim();
        }
        const roleMatch = line.match(/(?:role|position|hiring|opening|job title)[:\s]+([A-Za-z0-9&.,\s]{3,40})/i);
        if (roleMatch && !inferredJobTitle) {
          inferredJobTitle = roleMatch[1].trim();
        }
      }

      if (!inferredJobTitle && lines[0] && lines[0].length < 60) {
        inferredJobTitle = lines[0];
      }
    }

    return {
      text: extractedText.trim(),
      wordCount: words.length,
      extractedUrls,
      inferredJobTitle,
      inferredCompanyName,
      metadata: {
        filename,
        mimeType,
        fileSizeBytes: buffer.length,
        extractionMethod: method,
      },
    };
  }
}
