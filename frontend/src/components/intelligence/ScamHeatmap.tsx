/**
 * JobGuard AI - Recruitment Fraud & Vulnerability Heatmap
 * Module: frontend.src.components.intelligence.ScamHeatmap
 * Purpose: Matrix visualization mapping detected fraud categories against risk tiers
 *          based exclusively on empirical database scan telemetry from MySQL.
 * Policy: Strictly ZERO synthetic records, placeholder counts, or assumed threat numbers.
 */

import React, { useState } from 'react';

interface ScamHeatmapProps {
  matrixCounts?: Record<string, Record<string, number>>;
  totalScans?: number;
}

const CATEGORY_GUIDANCE: Record<string, { explanation: string; defense: string }> = {
  'Advance Fee': {
    explanation: 'Demands for upfront registration, security deposits, or software licenses before hiring.',
    defense: 'Authentic employers absorb their recruitment and equipment expenses. Never remit funds to secure employment.',
  },
  'Communication Redirection': {
    explanation: 'Redirecting applicants to private Telegram groups or WhatsApp chats without corporate audit trails.',
    defense: 'Insist on corporate email communication (@company.com) or official company portal interactions.',
  },
  'Financial Channel': {
    explanation: 'Solicitation of peer-to-peer transfers (UPI, crypto, cash apps) or fake check cashing requests.',
    defense: 'Never handle financial transactions or check deposits through personal accounts during recruitment.',
  },
  'Unrealistic Guarantee': {
    explanation: 'Unrealistic daily compensation claims, guaranteed placements, or instant offers without evaluation.',
    defense: 'Compare compensation against standard industry benchmarks and expect formal technical evaluation.',
  },
  'Identity Compromise': {
    explanation: 'Premature demands for banking passwords, OTPs, or excessive identity documents before an offer.',
    defense: 'Never disclose passwords, card PINs, or OTPs during job application or interview stages.',
  },
  'Recruiter Domain': {
    explanation: 'Recruiters using personal free webmail (gmail.com, yahoo.com) claiming to represent major corporations.',
    defense: 'Cross-reference recruiter identity with official corporate directory or LinkedIn verification.',
  },
  'Reshipping Scam': {
    explanation: 'Package inspection or forwarding requests that exploit candidates as unwitting couriers.',
    defense: 'Legitimate logistics firms do not hire remote workers to receive and re-mail merchandise from home.',
  },
  'Psychological Coercion': {
    explanation: 'Manufactured artificial urgency and pressure tactics to induce hasty compliance.',
    defense: 'Take time to verify opportunities independently; legitimate offers do not expire within minutes.',
  },
};

export const ScamHeatmap: React.FC<ScamHeatmapProps> = ({ matrixCounts = {}, totalScans = 0 }) => {
  const categories = Object.keys(matrixCounts);
  const tiers = ['High Risk', 'Moderate Risk', 'Low Risk'];

  const [selectedCell, setSelectedCell] = useState<{
    category: string;
    tier: string;
    count: number;
    percentage: number;
  } | null>(() => {
    if (categories.length > 0) {
      const firstCat = categories[0];
      const count = matrixCounts[firstCat]?.['High Risk'] || matrixCounts[firstCat]?.['Moderate Risk'] || 0;
      const pct = totalScans > 0 ? Math.round((count / totalScans) * 100) : 0;
      return { category: firstCat, tier: 'High Risk', count, percentage: pct };
    }
    return null;
  });

  if (categories.length === 0 || totalScans === 0) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Empirical Threat Vulnerability Heatmap
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Correlates observed fraud categories across risk tiers based on actual candidate scans in MySQL.
          </p>
        </div>
        <div className="p-12 text-center bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            No verified threat intelligence records available yet.
          </p>
        </div>
      </div>
    );
  }

  const getCellIntensityClass = (tier: string, count: number) => {
    if (count === 0) {
      return 'bg-[var(--bg-canvas)] text-[var(--text-tertiary)] border-[var(--border-subtle)]/40 hover:border-[var(--border-strong)]';
    }
    if (tier === 'High Risk') {
      if (count >= 5) return 'bg-[#D70015]/30 text-[#D70015] border-[#D70015]/40 font-bold';
      return 'bg-[#D70015]/15 text-[#D70015] border-[#D70015]/25 font-semibold';
    }
    if (tier === 'Moderate Risk') {
      if (count >= 5) return 'bg-[#F59E0B]/30 text-[#F59E0B] border-[#F59E0B]/40 font-bold';
      return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/25 font-semibold';
    }
    if (count >= 5) return 'bg-[#34C759]/30 text-[#34C759] border-[#34C759]/40 font-bold';
    return 'bg-[#34C759]/15 text-[#34C759] border-[#34C759]/25 font-semibold';
  };

  const activeGuidance = selectedCell
    ? CATEGORY_GUIDANCE[selectedCell.category] || {
        explanation: 'Observed deterministic rule indicators detected during job evaluation.',
        defense: 'Verify company recruitment channels through registered corporate domains.',
      }
    : null;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Empirical Threat Vulnerability Heatmap
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Correlates observed fraud categories across risk tiers based on actual candidate scans in MySQL.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-[var(--bg-canvas)] px-2.5 py-1 rounded-xl border border-[var(--border-subtle)]">
          {totalScans} Real Scan Records Analyzed
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                Observed Fraud Category
              </th>
              {tiers.map((t) => (
                <th
                  key={t}
                  className="p-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] min-w-[110px]"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]/40">
            {categories.map((cat) => (
              <tr key={cat} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                <td className="p-2.5 font-bold text-[var(--text-primary)] whitespace-nowrap">
                  {cat}
                </td>
                {tiers.map((tier) => {
                  const count = matrixCounts[cat]?.[tier] || 0;
                  const pct = totalScans > 0 ? Math.round((count / totalScans) * 100) : 0;
                  const isSelected =
                    selectedCell?.category === cat && selectedCell?.tier === tier;

                  return (
                    <td key={tier} className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedCell({ category: cat, tier, count, percentage: pct })}
                        className={`w-full py-2 px-2 rounded-xl border text-xs transition-all ${getCellIntensityClass(
                          tier,
                          count
                        )} ${isSelected ? 'ring-2 ring-[var(--accent-primary)] ring-offset-1' : ''}`}
                      >
                        <span className="block leading-none">{count} {count === 1 ? 'hit' : 'hits'}</span>
                        <span className="text-[10px] opacity-75 leading-none mt-1 block">
                          {pct}% of scans
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Drill-Down */}
      {selectedCell && activeGuidance && (
        <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[var(--border-subtle)] pb-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[var(--text-primary)] text-sm">
                {selectedCell.category}
              </span>
              <span className="text-[var(--text-tertiary)]">&bull;</span>
              <span className="font-semibold text-[var(--accent-primary)]">
                {selectedCell.tier}
              </span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              {selectedCell.count} verified incidents ({selectedCell.percentage}% of database scans)
            </span>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed">
            <strong className="text-[var(--text-primary)]">Observed Mechanism: </strong>
            {activeGuidance.explanation}
          </p>

          <p className="text-[#34C759] font-medium leading-relaxed flex items-start space-x-1.5 pt-1">
            <span className="font-bold">🛡️ Defensive Rule:</span>
            <span>{activeGuidance.defense}</span>
          </p>
        </div>
      )}
    </div>
  );
};
