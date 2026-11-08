import React from 'react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-separator/50 pb-4">
        <h1 className="text-xl font-semibold text-content-primary tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-content-secondary mt-1">
          Last revised: November 2026 (Academic Research &amp; Evaluation Draft)
        </p>
      </div>

      <div className="bg-surface rounded-card border border-separator/70 shadow-card p-6 sm:p-8 space-y-5 text-xs text-content-secondary leading-relaxed">
        <div>
          <h2 className="text-sm font-semibold text-content-primary mb-1">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the JobGuard AI platform, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, you must discontinue use of the platform immediately.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-content-primary mb-1">2. Purpose and Advisory Nature</h2>
          <p>
            JobGuard AI provides risk assessments and automated detection outputs based on mathematical modeling, machine learning inferences, and deterministic heuristic indicators. Outputs are strictly advisory to support user discretion and do not constitute legal guarantees, employment warranties, or absolute determinations of legitimacy.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-content-primary mb-1">3. Permitted Use</h2>
          <p>
            You agree to submit only authentic vacancy text, recruiter communications, or public career URLs for defensive threat analysis. You shall not leverage this platform to conduct denial-of-service attempts, reverse-engineer models, or submit automated abusive traffic.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-content-primary mb-1">4. Disclaimer of Warranties</h2>
          <p>
            The software is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis for academic research and consumer assistance. No representation is made that the service will remain uninterrupted, defect-free, or resilient against unknown zero-day deception methodologies.
          </p>
        </div>
      </div>
    </div>
  );
};
