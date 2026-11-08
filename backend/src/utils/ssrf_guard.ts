/**
 * JobGuard AI - Server-Side Request Forgery (SSRF) Protection Guard
 * Module: backend.src.utils.ssrf_guard
 * Purpose: Validates external URLs, verifies DNS resolution, and strictly blocks
 *          private, loopback, link-local, and internal cloud metadata addresses.
 */

import dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';

const lookupAsync = promisify(dns.lookup);

// Private IPv4 ranges (RFC 1918, RFC 3927, RFC 5737, Loopback, Cloud Metadata)
const PRIVATE_IPV4_PATTERNS = [
  /^127\./,                         // Loopback (127.0.0.0/8)
  /^10\./,                          // Class A Private (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B Private (172.16.0.0/12)
  /^192\.168\./,                    // Class C Private (192.168.0.0/16)
  /^169\.254\./,                    // Link-Local / AWS/GCP Metadata (169.254.0.0/16)
  /^0\./,                           // Current Network
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // Carrier-grade NAT
  /^192\.0\.2\./,                   // TEST-NET-1
  /^198\.51\.100\./,                // TEST-NET-2
  /^203\.0\.113\./,                 // TEST-NET-3
  /^224\./,                         // Multicast (224.0.0.0/4)
  /^240\./,                         // Reserved
  /^255\.255\.255\.255$/,           // Broadcast
];

// Private IPv6 patterns
const PRIVATE_IPV6_PATTERNS = [
  /^::1$/,                          // Loopback
  /^::$/,                           // Unspecified
  /^fc00:/i,                        // Unique Local Address (ULA)
  /^fd[0-9a-f]{2}:/i,               // Unique Local Address (ULA)
  /^fe80:/i,                        // Link-Local Unicast
  /^ff[0-9a-f]{2}:/i,               // Multicast
];

export interface SSRFValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  hostname?: string;
  ipAddress?: string;
  error?: string;
}

/**
 * Validates a target URL against SSRF vulnerabilities before any outbound request.
 *
 * Algorithm:
 * 1. Verifies protocol is strictly 'http:' or 'https:'.
 * 2. Rejects local hostnames ('localhost', '*.local', '*.internal').
 * 3. Resolves the DNS A/AAAA record using system resolver.
 * 4. Checks the resolved IP against all known RFC private, link-local, and metadata ranges.
 */
export async function validateUrlForSSRF(rawUrl: string): Promise<SSRFValidationResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Empty or invalid URL provided.' };
  }

  const trimmed = rawUrl.trim();
  let parsedUrl: URL;

  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsedUrl = new URL(withScheme);
  } catch {
    return { isValid: false, error: 'Malformed URL structure.' };
  }

  // 1. Restrict scheme to HTTP and HTTPS
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { isValid: false, error: `Disallowed URL protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 2. Reject internal and loopback hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname === '169.254.169.254' || // Cloud instance metadata IP
    hostname === 'metadata.google.internal'
  ) {
    return { isValid: false, error: 'Access to local, internal, or cloud metadata targets is forbidden.' };
  }

  // 3. Resolve DNS to get physical target IP
  try {
    const lookup = await lookupAsync(hostname);
    const resolvedIp = lookup.address;

    // Check IPv4 rules
    if (lookup.family === 4) {
      for (const pattern of PRIVATE_IPV4_PATTERNS) {
        if (pattern.test(resolvedIp)) {
          return {
            isValid: false,
            hostname,
            ipAddress: resolvedIp,
            error: `Resolved IP (${resolvedIp}) belongs to a restricted private or link-local address range.`,
          };
        }
      }
    }

    // Check IPv6 rules
    if (lookup.family === 6) {
      for (const pattern of PRIVATE_IPV6_PATTERNS) {
        if (pattern.test(resolvedIp)) {
          return {
            isValid: false,
            hostname,
            ipAddress: resolvedIp,
            error: `Resolved IPv6 (${resolvedIp}) belongs to a restricted internal or link-local address range.`,
          };
        }
      }
    }

    return {
      isValid: true,
      sanitizedUrl: parsedUrl.toString(),
      hostname,
      ipAddress: resolvedIp,
    };
  } catch (err: any) {
    return {
      isValid: false,
      hostname,
      error: `DNS resolution failed for hostname '${hostname}': ${err.message}`,
    };
  }
}
