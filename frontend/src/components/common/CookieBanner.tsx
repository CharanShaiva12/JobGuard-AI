/**
 * JobGuard AI - Cookie Consent & Privacy Transparency Banner
 * Module: frontend.src.components.common.CookieBanner
 * Policy: Strictly zero invasive tracking. Essential cookies only without consent.
 */

import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const CookieBanner: React.FC = () => {
  const { cookieConsent, setCookieConsent } = useTheme();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [performance, setPerformance] = useState(true);

  if (cookieConsent !== 'undecided') {
    return null;
  }

  const handleAcceptAll = () => {
    setCookieConsent('all', { analytics: true, functional: true, performance: true });
  };

  const handleRejectOptional = () => {
    setCookieConsent('necessary_only', { analytics: false, functional: true, performance: false });
  };

  const handleSaveCustom = () => {
    setCookieConsent('custom', { analytics, functional: true, performance });
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6" role="region" aria-label="Cookie consent banner">
      <div className="max-w-4xl mx-auto bg-white border border-[#D2D2D7] rounded-2xl shadow-xl p-5 sm:p-6 text-[#1D1D1F]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-base font-semibold tracking-tight text-[#1D1D1F]">
              Your Privacy & Cookie Preferences
            </h3>
            <p className="text-sm text-[#515154] leading-relaxed">
              JobGuard AI uses essential cookies to maintain secure sessions and prevent automated abuse.
              We do not sell personal data or track your browsing activity across third-party websites.
              You can customize your preferences at any time.
            </p>
          </div>
        </div>

        {showCustomizer && (
          <div className="mt-4 pt-4 border-t border-[#E5E5EA] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-[#1D1D1F]">Essential Security Cookies</span>
                <p className="text-xs text-[#86868B]">Required for CAPTCHA verification, session auth, and CSRF protection.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-[#F5F5F7] text-[#515154] rounded-full">
                Always Active
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-[#1D1D1F]">Performance & Diagnostics</span>
                <p className="text-xs text-[#86868B]">Helps measure API latency to optimize ML model response times.</p>
              </div>
              <input
                type="checkbox"
                checked={performance}
                onChange={(e) => setPerformance(e.target.checked)}
                className="w-4 h-4 rounded text-[#0071E3] focus:ring-[#0071E3]"
                aria-label="Toggle performance cookies"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-[#1D1D1F]">Anonymous Usage Telemetry</span>
                <p className="text-xs text-[#86868B]">Aggregated metrics to detect emerging recruitment scam patterns.</p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="w-4 h-4 rounded text-[#0071E3] focus:ring-[#0071E3]"
                aria-label="Toggle anonymous usage telemetry"
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E5EA]">
          <div className="flex gap-4 text-xs text-[#86868B]">
            <a href="/privacy" className="hover:text-[#1D1D1F] underline">Privacy Policy</a>
            <a href="/terms" className="hover:text-[#1D1D1F] underline">Terms of Service</a>
          </div>

          <div className="flex flex-wrap gap-2">
            {!showCustomizer ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowCustomizer(true)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#515154] hover:text-[#1D1D1F] border border-[#D2D2D7] rounded-lg transition-colors"
                >
                  Customize
                </button>
                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#515154] hover:text-[#1D1D1F] border border-[#D2D2D7] rounded-lg transition-colors"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg transition-colors shadow-sm"
                >
                  Accept All
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowCustomizer(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#515154] hover:text-[#1D1D1F] border border-[#D2D2D7] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg transition-colors shadow-sm"
                >
                  Save Preferences
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
