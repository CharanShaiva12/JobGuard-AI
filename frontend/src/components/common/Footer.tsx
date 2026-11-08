/**
 * JobGuard AI - Footer Component
 * Module: frontend.src.components.common.Footer
 * Policy: Minimal, professional footer displaying only JobGuard AI logo, name,
 *         short tagline, and copyright. Footer logo navigates to '/' and does NOT open sidebar.
 */

import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onOpenSidebar?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] py-6 px-4 sm:px-6 lg:px-8 mt-auto transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* JobGuard AI Logo & Branding -> Navigates to Home */}
        <Link
          to="/"
          className="flex items-center space-x-2.5 group p-1.5 -ml-1.5 rounded-xl hover:bg-[var(--bg-canvas)] transition-all text-left"
          aria-label="JobGuard AI Home"
        >
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-canvas)] flex items-center justify-center border border-[var(--border-strong)] group-hover:border-[var(--accent-primary)] transition-colors shadow-xs">
            <svg
              className="w-4 h-4 text-[var(--accent-primary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              JobGuard <span className="text-[var(--accent-primary)]">AI</span>
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] leading-none">
              Spot Fake Jobs &amp; Internships Before You Apply.
            </span>
          </div>
        </Link>

        {/* Minimal Copyright Notice */}
        <div className="text-[11px] text-[var(--text-tertiary)] text-center sm:text-right">
          &copy; {new Date().getFullYear()} JobGuard AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
