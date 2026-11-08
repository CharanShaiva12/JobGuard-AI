/**
 * JobGuard AI - Comprehensive Forensic Scan Dossier View
 * Module: frontend.src.components.analyzer.AnalysisResultView
 * Features:
 *   - Overall Result: Animated Semicircular Risk Meter (0-100), Risk Level, and plain-English verdict
 *   - Explainable AI Risk Reasoner (Payment, Salary, Communication, Domain)
 *   - Explainable AI Text Forensics (Interactive highlighted text with tooltips)
 *   - Domain Threat Intelligence (HTTPS, Host architecture, TLD, alignment)
 *   - Candidate Assessment Summary in clear English
 *   - Positive Indicators & Potential Concerns
 *   - Verified Corporate Resources & Public Sources
 *   - Publication-grade PDF and DOCX Forensic Report Downloads
 *   - Candidate Feedback Form (stored in MySQL feedback table)
 */

import React, { useState } from 'react';
import { ScanDossier } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { RiskMeter } from './RiskMeter';
import { RiskExplanationView } from './RiskExplanationView';
import { SuspiciousTextHighlighter } from './SuspiciousTextHighlighter';
import { DomainIntelligenceView } from './DomainIntelligenceView';
import { api } from '../../services/api';

interface AnalysisResultViewProps {
  dossier: ScanDossier;
  onReset: () => void;
}

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({
  dossier,
  onReset,
}) => {
  const {
    jobTitle,
    companyName,
    overallRiskScore,
    riskLevel,
    companyVerificationStatus,
    vacancyVerificationStatus,
    recruitmentStatus,
    officialWebsite,
    careersUrl,
    officialDomain,
    positiveIndicators = [],
    potentialConcerns = [],
    jobDescription,
    matchedRules = [],
  } = dossier;

  // Feedback states
  const [feedbackType, setFeedbackType] = useState<string>('correct_detection');
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Download states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await api.downloadPdf(dossier.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JobGuard_Report_${dossier.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Failed to download PDF report: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      const blob = await api.downloadDocx(dossier.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JobGuard_Report_${dossier.id.slice(0, 8)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Failed to download Word document: ${err.message}`);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackSubmitted || feedbackLoading) return;
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      await api.submitFeedback({
        scanId: dossier.id,
        feedbackType,
        comments: feedbackComments.trim() || undefined,
      });
      setFeedbackSubmitted(true);
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        'Unable to submit feedback at this time. Please try again.';
      setFeedbackError(errMsg);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getVerdictText = () => {
    if (riskLevel === 'Low Risk') {
      return 'Low Risk — This opportunity appears consistent with legitimate corporate recruitment practices.';
    } else if (riskLevel === 'Moderate Risk') {
      return 'Moderate Risk — Exercise caution. Certain indicators or lack of official records warrant independent verification.';
    } else {
      return 'High Risk — Strong warning signs of recruitment fraud or deceptive practices were identified.';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('VERIFIED')) {
      return 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/30';
    }
    if (
      s.includes('MISMATCH') ||
      s.includes('NOT FOUND') ||
      s.includes('EXPIRED') ||
      s.includes('FLAGGED')
    ) {
      return 'bg-[#D70015]/10 text-[#D70015] border-[#D70015]/30';
    }
    return 'bg-[#86868B]/10 text-[#86868B] border-[#86868B]/30';
  };

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      {/* 1. Header & Overall Result Card */}
      <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm p-6 sm:p-8 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <RiskBadge level={riskLevel} score={overallRiskScore} />
              <span className="text-xs px-2.5 py-0.5 bg-[var(--bg-canvas)] rounded-md text-[var(--text-secondary)] font-medium">
                {dossier.claimedEmployer
                  ? `Claimed: ${dossier.claimedEmployer}`
                  : companyName || 'Unspecified Employer'}
              </span>
              {dossier.claimedEmployer &&
                companyName &&
                dossier.claimedEmployer.toLowerCase() !== companyName.toLowerCase() && (
                  <span className="text-xs px-2.5 py-0.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-md font-medium">
                    Identified Entity: {companyName}
                  </span>
                )}
              <span className="text-[11px] px-2 py-0.5 bg-[var(--bg-canvas)] rounded-md text-[var(--text-tertiary)] uppercase font-semibold">
                {dossier.inputType || 'text'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {jobTitle || 'Job Opportunity Assessment'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
              {getVerdictText()}
            </p>
          </div>

          {/* Interactive Animated Risk Meter */}
          <div className="shrink-0 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center">
            <RiskMeter score={overallRiskScore} size={220} />
          </div>
        </div>

        {/* Verification Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
            <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">
              Company Identity
            </div>
            <span
              className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg border ${getStatusBadgeClass(
                companyVerificationStatus
              )}`}
            >
              {companyVerificationStatus}
            </span>
          </div>

          <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
            <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">
              Vacancy Status
            </div>
            <span
              className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg border ${getStatusBadgeClass(
                vacancyVerificationStatus
              )}`}
            >
              {vacancyVerificationStatus}
            </span>
          </div>

          <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
            <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">
              Recruitment Status
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mt-1">
              {recruitmentStatus}
            </div>
          </div>
        </div>

        {/* Export & Actions Bar */}
        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-4 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-canvas)] hover:bg-[var(--border-subtle)] rounded-xl border border-[var(--border-strong)] transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-[#D70015]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{downloadingPdf ? 'Exporting PDF...' : 'Download PDF Report'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={downloadingDocx}
              className="px-4 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-canvas)] hover:bg-[var(--border-subtle)] rounded-xl border border-[var(--border-strong)] transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-[#007AFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{downloadingDocx ? 'Exporting Word...' : 'Download Word (.docx)'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="px-6 py-2 text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm"
          >
            Start New Scan
          </button>
        </div>
      </div>

      {/* 2. Explainable AI Risk Reasoner */}
      <RiskExplanationView dossier={dossier} />

      {/* 3. Explainable AI Text Forensics (Suspicious Text Highlighter) */}
      {jobDescription && (
        <SuspiciousTextHighlighter
          originalText={jobDescription}
          matchedRules={matchedRules}
        />
      )}

      {/* 4. Domain Threat Intelligence */}
      <DomainIntelligenceView dossier={dossier} />

      {/* 5. Indicators Grid: Positive Indicators & Potential Concerns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Positive Indicators */}
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm p-6 transition-colors">
          <h2 className="text-xs font-bold text-[#34C759] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>✓</span> Positive Indicators
          </h2>
          {positiveIndicators.length > 0 ? (
            <ul className="space-y-2.5">
              {positiveIndicators.map((ind, i) => (
                <li
                  key={i}
                  className="text-xs text-[var(--text-secondary)] flex items-start gap-2.5"
                >
                  <span className="text-[#34C759] font-bold mt-0.5">•</span>
                  <span>{ind}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)] italic">
              No specific positive corporate verifications recorded for this input.
            </p>
          )}
        </div>

        {/* Potential Concerns */}
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm p-6 transition-colors">
          <h2 className="text-xs font-bold text-[#D70015] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>⚠️</span> Potential Concerns
          </h2>
          {potentialConcerns.length > 0 ? (
            <ul className="space-y-2.5">
              {potentialConcerns.map((con, i) => (
                <li
                  key={i}
                  className="text-xs text-[var(--text-secondary)] flex items-start gap-2.5"
                >
                  <span className="text-[#D70015] font-bold mt-0.5">•</span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)] italic">
              No critical fraud indicators or suspicious payment demands detected.
            </p>
          )}
        </div>
      </div>

      {/* 6. Company & Careers Verification Links */}
      {(officialWebsite || careersUrl || officialDomain) && (
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm p-6 transition-colors">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
            Verified Corporate Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {officialWebsite && (
              <div className="p-3.5 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-tertiary)] block mb-1">
                  Official Company Website
                </span>
                <a
                  href={
                    officialWebsite.startsWith('http')
                      ? officialWebsite
                      : `https://${officialWebsite}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline truncate block"
                >
                  {officialWebsite} ↗
                </a>
              </div>
            )}

            {careersUrl && (
              <div className="p-3.5 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-tertiary)] block mb-1">
                  Official Careers Portal
                </span>
                <a
                  href={
                    careersUrl.startsWith('http')
                      ? careersUrl
                      : `https://${careersUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline truncate block"
                >
                  {careersUrl} ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Candidate Assessment Feedback Form */}
      <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm p-6 sm:p-8 transition-colors">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1 uppercase tracking-wider">
          Candidate Assessment Feedback
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Help improve verification accuracy by providing feedback on this assessment.
        </p>

        {feedbackSubmitted ? (
          <div className="p-4 bg-[#34C759]/10 border border-[#34C759]/30 rounded-2xl text-xs text-[#34C759] font-semibold">
            ✓ Thank you! Your feedback has been recorded.
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            {feedbackError && (
              <div className="p-3 bg-[#D70015]/10 border border-[#D70015]/30 rounded-xl text-xs text-[#D70015] font-medium">
                {feedbackError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {[
                { id: 'correct_detection', label: 'Correct Detection' },
                { id: 'incorrect_detection', label: 'Incorrect Detection' },
                { id: 'false_positive', label: 'False Positive (Legitimate Flagged)' },
                { id: 'false_negative', label: 'False Negative (Scam Missed)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFeedbackType(opt.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-all ${
                    feedbackType === opt.id
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <textarea
                rows={2}
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Optional notes or context regarding this hiring opportunity..."
                className="w-full px-4 py-2.5 text-xs bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            <button
              type="submit"
              disabled={feedbackLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
