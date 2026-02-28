/**
 * SSRF Guard Utility
 *
 * Shared utility for validating URLs before making outbound server-side
 * HTTP requests. Prevents Server-Side Request Forgery (SSRF) attacks by
 * blocking requests to private IP ranges, loopback addresses, cloud metadata
 * endpoints, and non-HTTPS URLs.
 */

import { serverEnv } from '@shared/config/env';

/**
 * Private IP ranges that should be blocked for SSRF protection
 */
const PRIVATE_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 - Loopback
  /^10\./, // 10.0.0.0/8 - Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 - Class B private
  /^192\.168\./, // 192.168.0.0/16 - Class C private
  /^169\.254\./, // 169.254.0.0/16 - Link-local / cloud metadata
  /^0\.0\.0\.0$/, // 0.0.0.0 - All interfaces
  /^255\.255\.255\.255$/, // Broadcast
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 ULA
  /^fe80:/i, // IPv6 link-local
  /^::$/, // IPv6 unspecified
];

/**
 * Blocked hostnames for SSRF protection
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  '169.254.169.254', // AWS / Azure metadata endpoint
  'metadata.google.internal', // GCP metadata
  'metadata', // GCP metadata short name
  'kubernetes.default', // K8s internal
  'kubernetes.default.svc',
];

/**
 * Validate a URL string for use as a webhook or outbound HTTP target.
 *
 * Returns `true` if the URL is safe to fetch.
 * Returns `false` if the URL should be blocked.
 *
 * Rules enforced:
 * - Must be HTTPS (HTTP allowed only in test/development environments)
 * - Hostname must not be a loopback, private, or metadata address
 *
 * @param urlString - The URL to validate
 * @returns boolean indicating whether the URL is safe to use
 */
export function validateWebhookUrl(urlString: string): boolean {
  let parsed: URL;

  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  const isTestOrDev =
    serverEnv.ENV === 'test' || serverEnv.ENV === 'development';

  // Require HTTPS in production; allow HTTP in test/dev
  if (parsed.protocol === 'https:') {
    // Always allowed
  } else if (parsed.protocol === 'http:' && isTestOrDev) {
    // Allowed in non-production environments only
  } else {
    return false;
  }

  // URL API wraps IPv6 addresses in brackets (e.g. "[::1]") — strip them for pattern matching
  const rawHostname = parsed.hostname.toLowerCase();
  const hostname =
    rawHostname.startsWith('[') && rawHostname.endsWith(']')
      ? rawHostname.slice(1, -1)
      : rawHostname;

  // Check explicitly blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return false;
  }

  // Check IPv4 private ranges
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Pattern);

  if (ipv4Match) {
    // Validate each octet is 0-255
    for (let i = 1; i <= 4; i++) {
      const octet = parseInt(ipv4Match[i], 10);
      if (octet < 0 || octet > 255) {
        return false;
      }
    }

    const ip = `${ipv4Match[1]}.${ipv4Match[2]}.${ipv4Match[3]}.${ipv4Match[4]}`;
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(ip)) {
        return false;
      }
    }
  }

  // Check IPv6 private/loopback patterns on the de-bracketed hostname
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return false;
    }
  }

  return true;
}
