/**
 * JobGuard AI - Explainable AI Risk Reasoner
 * Module: frontend.src.components.analyzer.RiskExplanationView
 * Purpose: Translates multi-model forensic findings into clear, educational,
 *          plain-English security reasoning across 4 core risk dimensions.
 */

import React from 'react';
import { ScanDossier } from '../../types';

interface RiskExplanationViewProps {
  dossier: ScanDossier;
}

export const RiskExplanationView: React.FC<RiskExplanationViewProps> = ({ dossier }) => {
  const {
    companyVerificationStatus,
    vacancyVerificationStatus,
    matchedRules = [],
    geminiReasoning,
    actionableAdvice,
  } = dossier;

  // Evaluate the 4 key scam dimensions
  const hasPaymentDemand = matchedRules.some((r) =>
    r.category === 'Advance Fee' ||
    r.category === 'Financial Channel' ||
    /\b(?:fee|deposit|training\s+kit|payment|crypto|check|wire|registration)\b/i.test(r.phrase)
  );

  const hasSalaryAnomaly = matchedRules.some((r) =>
    r.category === 'Unrealistic Guarantee' ||
    /\b(?:unrealistic|guaranteed|daily\s+cash|instant\s+pay|exorbitant)\b/i.test(r.phrase)
  );

  const hasCommunicationRedFlags = matchedRules.some((r) =>
    r.category === 'Communication Redirection' ||
    r.category === 'Recruiter Domain' ||
    /\b(?:telegram|whatsapp|gmail|yahoo|hotmail|signal|sms|chat\s+interview)\b/i.test(r.phrase)
  );

  const hasDomainMismatch =
    companyVerificationStatus === 'MISMATCH' ||
    vacancyVerificationStatus === 'MISMATCH' ||
    matchedRules.some((r) => /\b(?:impersonat|spoof|malicious\s+domain)\b/i.test(r.phrase));

  const dimensions = [
    {
      title: 'Payment & Advance Fee Requests',
      status: hasPaymentDemand ? 'High Risk' : 'Clear',
      isWarning: hasPaymentDemand,
      detail: hasPaymentDemand
        ? 'Explicit requests for payments, registration fees, or equipment purchase deposits detected. Legitimate employers NEVER require candidates to pay upfront.'
        : 'No advance fees, application charges, or payment demands were found in the analyzed listing.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Compensation Realism',
      status: hasSalaryAnomaly ? 'Suspicious' : 'Consistent',
      isWarning: hasSalaryAnomaly,
      detail: hasSalaryAnomaly
        ? 'Unusually inflated salary figures, guaranteed daily wages, or disproportionate hourly rates for entry-level work detected.'
        : 'Compensation structure aligns with conventional industry ranges or does not exhibit bait-and-switch salary inflation.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      title: 'Communication Channels',
      status: hasCommunicationRedFlags ? 'Suspicious' : 'Standard',
      isWarning: hasCommunicationRedFlags,
      detail: hasCommunicationRedFlags
        ? 'Directing interviews or communication to free webmail (Gmail/Yahoo) or consumer messaging apps (Telegram, WhatsApp) without official enterprise email.'
        : 'Recruitment channels appear standard or use enterprise communication protocols.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      title: 'Domain & Corporate Identity',
      status: hasDomainMismatch ? 'Mismatch Flag' : 'Verified / Neutral',
      isWarning: hasDomainMismatch,
      detail: hasDomainMismatch
        ? 'Target application domain does not match the claimed employer, or represents a spoofed/lookalike address designed to impersonate.'
        : 'No evidence of domain spoofing; destination domain is consistent or directly accessible via authentic infrastructure.',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </span>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Explainable AI Risk Reasoner
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
          Multi-Dimensional Security Evaluation
        </span>
      </div>

      {/* Reasoning Narrative */}
      {geminiReasoning && (
        <div className="p-3.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
          <p className="font-medium text-[var(--text-primary)] mb-1">Contextual Assessment:</p>
          <p>{geminiReasoning}</p>
        </div>
      )}

      {/* 4 Security Dimensions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {dimensions.map((dim, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border transition-all ${
              dim.isWarning
                ? 'bg-[#D70015]/5 border-[#D70015]/30'
                : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <span className={dim.isWarning ? 'text-[#D70015]' : 'text-[var(--accent-primary)]'}>
                  {dim.icon}
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {dim.title}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  dim.isWarning
                    ? 'bg-[#D70015]/15 text-[#D70015]'
                    : 'bg-[#34C759]/15 text-[#34C759]'
                }`}
              >
                {dim.status}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
              {dim.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Actionable Advisory */}
      {actionableAdvice && (
        <div className="p-3.5 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 rounded-xl">
          <p className="text-xs font-bold text-[var(--accent-primary)] mb-1 flex items-center space-x-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Recommended Safety Guidance:</span>
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {actionableAdvice}
          </p>
        </div>
      )}
    </div>
  );
};
