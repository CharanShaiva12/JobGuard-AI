/**
 * JobGuard AI - User Dashboard View
 * Module: frontend.src.components.dashboard.DashboardView
 * Purpose: Displays live aggregate metrics calculated directly from MySQL scan history.
 * Policy: Strictly zero simulated or fake statistics. Professional, calm language.
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err: any) {
        console.warn('Could not load dashboard stats:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalScans = stats?.totalScans ?? 0;
  const highRisk = stats?.highRiskCount ?? 0;
  const moderateRisk = stats?.moderateRiskCount ?? 0;
  const lowRisk = stats?.lowRiskCount ?? 0;
  const avgScore = stats?.averageRiskScore ?? 0;

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Overview of your assessed job opportunities and verification history.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)]" />
          ))}
        </div>
      ) : totalScans === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-2xl flex items-center justify-center mx-auto text-xl">
            📊
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            No Scans Yet
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Submit a job posting, application link, or employer name to see your risk assessment history.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            Scan a Job
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Scans */}
            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-xs">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Total Scans</div>
              <div className="text-3xl font-extrabold text-[var(--text-primary)] mt-2">
                {totalScans}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
                Average risk score: {avgScore}/100
              </div>
            </div>

            {/* Card 2: High Risk */}
            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-xs">
              <div className="text-xs font-medium text-[#D70015]">High Risk Identified</div>
              <div className="text-3xl font-extrabold text-[#D70015] mt-2">
                {highRisk}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
                Significant warning signs
              </div>
            </div>

            {/* Card 3: Moderate Risk */}
            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-xs">
              <div className="text-xs font-medium text-[#FF9500]">Moderate Risk</div>
              <div className="text-3xl font-extrabold text-[#FF9500] mt-2">
                {moderateRisk}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
                Exercise caution & verify
              </div>
            </div>

            {/* Card 4: Low Risk */}
            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-xs">
              <div className="text-xs font-medium text-[#34C759]">Low Risk / Verified</div>
              <div className="text-3xl font-extrabold text-[#34C759] mt-2">
                {lowRisk}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
                Consistent with authentic hiring
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] p-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Ready to assess another position?</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Check offer letters, recruiter messages, or corporate career links anytime.
              </p>
            </div>
            <Link
              to="/"
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm shrink-0"
            >
              Start New Scan
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
