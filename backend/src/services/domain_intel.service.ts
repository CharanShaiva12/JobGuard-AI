/**
 * JobGuard AI - Passive RDAP Domain Age & DNS Email Authentication Intelligence
 * Module: backend.src.services.domain_intel.service
 * Purpose: Performs fast, non-blocking passive DNS (MX, SPF, DMARC) and RDAP
 *          domain registration age checks without scraping target webpages.
 * Safety: Strictly bounded timeouts; degrades gracefully in offline environments.
 */

import dns from 'dns/promises';
import axios from 'axios';

export interface DomainAuthIntelResult {
  domain: string;
  rootDomain: string;
  domainAgeDays: number | null;
  registrationDate: string | null;
  isNewlyRegistered: boolean;
  hasMx: boolean | null;
  hasSpf: boolean | null;
  hasDmarc: boolean | null;
  positiveSignals: string[];
  riskSignals: string[];
}

const MULTI_PART_TLDS = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'co.in', 'org.in', 'net.in', 'gov.in', 'ac.in',
  'com.au', 'com.br', 'co.jp', 'com.sg', 'co.nz', 'co.za', 'com.mx',
]);

/**
 * Extracts the registrable root domain (eTLD+1 heuristic) from a hostname.
 */
export function extractRootDomain(hostname: string): string {
  const clean = hostname.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  // Do not slice numeric IPv4 or bracketed IPv6 literals
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean) || clean.includes(':')) {
    return clean;
  }
  const parts = clean.split('.').filter(Boolean);
  if (parts.length <= 2) return clean;
  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (MULTI_PART_TLDS.has(lastTwo) && parts.length >= 3) {
    return `${parts[parts.length - 3]}.${lastTwo}`;
  }
  return lastTwo;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class DomainIntelService {
  /**
   * Executes passive DNS (MX/SPF/DMARC) and RDAP registration age lookups.
   */
  public static async inspectDomain(hostname: string, offlineMode: boolean = false): Promise<DomainAuthIntelResult> {
    const cleanHost = (hostname || '').trim().toLowerCase();
    const rootDomain = extractRootDomain(cleanHost);
    const result: DomainAuthIntelResult = {
      domain: cleanHost,
      rootDomain,
      domainAgeDays: null,
      registrationDate: null,
      isNewlyRegistered: false,
      hasMx: null,
      hasSpf: null,
      hasDmarc: null,
      positiveSignals: [],
      riskSignals: [],
    };

    if (!rootDomain || !rootDomain.includes('.') || /^\d{1,3}(\.\d{1,3}){3}$/.test(cleanHost) || cleanHost.includes(':')) {
      return result;
    }

    // 1. Passive DNS checks (MX, SPF, DMARC) with strict 2s timeout
    const [mxRes, txtRes, dmarcRes] = await Promise.allSettled([
      withTimeout(dns.resolveMx(rootDomain), 2000),
      withTimeout(dns.resolveTxt(rootDomain), 2000),
      withTimeout(dns.resolveTxt(`_dmarc.${rootDomain}`), 2000),
    ]);

    if (mxRes.status === 'fulfilled') {
      result.hasMx = Array.isArray(mxRes.value) && mxRes.value.length > 0;
    } else if (mxRes.reason?.code === 'ENODATA' || mxRes.reason?.code === 'ENOTFOUND') {
      result.hasMx = false;
    }

    if (txtRes.status === 'fulfilled') {
      const flatTxt = txtRes.value.map((chunks) => chunks.join('')).join('\n');
      result.hasSpf = /v=spf1\b/i.test(flatTxt);
    } else if (txtRes.reason?.code === 'ENODATA' || txtRes.reason?.code === 'ENOTFOUND') {
      result.hasSpf = false;
    }

    if (dmarcRes.status === 'fulfilled') {
      const flatDmarc = dmarcRes.value.map((chunks) => chunks.join('')).join('\n');
      result.hasDmarc = /v=DMARC1\b/i.test(flatDmarc);
    } else if (dmarcRes.reason?.code === 'ENODATA' || dmarcRes.reason?.code === 'ENOTFOUND') {
      result.hasDmarc = false;
    }

    // 2. Passive RDAP domain creation date check (skipped in strict offline mode)
    if (!offlineMode) {
      try {
        const rdapResp = await axios.get(`https://rdap.org/domain/${encodeURIComponent(rootDomain)}`, {
          timeout: 2500,
          headers: { Accept: 'application/rdap+json, application/json' },
          validateStatus: (s) => s >= 200 && s < 400,
        });
        const events = Array.isArray(rdapResp.data?.events) ? rdapResp.data.events : [];
        const regEvent = events.find(
          (e: any) =>
            typeof e?.eventAction === 'string' &&
            e.eventAction.toLowerCase() === 'registration' &&
            typeof e?.eventDate === 'string'
        );
        if (regEvent?.eventDate) {
          const parsedDate = new Date(regEvent.eventDate);
          if (!Number.isNaN(parsedDate.getTime())) {
            const ageDays = Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
            if (ageDays >= 0) {
              result.domainAgeDays = ageDays;
              result.registrationDate = parsedDate.toISOString().slice(0, 10);
              result.isNewlyRegistered = ageDays < 30;
            }
          }
        }
      } catch {
        // RDAP lookup is best-effort and fails silently when offline or unsupported by TLD
      }
    }

    // Synthesize human-readable domain intelligence signals
    if (result.isNewlyRegistered && result.domainAgeDays !== null) {
      result.riskSignals.push(
        `Domain Age Warning: ${rootDomain} was registered only ${result.domainAgeDays} days ago (${result.registrationDate}). Newly created domains are frequently used in phishing recruitment campaigns.`
      );
    } else if (result.domainAgeDays !== null && result.domainAgeDays >= 365) {
      const years = Math.floor(result.domainAgeDays / 365);
      result.positiveSignals.push(
        `Established Domain Registration: ${rootDomain} has been registered for ${years}+ year${years > 1 ? 's' : ''} (since ${result.registrationDate}).`
      );
    }

    if (result.hasMx && result.hasSpf && result.hasDmarc) {
      result.positiveSignals.push(
        `Verified Email Authentication: ${rootDomain} publishes valid MX, SPF, and DMARC records.`
      );
    } else if (result.hasMx === false && result.hasSpf === false && result.hasDmarc === false) {
      result.riskSignals.push(
        `Domain Email Infrastructure Missing: ${rootDomain} has no MX, SPF, or DMARC records configured.`
      );
    }

    return result;
  }
}
