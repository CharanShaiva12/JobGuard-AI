import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CaptchaData, User } from '../../types';
import { CaptchaBox } from '../common/CaptchaBox';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');

  // Profile-specific fields (Phase 3)
  const [accountType, setAccountType] = useState<'student' | 'job_seeker'>('job_seeker');
  const [collegeUniversity, setCollegeUniversity] = useState('');
  const [courseDegree, setCourseDegree] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [highestQualification, setHighestQualification] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Entry-level');
  const [preferredJobRole, setPreferredJobRole] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');

  // CAPTCHA State (enforced on BOTH registration and login)
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaSolution, setCaptchaSolution] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode, isOpen]);

  // Load CAPTCHA challenge whenever modal opens or mode switches
  const loadCaptcha = async (action: 'login' | 'register') => {
    setCaptchaLoading(true);
    setCaptchaSolution('');
    try {
      const data = await api.getCaptcha(action);
      setCaptcha(data);
    } catch (err: any) {
      console.warn('Failed to load CAPTCHA:', err.message);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCaptcha(mode);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!captcha || !captchaSolution.trim()) {
      setError('Please solve the security CAPTCHA verification challenge.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await api.register({
          username,
          email,
          password,
          fullName,
          organization,
          accountType,
          collegeUniversity: accountType === 'student' ? collegeUniversity : undefined,
          courseDegree: accountType === 'student' ? courseDegree : undefined,
          graduationYear: accountType === 'student' && graduationYear ? parseInt(graduationYear, 10) : undefined,
          highestQualification: accountType === 'job_seeker' ? highestQualification : undefined,
          experienceLevel: accountType === 'job_seeker' ? experienceLevel : undefined,
          preferredJobRole,
          preferredLocation,
          captchaId: captcha.id,
          captchaSolution,
        });
        setSuccessMsg('Account registered successfully! Logging you in...');
        setTimeout(() => {
          onSuccess(res.user, res.token);
          onClose();
        }, 600);
      } else {
        const res = await api.login({
          identifier: username || email,
          password,
          captchaId: captcha.id,
          captchaSolution,
        });
        setSuccessMsg('Signed in successfully.');
        setTimeout(() => {
          onSuccess(res.user, res.token);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Authentication failed. Please verify your credentials.'
      );
      loadCaptcha(mode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] rounded-2xl shadow-xl border border-[var(--border-subtle)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] shrink-0">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'login'
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'register'
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Register
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <h2 id="auth-modal-title" className="text-base font-bold text-[var(--text-primary)]">
              {mode === 'login' ? 'Welcome Back' : 'Create Your JobGuard Account'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {mode === 'login'
                ? 'Sign in to access your forensic scanning dossier and personal threat analytics.'
                : 'Protect your internship and job applications with explainable AI fraud detection.'}
            </p>
          </div>

          {/* Feedback Alerts */}
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

          {/* Registration Extra Fields */}
          {mode === 'register' && (
            <>
              {/* Account Type Selector (Phase 3) */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  I am a:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('student')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      accountType === 'student'
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                    }`}
                  >
                    🎓 Student / Intern
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('job_seeker')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      accountType === 'job_seeker'
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                    }`}
                  >
                    💼 Job Seeker / Professional
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Taylor"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Target Role / Title
                  </label>
                  <input
                    type="text"
                    value={preferredJobRole}
                    onChange={(e) => setPreferredJobRole(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Student Tailored Fields */}
              {accountType === 'student' && (
                <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] space-y-2.5">
                  <span className="text-[11px] font-bold text-[var(--accent-primary)] block">
                    Student / Academic Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        College / University
                      </label>
                      <input
                        type="text"
                        value={collegeUniversity}
                        onChange={(e) => setCollegeUniversity(e.target.value)}
                        placeholder="e.g. Stanford University"
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Course / Major
                      </label>
                      <input
                        type="text"
                        value={courseDegree}
                        onChange={(e) => setCourseDegree(e.target.value)}
                        placeholder="e.g. B.S. Computer Science"
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                      Expected Graduation Year
                    </label>
                    <input
                      type="number"
                      min={2020}
                      max={2035}
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              )}

              {/* Job Seeker Tailored Fields */}
              {accountType === 'job_seeker' && (
                <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] space-y-2.5">
                  <span className="text-[11px] font-bold text-[var(--accent-primary)] block">
                    Professional Background
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Highest Qualification
                      </label>
                      <input
                        type="text"
                        value={highestQualification}
                        onChange={(e) => setHighestQualification(e.target.value)}
                        placeholder="e.g. Bachelor's / Master's"
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Experience Level
                      </label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                      >
                        <option value="Entry-level">Entry-level (0-2 yrs)</option>
                        <option value="Mid-level">Mid-level (3-5 yrs)</option>
                        <option value="Senior">Senior (6+ yrs)</option>
                        <option value="Executive">Executive / Director</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Organization / University
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Current University / Company"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Preferred Location
                  </label>
                  <input
                    type="text"
                    value={preferredLocation}
                    onChange={(e) => setPreferredLocation(e.target.value)}
                    placeholder="e.g. Remote / New York"
                    className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </>
          )}

          {/* Identifier / Username */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {mode === 'login' ? 'Username or Email' : 'Username'}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={mode === 'login' ? 'Your username or email' : 'Choose a unique username'}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* CAPTCHA Enforcement (Active on BOTH login and register) */}
          <CaptchaBox
            captcha={captcha}
            solution={captchaSolution}
            onSolutionChange={setCaptchaSolution}
            onRefresh={() => loadCaptcha(mode)}
            loading={captchaLoading}
          />

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-sm"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span>{mode === 'login' ? 'Sign In' : 'Complete Registration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
