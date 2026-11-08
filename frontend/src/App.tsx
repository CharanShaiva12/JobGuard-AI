/**
 * JobGuard AI - Frontend Application Root
 * Module: frontend.src.App
 * Purpose: Application layout, routing, session lifecycle, theme provider,
 *          and authentication gating with state preservation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { Sidebar } from './components/common/Sidebar';
import { CookieBanner } from './components/common/CookieBanner';
import { ThemeModal } from './components/common/ThemeModal';
import { AuthModal } from './components/auth/AuthModal';
import { JobAnalyzerForm } from './components/analyzer/JobAnalyzerForm';
import { AnalysisResultView } from './components/analyzer/AnalysisResultView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ScanHistoryView } from './components/history/ScanHistoryView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AdminLoginView } from './components/admin/AdminLoginView';
import { ScamIntelligenceView } from './components/intelligence/ScamIntelligenceView';
import { ModelPerformanceView } from './components/models/ModelPerformanceView';
import { UserAnalyticsView } from './components/analytics/UserAnalyticsView';
import { MyAccountView } from './components/account/MyAccountView';
import { AboutView } from './components/about/AboutView';
import { TermsOfService } from './components/legal/TermsOfService';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { NotFoundView } from './components/common/NotFoundView';
import { ScanDossier, User } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentDossier, setCurrentDossier] = useState<ScanDossier | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // Preserve pending scan execution across unauthenticated gating
  const pendingScanRef = useRef<(() => Promise<void>) | null>(null);

  const navigate = useNavigate();

  // Load user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('jobguard_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify active HTTP-only session cookie with backend
        api.getMe()
          .then((u) => {
            setUser(u);
            localStorage.setItem('jobguard_user', JSON.stringify(u));
          })
          .catch(() => {
            localStorage.removeItem('jobguard_user');
            setUser(null);
          });
      } catch {
        setUser(null);
      }
    } else {
      // Check if session cookie exists
      api.getMe()
        .then((u) => {
          setUser(u);
          localStorage.setItem('jobguard_user', JSON.stringify(u));
        })
        .catch(() => {
          setUser(null);
        });
    }
  }, []);

  const handleAuthSuccess = (authUser: User, _token?: string) => {
    setUser(authUser);
    localStorage.setItem('jobguard_user', JSON.stringify(authUser));
    setAlertSuccess(`Welcome, ${authUser.full_name || authUser.username}!`);
    setTimeout(() => setAlertSuccess(null), 4000);

    // If there was a pending scan queued before login, resume it now automatically
    if (pendingScanRef.current) {
      const resumeScan = pendingScanRef.current;
      pendingScanRef.current = null;
      resumeScan();
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setCurrentDossier(null);
    setAlertSuccess('You have signed out successfully.');
    setTimeout(() => setAlertSuccess(null), 3000);
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleRequireAuth = (callback: () => Promise<void>) => {
    pendingScanRef.current = callback;
    setAlertError('Please sign in or create an account to scan this opportunity. Your entered details have been preserved.');
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-200">
      <Navbar
        user={user}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenThemeModal={() => setThemeModalOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Global Alerts / Toasts */}
      {alertError && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="p-3.5 bg-[#D70015]/10 border border-[#D70015]/30 rounded-2xl text-xs text-[#D70015] flex items-center justify-between font-medium">
            <span>{alertError}</span>
            <button onClick={() => setAlertError(null)} className="text-[#D70015] hover:opacity-70 font-bold ml-4">✕</button>
          </div>
        </div>
      )}

      {alertSuccess && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="p-3.5 bg-[#34C759]/10 border border-[#34C759]/30 rounded-2xl text-xs text-[#34C759] flex items-center justify-between font-medium">
            <span>{alertSuccess}</span>
            <button onClick={() => setAlertSuccess(null)} className="text-[#34C759] hover:opacity-70 font-bold ml-4">✕</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Routes>
          <Route
            path="/"
            element={
              currentDossier ? (
                <AnalysisResultView
                  dossier={currentDossier}
                  onReset={() => setCurrentDossier(null)}
                />
              ) : (
                <div className="space-y-6">
                  <div className="text-center max-w-2xl mx-auto mb-8 space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                      Verify Before You Apply.
                    </h1>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      Check job offers, identify recruitment scams, and make safer career decisions.
                    </p>
                  </div>
                  <JobAnalyzerForm
                    user={user}
                    onRequireAuth={handleRequireAuth}
                    onAnalysisComplete={(dossier) => {
                      setCurrentDossier(dossier);
                      setAlertError(null);
                    }}
                    onError={(err) => setAlertError(err)}
                  />
                </div>
              )
            }
          />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route
            path="/history"
            element={
              <ScanHistoryView
                user={user}
                onSelectScan={(dossier) => {
                  setCurrentDossier(dossier);
                  navigate('/');
                }}
                onOpenAuth={handleOpenAuth}
              />
            }
          />
          <Route
            path="/analytics"
            element={
              <UserAnalyticsView
                currentUser={user}
                onOpenAuth={handleOpenAuth}
                onSelectScan={(dossier) => {
                  setCurrentDossier(dossier);
                  navigate('/');
                }}
              />
            }
          />
          <Route
            path="/account"
            element={
              <MyAccountView
                currentUser={user}
                onUserUpdate={(updated) => setUser(updated)}
                onOpenAuth={handleOpenAuth}
              />
            }
          />
          <Route path="/intelligence" element={<ScamIntelligenceView />} />
          <Route path="/models" element={<ModelPerformanceView />} />
          <Route path="/admin" element={<AdminDashboardView currentUser={user} />} />
          <Route
            path="/admin/login"
            element={
              <AdminLoginView
                currentUser={user}
                onAdminLoginSuccess={(adminUser, token) => handleAuthSuccess(adminUser, token)}
              />
            }
          />
          <Route path="/about" element={<AboutView />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </main>

      <Footer />

      {/* Navigation Sidebar Drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      {/* Cookie Consent Banner */}
      <CookieBanner />

      {/* Visual Theme Picker Modal */}
      <ThemeModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />

      {/* Auth Modal with mandatory CAPTCHA on both login and register */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
