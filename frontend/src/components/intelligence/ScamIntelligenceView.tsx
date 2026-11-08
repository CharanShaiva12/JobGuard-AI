/**
 * JobGuard AI - Threat Intelligence & Fraud Taxonomy Dashboard
 * Module: frontend.src.components.intelligence.ScamIntelligenceView
 * Features:
 *   - Real telemetry from MySQL threat_intel_domains and scan_history tables
 *   - Empirical Recruitment Fraud Heatmap matrix driven by real scan records
 *   - Domain classification breakdowns (Trusted ATS, Phishing hosts, Suspicious TLDs)
 *   - Real observed heuristic scam violations with frequency counts and percentages
 *   - Real recent threat detections from database scan records
 * Policy: Strictly ZERO synthetic records, placeholder counts, or assumed threat patterns.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ScamHeatmap } from './ScamHeatmap';

export const ScamIntelligenceView: React.FC = () => {
  const [intelData, setIntelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState<string>('all');

  useEffect(() => {
    const fetchIntel = async () => {
      try {
        const data = await api.getThreatIntelStats();
        setIntelData(data);
      } catch (err: any) {
        console.warn('Failed to load threat intelligence telemetry:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchIntel();
  }, []);

  const totalDomains = intelData?.totalThreatDomains ?? 0;
  const threatDomains = intelData?.threatDomains || [];
  const trustedAtsCount = threatDomains.filter((d: any) => d.category === 'trusted_enterprise').length;
  const phishingHostsCount = threatDomains.filter((d: any) => d.category === 'phishing_host').length;
  const suspiciousTldCount = threatDomains.filter((d: any) => d.category === 'suspicious_tld').length;

  const filteredDomains = threatDomains.filter((d: any) => {
    if (domainFilter === 'all') return true;
    return d.category === domainFilter;
  });

  const topViolations = intelData?.topViolations || [];
  const recentThreats = intelData?.recentThreats || [];
  const totalScans = intelData?.distribution?.totalScans ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Recruitment Threat Intelligence
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Real domain security registries, empirical threat indicators, and risk patterns recorded directly in MySQL database records.
        </p>
      </div>

      {/* 1. Real Threat Intel Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Tracked Domain Entities
          </span>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            {totalDomains}
          </div>
          <span className="text-[11px] text-[var(--accent-primary)] font-medium mt-0.5 block">
            Cached in MySQL Database
          </span>
        </div>

        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Enterprise Career Portals
          </span>
          <div className="text-2xl font-extrabold text-[#34C759]">
            {trustedAtsCount}
          </div>
          <span className="text-[11px] text-[#34C759] font-medium mt-0.5 block">
            Verified ATS Infrastructures
          </span>
        </div>

        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Abused Phishing Hosts
          </span>
          <div className="text-2xl font-extrabold text-[#D70015]">
            {phishingHostsCount}
          </div>
          <span className="text-[11px] text-[#D70015] font-medium mt-0.5 block">
            Flagged Malicious Staging Hosts
          </span>
        </div>

        <div className="p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
            Suspicious TLD Extensions
          </span>
          <div className="text-2xl font-extrabold text-[#F59E0B]">
            {suspiciousTldCount}
          </div>
          <span className="text-[11px] text-[#F59E0B] font-medium mt-0.5 block">
            High-Risk Top-Level Domains
          </span>
        </div>
      </div>

      {/* 2. Real Recruitment Vulnerability Heatmap */}
      <ScamHeatmap
        matrixCounts={intelData?.matrixCounts}
        totalScans={totalScans}
      />

      {/* 3. Real Threat Intel Domain Database Explorer */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Active Threat Intelligence Domain Records
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Authoritative local threat intelligence registry queried by the multi-engine risk pipeline.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1 bg-[var(--bg-canvas)] p-1 rounded-xl border border-[var(--border-subtle)]">
            {[
              { id: 'all', label: 'All' },
              { id: 'trusted_enterprise', label: 'Trusted ATS' },
              { id: 'phishing_host', label: 'Phishing Hosts' },
              { id: 'suspicious_tld', label: 'Suspicious TLDs' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDomainFilter(f.id)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  domainFilter === f.id
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Domain List Table */}
        {filteredDomains.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)] text-[10px] uppercase font-bold text-left">
                  <th className="py-2.5 px-3">Domain / Host Pattern</th>
                  <th className="py-2.5 px-3">Intelligence Category</th>
                  <th className="py-2.5 px-3">Threat Tier</th>
                  <th className="py-2.5 px-3">Forensic Description</th>
                  <th className="py-2.5 px-3">Authority Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]/40 font-mono">
                {filteredDomains.map((dom: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[var(--bg-canvas)] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">
                      {dom.domain_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          dom.category === 'trusted_enterprise'
                            ? 'bg-[#34C759]/10 text-[#34C759]'
                            : dom.category === 'phishing_host'
                            ? 'bg-[#D70015]/10 text-[#D70015]'
                            : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                        }`}
                      >
                        {dom.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          dom.threat_level === 'high' || dom.threat_level === 'critical'
                            ? 'text-[#D70015]'
                            : dom.threat_level === 'medium'
                            ? 'text-[#F59E0B]'
                            : 'text-[#34C759]'
                        }`}
                      >
                        {dom.threat_level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)] font-sans">
                      {dom.notes}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-tertiary)] font-sans text-[11px]">
                      {dom.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              No verified threat intelligence records available yet.
            </p>
          </div>
        )}
      </div>

      {/* 4. Common Empirical Violations Observed in Live Submissions */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Dominant Fraud Patterns Observed in Candidate Submissions
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Frequency analysis of deterministic rule matches across actual candidate scans.
          </p>
        </div>

        {topViolations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {topViolations.map((v: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase bg-[#D70015]/10 text-[#D70015]">
                    {v.severity}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {v.count} {v.count === 1 ? 'hit' : 'hits'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate" title={v.phrase}>
                  &ldquo;{v.phrase}&rdquo;
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)]">
                  Category: {v.category}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              No verified threat intelligence records available yet.
            </p>
          </div>
        )}
      </div>

      {/* 5. Real Recent Threat Detections from Database */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Recent Verified Scam Detections
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Actual recruitment risks identified by JobGuard multi-model consensus pipeline.
          </p>
        </div>

        {recentThreats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentThreats.map((threat: any) => (
              <div
                key={threat.id}
                className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        threat.riskLevel === 'High Risk'
                          ? 'bg-[#D70015]/10 text-[#D70015]'
                          : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                      }`}
                    >
                      {threat.riskLevel} &bull; Score {threat.overallRiskScore}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                      {threat.createdAt ? new Date(threat.createdAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                    {threat.jobTitle}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Target: {threat.companyName}
                  </p>
                </div>
                <div className="text-[10px] text-[var(--accent-primary)] font-semibold flex items-center space-x-1">
                  <span>🛡️ Flagged by JobGuard Multi-Engine Verification</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              No verified threat intelligence records available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
