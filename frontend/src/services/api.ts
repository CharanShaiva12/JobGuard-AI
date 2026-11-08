/**
 * JobGuard AI - API Client Service
 * Module: frontend.src.services.api
 * Purpose: Centralized Axios client managing secure HTTP-only cookie sessions,
 *          multi-mode scans, report exports, admin controls, and user preferences.
 */

import axios from 'axios';
import {
  ScanDossier,
  User,
  CaptchaData,
  UserPreferences,
  SystemStatusReport,
} from '../types';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Automatically transmits HTTP-only session cookie
});

// Response interceptor to handle session expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('jobguard_user');
      localStorage.removeItem('jobguard_token');
    }
    return Promise.reject(error);
  }
);

// ------------------------------------------------------------------------------
// API Service Methods
// ------------------------------------------------------------------------------
export const api = {
  // System Telemetry & Component Status
  async getSystemStatus(): Promise<SystemStatusReport> {
    const res = await apiClient.get<{ success: boolean; data: SystemStatusReport }>('/system/status');
    return res.data.data;
  },

  // CAPTCHA
  async getCaptcha(action: 'register' | 'login' | 'scan' = 'login'): Promise<CaptchaData> {
    const res = await apiClient.get<{ success: boolean; data: CaptchaData }>(`/captcha/generate?action=${action}`);
    return res.data.data;
  },

  // Authentication
  async register(payload: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    organization?: string;
    accountType?: 'student' | 'job_seeker';
    collegeUniversity?: string;
    courseDegree?: string;
    graduationYear?: number;
    highestQualification?: string;
    experienceLevel?: string;
    preferredJobRole?: string;
    preferredLocation?: string;
    captchaId: string;
    captchaSolution: string;
  }): Promise<{ user: User; token: string }> {
    const res = await apiClient.post('/auth/register', payload);
    return res.data.data;
  },

  async login(payload: {
    identifier: string;
    password: string;
    captchaId: string;
    captchaSolution: string;
  }): Promise<{ user: User; token: string; mustChangePassword?: boolean }> {
    const res = await apiClient.post('/auth/login', payload);
    return res.data.data;
  },

  async adminLogin(payload: {
    identifier: string;
    password: string;
    captchaId: string;
    captchaSolution: string;
  }): Promise<{ user: User; token: string; mustChangePassword?: boolean }> {
    const res = await apiClient.post('/auth/admin-login', payload);
    return res.data.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('jobguard_user');
      localStorage.removeItem('jobguard_token');
    }
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get('/auth/me');
    return res.data.data.user;
  },

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const res = await apiClient.put('/auth/profile', profileData);
    return res.data.data.user;
  },

  async changePassword(payload: {
    currentPassword?: string;
    newPassword: string;
  }): Promise<void> {
    await apiClient.post('/auth/change-password', payload);
  },

  // Independent Scan & Analysis Methods
  async analyzeJob(payload: {
    jobTitle?: string;
    companyName?: string;
    recruiterName?: string;
    jobLocation?: string;
    jobDescription?: string;
    applicationUrl?: string | null;
    requirements?: string;
    benefits?: string;
    inputType?: string;
  }): Promise<ScanDossier> {
    const res = await apiClient.post('/scan', payload);
    return res.data.data;
  },

  async analyzeUrl(url: string): Promise<ScanDossier> {
    const res = await apiClient.post('/scan/url', { url });
    return res.data.data;
  },

  async verifyCompany(companyName: string): Promise<ScanDossier> {
    const res = await apiClient.post('/scan/company', { companyName });
    return res.data.data;
  },

  async uploadAndAnalyze(formData: FormData): Promise<ScanDossier> {
    const res = await apiClient.post('/scan/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  // Scan History
  async getScanHistory(params?: {
    riskLevel?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ scans: any[]; total: number }> {
    const res = await apiClient.get('/scan/history', { params });
    return {
      scans: res.data.data || [],
      total: res.data.pagination?.total || 0,
    };
  },

  async getScanById(id: string): Promise<ScanDossier> {
    const res = await apiClient.get(`/scan/${id}`);
    return res.data.data;
  },

  async deleteScan(id: string): Promise<void> {
    await apiClient.delete(`/scan/${id}`);
  },

  // User Personal Scan Analytics (Priority 16)
  async getUserAnalytics(): Promise<any> {
    const res = await apiClient.get('/scan/analytics');
    return res.data.data;
  },

  // Report Downloads
  async downloadPdf(id: string): Promise<Blob> {
    const res = await apiClient.get(`/scan/${id}/export/pdf`, { responseType: 'blob' });
    return res.data;
  },

  async downloadDocx(id: string): Promise<Blob> {
    const res = await apiClient.get(`/scan/${id}/export/docx`, { responseType: 'blob' });
    return res.data;
  },

  // Feedback
  async submitFeedback(payload: { scanId: string; feedbackType: string; comments?: string }): Promise<void> {
    await apiClient.post('/feedback', payload);
  },

  // Preferences & Personalization
  async getUserPreferences(): Promise<UserPreferences> {
    const res = await apiClient.get('/user/preferences');
    return res.data.data;
  },

  async updateUserPreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const res = await apiClient.put('/user/preferences', prefs);
    return res.data.data;
  },

  // Dashboard & Telemetry
  async getDashboardStats(): Promise<any> {
    const res = await apiClient.get('/dashboard/stats');
    return res.data.data;
  },

  async getHealth(): Promise<any> {
    const res = await apiClient.get('/dashboard/health');
    return res.data;
  },

  // Threat Intelligence Data
  async getThreatIntelStats(): Promise<any> {
    const res = await apiClient.get('/dashboard/intelligence');
    return res.data.data;
  },

  // Administration
  async getAdminUsers(): Promise<User[]> {
    const res = await apiClient.get('/admin/users');
    return res.data.data;
  },

  async getAdminMetrics(): Promise<any> {
    const res = await apiClient.get('/admin/metrics');
    return res.data.data;
  },

  async getAdminLogs(): Promise<any[]> {
    const res = await apiClient.get('/admin/logs');
    return res.data.data;
  },

  async updateUserStatus(userId: number, isActive: boolean, role?: string): Promise<void> {
    await apiClient.patch(`/admin/users/${userId}`, { isActive, role });
  },

  async bootstrapAdmin(): Promise<void> {
    await apiClient.post('/admin/bootstrap');
  },

  // Model Evaluation Benchmark Metrics (Priority 15)
  async getModelEvaluation(): Promise<any> {
    const res = await apiClient.get('/admin/models/evaluation');
    return res.data.data;
  },

  // Governed Model Lifecycle & Retraining
  async getModelLifecycle(): Promise<any> {
    const res = await apiClient.get('/admin/model-lifecycle');
    return res.data.data;
  },

  async verifyFeedback(feedbackId: string, verifiedLabel: number): Promise<void> {
    await apiClient.post(`/admin/feedback/${feedbackId}/verify`, { verifiedLabel });
  },

  async retrainCandidateModel(): Promise<any> {
    const res = await apiClient.post('/admin/model-lifecycle/retrain');
    return res.data;
  },

  async promoteCandidateModel(): Promise<any> {
    const res = await apiClient.post('/admin/model-lifecycle/promote');
    return res.data;
  },

  async rollbackModel(): Promise<any> {
    const res = await apiClient.post('/admin/model-lifecycle/rollback');
    return res.data;
  },
};
