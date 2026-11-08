/**
 * JobGuard AI - Explainable AI Suspicious Text Highlighter
 * Module: frontend.src.components.analyzer.SuspiciousTextHighlighter
 * Purpose: Visualizes flagged lexical phrases within the original job text,
 *          providing contextual security explanations via interactive tooltips.
 */

import React, { useState } from 'react';
import { MatchedRule } from '../../types';

interface SuspiciousTextHighlighterProps {
  originalText: string;
  matchedRules: MatchedRule[];
}

export const SuspiciousTextHighlighter: React.FC<SuspiciousTextHighlighterProps> = ({
  originalText,
  matchedRules = [],
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{
    phrase: string;
    severity: string;
    explanation: string;
    x: number;
    y: number;
  } | null>(null);

  const [highlightMode, setHighlightMode] = useState<boolean>(true);

  if (!originalText || !originalText.trim()) {
    return null;
  }

  // If no rules matched, display text without highlights
  if (!matchedRules || matchedRules.length === 0) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            Analyzed Job Posting Text
          </h3>
          <span className="text-[11px] text-[#34C759] font-semibold flex items-center space-x-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>No Suspicious Phrases Detected</span>
          </span>
        </div>
        <div className="p-4 bg-[var(--bg-canvas)] rounded-xl text-xs text-[var(--text-secondary)] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
          {originalText}
        </div>
      </div>
    );
  }

  // Extract unique phrases to highlight
  const phrasesToHighlight = matchedRules
    .filter((r) => r.phrase && r.phrase.trim().length > 2)
    .sort((a, b) => b.phrase.length - a.phrase.length); // longest phrases first to prevent partial cutoffs

  // Build regex matching any phrase case-insensitively
  const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(
    `(${phrasesToHighlight.map((r) => escapeRegex(r.phrase)).join('|')})`,
    'gi'
  );

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-[#D70015]/20 text-[#D70015] border-[#D70015]/40 hover:bg-[#D70015]/30';
      case 'HIGH':
        return 'bg-[#F97316]/20 text-[#F97316] border-[#F97316]/40 hover:bg-[#F97316]/30';
      case 'MEDIUM':
        return 'bg-[#F59E0B]/20 text-[#D97706] border-[#F59E0B]/40 hover:bg-[#F59E0B]/30';
      default:
        return 'bg-[#3B82F6]/20 text-[#2563EB] border-[#3B82F6]/40 hover:bg-[#3B82F6]/30';
    }
  };

  const getRuleForPhrase = (phrase: string): MatchedRule | undefined => {
    return matchedRules.find(
      (r) => r.phrase.toLowerCase() === phrase.toLowerCase()
    );
  };

  const renderHighlightedContent = () => {
    if (!highlightMode) {
      return (
        <div className="p-4 bg-[var(--bg-canvas)] rounded-xl text-xs text-[var(--text-secondary)] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-mono">
          {originalText}
        </div>
      );
    }

    const parts = originalText.split(pattern);

    return (
      <div className="p-4 bg-[var(--bg-canvas)] rounded-xl text-xs text-[var(--text-primary)] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-mono relative">
        {parts.map((part, index) => {
          const matched = getRuleForPhrase(part);
          if (matched) {
            const colorClass = getSeverityColor(matched.severity);
            return (
              <mark
                key={index}
                className={`px-1 py-0.5 rounded border cursor-help font-semibold transition-colors ${colorClass}`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveTooltip({
                    phrase: part,
                    severity: matched.severity,
                    explanation: matched.explanation,
                    x: rect.left,
                    y: rect.top - 8,
                  });
                }}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                {part}
              </mark>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-3 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-[#D70015]/10 text-[#D70015]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </span>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Explainable AI Text Forensics
          </h3>
          <span className="text-xs bg-[#D70015]/10 text-[#D70015] font-semibold px-2 py-0.5 rounded-full">
            {matchedRules.length} Flags
          </span>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center space-x-1 bg-[var(--bg-canvas)] p-1 rounded-xl border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setHighlightMode(true)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
              highlightMode
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Highlighted View
          </button>
          <button
            type="button"
            onClick={() => setHighlightMode(false)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
              !highlightMode
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Raw Text
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-secondary)]">
        Hover over highlighted keywords to inspect security risk rationales.
      </p>

      {renderHighlightedContent()}

      {/* Floating Tooltip */}
      {activeTooltip && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-y-full -translate-x-1/2 px-3 py-2 bg-[#1D1D1F] text-white rounded-xl shadow-xl border border-white/10 text-xs max-w-xs"
          style={{
            left: activeTooltip.x + 30,
            top: activeTooltip.y - 4,
          }}
        >
          <div className="flex items-center justify-between space-x-2 mb-1 border-b border-white/20 pb-1">
            <span className="font-bold text-[11px] text-amber-300">
              "{activeTooltip.phrase}"
            </span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-red-500/30 text-red-200">
              {activeTooltip.severity}
            </span>
          </div>
          <p className="text-[11px] text-gray-200 leading-snug">
            {activeTooltip.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
