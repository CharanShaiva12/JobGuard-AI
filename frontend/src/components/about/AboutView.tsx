/**
 * JobGuard AI - About Page View
 * Module: frontend.src.components.about.AboutView
 * Purpose: Clear, simple explanation of JobGuard AI and official academic project details.
 * Policy: Written in general English without technical jargon or equations.
 * Academic Details: Sourced from official project synopsis and SRS documents.
 */

import React from 'react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto text-[var(--text-primary)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          About JobGuard AI
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
          An intelligent safety system protecting job seekers from recruitment fraud and employment scams.
        </p>
      </div>

      {/* Main Narrative Card */}
      <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm p-6 sm:p-8 space-y-6 text-xs text-[var(--text-secondary)] leading-relaxed transition-colors">
        {/* Section 1: What is JobGuard AI? */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
            What is JobGuard AI?
          </h2>
          <p className="leading-relaxed text-xs">
            JobGuard AI is a web-based safety platform designed to assist job seekers in verifying recruitment communications, job offers, and application links. By evaluating job postings before an applicant shares sensitive personal data, identity documents, or money, JobGuard AI helps candidates determine whether a hiring opportunity is genuine or deceptive.
          </p>
        </div>

        {/* Section 2: Why it was Developed */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
            Why It Was Developed
          </h2>
          <p className="leading-relaxed text-xs">
            As hiring processes have moved online, employment fraud has increased significantly. Fraudulent actors impersonate reputable companies, send fake appointment letters, and manipulate job seekers into paying upfront registration charges, laptop deposit fees, or training costs. JobGuard AI was developed to provide job seekers with an accessible, immediate tool to evaluate suspicious communications and avoid predatory recruitment schemes.
          </p>
        </div>

        {/* Section 3: How it Helps Job Seekers */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
            How It Helps Job Seekers
          </h2>
          <p className="leading-relaxed text-xs mb-3">
            JobGuard AI reviews hiring opportunities through multiple protective checks to ensure applicants have a clear, reliable understanding of any potential risks:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Job Description Analysis
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Examines recruitment descriptions and messages for red flags, including demands for upfront money, unrealistic pay promises, high-pressure deadlines, or off-platform messaging requests.
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Application URL Analysis
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Checks application links and website addresses to identify fake websites, temporary link shorteners, spoofed domains, and unencrypted pages attempting to mimic legitimate employers.
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Company Verification
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Identifies whether the organization hiring candidates is an authentic registered business and compares the application channel against the company&apos;s verified public career infrastructure.
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Document &amp; Screenshot Analysis
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Reads uploaded offer letters, PDFs, Word documents, and mobile screenshot images, extracting readable job details and scanning the content for deceptive patterns.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: AI-Assisted Scam-Risk Assessment */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
            AI-Assisted Scam-Risk Assessment
          </h2>
          <p className="leading-relaxed text-xs">
            Instead of presenting confusing technical diagnostics, JobGuard AI synthesizes all findings into a straightforward 0–100 risk score and clear risk tier (Low Risk, Moderate Risk, or High Risk). Each assessment highlights observed positive indicators, potential concerns, and practical safety advice, empowering candidates to make informed career decisions.
          </p>
        </div>
      </div>

      {/* Section 5: Academic Project Details Card */}
      <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm p-6 sm:p-8 space-y-4 transition-colors">
        <div className="border-b border-[var(--border-subtle)] pb-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Academic Project Details
          </h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Department of Computer Applications &bull; Bachelor of Computer Applications (2026–2027)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] block uppercase tracking-wider">
              Project Title
            </span>
            <span className="font-bold text-[var(--text-primary)] block leading-snug">
              JOBGUARD AI — AI-Assisted Job Scam Detection and Risk Assessment System
            </span>
          </div>

          <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] block uppercase tracking-wider">
              Institution
            </span>
            <span className="font-bold text-[var(--text-primary)] block leading-snug">
              JSS Science and Technology University
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] block">
              JSS Mahavidyapeetha, Mysuru &ndash; 570 006
            </span>
          </div>

          <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] block uppercase tracking-wider">
              Submitted By
            </span>
            <div className="space-y-1 pt-0.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[var(--text-primary)]">Charan M</span>
                <span className="font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                  01JST24UBC024
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[var(--text-primary)]">Chethan Kumar L E</span>
                <span className="font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                  01JST24UBC025
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] block uppercase tracking-wider">
              Project Guide
            </span>
            <span className="font-bold text-[var(--text-primary)] block leading-snug">
              Dr. C. S. Santhosh
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] block">
              Assistant Professor, Department of Computer Applications
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
