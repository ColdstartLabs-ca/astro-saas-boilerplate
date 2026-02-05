/**
 * Shared types for Astro API endpoints
 */

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
}
