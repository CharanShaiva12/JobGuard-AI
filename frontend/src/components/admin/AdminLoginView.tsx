/**
 * JobGuard AI - Administrator Secure Portal & First-Login Password Change
 * Module: frontend.src.components.admin.AdminLoginView
 * Purpose: Dedicated administrative authentication gateway with CAPTCHA verification
 *          and mandatory password rotation for auto-provisioned credentials.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { CaptchaData, User } from '../../types';
import { CaptchaBox } from '../common/CaptchaBox';

interface AdminLoginViewProps {
  currentUser: User | null;
  onAdminLoginSuccess: (adminUser: User, token: string) => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  currentUser,
  onAdminLoginSuccess,
}) => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaSolution, setCaptchaSolution] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password reset stage if must_change_password is true
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeAdminUser, setActiveAdminUser] = useState<User | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'admin' && !currentUser.must_change_password) {
      navigate('/admin');
    }
  }, [currentUser, navigate]);

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    setCaptchaSolution('');
    try {
      const data = await api.getCaptcha('login');
      setCaptcha(data);
    } catch (err: any) {
      console.warn('Failed to load CAPTCHA for admin portal:', err.message);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!captcha || !captchaSolution.trim()) {
      setError('Please complete the administrative CAPTCHA challenge.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.adminLogin({
        identifier,
        password,
        captchaId: captcha.id,
        captchaSolution,
      });

      if (res.mustChangePassword || res.user.must_change_password) {
        setMustResetPassword(true);
        setActiveAdminUser(res.user);
        setSuccessMsg('Initial temporary credentials authenticated. Password change required.');
      } else {
        setSuccessMsg('Administrator session verified. Redirecting to console...');
        onAdminLoginSuccess(res.user, res.token);
        setTimeout(() => navigate('/admin'), 600);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Administrative authentication failed.');
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Administrative password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({ newPassword });
      setSuccessMsg('Permanent administrative password configured successfully! Redirecting...');
      if (activeAdminUser) {
        const updatedAdmin: User = { ...activeAdminUser, must_change_password: 0 };
        onAdminLoginSuccess(updatedAdmin, '');
      }
      setTimeout(() => navigate('/admin'), 800);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update administrative password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-3xl shadow-xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto border border-[var(--border-subtle)]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Administrator Gateway
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Authorized personnel only. Sessions are audited and monitored.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-[#D70015]/10 border border-[#D70015]/30 rounded-xl text-xs text-[#D70015] font-medium">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-[#34C759]/10 border border-[#34C759]/30 rounded-xl text-xs text-[#34C759] font-medium">
          {successMsg}
        </div>
      )}

      {!mustResetPassword ? (
        /* Login Form */
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Admin Identifier (Username or Email)
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="admin"
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] font-mono"
            />
          </div>

          <CaptchaBox
            captcha={captcha}
            solution={captchaSolution}
            onSolutionChange={setCaptchaSolution}
            onRefresh={loadCaptcha}
            loading={captchaLoading}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating Administrator...' : 'Sign In to Command Center'}
          </button>
        </form>
      ) : (
        /* Forced First-Time Password Reset Form */
        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400">
            <strong>Action Required:</strong> You are using temporary auto-provisioned credentials. You must set a permanent administrative password before proceeding.
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              New Permanent Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Re-enter password"
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Setting Permanent Password...' : 'Save Password & Enter Console'}
          </button>
        </form>
      )}
    </div>
  );
};
