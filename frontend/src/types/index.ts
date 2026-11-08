/**
 * JobGuard AI - Frontend Domain Interfaces
 * Module: frontend.src.types
 */

export type RiskLevel = 'Low Risk' | 'Moderate Risk' | 'High Risk';

export type VerificationStatus =
  | 'VERIFIED WITH SOURCE EVIDENCE'
  | 'VERIFIED'
  | 'NOT FOUND'
  | 'CLOSED'
  | 'EXPIRED'
  | 'MISMATCH'
  | 'UNABLE TO VERIFY'
  | 'DATE UNAVAILABLE'
  | 'NO MATCHING PUBLIC RESULT';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  organization?: string;
  role: 'user' | 'analyst' | 'admin';
  is_active?: number;
  created_at?: string;
  account_type?: 'student' | 'job_seeker';
  college_university?: string;
  course_degree?: string;
  graduation_year?: number;
  highest_qualification?: string;
  experience_level?: string;
  preferred_job_role?: string;
  preferred_location?: string;
  must_change_password?: number;
}

export interface ComponentStatus {
  name: string;
  status: 'Available' | 'Offline' | 'Unavailable' | 'Not Configured';
  details: string;
}

export interface SystemStatusReport {
  mode: 'auto' | 'online' | 'offline';
  timestamp: string;
  components: {
    localMl: ComponentStatus;
    database: ComponentStatus;
    ocr: ComponentStatus;
    gemini: ComponentStatus;
    liveVerification: ComponentStatus;
  };
}

export interface MatchedRule {
  id: string;
  category: string;
  phrase: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  weight: number;
  explanation: string;
}

export interface ExtractedEntities {
  companyNames: string[];
  jobTitles: string[];
  locations: string[];
  jobIds: string[];
  salaryClaims: string[];
  contactEmails: string[];
  contactPhones: string[];
  messagingHandles: string[];
  urls: string[];
  suspiciousKeywords: string[];
}

export interface PublicSourceFinding {
  searchQuery: string;
  resultTitle: string;
  sourceUrl: string;
  sourceDomain: string;
  retrievedSnippet: string;
  publicationDate: string;
  retrievalTimestamp: string;
  relevanceExplanation: string;
  verificationStatus: VerificationStatus;
}

export interface RiskBreakdown {
  compositeScore: number;
  riskLevel: RiskLevel;
  formula: string;
  weights: {
    heuristicRules: number;
    textMLModel: number;
    urlPhishingModel: number;
    geminiReasoning: number;
  };
  components: {
    heuristicSubscore: number;
    textMLSubscore: number;
    urlSubscore: number | null;
    geminiSubscore: number | null;
  };
  overridesApplied: string[];
  hasAdvanceFeeOverride?: boolean;
  publicSourceFindings?: PublicSourceFinding[];
  groundingStatusReason?: string;
  isGroundedSearchExecuted?: boolean;
}

export interface ScanDossier {
  id: string;
  userId: number | null;
  jobTitle: string;
  claimedEmployer?: string;
  companyName: string;
  jobDescription: string;
  applicationUrl: string | null;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  mlProbability: number;
  urlProbability: number | null;
  heuristicScore: number;
  geminiScore: number | null;
  companyVerificationStatus: VerificationStatus;
  vacancyVerificationStatus: VerificationStatus;
  recruitmentStatus: string;
  officialDomain: string;
  careersSource: string;
  riskBreakdown: RiskBreakdown;
  matchedRules: MatchedRule[];
  extractedEntities: ExtractedEntities;
  urlIndicators: string[] | null;
  geminiReasoning: string | null;
  assessmentSummary?: string;
  positiveIndicators?: string[];
  potentialConcerns?: string[];
  officialWebsite?: string;
  careersUrl?: string;
  groundingStatusReason?: string;
  isGroundedSearchExecuted?: boolean;
  actionableAdvice: string;
  inputType: 'url' | 'text' | 'company' | 'document' | string;
  createdAt: string;
}

export interface CaptchaData {
  id: string;
  question: string;
  svgImage: string;
  expiresInSeconds: number;
}

export type ThemeName =
  | 'royal_blue_cream'
  | 'cyan_ash_steel'
  | 'vista_blue_oxford'
  | 'forest_leaf'
  | 'electric_mint_carbon'
  | 'wine_red_sand'
  | 'cherry_alabaster'
  | 'midnight_indigo_vanilla'
  | 'warm_neutral_light'
  | 'carbon_slate_dark';

export type ColorMode = 'light' | 'dark' | 'system';

export type CookieConsentType = 'all' | 'necessary_only' | 'custom' | 'undecided';

export interface UserPreferences {
  theme: ThemeName;
  colorMode: ColorMode;
  cookieConsent: CookieConsentType;
  cookiePreferences: {
    analytics: boolean;
    functional: boolean;
    performance: boolean;
  };
}
