/**
 * JobGuard AI - Domain Intelligence & Threat Infrastructure View
 * Module: frontend.src.components.analyzer.DomainIntelligenceView
 * Purpose: Inspects target URL domains for registration age, HTTPS encryption,
 *          corporate domain consistency, and threat intelligence flags.
 */

import React from 'react';
import { ScanDossier } from '../../types';

interface DomainIntelligenceViewProps {
  dossier: ScanDossier;
}

export const DomainIntelligenceView: React.FC<DomainIntelligenceViewProps> = ({ dossier }) => {
  const { applicationUrl, officialDomain, companyName, urlProbability, potentialConcerns = [] } = dossier;

  if (!applicationUrl && !officialDomain) {
    return null;
  }

  // Parse destination domain
  let targetDomain = officialDomain || '';
  let protocol = 'https:';
  let isDirectIp = false;

  try {
    const raw = applicationUrl || officialDomain;
    const urlObj = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    targetDomain = urlObj.hostname;
    protocol = urlObj.protocol;
    isDirectIp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(targetDomain);
  } catch {
    targetDomain = officialDomain || applicationUrl || 'unknown';
  }

  const isHttps = protocol === 'https:';
  const isHighRiskUrl = (urlProbability !== null && urlProbability >= 0.6) || isDirectIp;

  // Extract domain TLD
  const parts = targetDomain.split('.');
  const tld = parts.length > 1 ? `.${parts[parts.length - 1]}` : '.com';
  const isSuspiciousTld = ['.xyz', '.top', '.work', '.click', '.info', '.biz', '.cc'].includes(tld.toLowerCase());

  // Check threat intel mentions
  const threatMentions = potentialConcerns.filter((c) =>
    /domain|threat|phish|ip address|malicious/i.test(c)
  );

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </span>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Domain Threat Intelligence
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[var(--text-tertiary)] font-mono">
          {targetDomain}
        </span>
      </div>

      {/* Grid of Domain Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Protocol / Encryption */}
        <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            Transport Security
          </span>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${isHttps ? 'bg-[#34C759]' : 'bg-[#D70015]'}`} />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {isHttps ? 'HTTPS Encrypted' : 'Insecure (HTTP)'}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">
            {isHttps ? 'TLS certificate active' : 'Vulnerable to tampering'}
          </span>
        </div>

        {/* Metric 2: Host Type */}
        <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            Host Architecture
          </span>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${!isDirectIp ? 'bg-[#34C759]' : 'bg-[#D70015]'}`} />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {isDirectIp ? 'Raw IP Host' : 'Named Domain'}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">
            {isDirectIp ? 'Direct numeric address' : 'DNS resolution active'}
          </span>
        </div>

        {/* Metric 3: Top-Level Domain (TLD) */}
        <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            Domain Extension
          </span>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${!isSuspiciousTld ? 'bg-[#34C759]' : 'bg-[#F59E0B]'}`} />
            <span className="text-xs font-bold font-mono text-[var(--text-primary)]">
              {tld}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">
            {isSuspiciousTld ? 'High-risk TLD category' : 'Standard registry TLD'}
          </span>
        </div>

        {/* Metric 4: Employer Match */}
        <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
            Identity Alignment
          </span>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${!isHighRiskUrl ? 'bg-[#34C759]' : 'bg-[#D70015]'}`} />
            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
              {companyName || 'Claimed Corp'}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">
            {isHighRiskUrl ? 'Suspicious structure' : 'Standard alignment'}
          </span>
        </div>
      </div>

      {/* Threat Flag Alert if any */}
      {threatMentions.length > 0 && (
        <div className="p-3 bg-[#D70015]/10 border border-[#D70015]/30 rounded-xl space-y-1">
          <p className="text-xs font-bold text-[#D70015] flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Threat Intelligence Flags:</span>
          </p>
          <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-0.5 pl-1">
            {threatMentions.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
