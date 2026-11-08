/**
 * JobGuard AI - Scan History & Evidence Dossier Archive
 * Module: frontend.src.components.history.ScanHistoryView
 * Features:
 *   - User-isolated scan history loaded from MySQL 8.4
 *   - Search by job title or company name
 *   - Filter by risk level
 *   - Direct PDF / DOCX report export
 *   - Deletion of personal scan records with confirmation
 *   - Accessible empty states
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { RiskBadge } from '../common/RiskBadge';
import { ScanDossier, User } from '../../types';

interface ScanHistoryViewProps {
  user: User | null;
  onSelectScan: (dossier: ScanDossier) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const ScanHistoryView: React.FC<ScanHistoryViewProps> = ({
  user,
  onSelectScan,
  onOpenAuth,
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  const fetchHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getScanHistory({
        search: searchTerm.trim() || undefined,
        riskLevel: filterRisk !== 'ALL' ? filterRisk : undefined,
      });
      setHistory(data.scans || []);
    } catch (err: any) {
      console.warn('Could not load scan history:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, filterRisk]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleOpenScan = async (scanId: string) => {
    try {
      const dossier = await api.getScanById(scanId);
      onSelectScan(dossier);
    } catch {
      alert('Could not load dossier details.');
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!window.confirm('Are you sure you want to delete this scan record from your private history?')) {
      return;
    }
    try {
      await api.deleteScan(scanId);
      setHistory((prev) => prev.filter((s) => s.id !== scanId));
    } catch {
      alert('Failed to delete scan record.');
    }
  };

  const handleDownloadPdf = async (scanId: string) => {
    try {
      const blob = await api.downloadPdf(scanId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JobGuard_Report_${scanId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Failed to export PDF.');
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-3xl border border-[#D2D2D7]/80 p-12 text-center max-w-lg mx-auto space-y-4 text-[#1D1D1F]">
        <h2 className="text-base font-bold">
          Sign In to Access Scan History
        </h2>
        <p className="text-xs text-[#515154] leading-relaxed">
          Sign in to your JobGuard account to review past inspection dossiers, audit evidence, and track verified employers.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          Sign In to Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#1D1D1F]">
      <div className="border-b border-[#E5E5EA] pb-4">
        <h1 className="text-xl font-bold tracking-tight">
          Inspection History &amp; Threat Dossiers
        </h1>
        <p className="text-xs text-[#515154] mt-1">
          Review previous opportunity evaluations, download reports, or inspect evidence.
        </p>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D2D2D7]/80">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Search by job title or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#D2D2D7] rounded-xl text-[#1D1D1F] focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]"
          />
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-medium bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#D2D2D7] rounded-xl transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#86868B]">Filter:</label>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#D2D2D7] rounded-xl text-[#1D1D1F] focus:border-[#0071E3]"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="High Risk">High Risk</option>
            <option value="Moderate Risk">Moderate Risk</option>
            <option value="Low Risk">Low Risk</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-[#E5E5EA]" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#D2D2D7]/80 p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="text-xs font-bold text-[#1D1D1F]">No Scan Dossiers Found</div>
          <p className="text-xs text-[#515154] leading-relaxed">
            No inspection records match your query. Evaluated opportunities will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#D2D2D7]/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[#515154] font-semibold">
                  <th className="py-3.5 px-4">Opportunity Title</th>
                  <th className="py-3.5 px-4">Claimed Employer</th>
                  <th className="py-3.5 px-4">Input Type</th>
                  <th className="py-3.5 px-4">Risk Evaluation</th>
                  <th className="py-3.5 px-4">Scanned At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {history.map((scan) => {
                  const title = scan.jobTitle || scan.job_title || 'Untitled Assessment';
                  const employer = scan.claimedEmployer || scan.claimed_employer || scan.companyName || scan.company_name || 'Unspecified';
                  const inputType = scan.inputType || scan.input_type || 'text';
                  const riskLevel = scan.riskLevel || scan.risk_level || 'Low Risk';
                  const riskScore = scan.overallRiskScore ?? scan.overall_risk_score ?? 0;
                  const dateRaw = scan.createdAt || scan.created_at;
                  const formattedDate = dateRaw && !isNaN(new Date(dateRaw).getTime())
                    ? new Date(dateRaw).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recent';

                  return (
                    <tr key={scan.id} className="hover:bg-[#F5F5F7]/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#1D1D1F] max-w-xs truncate" title={title}>
                        {title}
                      </td>
                      <td className="py-3.5 px-4 text-[#515154] max-w-[140px] truncate" title={employer}>
                        {employer}
                      </td>
                      <td className="py-3.5 px-4 text-[#86868B] uppercase font-medium text-[11px]">{inputType}</td>
                      <td className="py-3.5 px-4">
                        <RiskBadge level={riskLevel} score={riskScore} />
                      </td>
                      <td className="py-3.5 px-4 text-[#86868B] whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenScan(scan.id)}
                          className="px-2.5 py-1 text-xs font-medium text-[#0071E3] hover:underline"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(scan.id)}
                          className="px-2.5 py-1 text-xs font-medium text-[#515154] hover:text-[#1D1D1F]"
                          title="Download PDF"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteScan(scan.id)}
                          className="px-2 py-1 text-xs font-medium text-[#D70015] hover:underline"
                          title="Delete record"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
