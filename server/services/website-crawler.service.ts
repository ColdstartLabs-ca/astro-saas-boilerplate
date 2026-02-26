/**
 * Website Crawler Service
 * Lightweight service for fetching website metadata
 *
 * Handles:
 * - Fetching HTML content from URLs with SSRF protection
 * - Extracting title and meta description via regex (no DOM API - Cloudflare Workers compatible)
 * - URL validation (blocks private IPs, localhost, non-HTTP protocols)
 */

// =============================================================================
// Constants
// =============================================================================

/** Maximum time to wait for a response (10 seconds) */
const FETCH_TIMEOUT_MS = 10_000;

/** Maximum response size to process (5MB) */
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/** User agent for requests */
const USER_AGENT = 'AutopilotRank-Crawler/1.0 (+https://autopilotrank.com)';

// =============================================================================
// Types
// =============================================================================

/**
 * Metadata extracted from a webpage
 */
export interface IWebsiteMetadata {
  title: string | null;
  description: string | null;
}

/**
 * Custom error for invalid URLs
 */
export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

/**
 * Custom error for SSRF attempts
 */
export class SsrProtectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrProtectionError';
  }
}

/**
 * Custom error for timeout
 */
export class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

/**
 * Custom error for non-HTML responses
 */
export class NonHtmlResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonHtmlResponseError';
  }
}

// =============================================================================
// SSRF Protection
// =============================================================================

/**
 * Private IP ranges that should be blocked for SSRF protection
 */
const PRIVATE_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 - Loopback
  /^10\./, // 10.0.0.0/8 - Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 - Class B private
  /^192\.168\./, // 192.168.0.0/16 - Class C private
  /^169\.254\./, // 169.254.0.0/16 - Link-local
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
  'metadata.google.internal', // GCP metadata
  'metadata', // GCP metadata
  'kubernetes.default', // K8s internal
  'kubernetes.default.svc',
];

/**
 * Validates a URL and checks for SSRF attempts
 * @throws {InvalidUrlError} If the URL is not a valid HTTP/HTTPS URL
 * @throws {SsrProtectionError} If the URL points to a blocked address
 */
function validateUrl(urlString: string): URL {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    throw new InvalidUrlError('Invalid URL format');
  }

  // Only allow HTTP and HTTPS protocols
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidUrlError('Only HTTP and HTTPS protocols are allowed');
  }

  const hostname = url.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new SsrProtectionError('Access to this hostname is blocked');
  }

  // Check for IP addresses that look like private ranges
  // This regex matches IPv4 addresses
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Pattern);

  if (match) {
    const ip = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;

    // Validate each octet is 0-255
    for (let i = 1; i <= 4; i++) {
      const octet = parseInt(match[i], 10);
      if (octet < 0 || octet > 255) {
        throw new InvalidUrlError('Invalid IP address');
      }
    }

    // Check private IP ranges
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(ip)) {
        throw new SsrProtectionError('Access to private IP addresses is blocked');
      }
    }
  }

  // Check for IPv6 private addresses
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new SsrProtectionError('Access to private IP addresses is blocked');
    }
  }

  return url;
}

// =============================================================================
// HTML Parsing (Regex-based for Cloudflare Workers compatibility)
// =============================================================================

/**
 * Extract title from HTML using regex
 * Looks for <title>...</title> tags
 */
function extractTitle(html: string): string | null {
  // Match <title>content</title> (case-insensitive)
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    // Decode HTML entities and trim
    return decodeHtmlEntities(titleMatch[1].trim());
  }
  return null;
}

/**
 * Extract meta description from HTML using regex
 * Looks for <meta name="description" content="...">
 */
function extractDescription(html: string): string | null {
  // Match <meta name="description" content="..."> (case-insensitive, handles attribute order variations)
  const patterns = [
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
    /<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i,
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']\s*\/?>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

// =============================================================================
// Website Crawler Service Class
// =============================================================================

export class WebsiteCrawlerService {
  /**
   * Fetch metadata from a URL
   *
   * @param url The URL to fetch metadata from
   * @returns The extracted title and description
   * @throws {InvalidUrlError} If the URL is invalid
   * @throws {SsrProtectionError} If the URL is blocked for SSRF protection
   * @throws {FetchTimeoutError} If the request times out
   * @throws {NonHtmlResponseError} If the response is not HTML
   */
  async fetchMetadata(url: string): Promise<IWebsiteMetadata> {
    console.info('[WebsiteCrawlerService] Starting metadata fetch', { url });

    // Validate URL and check for SSRF
    validateUrl(url);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,text/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new NonHtmlResponseError(`Expected HTML content, got: ${contentType}`);
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
        throw new Error(`Response too large: ${contentLength} bytes (max: ${MAX_RESPONSE_SIZE})`);
      }

      // Read the response body with size limit
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        totalSize += value.length;

        if (totalSize > MAX_RESPONSE_SIZE) {
          reader.cancel();
          throw new Error(`Response too large: exceeded ${MAX_RESPONSE_SIZE} bytes`);
        }

        chunks.push(value);
      }

      // Combine chunks and decode
      const htmlBytes = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        htmlBytes.set(chunk, offset);
        offset += chunk.length;
      }

      // Decode as UTF-8 (fallback to latin1 if invalid)
      let html: string;
      try {
        html = new TextDecoder('utf-8', { fatal: true }).decode(htmlBytes);
      } catch {
        html = new TextDecoder('latin1').decode(htmlBytes);
      }

      // Extract metadata using regex
      const title = extractTitle(html);
      const description = extractDescription(html);

      console.info('[WebsiteCrawlerService] Metadata extracted successfully', {
        url,
        title,
        hasDescription: !!description,
        htmlSizeBytes: totalSize,
      });

      return { title, description };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[WebsiteCrawlerService] Request timed out', { url });
        throw new FetchTimeoutError(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
      }

      // Re-throw our custom errors
      if (
        error instanceof InvalidUrlError ||
        error instanceof SsrProtectionError ||
        error instanceof NonHtmlResponseError ||
        error instanceof FetchTimeoutError
      ) {
        throw error;
      }

      // Wrap other errors
      if (error instanceof Error) {
        console.error('[WebsiteCrawlerService] Fetch failed', { url, error: error.message });
        throw new Error(`Failed to fetch URL: ${error.message}`);
      }

      console.error('[WebsiteCrawlerService] Fetch failed with unknown error', { url });
      throw new Error('Failed to fetch URL: Unknown error');
    }
  }
}

// Export singleton instance
export const websiteCrawlerService = new WebsiteCrawlerService();
