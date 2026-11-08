import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundView: React.FC = () => {
  return (
    <div className="bg-surface rounded-card border border-separator/70 shadow-card p-12 text-center max-w-md mx-auto space-y-4 my-12">
      <div className="w-12 h-12 bg-canvas rounded-full flex items-center justify-center mx-auto text-content-tertiary border border-separator/60">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-content-primary tracking-tight">
        404 — Page Not Found
      </h1>
      <p className="text-xs text-content-secondary leading-relaxed">
        The requested endpoint or resource is unavailable or has moved.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-input shadow-subtle transition-colors"
        >
          Return to Scan Analyzer
        </Link>
      </div>
    </div>
  );
};
