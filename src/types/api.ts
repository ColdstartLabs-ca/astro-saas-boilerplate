/**
 * Shared types for Astro API endpoints
 */

import type { RegionalCurrency } from '@shared/config/regional-pricing';

/**
 * Portal request body
 */
export interface IPortalRequest {
  returnUrl?: string;
}

/**
 * Astro Locals interface for user context set by middleware
 */
export interface ILocals {
  userId?: string;
  userEmail?: string;
  /** Regional currency for price display (detected from CF-IPCountry) */
  currency: RegionalCurrency | null;
}
