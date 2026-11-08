/**
 * JobGuard AI - Administrator Management & Model Lifecycle View
 * Module: frontend.src.components.admin.AdminDashboardView
 * Features:
 *   - Real-time aggregate telemetry (Total Users, Scans, High Risk Volume, Feedback)
 *   - User account status management (active/inactive toggle, role change)
 *   - Immutable security audit log viewer
 *   - Governed Model Improvement & Retraining (Candidate training, evaluation, promotion, rollback)
 *   - Secure admin bootstrap trigger for initial platform provisioning
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';

interface AdminDashboardViewProps {
  currentUser: User | null;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ currentUser }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [modelLifecycle, setModelLifecycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'models'>('overview');
  const [bootstrapSuccess, setBootstrapSuccess] = useState<string | null>(null);

  // Model action states
  const [modelLoading, setModelLoading] = useState(false);
  const [modelMsg, setModelMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [evalResults, setEvalResults] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, u, l, ml] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.getAdminUsers().catch(() => []),
        api.getAdminLogs().catch(() => []),
        api.getModelLifecycle().catch(() => null),
      ]);
      setMetrics(m);
      setUsers(u);
      setLogs(l);
      setModelLifecycle(ml);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.is_active === 1 ? false : true;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} account ${user.username}?`)) {
      return;
    }
    try {
      await api.updateUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus ? 1 : 0 } : u))
      );
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleBootstrapAdmin = async () => {
    try {
      await api.bootstrapAdmin();
      setBootstrapSuccess('Administrator privileges initialized. Please sign out and sign back in to refresh token permissions.');
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Bootstrap failed.');
    }
  };

  const handleRetrainCandidate = async () => {
    setModelLoading(true);
    setModelMsg(null);
    setEvalResults(null);
    try {
      const res = await api.retrainCandidateModel();
      setModelMsg({ text: res.message || 'Candidate model retrained successfully.' });
      setEvalResults(res.evaluation);
      const updated = await api.getModelLifecycle();
      setModelLifecycle(updated);
    } catch (err: any) {
      setModelMsg({ text: err.response?.data?.error || err.message || 'Retraining failed.', isError: true });
    } finally {
      setModelLoading(false);
    }
  };

  const handlePromoteCandidate = async () => {
    if (!window.confirm('Promote candidate model to production? Existing production model will be backed up for rollback.')) {
      return;
    }
    setModelLoading(true);
    setModelMsg(null);
    try {
      const res = await api.promoteCandidateModel();
      setModelMsg({ text: res.message || 'Model promoted to production successfully!' });
      const updated = await api.getModelLifecycle();
      setModelLifecycle(updated);
    } catch (err: any) {
      setModelMsg({ text: err.response?.data?.error || err.message || 'Promotion failed.', isError: true });
    } finally {
      setModelLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!window.confirm('Rollback to previous production model artifact?')) {
      return;
    }
    setModelLoading(true);
    setModelMsg(null);
    try {
      const res = await api.rollbackModel();
      setModelMsg({ text: res.message || 'Rollback complete. Previous model restored.' });
      const updated = await api.getModelLifecycle();
      setModelLifecycle(updated);
    } catch (err: any) {
      setModelMsg({ text: err.response?.data?.error || err.message || 'Rollback failed.', isError: true });
    } finally {
      setModelLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-3xl border border-[var(--border-strong)] p-12 text-center max-w-lg mx-auto space-y-4">
        <h2 className="text-base font-bold">Administrator Access Required</h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Please sign in with administrator credentials to view platform surveillance and account controls.
        </p>
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-3xl border border-[var(--border-strong)] p-12 text-center max-w-lg mx-auto space-y-4">
        <h2 className="text-base font-bold">Standard Account Detected</h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Your account is currently assigned the <span className="font-semibold">{currentUser.role}</span> role.
          If this is a fresh setup and no administrator exists yet, you may initialize platform admin rights below.
        </p>

        {bootstrapSuccess ? (
          <div className="p-4 bg-[#34C759]/10 border border-[#34C759]/30 rounded-xl text-xs text-[#34C759] font-medium">
            ✓ {bootstrapSuccess}
          </div>
        ) : (
          <button
            onClick={handleBootstrapAdmin}
            className="px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            Claim Administrator Rights (First Time Setup)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Administration &amp; Model Governance
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            System metrics, user registries, audit trails, and governed machine learning lifecycles.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1 bg-[var(--bg-canvas)] p-1 rounded-xl border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'overview' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-secondary)]'
            }`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'users' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-secondary)]'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'models' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-secondary)]'
            }`}
          >
            Model Lifecycle
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'logs' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-secondary)]'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)]" />
          ))}
        </div>
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-xs">
              <div className="text-xs font-medium text-[var(--text-tertiary)]">Registered Users</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{metrics?.users?.total || 0}</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">Active: {metrics?.users?.active || 0}</div>
            </div>

            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-xs">
              <div className="text-xs font-medium text-[var(--text-tertiary)]">Total Scans Run</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{metrics?.scans?.total || 0}</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">Avg Score: {metrics?.scans?.averageScore || 0}/100</div>
            </div>

            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-xs">
              <div className="text-xs font-medium text-[#D70015]">High Risk Scams</div>
              <div className="text-2xl font-bold text-[#D70015] mt-2">{metrics?.scans?.highRisk || 0}</div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Confirmed threats</div>
            </div>

            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-xs">
              <div className="text-xs font-medium text-[var(--accent-primary)]">User Feedback Logs</div>
              <div className="text-2xl font-bold text-[var(--accent-primary)] mt-2">{metrics?.feedback?.total || 0}</div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Correct: {metrics?.feedback?.correct || 0}</div>
            </div>
          </div>
        </div>
      ) : activeTab === 'models' ? (
        <div className="space-y-6">
          {modelMsg && (
            <div className={`p-4 rounded-2xl text-xs font-medium ${modelMsg.isError ? 'bg-[#D70015]/10 border border-[#D70015]/30 text-[#D70015]' : 'bg-[#34C759]/10 border border-[#34C759]/30 text-[#34C759]'}`}>
              {modelMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Production Model Status */}
            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Production Model Artifact
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/30">
                  Live in Production
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div><span className="text-[var(--text-tertiary)]">Version:</span> <span className="font-semibold">{modelLifecycle?.currentModel?.version || '1.0.0'}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Algorithm:</span> <span className="font-semibold">{modelLifecycle?.currentModel?.model_type || 'LogisticRegression + TF-IDF'}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Training Baseline:</span> <span className="font-semibold">{modelLifecycle?.currentModel?.dataset || 'EMSCAD Baseline'}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Promoted:</span> <span className="font-semibold">{modelLifecycle?.currentModel?.promoted_at || 'Initial Deployment'}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Rollback Backup:</span> <span className="font-semibold">{modelLifecycle?.currentModel?.has_backup ? 'Available' : 'None'}</span></div>
              </div>

              {modelLifecycle?.currentModel?.has_backup && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRollback}
                    disabled={modelLoading}
                    className="px-4 py-2 text-xs font-bold text-[#D70015] bg-[#D70015]/10 hover:bg-[#D70015]/20 border border-[#D70015]/30 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Rollback to Previous Backup
                  </button>
                </div>
              )}
            </div>

            {/* Governed Feedback Learning & Retraining Controls */}
            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Feedback Pool &amp; Retraining
              </h3>

              <div className="space-y-2 text-xs">
                <div><span className="text-[var(--text-tertiary)]">Total Submissions:</span> <span className="font-semibold">{modelLifecycle?.feedbackStats?.total || 0}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Human-Verified Samples:</span> <span className="font-semibold">{modelLifecycle?.feedbackStats?.verified || 0}</span></div>
                <div><span className="text-[var(--text-tertiary)]">Pending Audit:</span> <span className="font-semibold">{modelLifecycle?.feedbackStats?.pending || 0}</span></div>
                <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed pt-1">
                  Policy: Unverified feedback is never applied directly to production. Retraining produces an evaluated candidate model with safe gating and rollback protection.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRetrainCandidate}
                  disabled={modelLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {modelLoading ? 'Processing...' : 'Train Candidate Model'}
                </button>

                {modelLifecycle?.candidateAvailable && (
                  <button
                    type="button"
                    onClick={handlePromoteCandidate}
                    disabled={modelLoading}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#34C759] hover:bg-[#2EB04E] rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    Promote Candidate to Production
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Benchmark Results Display */}
          {evalResults && (
            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Candidate Holdout Evaluation Benchmark
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] text-center">
                  <div className="text-[11px] text-[var(--text-tertiary)]">Accuracy</div>
                  <div className="text-lg font-bold">{evalResults.accuracy}</div>
                </div>
                <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] text-center">
                  <div className="text-[11px] text-[var(--text-tertiary)]">Precision</div>
                  <div className="text-lg font-bold">{evalResults.precision}</div>
                </div>
                <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] text-center">
                  <div className="text-[11px] text-[var(--text-tertiary)]">Recall</div>
                  <div className="text-lg font-bold">{evalResults.recall}</div>
                </div>
                <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] text-center">
                  <div className="text-[11px] text-[var(--text-tertiary)]">F1-Score</div>
                  <div className="text-lg font-bold text-[var(--accent-primary)]">{evalResults.f1_score}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'users' ? (
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                      {u.username}
                      {u.full_name && <span className="block text-[11px] font-normal text-[var(--text-tertiary)]">{u.full_name}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.is_active === 1 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#D70015]/10 text-[#D70015]'
                        }`}
                      >
                        {u.is_active === 1 ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-tertiary)]">
                      {new Date(u.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            u.is_active === 1
                              ? 'border-[#D70015]/30 text-[#D70015] hover:bg-[#D70015]/10'
                              : 'border-[#34C759]/30 text-[#34C759] hover:bg-[#34C759]/10'
                          }`}
                        >
                          {u.is_active === 1 ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-strong)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">User ID</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--text-tertiary)]">
                      No security audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                      <td className="py-3 px-4 text-[var(--text-tertiary)] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--accent-primary)]">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{log.user_id ?? 'System'}</td>
                      <td className="py-3 px-4 text-[var(--text-tertiary)] font-mono">{log.ip_address || '—'}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] truncate max-w-xs">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
