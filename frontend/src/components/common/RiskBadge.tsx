import React from 'react';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score }) => {
  let bgClass = 'bg-risk-low-bg text-risk-low border-risk-low/20';
  let dotClass = 'bg-risk-low';

  if (level === 'High Risk') {
    bgClass = 'bg-risk-high-bg text-risk-high border-risk-high/20';
    dotClass = 'bg-risk-high';
  } else if (level === 'Moderate Risk') {
    bgClass = 'bg-risk-moderate-bg text-risk-moderate border-risk-moderate/20';
    dotClass = 'bg-risk-moderate';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-semibold border ${bgClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotClass}`} />
      <span>{level}</span>
      {score !== undefined && <span className="ml-1 opacity-80">({score}/100)</span>}
    </span>
  );
};
