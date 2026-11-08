/**
 * JobGuard AI - Comprehensive Multi-Engine Scan & Risk Assessment Service
 * Module: backend.src.services.scan.service
 * Purpose: Dynamically routes inputs to the correct forensic engines:
 *          - URL-only: SSRF guard + Threat Intel + PhiUSIIL URL Threat Model (U) + Gemini (G)
 *          - Text-only: Deterministic Rules (H) + EMSCAD Text Model (M) + Gemini (G)
 *          - Company-only: Threat Intel Domain Check + Public Source Verification (G)
 *          - Combined / Document: Dynamic routing to all applicable engines
 * Formulation: Dynamic Consensus Fusion across active streams without artificial defaults.
 */

import crypto from 'crypto';
import { query } from '../config/database.js';
import { RuleEngineService } from './rule_engine.service.js';
import { MLClientService } from './ml_client.service.js';
import { GeminiService } from './gemini.service.js';
import { RiskFusionService } from './risk_fusion.service.js';
import { ThreatIntelService } from './threat_intel.service.js';
import { validateUrlForSSRF } from '../utils/ssrf_guard.js';
import { DirectSourceVerificationService, DirectSourceFinding } from './direct_source_verification.service.js';
import { ScanDossier, VerificationStatus } from '../types/index.js';

export interface ScanJobPayload {
  userId?: number | null;
  jobTitle?: string;
  companyName?: string;
  recruiterName?: string;
  jobLocation?: string;
  jobDescription?: string;
  applicationUrl?: string | null;
  requirements?: string;
  benefits?: string;
  companyProfile?: string;
  inputType?: 'url' | 'text' | 'company' | 'document' | 'manual' | string;
  uploadedFileId?: string;
}

/**
 * Extracts normalized hostname, registrable root domain, and identifies known corporate employers.
 */
export function extractDomainAndEmployer(urlStr: string): {
  hostname: string;
  rootDomain: string;
  inferredEmployer: string | null;
  isVerifiedCorporatePortal: boolean;
} {
  try {
    const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    const hostname = parsed.hostname.toLowerCase();

    // Multi-part ccTLDs: .co.uk, .com.au, .co.in, .org.uk, .gov.in, etc.
    const multiPartTlds = ['.co.uk', '.com.au', '.co.in', '.org.uk', '.ac.in', '.gov.in', '.com.br', '.co.nz', '.co.za'];
    let rootDomain = hostname;
    let matchedMulti = false;
    for (const mtld of multiPartTlds) {
      if (hostname.endsWith(mtld)) {
        const parts = hostname.slice(0, -mtld.length).split('.');
        rootDomain = `${parts[parts.length - 1]}${mtld}`;
        matchedMulti = true;
        break;
      }
    }
    if (!matchedMulti) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        rootDomain = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
      }
    }

    // Comprehensive mapping of recognized enterprises & careers portals
    const knownCorporateMap: Record<string, string> = {
      'microsoft.com': 'Microsoft Corporation',
      'careers.microsoft.com': 'Microsoft Corporation',
      'google.com': 'Google LLC',
      'careers.google.com': 'Google LLC',
      'amazon.com': 'Amazon',
      'amazon.jobs': 'Amazon',
      'apple.com': 'Apple Inc.',
      'jobs.apple.com': 'Apple Inc.',
      'meta.com': 'Meta Platforms',
      'metacareers.com': 'Meta Platforms',
      'netflix.com': 'Netflix',
      'netflixjobs.com': 'Netflix',
      'cisco.com': 'Cisco Systems',
      'intel.com': 'Intel Corporation',
      'ibm.com': 'IBM',
      'oracle.com': 'Oracle Corporation',
      'salesforce.com': 'Salesforce',
      'adobe.com': 'Adobe',
      'spotify.com': 'Spotify',
      'uber.com': 'Uber',
      'airbnb.com': 'Airbnb',
      'linkedin.com': 'LinkedIn',
      'nvidia.com': 'NVIDIA',
      'tesla.com': 'Tesla',
      'jpmorgan.com': 'JPMorgan Chase',
      'goldmansachs.com': 'Goldman Sachs',
    };

    if (knownCorporateMap[hostname]) {
      return { hostname, rootDomain, inferredEmployer: knownCorporateMap[hostname], isVerifiedCorporatePortal: true };
    }
    if (knownCorporateMap[rootDomain]) {
      return { hostname, rootDomain, inferredEmployer: knownCorporateMap[rootDomain], isVerifiedCorporatePortal: true };
    }

    // Generic inference for corporate careers subdomains: e.g. careers.cisco.com -> Cisco
    const baseName = rootDomain.split('.')[0];
    if (baseName && baseName.length > 2 && !['bit', 'tinyurl', 't', 'is', 'goo', 'ow', 'buff', 'linktr', 'forms'].includes(baseName)) {
      const formatted = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      const isCareersPortal = hostname.startsWith('careers.') || hostname.startsWith('jobs.') || hostname.includes('recruitment');
      return { hostname, rootDomain, inferredEmployer: formatted, isVerifiedCorporatePortal: isCareersPortal };
    }

    return { hostname, rootDomain, inferredEmployer: null, isVerifiedCorporatePortal: false };
  } catch {
    return { hostname: '', rootDomain: '', inferredEmployer: null, isVerifiedCorporatePortal: false };
  }
}

export class ScanService {
  private static isScanActive = false;
  private static activeScanId: string | null = null;

  /**
   * Executes multi-layer forensic analysis with strict input-dependent engine routing.
   * Enforces global mutex lock so only one scan executes at a time.
   */
  public static async analyzeJob(payload: ScanJobPayload): Promise<ScanDossier> {
    if (ScanService.isScanActive) {
      const err: any = new Error('Another scan is currently in progress. Please wait for it to complete.');
      err.code = 'SCAN_IN_PROGRESS';
      err.statusCode = 409;
      throw err;
    }

    const scanId = crypto.randomUUID();
    ScanService.isScanActive = true;
    ScanService.activeScanId = scanId;

    try {
      const cleanTitle = (payload.jobTitle || '').trim();
      const cleanCompany = (payload.companyName || '').trim();
      const cleanRecruiter = (payload.recruiterName || '').trim();
      const cleanLocation = (payload.jobLocation || '').trim();
      const cleanDescription = (payload.jobDescription || '').trim();
      let cleanUrl = payload.applicationUrl ? payload.applicationUrl.trim() : null;

      if (!cleanTitle && !cleanDescription && !cleanUrl && !cleanCompany) {
        throw new Error('Please provide at least a job description, application link, or company name to analyze.');
      }

      // Resolve structured input type
      let inputType = payload.inputType || 'text';
      if (inputType === 'manual') {
        if (cleanDescription && cleanUrl) inputType = 'combined';
        else if (cleanUrl && !cleanDescription && !cleanCompany) inputType = 'url';
        else if (cleanCompany && !cleanDescription && !cleanUrl) inputType = 'company';
        else inputType = 'text';
      }

      // Extract domain & infer employer from URL or description when not explicitly specified
      const urlDomainMeta = cleanUrl ? extractDomainAndEmployer(cleanUrl) : null;
      let inferredCompany = cleanCompany || (urlDomainMeta?.inferredEmployer ?? '');
      if (!inferredCompany && cleanDescription) {
        const extracted = RuleEngineService.extractCompanyNames(cleanDescription, cleanUrl);
        if (extracted && extracted.length > 0) {
          inferredCompany = extracted[0];
        }
      }

      let inferredTitle = cleanTitle;
      if (!inferredTitle && cleanDescription) {
        const extractedTitles = RuleEngineService.extractJobTitles(cleanDescription);
        if (extractedTitles && extractedTitles.length > 0) {
          inferredTitle = extractedTitles[0];
        }
      }

      const isStandaloneCareersPortal = Boolean(cleanUrl && urlDomainMeta?.isVerifiedCorporatePortal && !cleanDescription);

      const displayTitle = inferredTitle || (isStandaloneCareersPortal ? `Official Careers Portal (${inferredCompany})` : (inferredCompany ? `Opportunity at ${inferredCompany}` : (cleanUrl ? 'URL Assessment Target' : 'Job Assessment')));
      const displayCompany = inferredCompany || 'Unspecified Employer';

    // --------------------------------------------------------------------------
    // 1. URL Analysis (SSRF Validation, Threat Intel Cache, & PhiUSIIL Model)
    // --------------------------------------------------------------------------
    let U: number | null = null;
    const urlIndicators: string[] = [];
    let isTrustedATS = false;
    let isFlaggedThreat = false;
    let officialDomain = '';
    let directFindingItem: any = null;
    const directPositiveIndicators: string[] = [];

    if (cleanUrl) {
      const ssrfCheck = await validateUrlForSSRF(cleanUrl);
      if (!ssrfCheck.isValid) {
        urlIndicators.push(`[SSRF Restriction]: ${ssrfCheck.error}`);
      } else {
        try {
          const parsed = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
          officialDomain = parsed.hostname;
        } catch {
          officialDomain = '';
        }

        // Query threat intelligence cache in MySQL
        const threatIntel = await ThreatIntelService.evaluateDomain(cleanUrl);
        if (threatIntel.isTrustedATS) {
          isTrustedATS = true;
          urlIndicators.push(`Verified Enterprise Career Infrastructure (${threatIntel.domain})`);
        }
        if (threatIntel.isFlaggedMalicious) {
          isFlaggedThreat = true;
          urlIndicators.push(`Threat Intel Flagged Domain (${threatIntel.threatDescription})`);
        }

        // Evaluate PhiUSIIL 18-feature URL model
        try {
          const urlPrediction = await MLClientService.predictUrl(cleanUrl);
          if (urlPrediction) {
            U = urlPrediction.probability;
            // Calibration: A verified corporate careers domain without threat indicators represents negligible phishing risk
            if (urlDomainMeta?.isVerifiedCorporatePortal && !isFlaggedThreat) {
              U = Math.min(U, 0.05);
            }
            if (urlPrediction.indicators && urlPrediction.indicators.length > 0) {
              urlIndicators.push(...urlPrediction.indicators);
            }
          }
        } catch (err: any) {
          console.warn(`[ScanService] URL ML evaluation notice: ${err.message}`);
          U = null;
        }

        // Direct public source verification (Free Tier, SSRF protected)
        try {
          const directFinding = await DirectSourceVerificationService.verifyUrl(cleanUrl, inferredCompany);
          if (directFinding.isAccessible) {
            urlIndicators.push(`Verified Destination Title: "${directFinding.pageTitle}" (HTTP ${directFinding.httpStatus})`);
            if (directFinding.domainMatchesEmployer) {
              directPositiveIndicators.push(`Target domain ${directFinding.finalDomain} matches claimed employer.`);
            }
            directFindingItem = {
              searchQuery: `Direct HTTP Retrieval: ${directFinding.sourceUrl}`,
              resultTitle: directFinding.pageTitle,
              sourceUrl: directFinding.sourceUrl,
              sourceDomain: directFinding.finalDomain,
              retrievedSnippet: directFinding.notes,
              publicationDate: 'DATE UNAVAILABLE',
              retrievalTimestamp: directFinding.retrievalTimestamp,
              relevanceExplanation: 'Directly retrieved public destination page with SSRF protection (not search grounding).',
              verificationStatus: directFinding.domainMatchesEmployer ? 'VERIFIED WITH SOURCE EVIDENCE' : 'VERIFIED',
            };
          }
        } catch (dirErr: any) {
          console.warn(`[ScanService] Direct source verification notice: ${dirErr.message}`);
        }
      }
    }

    // --------------------------------------------------------------------------
    // 2. Deterministic Rule & Heuristic Analysis (H)
    // --------------------------------------------------------------------------
    const fullTextToInspect = [
      displayTitle,
      displayCompany,
      cleanRecruiter,
      cleanLocation,
      cleanDescription,
      payload.requirements || '',
      payload.benefits || '',
    ]
      .filter(Boolean)
      .join('\n');

    const ruleEvaluation = RuleEngineService.evaluate(fullTextToInspect, cleanUrl);
    let H = ruleEvaluation.score;

    if (isFlaggedThreat) {
      H = Math.min(1.0, H + 0.40);
    }

    // --------------------------------------------------------------------------
    // 3. EMSCAD Text ML Model (M) - ONLY run if substantive job text is present
    // --------------------------------------------------------------------------
    let M: number | null = null;
    const hasSubstantiveText = cleanDescription.length >= 25;

    if (hasSubstantiveText) {
      try {
        const textPrediction = await MLClientService.predictText({
          title: displayTitle,
          companyProfile: payload.companyProfile || '',
          description: cleanDescription,
          requirements: payload.requirements || '',
          benefits: payload.benefits || '',
        });
        M = textPrediction.probability;
      } catch (err: any) {
        console.warn(`[ScanService] Text ML fallback notice: ${err.message}`);
        M = null;
      }
    }

    // --------------------------------------------------------------------------
    // 4. Google Gemini Contextual AI & Public Source Verification (G)
    // --------------------------------------------------------------------------
    const geminiAnalysis = await GeminiService.analyze({
      jobTitle: displayTitle,
      companyName: displayCompany,
      recruiterName: cleanRecruiter,
      jobLocation: cleanLocation,
      jobDescription: cleanDescription,
      applicationUrl: cleanUrl,
      matchedRules: ruleEvaluation.matchedRules.map((r) => ({
        phrase: r.phrase,
        explanation: r.explanation,
        severity: r.severity,
      })),
    });

    const G = geminiAnalysis.isAvailable ? geminiAnalysis.score : null;

    // --------------------------------------------------------------------------
    // 5. Impersonation & Vacancy Consistency Check
    // --------------------------------------------------------------------------
    let hasBrandImpersonation = Boolean(geminiAnalysis.brandImpersonationDetected);

    // Deterministic Domain / Impersonation Check
    if (cleanCompany && officialDomain) {
      const normCompany = cleanCompany.toLowerCase().replace(/[^a-z0-9]/g, '');
      const coreCompany = normCompany.replace(/(corporation|corp|inc|llc|ltd|technologies|solutions|group|services)$/, '');
      const normHost = officialDomain.toLowerCase();
      
      const majorEnterprises = ['microsoft', 'google', 'amazon', 'apple', 'meta', 'netflix', 'adobe', 'oracle', 'ibm', 'cisco', 'intel', 'salesforce'];
      const isClaimedMajor = majorEnterprises.some((corp) => normCompany.includes(corp));

      if (isClaimedMajor) {
        const domainMatches = majorEnterprises.some((corp) => normCompany.includes(corp) && normHost.includes(corp));
        if (!domainMatches && !isTrustedATS) {
          hasBrandImpersonation = true;
        }
      } else if (coreCompany.length >= 4) {
        const suspiciousHosts = ['bit.ly', 'tinyurl.com', 't.me', 'wa.me', 'cutt.ly', 'is.gd', 'forms.gle'];
        if (suspiciousHosts.some((sh) => normHost.includes(sh))) {
          hasBrandImpersonation = true;
        }
      }
    }

    // --------------------------------------------------------------------------
    // 6. Consensus Risk Fusion (R)
    // --------------------------------------------------------------------------
    const hasCriticalPaymentDemand = ruleEvaluation.hasCriticalAdvanceFee || isFlaggedThreat;
    const riskBreakdown = RiskFusionService.fuse(
      H,
      M,
      U,
      G,
      hasCriticalPaymentDemand,
      hasBrandImpersonation,
      isStandaloneCareersPortal
    );

    // --------------------------------------------------------------------------
    // 7. Vacancy-Level Verification Statuses & Evidence Synthesis
    // --------------------------------------------------------------------------
    let companyStatus: VerificationStatus = geminiAnalysis.companyVerificationStatus || 'UNABLE TO VERIFY';
    let vacancyStatus: VerificationStatus = geminiAnalysis.vacancyVerificationStatus || 'UNABLE TO VERIFY';
    let recruitmentStatus: string = 'Unable to Verify';

    if (hasBrandImpersonation) {
      companyStatus = 'MISMATCH';
      vacancyStatus = 'MISMATCH';
      recruitmentStatus = 'Flagged / Brand Mismatch';
    } else if (hasCriticalPaymentDemand || riskBreakdown.riskLevel === 'High Risk') {
      if (companyStatus !== 'VERIFIED') {
        companyStatus = 'UNABLE TO VERIFY';
      }
      vacancyStatus = 'NOT FOUND';
      recruitmentStatus = 'Flagged / Suspicious';
    } else if (isStandaloneCareersPortal) {
      companyStatus = 'VERIFIED';
      vacancyStatus = 'NOT FOUND';
      recruitmentStatus = 'Official Portal Verified';
    } else if (geminiAnalysis.isGroundedSearchExecuted && geminiAnalysis.vacancyVerificationStatus === 'VERIFIED WITH SOURCE EVIDENCE') {
      recruitmentStatus = 'Active';
    } else if (cleanDescription && /(application[s]?\s+closed|no\s+longer\s+accepting|position\s+closed)/i.test(cleanDescription)) {
      recruitmentStatus = 'Closed';
    } else if (cleanDescription && /(expired|deadline\s+passed)/i.test(cleanDescription)) {
      recruitmentStatus = 'Expired';
    } else if (companyStatus === 'VERIFIED' && cleanDescription) {
      recruitmentStatus = 'Vacancy Not Independently Located';
    } else {
      recruitmentStatus = 'Unable to Verify';
    }

    // Combine indicators
    const positiveIndicators: string[] = [...geminiAnalysis.positiveIndicators, ...directPositiveIndicators];
    const potentialConcerns: string[] = [...geminiAnalysis.potentialConcerns];

    if (isStandaloneCareersPortal && !positiveIndicators.some((i) => i.includes('official') || i.includes('domain'))) {
      positiveIndicators.unshift(`Application URL is hosted on the official ${displayCompany} domain (${officialDomain}). Website identity is verified.`);
    }

    if (isTrustedATS && !positiveIndicators.some((i) => i.includes('ATS') || i.includes('infrastructure'))) {
      positiveIndicators.unshift(`Application link targets enterprise career portal (${officialDomain}). Note: Independent vacancy matching remains recommended.`);
    }

    if (hasBrandImpersonation && !potentialConcerns.some((c) => c.toLowerCase().includes('impersonat'))) {
      potentialConcerns.unshift(`Potential Brand Impersonation: Posting claims to represent ${displayCompany}, but the destination domain (${officialDomain || 'contact channel'}) is not authorized.`);
    }

    for (const rule of ruleEvaluation.matchedRules) {
      if (!potentialConcerns.some((c) => c.toLowerCase().includes(rule.phrase.toLowerCase()))) {
        potentialConcerns.push(`${rule.phrase}: ${rule.explanation}`);
      }
    }

    if (isFlaggedThreat) {
      potentialConcerns.unshift('Domain is flagged in threat intelligence databases for malicious activity.');
    }

    // Assemble comprehensive dossier
    const dossier: ScanDossier = {
      id: scanId,
      userId: payload.userId || null,
      jobTitle: displayTitle,
      claimedEmployer: cleanCompany || undefined,
      companyName: displayCompany,
      jobDescription: cleanDescription,
      applicationUrl: cleanUrl,
      overallRiskScore: riskBreakdown.compositeScore,
      riskLevel: riskBreakdown.riskLevel,
      mlProbability: M !== null ? M : 0.0,
      urlProbability: U,
      heuristicScore: H,
      geminiScore: G,
      companyVerificationStatus: companyStatus,
      vacancyVerificationStatus: vacancyStatus,
      recruitmentStatus,
      officialDomain: officialDomain || geminiAnalysis.officialWebsite || '',
      careersSource: geminiAnalysis.careersUrl || cleanUrl || '',
      riskBreakdown: {
        ...riskBreakdown,
        publicSourceFindings: [
          ...(directFindingItem ? [directFindingItem] : []),
          ...(geminiAnalysis.publicSourceFindings || []),
        ],
        groundingStatusReason: geminiAnalysis.groundingStatusReason,
        isGroundedSearchExecuted: geminiAnalysis.isGroundedSearchExecuted,
      },
      matchedRules: ruleEvaluation.matchedRules,
      extractedEntities: ruleEvaluation.extractedEntities,
      urlIndicators: urlIndicators.length > 0 ? Array.from(new Set(urlIndicators)) : null,
      geminiReasoning: geminiAnalysis.reasoning,
      assessmentSummary: geminiAnalysis.assessmentSummary,
      positiveIndicators,
      potentialConcerns,
      officialWebsite: geminiAnalysis.officialWebsite,
      careersUrl: geminiAnalysis.careersUrl,
      actionableAdvice: geminiAnalysis.actionableAdvisory,
      groundingStatusReason: geminiAnalysis.groundingStatusReason,
      isGroundedSearchExecuted: geminiAnalysis.isGroundedSearchExecuted,
      inputType,
      createdAt: new Date(),
    };

    // Persist scan dossier into MySQL 8.4 database
    try {
      await query(
        `INSERT INTO scan_history (
          id, user_id, job_title, claimed_employer, company_name, job_description, application_url,
          overall_risk_score, risk_level, ml_probability, url_probability, heuristic_score, gemini_score,
          company_verification_status, vacancy_verification_status, recruitment_status, official_domain,
          risk_breakdown_json, matched_rules_json, extracted_entities_json, url_indicators_json,
          gemini_reasoning, actionable_advice, input_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dossier.id,
          dossier.userId,
          dossier.jobTitle,
          dossier.claimedEmployer || null,
          dossier.companyName,
          dossier.jobDescription,
          dossier.applicationUrl,
          dossier.overallRiskScore,
          dossier.riskLevel,
          dossier.mlProbability,
          dossier.urlProbability,
          dossier.heuristicScore,
          dossier.geminiScore,
          dossier.companyVerificationStatus,
          dossier.vacancyVerificationStatus,
          dossier.recruitmentStatus,
          dossier.officialDomain,
          JSON.stringify(dossier.riskBreakdown),
          JSON.stringify(dossier.matchedRules),
          JSON.stringify(dossier.extractedEntities),
          dossier.urlIndicators ? JSON.stringify(dossier.urlIndicators) : null,
          dossier.geminiReasoning,
          dossier.actionableAdvice,
          dossier.inputType,
        ]
      );
    } catch (dbErr: any) {
      console.warn(`[ScanService] MySQL persist notice: ${dbErr.message}`);
    }

    return dossier;
    } finally {
      ScanService.isScanActive = false;
      ScanService.activeScanId = null;
    }
  }

  /**
   * Retrieves individual dossier by ID.
   */
  public static async getScanById(scanId: string): Promise<ScanDossier | null> {
    const rows = await query('SELECT * FROM scan_history WHERE id = ? LIMIT 1', [scanId]);
    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    const riskBreakdown = typeof r.risk_breakdown_json === 'string' ? JSON.parse(r.risk_breakdown_json) : (r.risk_breakdown_json || {});
    const matchedRules = typeof r.matched_rules_json === 'string' ? JSON.parse(r.matched_rules_json) : (r.matched_rules_json || []);
    const extractedEntities = typeof r.extracted_entities_json === 'string' ? JSON.parse(r.extracted_entities_json) : (r.extracted_entities_json || {
      salaryClaims: [],
      contactEmails: [],
      contactPhones: [],
      messagingHandles: [],
      urls: [],
      suspiciousKeywords: [],
    });
    const urlIndicators = r.url_indicators_json
      ? (typeof r.url_indicators_json === 'string' ? JSON.parse(r.url_indicators_json) : r.url_indicators_json)
      : null;

    return {
      id: r.id,
      userId: r.user_id,
      jobTitle: r.job_title,
      claimedEmployer: r.claimed_employer || undefined,
      companyName: r.company_name,
      jobDescription: r.job_description,
      applicationUrl: r.application_url,
      overallRiskScore: r.overall_risk_score,
      riskLevel: r.risk_level,
      mlProbability: parseFloat(r.ml_probability) || 0.0,
      urlProbability: r.url_probability !== null ? parseFloat(r.url_probability) : null,
      heuristicScore: parseFloat(r.heuristic_score) || 0.0,
      geminiScore: r.gemini_score !== null ? parseFloat(r.gemini_score) : null,
      companyVerificationStatus: r.company_verification_status,
      vacancyVerificationStatus: r.vacancy_verification_status,
      recruitmentStatus: r.recruitment_status,
      officialDomain: r.official_domain,
      careersSource: r.application_url || '',
      riskBreakdown,
      matchedRules,
      extractedEntities,
      urlIndicators,
      geminiReasoning: r.gemini_reasoning,
      assessmentSummary: riskBreakdown.assessmentSummary || r.gemini_reasoning,
      positiveIndicators: riskBreakdown.positiveIndicators || [],
      potentialConcerns: riskBreakdown.potentialConcerns || [],
      officialWebsite: r.official_domain,
      careersUrl: r.application_url,
      actionableAdvice: r.actionable_advice,
      inputType: r.input_type || 'manual',
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    };
  }

  /**
   * Retrieves user-isolated scan history with optional filters.
   */
  public static async getUserHistory(params: {
    userId: number;
    riskLevel?: string;
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ scans: ScanDossier[]; total: number }> {
    let whereClause = 'WHERE user_id = ?';
    const queryParams: any[] = [params.userId];

    if (params.riskLevel) {
      whereClause += ' AND risk_level = ?';
      queryParams.push(params.riskLevel);
    }

    if (params.search) {
      whereClause += ' AND (job_title LIKE ? OR company_name LIKE ? OR claimed_employer LIKE ?)';
      queryParams.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
    }

    const countRows = await query(`SELECT COUNT(*) as total FROM scan_history ${whereClause}`, queryParams);
    const total = countRows && countRows.length > 0 ? countRows[0].total : 0;

    const dataQuery = `SELECT * FROM scan_history ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const rows = await query(dataQuery, [...queryParams, params.limit, params.offset]);

    const scans: ScanDossier[] = (rows || []).map((r: any) => {
      const riskBreakdown = typeof r.risk_breakdown_json === 'string' ? JSON.parse(r.risk_breakdown_json) : (r.risk_breakdown_json || {});
      const matchedRules = typeof r.matched_rules_json === 'string' ? JSON.parse(r.matched_rules_json) : (r.matched_rules_json || []);
      const extractedEntities = typeof r.extracted_entities_json === 'string' ? JSON.parse(r.extracted_entities_json) : (r.extracted_entities_json || {
        salaryClaims: [],
        contactEmails: [],
        contactPhones: [],
        messagingHandles: [],
        urls: [],
        suspiciousKeywords: [],
      });
      const urlIndicators = r.url_indicators_json
        ? (typeof r.url_indicators_json === 'string' ? JSON.parse(r.url_indicators_json) : r.url_indicators_json)
        : null;

      return {
        id: r.id,
        userId: r.user_id,
        jobTitle: r.job_title,
        claimedEmployer: r.claimed_employer || undefined,
        companyName: r.company_name,
        jobDescription: r.job_description,
        applicationUrl: r.application_url,
        overallRiskScore: r.overall_risk_score,
        riskLevel: r.risk_level,
        mlProbability: parseFloat(r.ml_probability) || 0.0,
        urlProbability: r.url_probability !== null ? parseFloat(r.url_probability) : null,
        heuristicScore: parseFloat(r.heuristic_score) || 0.0,
        geminiScore: r.gemini_score !== null ? parseFloat(r.gemini_score) : null,
        companyVerificationStatus: r.company_verification_status,
        vacancyVerificationStatus: r.vacancy_verification_status,
        recruitmentStatus: r.recruitment_status,
        officialDomain: r.official_domain,
        careersSource: r.application_url || '',
        riskBreakdown,
        matchedRules,
        extractedEntities,
        urlIndicators,
        geminiReasoning: r.gemini_reasoning,
        assessmentSummary: riskBreakdown.assessmentSummary || r.gemini_reasoning,
        positiveIndicators: riskBreakdown.positiveIndicators || [],
        potentialConcerns: riskBreakdown.potentialConcerns || [],
        officialWebsite: r.official_domain,
        careersUrl: r.application_url,
        actionableAdvice: r.actionable_advice,
        inputType: r.input_type || 'manual',
        createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      };
    });

    return { scans, total };
  }

  /**
   * Deletes a user scan by ID ensuring user isolation.
   */
  public static async deleteUserScan(scanId: string, userId: number): Promise<boolean> {
    const result = await query('DELETE FROM scan_history WHERE id = ? AND user_id = ?', [scanId, userId]);
    return result && result.affectedRows > 0;
  }
}
