import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-separator/50 pb-4">
        <h1 className="text-xl font-semibold text-content-primary tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-content-secondary mt-1">
          Effective: November 2026 (JobGuard AI Data Practices)
        </p>
      </div>

      <div className="bg-surface rounded-card border border-separator/70 shadow-card p-6 sm:p-8 space-y-5 text-xs text-content-secondary leading-relaxed">
        <div>
          <h2 className="text-sm font-semibold text-content-primary mb-1">1. Information Collection</h2>
          <p>
            JobGuard AI collects user account credentials (username, email, bcrypt-hashed passwords) and user-submitted job descriptions, URLs, and recruiter metadata necessary to perform multi-engine risk evaluation.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-content-primary mb-1">2. Passive URL Inspection Principle</h2>
          <p>
            Submitted URLs are analyzed strictly through passive lexical and structural feature parsing (such as length, TLD, subdomain depth, and character ratios). JobGuard AI does not download, scrape, or execute remote executable scripts from third-party links submitted for analysis.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-content-primary mb-1">3. Data Retention and Security</h2>
          <p>
            User scan records are stored in encrypted relational databases (MySQL 8.4) with foreign-key isolation. Passwords are salted and hashed using bcrypt (work factor 12). Account authentication requires solving a cryptographic, single-use CAPTCHA challenge.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-content-primary mb-1">4. Third-Party AI Processing</h2>
          <p>
            When cloud contextual analysis is enabled, sanitized job description text and heuristic indicators are processed via the Google Gemini API in adherence with Google Cloud developer data governance standards.
          </p>
        </div>
      </div>
    </div>
  );
};
