/**
 * JobGuard AI - Direct Public Source Verification Engine
 * Module: backend.src.services.direct_source_verification.service
 * Purpose: Safely retrieves user-supplied job postings directly from public websites
 *          without relying on paid Google Search grounding APIs.
 * Security: Strict SSRF protection, redirect verification, IP range enforcement,
 *          safe timeouts, and response size limits.
 * Policy: Clearly tags evidence as 'DIRECTLY RETRIEVED OFFICIAL SOURCE' (not search grounding).
 */

import axios, { AxiosResponse } from 'axios';
import { validateUrlForSSRF } from '../utils/ssrf_guard.js';
import { config } from '../config/env.js';
import { extractDomainAndEmployer } from './scan.service.js';

export interface DirectSourceFinding {
  sourceType: 'DIRECTLY RETRIEVED OFFICIAL SOURCE' | 'LOCAL REPUTATION HEURISTIC' | 'SOURCE UNAVAILABLE';
  sourceUrl: string;
  finalDomain: string;
  pageTitle: string;
  isAccessible: boolean;
  httpStatus?: number;
  retrievalTimestamp: string;
  domainMatchesEmployer: boolean;
  notes: string;
}

export class DirectSourceVerificationService {
  /**
   * Safely verifies an external job vacancy URL through direct HTTP retrieval.
   */
  public static async verifyUrl(
    targetUrl: string,
    claimedEmployer?: string
  ): Promise<DirectSourceFinding> {
    const timestamp = new Date().toISOString();

    if (!targetUrl || !targetUrl.trim()) {
      return {
        sourceType: 'SOURCE UNAVAILABLE',
        sourceUrl: '',
        finalDomain: '',
        pageTitle: 'No URL Provided',
        isAccessible: false,
        retrievalTimestamp: timestamp,
        domainMatchesEmployer: false,
        notes: 'No external vacancy URL was provided for live source verification.',
      };
    }

    const cleanUrl = targetUrl.trim();

    // In offline mode, do not perform outbound HTTP requests
    if (config.jobguardMode === 'offline') {
      const meta = extractDomainAndEmployer(cleanUrl);
      return {
        sourceType: 'LOCAL REPUTATION HEURISTIC',
        sourceUrl: cleanUrl,
        finalDomain: meta.rootDomain || meta.hostname || 'local',
        pageTitle: 'Offline Mode Assessment',
        isAccessible: false,
        retrievalTimestamp: timestamp,
        domainMatchesEmployer: Boolean(
          claimedEmployer &&
            meta.inferredEmployer &&
            claimedEmployer.toLowerCase().includes(meta.inferredEmployer.toLowerCase())
        ),
        notes: 'Live HTTP source verification skipped because JobGuard AI is operating in offline mode.',
      };
    }

    // Step 1: SSRF Validation of initial URL
    const ssrfCheck = await validateUrlForSSRF(cleanUrl);
    if (!ssrfCheck.isValid) {
      return {
        sourceType: 'SOURCE UNAVAILABLE',
        sourceUrl: cleanUrl,
        finalDomain: ssrfCheck.hostname || 'restricted',
        pageTitle: 'SSRF Restricted',
        isAccessible: false,
        retrievalTimestamp: timestamp,
        domainMatchesEmployer: false,
        notes: `Direct source verification blocked by SSRF security guard: ${ssrfCheck.error}`,
      };
    }

    // Step 2: Safe HTTP GET with redirect re-validation and size limits
    try {
      let currentUrl = ssrfCheck.sanitizedUrl || cleanUrl;
      let redirectCount = 0;
      const MAX_REDIRECTS = 3;
      let response: AxiosResponse | null = null;

      while (redirectCount <= MAX_REDIRECTS) {
        // Validate each hop against SSRF
        const hopCheck = await validateUrlForSSRF(currentUrl);
        if (!hopCheck.isValid) {
          return {
            sourceType: 'SOURCE UNAVAILABLE',
            sourceUrl: currentUrl,
            finalDomain: hopCheck.hostname || 'restricted',
            pageTitle: 'Redirect Blocked',
            isAccessible: false,
            retrievalTimestamp: timestamp,
            domainMatchesEmployer: false,
            notes: `Redirect to unsafe host was blocked by SSRF policy: ${hopCheck.error}`,
          };
        }

        const res: AxiosResponse = await axios.get(currentUrl, {
          timeout: 5000,
          maxRedirects: 0, // Handle redirects manually for strict SSRF safety
          maxContentLength: 2 * 1024 * 1024, // 2MB max response
          headers: {
            'User-Agent': 'JobGuard-AI-Verification-Bot/1.0 (+https://jobguard.local; safety audit)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          validateStatus: (status) => (status >= 200 && status < 400),
        });

        if (res.status >= 300 && res.status < 400 && res.headers.location) {
          const redirectTarget = new URL(res.headers.location, currentUrl).href;
          currentUrl = redirectTarget;
          redirectCount++;
          continue;
        }

        response = res;
        break;
      }

      if (!response) {
        return {
          sourceType: 'SOURCE UNAVAILABLE',
          sourceUrl: currentUrl,
          finalDomain: new URL(currentUrl).hostname,
          pageTitle: 'Too Many Redirects',
          isAccessible: false,
          retrievalTimestamp: timestamp,
          domainMatchesEmployer: false,
          notes: 'Target URL exceeded maximum permitted redirects (3 hops).',
        };
      }

      const finalUrl = currentUrl;
      const finalDomainMeta = extractDomainAndEmployer(finalUrl);
      const finalDomain = finalDomainMeta.rootDomain || finalDomainMeta.hostname;

      // Step 3: Extract Page Title safely
      const html = typeof response.data === 'string' ? response.data : '';
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const rawTitle = titleMatch ? titleMatch[1].trim() : 'Recruitment Web Page';
      // Sanitize title to prevent XSS
      const sanitizedTitle = rawTitle.replace(/[<>]/g, '').slice(0, 150);

      // Step 4: Compare final domain against claimed employer
      let domainMatches = false;
      if (claimedEmployer && claimedEmployer.trim()) {
        const cleanEmployer = claimedEmployer.toLowerCase().trim();
        const domainBase = finalDomain.split('.')[0]?.toLowerCase() || '';
        domainMatches =
          Boolean(finalDomainMeta.inferredEmployer && cleanEmployer.includes(finalDomainMeta.inferredEmployer.toLowerCase())) ||
          (domainBase.length > 2 && cleanEmployer.includes(domainBase));
      }

      return {
        sourceType: 'DIRECTLY RETRIEVED OFFICIAL SOURCE',
        sourceUrl: finalUrl,
        finalDomain,
        pageTitle: sanitizedTitle,
        isAccessible: true,
        httpStatus: response.status,
        retrievalTimestamp: timestamp,
        domainMatchesEmployer: domainMatches,
        notes: `Directly retrieved from public web server (HTTP ${response.status}). ${
          domainMatches
            ? `Domain matches claimed employer (${claimedEmployer}).`
            : `Verified public domain: ${finalDomain}.`
        }`,
      };
    } catch (err: any) {
      const finalDomain = extractDomainAndEmployer(cleanUrl).hostname;
      return {
        sourceType: 'SOURCE UNAVAILABLE',
        sourceUrl: cleanUrl,
        finalDomain,
        pageTitle: 'Unable to Reach Host',
        isAccessible: false,
        retrievalTimestamp: timestamp,
        domainMatchesEmployer: false,
        notes: `Direct connection to destination URL could not be established (${err.message || 'Network timeout'}).`,
      };
    }
  }
}
