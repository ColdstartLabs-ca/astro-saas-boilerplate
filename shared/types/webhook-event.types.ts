/**
 * Webhook Event Types for Zapier/Make Integration
 *
 * Defines event types, payloads, and interfaces for outbound webhook events.
 * These events allow users to subscribe to AutopilotRank events via Zapier/Make.
 */

// =============================================================================
// Event Types
// =============================================================================

/**
 * All supported webhook event types
 */
export type WebhookEventType =
  | 'article.published'
  | 'article.approved'
  | 'article.generated'
  | 'campaign.completed'
  | 'opportunity.found';

/**
 * Array of all event types for validation
 */
export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'article.published',
  'article.approved',
  'article.generated',
  'campaign.completed',
  'opportunity.found',
];

// =============================================================================
// Event Payloads
// =============================================================================

/**
 * Base payload structure for all webhook events
 */
export interface IWebhookEventPayloadBase {
  /** Event type that triggered the webhook */
  event: WebhookEventType;
  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;
  /** User ID who owns the resource */
  userId: string;
}

/**
 * Article-related event data (common fields)
 */
export interface IArticleEventData {
  /** Article ID */
  id: string;
  /** Article title */
  title: string | null;
  /** Article slug */
  slug: string | null;
  /** Primary keyword */
  primaryKeyword: string;
  /** Word count */
  wordCount: number | null;
  /** SEO score */
  seoScore: number | null;
  /** Published URL (if published) */
  publishedUrl: string | null;
  /** Campaign ID */
  campaignId: string | null;
  /** Campaign name */
  campaignName: string | null;
  /** Project ID */
  projectId: string | null;
  /** Project name */
  projectName: string | null;
}

/**
 * Payload for article.published event
 */
export interface IArticlePublishedPayload extends IWebhookEventPayloadBase {
  event: 'article.published';
  data: IArticleEventData;
}

/**
 * Payload for article.approved event
 */
export interface IArticleApprovedPayload extends IWebhookEventPayloadBase {
  event: 'article.approved';
  data: IArticleEventData;
}

/**
 * Payload for article.generated event
 */
export interface IArticleGeneratedPayload extends IWebhookEventPayloadBase {
  event: 'article.generated';
  data: IArticleEventData;
}

/**
 * Campaign completion data
 */
export interface ICampaignCompletedData {
  /** Campaign ID */
  id: string;
  /** Campaign name */
  name: string;
  /** Project ID */
  projectId: string | null;
  /** Project name */
  projectName: string | null;
  /** Total articles generated */
  totalArticles: number;
  /** Number of published articles */
  publishedArticles: number;
  /** Number of approved articles */
  approvedArticles: number;
}

/**
 * Payload for campaign.completed event
 */
export interface ICampaignCompletedPayload extends IWebhookEventPayloadBase {
  event: 'campaign.completed';
  data: ICampaignCompletedData;
}

/**
 * Opportunity data for webhook events
 */
export interface IOpportunityFoundData {
  /** Opportunity ID */
  id: string;
  /** Opportunity type */
  type: string;
  /** Opportunity title */
  title: string;
  /** Opportunity description */
  description: string;
  /** Query keyword */
  query: string | null;
  /** Page URL */
  pageUrl: string | null;
  /** Estimated impact */
  estimatedImpact: string;
  /** Priority score */
  priorityScore: number;
  /** Project ID */
  projectId: string;
  /** Project name */
  projectName: string | null;
}

/**
 * Payload for opportunity.found event
 */
export interface IOpportunityFoundPayload extends IWebhookEventPayloadBase {
  event: 'opportunity.found';
  data: IOpportunityFoundData;
}

/**
 * Union type for all webhook event payloads
 */
export type IWebhookEventPayload =
  | IArticlePublishedPayload
  | IArticleApprovedPayload
  | IArticleGeneratedPayload
  | ICampaignCompletedPayload
  | IOpportunityFoundPayload;

// =============================================================================
// Webhook Subscription
// =============================================================================

/**
 * Webhook subscription record from database
 */
export interface IWebhookSubscription {
  id: string;
  user_id: string;
  event_type: WebhookEventType;
  target_url: string;
  secret: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Safe webhook subscription (without secret) for API responses
 */
export type IWebhookSubscriptionSafe = Omit<IWebhookSubscription, 'secret'>;

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Input for subscribing to a webhook event
 */
export interface ISubscribeWebhookInput {
  /** Event type to subscribe to */
  eventType: WebhookEventType;
  /** Webhook URL to receive events (Zapier/Make webhook URL) */
  targetUrl: string;
  /** Optional secret for HMAC signature (auto-generated if not provided) */
  secret?: string;
}

/**
 * Input for unsubscribing from a webhook event
 */
export interface IUnsubscribeWebhookInput {
  /** Subscription ID to delete */
  subscriptionId: string;
}

/**
 * Input for toggling subscription active status
 */
export interface IToggleWebhookInput {
  /** Subscription ID to toggle */
  subscriptionId: string;
  /** New active status */
  active: boolean;
}

/**
 * Response from subscribing to a webhook
 */
export interface ISubscribeWebhookResponse {
  subscription: IWebhookSubscriptionSafe;
}

/**
 * Response from listing webhook subscriptions
 */
export interface IListWebhookSubscriptionsResponse {
  subscriptions: IWebhookSubscriptionSafe[];
}

// =============================================================================
// Delivery Tracking
// =============================================================================

/**
 * Status of a webhook delivery attempt
 */
export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

/**
 * Record of a webhook delivery attempt (for logging/debugging)
 */
export interface IWebhookDeliveryAttempt {
  subscriptionId: string;
  eventType: WebhookEventType;
  targetUrl: string;
  status: WebhookDeliveryStatus;
  attemptNumber: number;
  responseStatus?: number;
  errorMessage?: string;
  timestamp: string;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when webhook subscription is not found
 */
export class WebhookSubscriptionNotFoundError extends Error {
  public readonly subscriptionId: string;

  constructor(subscriptionId: string) {
    super(`Webhook subscription not found: ${subscriptionId}`);
    this.name = 'WebhookSubscriptionNotFoundError';
    this.subscriptionId = subscriptionId;
  }
}

/**
 * Error thrown when webhook delivery fails
 */
export class WebhookDeliveryError extends Error {
  public readonly targetUrl: string;
  public readonly statusCode?: number;

  constructor(targetUrl: string, message: string, statusCode?: number) {
    super(`Webhook delivery failed: ${message}`);
    this.name = 'WebhookDeliveryError';
    this.targetUrl = targetUrl;
    this.statusCode = statusCode;
  }
}
