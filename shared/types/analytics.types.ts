/**
 * Analytics event taxonomy and type definitions.
 *
 * All custom events follow a consistent naming convention:
 * - snake_case for event names
 * - Properties are camelCase
 *
 * These types are shared between client and server for consistent analytics tracking.
 */

// =============================================================================
// Event Properties
// =============================================================================

export interface IPageViewProperties {
  path: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface ISignupProperties {
  method: 'email' | 'google' | 'facebook' | 'azure';
}

export interface ISubscriptionProperties {
  plan: 'starter' | 'growth' | 'agency';
  amountCents: number;
  billingInterval: 'monthly' | 'yearly';
  currency?: string;
}

export interface ICreditPackProperties {
  pack: 'small' | 'medium' | 'large';
  amountCents: number;
  credits: number;
  currency?: string;
}

// Generic API operation event properties for boilerplate
export interface IApiCallProperties {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  durationMs: number;
  success: boolean;
  creditsCost?: number;
}

// =============================================================================
// PMF & Revenue Events (SaaS Boilerplate specific)
// =============================================================================

export interface IArticleGeneratedProperties {
  article_id: string;
  user_id: string;
  keyword: string;
  word_count: number;
  seo_score?: number;
  credits_used: number;
  model_used: string;
  duration_ms: number;
  success: boolean;
  error_message?: string;
}

export interface IArticlePublishedProperties {
  article_id: string;
  user_id: string;
  cms_type: 'wordpress' | 'shopify' | 'webflow' | 'manual';
  status: 'success' | 'failed';
  url?: string;
}

export interface IProjectCreatedProperties {
  project_id: string;
  domain?: string;
  industry?: string;
  cms_type: 'wordpress' | 'shopify' | 'webflow' | 'other';
  gsc_connected: boolean;
}

export interface ISeanEllisResponseProperties {
  response: 'very_disappointed' | 'somewhat_disappointed' | 'not_disappointed';
  days_as_user: number;
  articles_published: number;
}

export interface ISubscriptionExpansionProperties {
  previous_plan: 'trial' | 'starter' | 'growth' | 'agency';
  new_plan: 'starter' | 'growth' | 'agency';
  previous_amount_cents: number;
  new_amount_cents: number;
  trigger: 'usage_limit' | 'feature_request' | 'downgrade';
}

// =============================================================================
// Event Types
// =============================================================================

export type IAnalyticsEventName =
  // Page and session events
  | 'page_view'
  // Authentication events
  | 'signup_started'
  | 'signup_completed'
  | 'login'
  | 'logout'
  // Subscription events
  | 'subscription_created'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'upgrade_started'
  // Credit events
  | 'credit_pack_purchased'
  | 'credits_deducted'
  | 'credits_refunded'
  | 'credits_low_warning'
  // Content/Article events (SaaS Boilerplate)
  | 'project_created'
  | 'article_generation_started'
  | 'article_generated'
  | 'article_published'
  | 'campaign_created'
  // PMF events
  | 'sean_ellis_survey_shown'
  | 'sean_ellis_survey_completed'
  | 'onboarding_completed'
  // Generic API operation events (replace with your specific events)
  | 'api_call_completed'
  | 'content_downloaded'
  // Checkout events
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned'
  // Error/limit events (server-side only)
  | 'rate_limit_exceeded'
  | 'processing_failed'
  // Batch/limit events
  | 'batch_limit_modal_shown'
  | 'batch_limit_upgrade_clicked'
  | 'batch_limit_partial_add_clicked'
  | 'batch_limit_modal_closed';

export interface IAnalyticsEvent {
  name: IAnalyticsEventName;
  properties?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
}

// =============================================================================
// User Identity
// =============================================================================

export interface IUserIdentity {
  userId: string;
  email?: string; // Raw email for hashing (will be hashed client-side)
  emailHash?: string; // Pre-computed SHA-256 hash, never raw email
  createdAt?: string;
  subscriptionTier?: string;
}

// =============================================================================
// Consent
// =============================================================================

export type IConsentStatus = 'granted' | 'denied' | 'pending';

export interface IAnalyticsConsent {
  analytics: IConsentStatus;
  marketing: IConsentStatus;
  updatedAt: number;
}
