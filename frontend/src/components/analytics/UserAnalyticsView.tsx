/**
 * JobGuard AI - User Personal Scan Analytics & Threat History
 * Module: frontend.src.components.analytics.UserAnalyticsView
 * Purpose: Aggregates personal scan history, fraud distribution, and risk metrics
 *          isolated strictly to the authenticated user.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { User } from '../../types';

interface UserAnalyticsViewProps {
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onSelectScan: (dossier: any) => void;
}

export const UserAnalyticsView: React.FC<UserAnalyticsViewProps> = ({
  currentUser,
  onOpenAuth,
  onSelectScan,
}) => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      const fetchAnalytics = async () => {
        try {
          const data = await api.getUserAnalytics();
          setAnalytics(data);
        } catch (err: any) {
          console.warn('Failed to load personal scan analytics:', err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-8 text-center max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Personal Scan Analytics
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Sign in to view personalized telemetry on your verified opportunities, historical risk breakdowns, and detected fraud trends.
        </p>
        <button
          type="button"
          onClick={() => onOpenAuth('login')}
          className="px-5 py-2 text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm"
        >
          Sign In
        </button>
      </div>
    );
  }

  const {
    totalScans = 0,
    averageRiskScore = 0,
    riskBreakdown = { highRisk: 0, moderateRisk: 0, lowRisk: 0 },
    inputModeBreakdown = {},
    topFlaggedCategories = [],
    recentScans = [],
  } = analytics || {};

  const highPct = totalScans > 0 ? Math.round((riskBreakdown.highRisk / totalScans) * 100) : 0;
  const modPct = totalScans > 0 ? Math.round((riskBreakdown.moderateRisk / totalScans) * 100) : 0;
  const lowPct = totalScans > 0 ? Math.round((riskBreakdown.lowRisk / totalScans) * 100) : 0;

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Personal Scan Analytics &amp; Exposure Telemetry
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Historical overview of all opportunities analyzed under account <strong>{currentUser.username}</strong>.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Total Opportunities Scanned
          </span>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            {totalScans}
          </div>
          <span className="text-[11px] text-[var(--accent-primary)] font-medium mt-0.5 block">
            Lifetime verification count
          </span>
        </div>

        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Average Risk Score
          </span>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            {averageRiskScore} <span className="text-xs font-normal text-[var(--text-tertiary)]">/ 100</span>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 block">
            Across all submissions
          </span>
        </div>

        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Critical / High-Risk Flagged
          </span>
          <div className="text-2xl font-extrabold text-[#D70015]">
            {riskBreakdown.highRisk}
          </div>
          <span className="text-[11px] text-[#D70015] font-medium mt-0.5 block">
            {highPct}% of your scans
          </span>
        </div>

        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Verified Low Risk
          </span>
          <div className="text-2xl font-extrabold text-[#34C759]">
            {riskBreakdown.lowRisk}
          </div>
          <span className="text-[11px] text-[#34C759] font-medium mt-0.5 block">
            {lowPct}% safe corporate roles
          </span>
        </div>
      </div>

      {/* Risk Distribution Bar */}
      {totalScans > 0 && (
        <div className="p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Risk Level Portfolio Distribution
            </h2>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {totalScans} verified records
            </span>
          </div>

          <div className="h-4 w-full bg-[var(--bg-canvas)] rounded-full overflow-hidden flex border border-[var(--border-subtle)]">
            <div
              style={{ width: `${lowPct}%` }}
              className="bg-[#34C759] h-full transition-all"
              title={`Low Risk: ${lowPct}%`}
            />
            <div
              style={{ width: `${modPct}%` }}
              className="bg-[#F59E0B] h-full transition-all"
              title={`Moderate Risk: ${modPct}%`}
            />
            <div
              style={{ width: `${highPct}%` }}
              className="bg-[#D70015] h-full transition-all"
              title={`High Risk: ${highPct}%`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs pt-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              <span>Low Risk ({riskBreakdown.lowRisk} — {lowPct}%)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span>Moderate Risk ({riskBreakdown.moderateRisk} — {modPct}%)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D70015]" />
              <span>High Risk ({riskBreakdown.highRisk} — {highPct}%)</span>
            </span>
          </div>
        </div>
      )}

      {/* Top Flagged Categories & Input Mode Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Flagged Categories */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Most Frequently Flagged Threat Types
          </h2>
          {topFlaggedCategories.length > 0 ? (
            <div className="space-y-2.5">
              {topFlaggedCategories.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] text-xs"
                >
                  <span className="font-semibold text-[var(--text-primary)]">
                    {item.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#D70015]/10 text-[#D70015] font-bold">
                    {item.count} detections
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)] italic">
              No specific recurring threat patterns recorded in your scans yet.
            </p>
          )}
        </div>

        {/* Input Mode Distribution */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Verification Channels Used
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
                Text / Email Scans
              </span>
              <div className="text-xl font-bold text-[var(--text-primary)] font-mono">
                {inputModeBreakdown.text || 0}
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
                Direct URL Checks
              </span>
              <div className="text-xl font-bold text-[var(--text-primary)] font-mono">
                {inputModeBreakdown.url || 0}
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
                Document / Image OCR
              </span>
              <div className="text-xl font-bold text-[var(--text-primary)] font-mono">
                {(inputModeBreakdown.image || 0) + (inputModeBreakdown.document || 0)}
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
                Company Verifications
              </span>
              <div className="text-xl font-bold text-[var(--text-primary)] font-mono">
                {inputModeBreakdown.company || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      {recentScans.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Recent Activity
            </h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-[var(--accent-primary)] hover:underline font-semibold"
            >
              View Full History →
            </button>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {recentScans.map((s: any) => (
              <div
                key={s.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--bg-canvas)] px-2 rounded-xl transition-colors cursor-pointer"
                onClick={async () => {
                  try {
                    const full = await api.getScanById(s.id);
                    onSelectScan(full);
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
              >
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {s.job_title}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {s.company_name} • {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.risk_level === 'High Risk'
                        ? 'bg-[#D70015]/10 text-[#D70015]'
                        : s.risk_level === 'Moderate Risk'
                        ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                        : 'bg-[#34C759]/10 text-[#34C759]'
                    }`}
                  >
                    {s.overall_risk_score}/100 • {s.risk_level}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
