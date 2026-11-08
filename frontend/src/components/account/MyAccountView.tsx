/**
 * JobGuard AI - My Account & Profile Management View
 * Module: frontend.src.components.account.MyAccountView
 * Features:
 *   - Student and Job Seeker profile personalization
 *   - Academic background & target recruitment roles
 *   - Password change and security credential management
 *   - Real-time profile synchronization with MySQL database
 */

import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';

interface MyAccountViewProps {
  currentUser: User | null;
  onUserUpdate: (updatedUser: User) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const MyAccountView: React.FC<MyAccountViewProps> = ({
  currentUser,
  onUserUpdate,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form state
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [organization, setOrganization] = useState(currentUser?.organization || '');
  const [accountType, setAccountType] = useState<'student' | 'job_seeker'>(
    currentUser?.account_type || 'job_seeker'
  );
  const [collegeUniversity, setCollegeUniversity] = useState(currentUser?.college_university || '');
  const [courseDegree, setCourseDegree] = useState(currentUser?.course_degree || '');
  const [graduationYear, setGraduationYear] = useState(
    currentUser?.graduation_year ? String(currentUser.graduation_year) : ''
  );
  const [highestQualification, setHighestQualification] = useState(currentUser?.highest_qualification || '');
  const [experienceLevel, setExperienceLevel] = useState(currentUser?.experience_level || 'Entry-level');
  const [preferredJobRole, setPreferredJobRole] = useState(currentUser?.preferred_job_role || '');
  const [preferredLocation, setPreferredLocation] = useState(currentUser?.preferred_location || '');

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setOrganization(currentUser.organization || '');
      setAccountType(currentUser.account_type || 'job_seeker');
      setCollegeUniversity(currentUser.college_university || '');
      setCourseDegree(currentUser.course_degree || '');
      setGraduationYear(currentUser.graduation_year ? String(currentUser.graduation_year) : '');
      setHighestQualification(currentUser.highest_qualification || '');
      setExperienceLevel(currentUser.experience_level || 'Entry-level');
      setPreferredJobRole(currentUser.preferred_job_role || '');
      setPreferredLocation(currentUser.preferred_location || '');
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-8 text-center max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Account Access Required
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Sign in to manage your student or job seeker profile, save recruitment preferences, and review your scan security history.
        </p>
        <button
          type="button"
          onClick={() => onOpenAuth('login')}
          className="px-5 py-2 text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateProfile({
        full_name: fullName,
        organization,
        account_type: accountType,
        college_university: accountType === 'student' ? collegeUniversity : undefined,
        course_degree: accountType === 'student' ? courseDegree : undefined,
        graduation_year: accountType === 'student' && graduationYear ? parseInt(graduationYear, 10) : undefined,
        highest_qualification: accountType === 'job_seeker' ? highestQualification : undefined,
        experience_level: accountType === 'job_seeker' ? experienceLevel : undefined,
        preferred_job_role: preferredJobRole,
        preferred_location: preferredLocation,
      });
      onUserUpdate(updated);
      localStorage.setItem('jobguard_user', JSON.stringify(updated));
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Password updated successfully.' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to update password.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Banner */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold text-xl flex items-center justify-center border border-[var(--border-subtle)]">
            {currentUser.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {currentUser.full_name || currentUser.username}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[var(--bg-canvas)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {currentUser.email} • Registered {new Date(currentUser.created_at || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-xl border ${
              accountType === 'student'
                ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
            }`}
          >
            {accountType === 'student' ? '🎓 Student / Intern' : '💼 Job Seeker'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[var(--border-subtle)] pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('profile');
            setMessage(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
            activeTab === 'profile'
              ? 'bg-[var(--accent-primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Profile Information
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('security');
            setMessage(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
            activeTab === 'security'
              ? 'bg-[var(--accent-primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Security &amp; Password
        </button>
      </div>

      {/* Notification Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border ${
            message.type === 'success'
              ? 'bg-[#34C759]/10 border-[#34C759]/30 text-[#34C759]'
              : 'bg-[#D70015]/10 border-[#D70015]/30 text-[#D70015]'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
              Account Category
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Tailors fraud detection heuristics towards internship scams or professional recruitment channels.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setAccountType('student')}
                className={`py-2.5 px-4 text-xs font-semibold rounded-xl border text-center transition-all ${
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
                className={`py-2.5 px-4 text-xs font-semibold rounded-xl border text-center transition-all ${
                  accountType === 'job_seeker'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                }`}
              >
                💼 Job Seeker / Professional
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Current Organization / Employer (Optional)
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>

          {/* Student Specific Section */}
          {accountType === 'student' && (
            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-3">
              <h3 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider">
                Academic Background
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    College / University Name
                  </label>
                  <input
                    type="text"
                    value={collegeUniversity}
                    onChange={(e) => setCollegeUniversity(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Graduation Year
                  </label>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    placeholder="2026"
                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Degree / Program / Major
                </label>
                <input
                  type="text"
                  value={courseDegree}
                  onChange={(e) => setCourseDegree(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science"
                  className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>
          )}

          {/* Job Seeker Specific Section */}
          {accountType === 'job_seeker' && (
            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] space-y-3">
              <h3 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider">
                Professional Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Highest Educational Qualification
                  </label>
                  <input
                    type="text"
                    value={highestQualification}
                    onChange={(e) => setHighestQualification(e.target.value)}
                    placeholder="e.g. Master's in Data Science"
                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Career Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  >
                    <option value="Entry-level">Entry-level (0-2 years)</option>
                    <option value="Mid-level">Mid-level (3-5 years)</option>
                    <option value="Senior">Senior (6+ years)</option>
                    <option value="Executive">Executive / Director</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Target Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Target Role / Dream Job Title
              </label>
              <input
                type="text"
                value={preferredJobRole}
                onChange={(e) => setPreferredJobRole(e.target.value)}
                placeholder="e.g. AI Research Intern, Software Engineer"
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Preferred Job Location
              </label>
              <input
                type="text"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                placeholder="e.g. Remote, New York, London, Bengaluru"
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <form onSubmit={handlePasswordSubmit} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4 max-w-xl">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
              Change Password
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Ensure your account uses a strong, unique password of at least 8 characters.
            </p>
          </div>

          {!currentUser.must_change_password && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              New Password
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
              placeholder="Re-enter new password"
              className="w-full px-3.5 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
