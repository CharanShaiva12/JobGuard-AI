/**
 * JobGuard AI - Interactive Animated Risk Meter (0-100)
 * Module: frontend.src.components.analyzer.RiskMeter
 * Features:
 *   - Semicircular vector gauge with dynamic risk gradient arc
 *   - 5 calibrated risk bands:
 *       0-20: Very Low (Safe)
 *      21-40: Low
 *      41-60: Moderate (Exercise Caution)
 *      61-80: High (Suspicious)
 *      81-100: Critical (Fraud / Phishing)
 *   - Respects prefers-reduced-motion
 *   - Accessible ARIA meter semantics
 */

import React, { useEffect, useState } from 'react';

interface RiskMeterProps {
  score: number; // 0 to 100
  size?: number;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({ score, size = 200 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Normalize score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  useEffect(() => {
    // Check user motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setAnimatedScore(normalizedScore);
      return;
    }

    const duration = 1000; // 1s animation
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easeProgress * normalizedScore));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [normalizedScore]);

  // Determine risk category metadata
  const getBandInfo = (val: number) => {
    if (val <= 20) {
      return {
        label: 'Very Low Risk',
        color: '#10B981', // emerald
        bgColor: 'rgba(16, 185, 129, 0.1)',
        description: 'Consistent with legitimate corporate recruiting standards.',
      };
    } else if (val <= 40) {
      return {
        label: 'Low Risk',
        color: '#34C759', // green
        bgColor: 'rgba(52, 199, 89, 0.1)',
        description: 'Standard recruitment signals observed with minor cautionary notes.',
      };
    } else if (val <= 60) {
      return {
        label: 'Moderate Risk',
        color: '#F59E0B', // amber
        bgColor: 'rgba(245, 158, 11, 0.1)',
        description: 'Unverified employer or unconventional communication channels detected.',
      };
    } else if (val <= 80) {
      return {
        label: 'High Risk',
        color: '#F97316', // orange
        bgColor: 'rgba(249, 115, 22, 0.1)',
        description: 'Strong deceptive indicators, suspicious URL structure, or wage anomalies.',
      };
    } else {
      return {
        label: 'Critical Risk',
        color: '#EF4444', // crimson
        bgColor: 'rgba(239, 68, 68, 0.12)',
        description: 'Confirmed advance-fee demand, phishing threat intelligence, or severe brand impersonation.',
      };
    }
  };

  const band = getBandInfo(normalizedScore);

  // SVG dimensions for semicircular gauge
  const radius = 70;
  const strokeWidth = 14;
  // Semicircle circumference: π * r
  const arcLength = Math.PI * radius;
  // Offset calculated from progress
  const strokeDashoffset = arcLength - (arcLength * animatedScore) / 100;

  return (
    <div
      className="flex flex-col items-center justify-center p-4"
      role="meter"
      aria-valuenow={normalizedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Overall Risk Score: ${normalizedScore} out of 100 (${band.label})`}
    >
      <div className="relative" style={{ width: size, height: size * 0.62 }}>
        <svg
          viewBox="0 0 180 110"
          className="w-full h-full overflow-visible"
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="25%" stopColor="#34C759" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="75%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated Value Arc */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke={band.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke 0.3s ease' }}
          />

          {/* Min and Max Markers */}
          <text x="20" y="108" fill="var(--text-tertiary)" fontSize="9" textAnchor="middle" fontWeight="500">
            0
          </text>
          <text x="90" y="32" fill="var(--text-tertiary)" fontSize="8" textAnchor="middle" fontWeight="500">
            50
          </text>
          <text x="160" y="108" fill="var(--text-tertiary)" fontSize="9" textAnchor="middle" fontWeight="500">
            100
          </text>
        </svg>

        {/* Central Readout */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center">
          <div className="flex items-baseline space-x-1">
            <span
              className="text-3xl font-black tracking-tight"
              style={{ color: band.color }}
            >
              {animatedScore}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] font-bold">/100</span>
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full mt-0.5"
            style={{ backgroundColor: band.bgColor, color: band.color }}
          >
            {band.label}
          </span>
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)] text-center mt-2 max-w-xs">
        {band.description}
      </p>
    </div>
  );
};
