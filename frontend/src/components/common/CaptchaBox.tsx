import React from 'react';
import { CaptchaData } from '../../types';

interface CaptchaBoxProps {
  captcha: CaptchaData | null;
  solution: string;
  onSolutionChange: (val: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const CaptchaBox: React.FC<CaptchaBoxProps> = ({
  captcha,
  solution,
  onSolutionChange,
  onRefresh,
  loading = false,
}) => {
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <label htmlFor="captcha-solution-input" className="block text-xs font-medium text-content-secondary">
          Security Verification (CAPTCHA)
        </label>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-accent hover:text-accent-hover transition-colors font-medium flex items-center space-x-1"
          aria-label="Refresh security verification challenge"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center space-x-3">
        {captcha ? (
          <img
            src={captcha.svgImage}
            alt="Security verification challenge"
            className="h-10 w-36 rounded border border-separator-light select-none bg-canvas"
          />
        ) : (
          <div className="h-10 w-36 rounded bg-neutral-200 animate-pulse" />
        )}

        <input
          id="captcha-solution-input"
          type="text"
          value={solution}
          onChange={(e) => onSolutionChange(e.target.value)}
          placeholder="Answer"
          required
          autoComplete="off"
          className="w-full px-3 py-2 text-sm bg-surface border border-separator rounded-input text-content-primary placeholder-content-tertiary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>
      <p className="text-[11px] text-content-tertiary">
        Solve the math puzzle above to verify you are a human.
      </p>
    </div>
  );
};
