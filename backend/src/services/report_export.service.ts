/**
 * JobGuard AI - Forensic Report Generation & Export Service
 * Module: backend.src.services.report_export.service
 * Purpose: Generates publication-grade PDF and Microsoft Word DOCX forensic dossiers.
 * Design: High-contrast, Apple-inspired typographical styling matching UI aesthetics.
 */

import PDFDocument from 'pdfkit';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { ScanDossier } from '../types/index.js';

export class ReportExportService {
  /**
   * Generates a downloadable PDF buffer for a specific scan dossier.
   */
  public static async generatePdf(dossier: ScanDossier): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 45, right: 45 },
          info: {
            Title: `JobGuard AI Forensic Report - ${dossier.id}`,
            Author: 'JobGuard AI Security Engine',
            Subject: 'Recruitment Scam Detection & Risk Assessment Dossier',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Header / Branding
        doc.fillColor('#1D1D1F').fontSize(18).font('Helvetica-Bold').text('JOBGUARD AI', { align: 'left' });
        doc.fillColor('#86868B').fontSize(9).font('Helvetica').text('Spot Fake Jobs & Internships Before You Apply.', { align: 'left' });
        doc.moveDown(0.4);

        // Divider
        doc.strokeColor('#E5E5EA').lineWidth(1).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.8);

        // Metadata Grid
        doc.fillColor('#1D1D1F').fontSize(11).font('Helvetica-Bold').text('1. INVESTIGATION METADATA');
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica');
        doc.text(`Dossier ID: ${dossier.id}`);
        doc.text(`Date & Time: ${new Date(dossier.createdAt).toUTCString()}`);
        doc.text(`Target Role: ${dossier.jobTitle}`);
        doc.text(`Employer Name: ${dossier.companyName}`);
        doc.text(`Company Verification: ${dossier.companyVerificationStatus}`);
        doc.text(`Vacancy Verification: ${dossier.vacancyVerificationStatus}`);
        doc.text(`Input Mode: ${dossier.inputType.toUpperCase()}`);
        if (dossier.applicationUrl) {
          doc.text(`Application URL: ${dossier.applicationUrl}`);
        }
        doc.moveDown(0.8);

        // Executive Risk Verdict Box
        const verdictColor = dossier.overallRiskScore >= 65 ? '#D70015' : dossier.overallRiskScore >= 35 ? '#FF9500' : '#34C759';
        doc.rect(45, doc.y, 505, 55).fillAndStroke('#F5F5F7', '#D2D2D7');
        const boxTop = doc.y;

        doc.fillColor(verdictColor).fontSize(16).font('Helvetica-Bold').text(
          `OVERALL RISK SCORE: ${dossier.overallRiskScore}/100 — ${dossier.riskLevel.toUpperCase()}`,
          55,
          boxTop + 12
        );
        doc.fillColor('#1D1D1F').fontSize(9).font('Helvetica').text(
          `Formula Consensus: R = 100 × (0.35H + 0.25M + 0.15U + 0.25G) | Advance Fee Override: ${dossier.riskBreakdown?.hasAdvanceFeeOverride ? 'YES (CRITICAL)' : 'NO'}`,
          55,
          boxTop + 34
        );

        doc.y = boxTop + 65;
        doc.moveDown(0.5);

        // Multi-Engine Breakdown Table
        doc.fillColor('#1D1D1F').fontSize(12).font('Helvetica-Bold').text('2. MULTI-ENGINE EVIDENCE SCORES');
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica');
        doc.text(`• Deterministic Rule Heuristics (H): ${(dossier.heuristicScore * 100).toFixed(1)}%`);
        doc.text(`• EMSCAD Text Classification Model (M): ${(dossier.mlProbability * 100).toFixed(1)}%`);
        doc.text(`• PhiUSIIL 18-Feature URL Model (U): ${dossier.urlProbability !== null ? (dossier.urlProbability * 100).toFixed(1) + '%' : 'N/A (No URL provided)'}`);
        doc.text(`• Google Gemini Contextual Reasoning (G): ${dossier.geminiScore !== null ? (dossier.geminiScore * 100).toFixed(1) + '%' : 'Offline / Fallback'}`);
        doc.moveDown(1);

        // Deterministic Rule Matches
        doc.fillColor('#1D1D1F').fontSize(12).font('Helvetica-Bold').text('3. OBSERVED HEURISTIC VIOLATIONS');
        doc.moveDown(0.3);
        if (dossier.matchedRules && dossier.matchedRules.length > 0) {
          dossier.matchedRules.forEach((rule, idx) => {
            doc.fillColor('#D70015').font('Helvetica-Bold').text(`[${rule.severity}] ${rule.phrase}`, { indent: 10 });
            doc.fillColor('#424245').font('Helvetica').text(`Explanation: ${rule.explanation}`, { indent: 20 });
            doc.moveDown(0.2);
          });
        } else {
          doc.fillColor('#34C759').font('Helvetica').text('No deterministic recruitment scam patterns matched.', { indent: 10 });
        }
        doc.moveDown(1);

        // Forensic AI Interpretation
        doc.fillColor('#1D1D1F').fontSize(12).font('Helvetica-Bold').text('4. FORENSIC AI ANALYSIS & ADVISORY');
        doc.moveDown(0.3);
        doc.fillColor('#1D1D1F').fontSize(9).font('Helvetica-Bold').text('Forensic Reasoning:');
        doc.font('Helvetica').text(dossier.geminiReasoning || 'Contextual evaluation generated from multi-layer heuristics.', { indent: 10 });
        doc.moveDown(0.4);
        doc.font('Helvetica-Bold').text('Actionable Advisory:');
        doc.font('Helvetica').text(dossier.actionableAdvice || 'Exercise standard employment safety precautions.', { indent: 10 });
        doc.moveDown(1.5);

        // Academic Disclaimer
        doc.strokeColor('#E5E5EA').lineWidth(0.5).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fillColor('#86868B').fontSize(8).font('Helvetica').text(
          'IMPORTANT DISCLAIMER: JobGuard AI produces probabilistic risk assessments based on machine learning models, lexical feature extraction, and public domain heuristics. It does not replace independent candidate due diligence or formal corporate verification.',
          { align: 'justify' }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a downloadable Microsoft Word (.docx) buffer for a specific scan dossier.
   */
  public static async generateDocx(dossier: ScanDossier): Promise<Buffer> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: 'JOBGUARD AI — FORENSIC SCAN DOSSIER',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Dossier Reference: ', bold: true }),
                new TextRun(dossier.id),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Generated On: ', bold: true }),
                new TextRun(new Date(dossier.createdAt).toUTCString()),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Job Title: ', bold: true }),
                new TextRun(dossier.jobTitle),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Company Name: ', bold: true }),
                new TextRun(dossier.companyName),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Application URL: ', bold: true }),
                new TextRun(dossier.applicationUrl || 'None specified'),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: `ASSESSMENT VERDICT: ${dossier.overallRiskScore}/100 (${dossier.riskLevel.toUpperCase()})`,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Formula: ', bold: true }),
                new TextRun('R = 100 × (0.35H + 0.25M + 0.15U + 0.25G)'),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'MULTI-ENGINE SUB-SCORES',
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '• Deterministic Rules (H): ', bold: true }),
                new TextRun(`${(dossier.heuristicScore * 100).toFixed(1)}%`),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '• EMSCAD Text Model (M): ', bold: true }),
                new TextRun(`${(dossier.mlProbability * 100).toFixed(1)}%`),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '• PhiUSIIL URL Model (U): ', bold: true }),
                new TextRun(dossier.urlProbability !== null ? `${(dossier.urlProbability * 100).toFixed(1)}%` : 'N/A'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '• Google Gemini AI (G): ', bold: true }),
                new TextRun(dossier.geminiScore !== null ? `${(dossier.geminiScore * 100).toFixed(1)}%` : 'Offline'),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'FORENSIC REASONING & ADVICE',
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Forensic Evaluation: ', bold: true }),
                new TextRun(dossier.geminiReasoning || 'Heuristic and machine learning evaluation completed.'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Candidate Advisory: ', bold: true }),
                new TextRun(dossier.actionableAdvice || 'Verify employer through authorized corporate directories.'),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'DISCLAIMER: JobGuard AI provides risk indicators for educational and cybersecurity assessment purposes. No guarantee of commercial authenticity is implied.',
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }
}
