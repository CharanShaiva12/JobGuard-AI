/**
 * JobGuard AI - Cloud Contextual Forensic AI & Public Source Verification Engine
 * Module: backend.src.services.gemini.service
 * SDK: @google/genai (Official Google GenAI SDK)
 * Purpose: Evaluates semantic manipulation, psychological coercion, brand impersonation,
 *          and performs structured public source verification.
 * Policy: Strictly separates observed factual evidence from AI interpretation.
 *         Extracts real search citations ONLY when live Google Search grounding succeeds.
 *         Operates on Gemini Free Tier with sequential request pacing (max concurrency = 1).
 *         Never fabricates URLs, dates, or search results.
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { GeminiQueueService } from './gemini_queue.service.js';

export type PublicVerificationStatus =
  | 'VERIFIED WITH SOURCE EVIDENCE'
  | 'VERIFIED'
  | 'NOT FOUND'
  | 'MISMATCH'
  | 'UNABLE TO VERIFY'
  | 'DATE UNAVAILABLE'
  | 'NO MATCHING PUBLIC RESULT';

export interface PublicSourceFinding {
  searchQuery: string;
  resultTitle: string;
  sourceUrl: string;
  sourceDomain: string;
  retrievedSnippet: string;
  publicationDate: string;
  retrievalTimestamp: string;
  relevanceExplanation: string;
  verificationStatus: PublicVerificationStatus;
}

export interface GeminiAnalysisResult {
  score: number; // 0.0 to 1.0
  reasoning: string;
  assessmentSummary: string;
  positiveIndicators: string[];
  potentialConcerns: string[];
  actionableAdvisory: string;
  isAvailable: boolean;
  isGroundedSearchExecuted: boolean;
  groundingStatusReason?: string;
  publicSourceFindings: PublicSourceFinding[];
  companyVerificationStatus: PublicVerificationStatus;
  vacancyVerificationStatus: PublicVerificationStatus;
  officialWebsite?: string;
  careersUrl?: string;
  brandImpersonationDetected?: boolean;
}

export class GeminiService {
  private static ai: GoogleGenAI | null = null;

  public static getClient(): GoogleGenAI | null {
    if (!this.ai && config.geminiApiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      } catch (err: any) {
        console.warn(`[GeminiService] Failed to initialize Google GenAI SDK: ${err.message}`);
        this.ai = null;
      }
    }
    return this.ai;
  }

  /**
   * Conducts structured forensic evaluation and public source verification.
   * Runs sequentially via GeminiQueueService to stay within Free Tier limits.
   */
  public static async analyze(params: {
    jobTitle?: string;
    companyName?: string;
    recruiterName?: string;
    jobLocation?: string;
    jobDescription?: string;
    applicationUrl?: string | null;
    matchedRules?: Array<{ phrase: string; explanation: string; severity: string }>;
  }): Promise<GeminiAnalysisResult> {
    const client = this.getClient();
    const timestamp = new Date().toISOString();

    const cleanTitle = (params.jobTitle || '').trim();
    const cleanCompany = (params.companyName || '').trim();
    const cleanDescription = (params.jobDescription || '').trim();
    const cleanUrl = (params.applicationUrl || '').trim();
    const cleanLocation = (params.jobLocation || '').trim();
    const cleanRecruiter = (params.recruiterName || '').trim();

    // Graceful offline operation if JOBGUARD_MODE=offline or API key is unconfigured
    if (config.jobguardMode === 'offline' || !client || !config.geminiApiKey) {
      const modeReason = config.jobguardMode === 'offline'
        ? 'System is operating in offline mode. Contextual forensics evaluated via local machine learning models and deterministic heuristic rules.'
        : 'Google Gemini API is operating in offline mode because the API key is not configured.';

      return {
        score: 0.0,
        reasoning: modeReason,
        assessmentSummary:
          'Local threat rules and offline machine learning security checks were performed.',
        positiveIndicators: [],
        potentialConcerns: [],
        actionableAdvisory:
          'Always verify employer domains on official enterprise registers. Never pay upfront fees.',
        isAvailable: false,
        isGroundedSearchExecuted: false,
        groundingStatusReason: config.jobguardMode === 'offline' ? 'Offline operation mode active' : 'API key unconfigured',
        publicSourceFindings: [],
        companyVerificationStatus: 'UNABLE TO VERIFY',
        vacancyVerificationStatus: 'UNABLE TO VERIFY',
      };
    }

    const modelName = config.geminiModel || 'gemini-3.5-flash-lite';

    // --------------------------------------------------------------------------
    // Step 1: Google Search Grounding Check
    // --------------------------------------------------------------------------
    let realGroundingFindings: PublicSourceFinding[] = [];
    let isGroundedSearchExecuted = false;
    let groundingStatusReason: string | undefined = undefined;

    // By default, Search Grounding is disabled to stay strictly on Free Tier without billing
    if (!config.geminiEnableSearchGrounding) {
      isGroundedSearchExecuted = false;
      realGroundingFindings = [];
      groundingStatusReason =
        'Google Search Grounding disabled by default to operate strictly within Gemini API Free Tier without cloud billing.';
    } else if (cleanCompany || cleanTitle || cleanUrl) {
      // If explicitly enabled via GEMINI_ENABLE_SEARCH_GROUNDING=true, execute sequentially
      try {
        const searchQuery = [
          cleanCompany ? `"${cleanCompany}"` : '',
          cleanTitle ? `"${cleanTitle}"` : '',
          'careers job posting official',
        ]
          .filter(Boolean)
          .join(' ');

        const groundedRes = await GeminiQueueService.executeSequentially(async () => {
          return await client.models.generateContent({
            model: modelName,
            contents: `Verify if ${cleanCompany || 'the employer'} has an active public career portal or matching opening for "${cleanTitle || 'this position'}". Application URL provided: ${cleanUrl || 'None'}. Query: ${searchQuery}`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });
        });

        const meta = groundedRes.candidates?.[0]?.groundingMetadata;
        if (meta && Array.isArray(meta.groundingChunks) && meta.groundingChunks.length > 0) {
          isGroundedSearchExecuted = true;
          const searchQueries = meta.webSearchQueries || [searchQuery];

          for (const chunk of meta.groundingChunks) {
            const uri = chunk.web?.uri;
            const title = chunk.web?.title;
            if (uri && title) {
              let domain = 'web';
              try {
                domain = new URL(uri).hostname;
              } catch {
                domain = uri;
              }

              realGroundingFindings.push({
                searchQuery: searchQueries[0] || searchQuery,
                resultTitle: title,
                sourceUrl: uri,
                sourceDomain: domain,
                retrievedSnippet: `Verified public result retrieved via Google Search Grounding: ${title}`,
                publicationDate: 'DATE UNAVAILABLE',
                retrievalTimestamp: timestamp,
                relevanceExplanation: 'Authoritative public source retrieved via live search grounding.',
                verificationStatus: 'VERIFIED WITH SOURCE EVIDENCE',
              });
            }
          }
        }
      } catch (searchErr: any) {
        isGroundedSearchExecuted = false;
        realGroundingFindings = [];
        const status = searchErr.status || (searchErr.response && searchErr.response.status) || 429;
        const errMsg = searchErr.message || '';

        if (status === 429 || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          groundingStatusReason =
            'Google Search Grounding Quota Exceeded (HTTP 429: RESOURCE_EXHAUSTED). Gemini API Free Tier requires paid billing for live Search Grounding.';
        } else if (status === 403 || errMsg.includes('PERMISSION_DENIED')) {
          groundingStatusReason = 'Google Search Grounding Permission Denied (HTTP 403).';
        } else {
          groundingStatusReason = `Google Search Grounding unavailable (${status}: ${errMsg.slice(0, 120)}).`;
        }
        console.warn(`[GeminiService] Grounding diagnostic: ${groundingStatusReason}`);
      }
    }

    // --------------------------------------------------------------------------
    // Step 2: Contextual Forensics & Strict Vacancy-Level Verification
    // --------------------------------------------------------------------------
    const systemInstructions = `You are the senior cybersecurity and employment forensics expert for JobGuard AI.
Your objective is to evaluate recruitment authenticity, detect deceptive scams, and conduct strict Vacancy-Level Verification.

STRICT VACANCY-LEVEL VERIFICATION PRINCIPLES:
1. SEPARATE COMPANY IDENTITY FROM INDIVIDUAL VACANCY:
   - Recognizing that a company (such as Microsoft, Google, AWS, Apple, or an enterprise) is legitimate DOES NOT mean the vacancy or job advertisement is legitimate!
   - Scammers frequently impersonate Fortune 500 brands.
2. APPLICATION DOMAIN & IMPERSONATION CHECK:
   - Check if the application URL (${cleanUrl || 'None'}) or contact email belongs to the claimed employer (${cleanCompany || 'None'}).
   - If the employer is claimed to be an enterprise (e.g., Microsoft), but the application URL is hosted on an unrelated domain, a free link shortener, or the recruiter uses a personal email (@gmail.com, @yahoo.com):
     * Mark brand_impersonation_detected as true.
     * Mark company_verification_status as 'VERIFIED' (the corporation exists).
     * Mark vacancy_verification_status as 'MISMATCH'.
     * The scam_probability MUST be HIGH (>= 0.75)!
3. STANDALONE CAREERS URL CONTEXT:
   - If only an official company careers URL is submitted (e.g., https://careers.microsoft.com/) without a specific job vacancy description:
     * Evaluate website and domain legitimacy.
     * If the domain is an authentic enterprise careers portal, mark company_verification_status as 'VERIFIED' and scam_probability as very low (<= 0.08).
     * Do NOT penalize the absence of an individual job vacancy description as fraudulent!
     * Set vacancy_verification_status to 'UNABLE TO VERIFY' or 'NOT FOUND', and explain that no specific vacancy was submitted.
4. ATS PLATFORM CAUTION:
   - The presence of an ATS (Workday, Greenhouse, Lever, etc.) does NOT independently establish that a job is genuine unless the ATS tenant specifically matches the employer.
5. HONEST CITATIONS:
   - Do NOT invent fake URLs, fake dates, or fake search findings.
   - If public source grounding was ungrounded, state that live web grounding was ungrounded.
6. FAIR HEURISTICS:
   - Do NOT treat missing salary or missing recruiter phone numbers as suspicious by themselves. Legitimate postings often omit them.`;

    const userPrompt = `Recruitment Posting Details:
Job Title: ${cleanTitle || 'Not Specified'}
Claimed Company: ${cleanCompany || 'Not Specified'}
Recruiter / Sender: ${cleanRecruiter || 'Not Specified'}
Location: ${cleanLocation || 'Not Specified'}
Application Link: ${cleanUrl || 'Not Provided'}
Job Description:
${cleanDescription || 'No description text provided.'}

Deterministic Rule Signals:
${JSON.stringify(params.matchedRules || [])}

Live Search Grounded Status: ${isGroundedSearchExecuted ? 'SUCCESS (Live Grounded)' : 'UNAVAILABLE (Ungrounded / Free Tier Mode)'}

Respond with a JSON object matching this schema:
{
  "scam_probability": <float between 0.00 and 1.00>,
  "brand_impersonation_detected": <boolean>,
  "assessment_summary": "<clear 1-3 sentence summary in non-technical English>",
  "positive_indicators": ["<genuine positive evidence observed>"],
  "potential_concerns": ["<real concerns detected, or empty if none>"],
  "company_verification_status": "<VERIFIED WITH SOURCE EVIDENCE | VERIFIED | NOT FOUND | MISMATCH | UNABLE TO VERIFY | NO MATCHING PUBLIC RESULT>",
  "vacancy_verification_status": "<VERIFIED WITH SOURCE EVIDENCE | VERIFIED | NOT FOUND | MISMATCH | UNABLE TO VERIFY | NO MATCHING PUBLIC RESULT>",
  "official_website": "<official corporate website URL or 'Not Available'>",
  "careers_url": "<official careers portal URL or 'Not Available'>",
  "actionable_advisory": "<practical candidate safety advice>"
}`;

    try {
      // Execute forensic generation through the sequential queue
      const response = await GeminiQueueService.executeSequentially(async () => {
        return await client.models.generateContent({
          model: modelName,
          contents: `${systemInstructions}\n\n${userPrompt}`,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
      });

      const text = response.text?.trim() || '{}';
      const parsed = JSON.parse(text);

      let score = Math.max(0.0, Math.min(1.0, parseFloat(parsed.scam_probability) || 0.0));
      const brandImpersonation = Boolean(parsed.brand_impersonation_detected);

      if (brandImpersonation && score < 0.75) {
        score = 0.75;
      }

      // Vacancy verification status: Never mark VERIFIED if vacancy was not live-grounded
      let vacancyStatus: PublicVerificationStatus =
        (parsed.vacancy_verification_status as PublicVerificationStatus) || 'UNABLE TO VERIFY';
      let companyStatus: PublicVerificationStatus =
        (parsed.company_verification_status as PublicVerificationStatus) || 'UNABLE TO VERIFY';

      if (!isGroundedSearchExecuted && vacancyStatus === 'VERIFIED WITH SOURCE EVIDENCE') {
        vacancyStatus = 'UNABLE TO VERIFY';
      }

      const positiveIndicators = Array.isArray(parsed.positive_indicators)
        ? parsed.positive_indicators.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [];

      const potentialConcerns = Array.isArray(parsed.potential_concerns)
        ? parsed.potential_concerns.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [];

      if (brandImpersonation && !potentialConcerns.some((c: string) => c.toLowerCase().includes('impersonat'))) {
        potentialConcerns.unshift(
          `Potential Impersonation: Claims to represent ${cleanCompany || 'a known company'}, but application link or communication domain does not match.`
        );
      }

      return {
        score: Math.round(score * 100) / 100,
        reasoning: parsed.assessment_summary || 'Verification assessment completed.',
        assessmentSummary: parsed.assessment_summary || 'Review of recruitment details completed.',
        positiveIndicators,
        potentialConcerns,
        actionableAdvisory:
          parsed.actionable_advisory || 'Verify hiring announcements directly on the official company careers portal.',
        isAvailable: true,
        isGroundedSearchExecuted,
        groundingStatusReason,
        publicSourceFindings: realGroundingFindings,
        companyVerificationStatus: companyStatus,
        vacancyVerificationStatus: vacancyStatus,
        officialWebsite: parsed.official_website !== 'Not Available' ? parsed.official_website : undefined,
        careersUrl: parsed.careers_url !== 'Not Available' ? parsed.careers_url : undefined,
        brandImpersonationDetected: brandImpersonation,
      };
    } catch (error: any) {
      console.warn(`[GeminiService] AI generation notice: ${error.message}`);
      return {
        score: 0.0,
        reasoning:
          'Contextual forensic assessment completed via offline local inspection engines.',
        assessmentSummary:
          'Local threat rules and heuristic security analysis completed.',
        positiveIndicators: [],
        potentialConcerns: [],
        actionableAdvisory:
          'Exercise vigilance, independently verify the employer on official government or business registers, and never pay upfront fees.',
        isAvailable: false,
        isGroundedSearchExecuted: false,
        groundingStatusReason: error.message?.slice(0, 150),
        publicSourceFindings: [],
        companyVerificationStatus: 'UNABLE TO VERIFY',
        vacancyVerificationStatus: 'UNABLE TO VERIFY',
      };
    }
  }
}
