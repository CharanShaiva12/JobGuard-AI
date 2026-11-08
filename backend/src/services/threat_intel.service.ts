/**
 * JobGuard AI - Threat Intelligence & Domain Reputation Layer
 * Module: backend.src.services.threat_intel.service
 * Purpose: Evaluates domains against cached threat taxonomy in MySQL 8.4
 *          (trusted ATS platforms, known phishing infrastructure, suspicious TLDs).
 * Policy: Never fabricates threat records. Distinguishes phishing from general abuse.
 */

import { query } from '../config/database.js';

export interface ThreatIntelReport {
  domain: string;
  category: 'trusted_enterprise' | 'phishing_host' | 'suspicious_tld' | 'disposable_webmail' | 'unknown';
  threatLevel: 'low' | 'medium' | 'high' | 'critical' | 'neutral';
  isTrustedATS: boolean;
  isFlaggedMalicious: boolean;
  threatDescription: string;
  source: string;
}

export class ThreatIntelService {
  /**
   * Queries threat intelligence database for a specific domain name or URL.
   */
  public static async evaluateDomain(rawUrlOrDomain: string): Promise<ThreatIntelReport> {
    if (!rawUrlOrDomain) {
      return {
        domain: '',
        category: 'unknown',
        threatLevel: 'neutral',
        isTrustedATS: false,
        isFlaggedMalicious: false,
        threatDescription: 'No domain provided for threat evaluation.',
        source: 'internal_cache',
      };
    }

    let hostname = rawUrlOrDomain.trim().toLowerCase();
    try {
      if (hostname.includes('://')) {
        const u = new URL(hostname);
        hostname = u.hostname;
      }
    } catch {
      // Keep as-is if raw domain
    }

    // Strip port if present
    hostname = hostname.split(':')[0];

    // 1. Query exact domain or parent suffix from threat_intel_domains
    try {
      const rows = await query<any[]>(
        'SELECT domain_name, category, threat_level, notes, source FROM threat_intel_domains'
      );

      for (const entry of rows) {
        const entryDomain = entry.domain_name.toLowerCase();

        // Exact match
        if (hostname === entryDomain) {
          return {
            domain: hostname,
            category: entry.category,
            threatLevel: entry.threat_level,
            isTrustedATS: entry.category === 'trusted_enterprise',
            isFlaggedMalicious: entry.category === 'phishing_host' || entry.threat_level === 'high' || entry.threat_level === 'critical',
            threatDescription: entry.notes || 'Identified in threat intelligence cache.',
            source: entry.source || 'JobGuard Threat Intel',
          };
        }

        // Subdomain match (e.g. candidate-apply.000webhostapp.com matches 000webhostapp.com)
        if (hostname.endsWith(`.${entryDomain}`)) {
          return {
            domain: hostname,
            category: entry.category,
            threatLevel: entry.threat_level,
            isTrustedATS: entry.category === 'trusted_enterprise',
            isFlaggedMalicious: entry.category === 'phishing_host' || entry.threat_level === 'high' || entry.threat_level === 'critical',
            threatDescription: `Subdomain of flagged domain: ${entryDomain}. ${entry.notes || ''}`.trim(),
            source: entry.source || 'JobGuard Threat Intel',
          };
        }

        // TLD match (e.g. .xyz, .top, .buzz)
        if (entryDomain.startsWith('.') && hostname.endsWith(entryDomain)) {
          return {
            domain: hostname,
            category: entry.category,
            threatLevel: entry.threat_level,
            isTrustedATS: false,
            isFlaggedMalicious: true,
            threatDescription: `Registered under suspicious top-level domain (${entryDomain}). ${entry.notes || ''}`.trim(),
            source: entry.source || 'JobGuard Threat Intel',
          };
        }
      }
    } catch (err: any) {
      console.warn(`[ThreatIntelService] Error querying threat intelligence cache: ${err.message}`);
    }

    return {
      domain: hostname,
      category: 'unknown',
      threatLevel: 'neutral',
      isTrustedATS: false,
      isFlaggedMalicious: false,
      threatDescription: 'Domain not observed in active threat intel feeds or verified ATS lists.',
      source: 'internal_cache',
    };
  }
}
