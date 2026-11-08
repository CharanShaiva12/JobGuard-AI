/**
 * JobGuard AI - Unified Job Opportunity & Recruitment Fraud Analyzer
 * Module: frontend.src.components.analyzer.JobAnalyzerForm
 * Purpose: Single unified form accepting job details, links, text, or uploaded documents/screenshots.
 * Gating: Unauthenticated users can fill the form; clicking Scan prompts authentication
 *         while strictly preserving all entered fields and selected files.
 * Loading: Displays only "Analyzing..." with an elegant spinner.
 */

import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { ScanDossier, User } from '../../types';

interface JobAnalyzerFormProps {
  user: User | null;
  onRequireAuth: (pendingScanCallback: () => Promise<void>) => void;
  onAnalysisComplete: (dossier: ScanDossier) => void;
  onError: (err: string) => void;
}

export const JobAnalyzerForm: React.FC<JobAnalyzerFormProps> = ({
  user,
  onRequireAuth,
  onAnalysisComplete,
  onError,
}) => {
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Language Detection (Priority 17)
  const detectLanguage = (text: string): { lang: string; isEnglish: boolean; notice: string } => {
    if (!text || text.trim().length < 15) {
      return { lang: 'English', isEnglish: true, notice: 'EMSCAD Primary Model' };
    }
    if (/[\u0900-\u097F]/.test(text)) {
      return { lang: 'Hindi', isEnglish: false, notice: 'Heuristics calibrated for English; contextual AI will translate & evaluate.' };
    }
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return { lang: 'Chinese', isEnglish: false, notice: 'Heuristics calibrated for English; contextual AI will translate & evaluate.' };
    }
    if (/[\u0600-\u06FF]/.test(text)) {
      return { lang: 'Arabic', isEnglish: false, notice: 'Heuristics calibrated for English; contextual AI will translate & evaluate.' };
    }
    const words = text.toLowerCase().split(/\s+/);
    const spanishMatches = words.filter((w) => ['el', 'la', 'de', 'para', 'con', 'trabajo', 'puesto', 'remoto', 'empresa'].includes(w)).length;
    const frenchMatches = words.filter((w) => ['le', 'la', 'les', 'pour', 'avec', 'emploi', 'travail', 'poste', 'societe'].includes(w)).length;
    const germanMatches = words.filter((w) => ['der', 'die', 'das', 'und', 'mit', 'arbeit', 'stelle', 'angebot', 'bewerbung'].includes(w)).length;

    if (spanishMatches >= 3) {
      return { lang: 'Spanish', isEnglish: false, notice: 'Heuristics calibrated for English; contextual AI will translate & evaluate.' };
    }
    if (frenchMatches >= 3) {
      return { lang: 'French', isEnglish: false, notice: 'Heuristics calibrated for English; contextual AI will translate & evaluate.' };
    }
    if (germanMatches >= 3) {
      return { lang: 'German', isEnglish: false, notice: 'Heuristics calibrated for English; contextual AI will translate & evaluate.' };
    }
    return { lang: 'English', isEnglish: true, notice: 'EMSCAD Primary Model Active' };
  };

  const detectedLang = detectLanguage(jobDescription);

  // Core execution routine
  const executeScan = async () => {
    setLoading(true);
    onError('');

    try {
      let dossier: ScanDossier;

      // Case 1: Uploaded document or screenshot
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (jobTitle.trim()) formData.append('jobTitle', jobTitle.trim());
        if (companyName.trim()) formData.append('companyName', companyName.trim());
        if (recruiterName.trim()) formData.append('recruiterName', recruiterName.trim());
        if (jobLocation.trim()) formData.append('jobLocation', jobLocation.trim());
        if (applicationUrl.trim()) formData.append('applicationUrl', applicationUrl.trim());
        if (jobDescription.trim()) formData.append('jobDescription', jobDescription.trim());

        dossier = await api.uploadAndAnalyze(formData);
      }
      // Case 2: URL only
      else if (applicationUrl.trim() && !jobDescription.trim() && !companyName.trim() && !jobTitle.trim()) {
        dossier = await api.analyzeUrl(applicationUrl.trim());
      }
      // Case 3: Company only
      else if (companyName.trim() && !jobDescription.trim() && !applicationUrl.trim() && !jobTitle.trim()) {
        dossier = await api.verifyCompany(companyName.trim());
      }
      // Case 4: Text or Combined input
      else {
        const inputType = (jobDescription.trim() && applicationUrl.trim()) ? 'combined' : 'text';
        dossier = await api.analyzeJob({
          jobTitle: jobTitle.trim() || undefined,
          companyName: companyName.trim() || undefined,
          recruiterName: recruiterName.trim() || undefined,
          jobLocation: jobLocation.trim() || undefined,
          jobDescription: jobDescription.trim() || undefined,
          applicationUrl: applicationUrl.trim() || null,
          inputType,
        });
      }

      onAnalysisComplete(dossier);
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.data?.code === 'SCAN_IN_PROGRESS') {
        onError('Another scan is currently in progress. Please wait a few seconds and try again.');
        return;
      }
      const msg = err.response?.data?.error || err.message || 'Analysis could not be completed. Please check your inputs.';
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const hasAnyInput =
      Boolean(jobTitle.trim()) ||
      Boolean(companyName.trim()) ||
      Boolean(recruiterName.trim()) ||
      Boolean(jobLocation.trim()) ||
      Boolean(applicationUrl.trim()) ||
      Boolean(jobDescription.trim()) ||
      Boolean(selectedFile);

    if (!hasAnyInput) {
      onError('Please provide a job description, link, employer name, or upload a document to scan.');
      return;
    }

    // Authentication gating: If user is not signed in, prompt auth and queue this scan
    if (!user) {
      onRequireAuth(async () => {
        await executeScan();
      });
      return;
    }

    executeScan();
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-3xl border border-[var(--border-strong)] shadow-sm p-6 sm:p-10 transition-colors">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Job Title & Company Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              disabled={loading}
              className="w-full px-4 py-2.5 text-xs bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Company / Employer Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Microsoft Corporation"
              disabled={loading}
              className="w-full px-4 py-2.5 text-xs bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl outline-none transition-colors"
            />
          </div>
        </div>

        {/* Row 2: Recruiter Name & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Recruiter / Sender
            </label>
            <input
              type="text"
              value={recruiterName}
              onChange={(e) => setRecruiterName(e.target.value)}
              placeholder="e.g. Sarah Jenkins or Talent Acquisition"
              disabled={loading}
              className="w-full px-4 py-2.5 text-xs bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Job Location / Work Arrangement
            </label>
            <input
              type="text"
              value={jobLocation}
              onChange={(e) => setJobLocation(e.target.value)}
              placeholder="e.g. Remote / New York, NY"
              disabled={loading}
              className="w-full px-4 py-2.5 text-xs bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl outline-none transition-colors"
            />
          </div>
        </div>

        {/* Row 3: Application URL */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            Job Application Link
          </label>
          <input
            type="url"
            value={applicationUrl}
            onChange={(e) => setApplicationUrl(e.target.value)}
            placeholder="e.g. https://careers.company.com/job/12345"
            disabled={loading}
            className="w-full px-4 py-2.5 text-xs bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl outline-none transition-colors"
          />
        </div>

        {/* Row 4: Job Description or Message */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Job Description or Message Content
            </label>
            {jobDescription.trim().length > 15 && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                  detectedLang.isEnglish
                    ? 'bg-[#34C759]/10 text-[#34C759]'
                    : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                }`}
              >
                <span>🌐 {detectedLang.lang}</span>
                <span className="text-[9px] text-[var(--text-tertiary)] hidden sm:inline">({detectedLang.notice})</span>
              </span>
            )}
          </div>
          <textarea
            rows={5}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description, interview invite, email body, or recruitment message here..."
            disabled={loading}
            className="w-full px-4 py-3 text-xs bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl outline-none transition-colors resize-y"
          />
        </div>

        {/* Row 5: Document or Screenshot Upload */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            Offer Letter, Job Posting PDF, or Screenshot
          </label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                : 'border-[var(--border-strong)] bg-[var(--bg-canvas)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center space-x-3">
                <span className="text-xl">📄</span>
                <div className="text-left">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-xs sm:max-w-md">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Ready for text &amp; OCR extraction
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 hover:bg-[var(--border-subtle)] rounded-full text-[var(--text-tertiary)] hover:text-[#D70015]"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  Drag &amp; drop an offer letter, PDF, DOCX, or screenshot image here
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Supported formats: PDF, DOCX, TXT, PNG, JPG, JPEG, WEBP (up to 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button & Simple Loading State */}
        <div className="pt-2 flex items-center justify-between">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Fill in any field or upload a file. All inputs are securely verified.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-2xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Scanning in progress...</span>
              </>
            ) : (
              <span>Scan</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
