/**
 * JobGuard AI - Live System Diagnostics & Operational Telemetry Badge
 * Module: frontend.src.components.common.SystemStatusBadge
 * Features:
 *   - Probes live backend components (/api/system/status)
 *   - Displays active mode ('auto' | 'online' | 'offline')
 *   - Dropdown modal detailing Database, Local ML, OCR, Gemini, and Live Verification
 */

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { SystemStatusReport } from '../../types';

export const SystemStatusBadge: React.FC = () => {
  const [report, setReport] = useState<SystemStatusReport | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemStatus();
      setReport(data);
    } catch {
      // Backend status endpoint unreachable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30s probe
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!report) {
    return (
      <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)]">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
        <span className="hidden sm:inline">Connecting</span>
      </div>
    );
  }

  const { mode, components } = report;
  const isDbUp = components.database.status === 'Available';
  const isMlUp = components.localMl.status === 'Available';

  const dotColor = !isDbUp
    ? 'bg-[#D70015]'
    : !isMlUp || mode === 'offline'
    ? 'bg-[#F59E0B]'
    : 'bg-[#34C759]';

  const badgeText = mode === 'offline' ? 'Offline Mode' : mode === 'online' ? 'Online Mode' : 'Mode: Auto';

  const getStatusColor = (status: string) => {
    if (status === 'Available') return 'text-[#34C759] bg-[#34C759]/10 border-[#34C759]/30';
    if (status === 'Offline') return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
    return 'text-[#D70015] bg-[#D70015]/10 border-[#D70015]/30';
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-canvas)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] transition-colors text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Click to view live system diagnostics"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span>{badgeText}</span>
        <svg
          className={`w-3 h-3 text-[var(--text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Diagnostics Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-xl p-4 z-50 animate-fade-in text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              <span className="font-bold text-[var(--text-primary)]">System Diagnostics</span>
            </div>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="text-[10px] text-[var(--accent-primary)] hover:underline font-semibold"
            >
              {loading ? 'Probing...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-2">
            {/* Database */}
            <div className="flex items-start justify-between p-2 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">MySQL 8.4 Database</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{components.database.details}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(components.database.status)}`}>
                {components.database.status}
              </span>
            </div>

            {/* Local ML */}
            <div className="flex items-start justify-between p-2 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Local ML Service</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{components.localMl.details}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(components.localMl.status)}`}>
                {components.localMl.status}
              </span>
            </div>

            {/* Local OCR */}
            <div className="flex items-start justify-between p-2 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Local PDF OCR</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{components.ocr.details}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(components.ocr.status)}`}>
                {components.ocr.status}
              </span>
            </div>

            {/* Gemini Analysis */}
            <div className="flex items-start justify-between p-2 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Gemini Reasoning</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{components.gemini.details}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(components.gemini.status)}`}>
                {components.gemini.status}
              </span>
            </div>

            {/* Live Verification */}
            <div className="flex items-start justify-between p-2 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Direct Verification</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{components.liveVerification.details}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(components.liveVerification.status)}`}>
                {components.liveVerification.status}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)] flex items-center justify-between">
            <span>Operating Mode: <strong>{mode}</strong></span>
            <span>{new Date(report.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
