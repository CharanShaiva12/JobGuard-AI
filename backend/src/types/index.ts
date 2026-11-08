/**
 * JobGuard AI - Core Domain Types & Interfaces
 * Module: backend.src.types
 */

export type UserRole = 'user' | 'analyst' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  organization: string;
  role: UserRole;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

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
  publicSourceFindings?: any[];
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
  inputType: string;
  createdAt: Date;
}

export interface CaptchaChallenge {
  id: string;
  solutionHash: string;
  action: 'register' | 'login' | 'scan';
  ipAddress: string;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
}
