/**
 * Webhook Event Service
 *
 * Handles webhook subscriptions and event dispatch for Zapier/Make integration.
 * Uses HMAC-SHA256 signatures for payload verification.
 * Implements fire-and-forget delivery with exponential backoff retries.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type {
  WebhookEventType,
  IWebhookSubscription,
  IWebhookEventPayload,
  IArticleEventData,
  ICampaignCompletedData,
  IOpportunityFoundData,
  ISubscribeWebhookInput,
  IWebhookSubscriptionSafe,
} from '@shared/types/webhook-event.types';
import { WebhookSubscriptionNotFoundError } from '@shared/types/webhook-event.types';

/**
 * Simple service logger for service-level logging
 */
const serviceLogger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(`[WebhookEventService] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[WebhookEventService] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
    console.error(`[WebhookEventService] ${message}`, error, meta ? JSON.stringify(meta) : '');
  },
};

/**
 * Configuration for retry behavior
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
};

/**
 * Generate a random secret for webhook subscriptions
 * @returns A 32-character random hex string
 */
function generateSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create HMAC-SHA256 signature for webhook payload
 *
 * @param payload - The JSON stringified payload
 * @param secret - The subscription secret
 * @returns Hex-encoded signature
 */
async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate delay for exponential backoff
 *
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Webhook Event Service class
 */
export class WebhookEventService {
  /**
   * Subscribe to a webhook event
   *
   * @param userId - User ID subscribing
   * @param input - Subscription input
   * @returns Created subscription (without secret)
   */
  async subscribe(userId: string, input: ISubscribeWebhookInput): Promise<IWebhookSubscriptionSafe> {
    const secret = input.secret || generateSecret();

    const { data, error } = await supabaseAdmin
      .from('webhook_subscriptions')
      .insert({
        user_id: userId,
        event_type: input.eventType,
        target_url: input.targetUrl,
        secret,
        active: true,
      })
      .select('id, user_id, event_type, target_url, active, created_at, updated_at')
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error(
          `Already subscribed to ${input.eventType} events at this URL`
        );
      }
      serviceLogger.error('Failed to create webhook subscription', error);
      throw new Error('Failed to create webhook subscription');
    }

    serviceLogger.info('Created webhook subscription', {
      subscriptionId: data.id,
      userId,
      eventType: input.eventType,
    });

    // Return the subscription with the generated secret for the user to save
    // Note: The secret is only returned once during creation
    return {
      ...data,
      secret, // Include secret in the initial response so user can verify webhooks
    } as IWebhookSubscriptionSafe & { secret: string };
  }

  /**
   * Unsubscribe from a webhook event
   *
   * @param userId - User ID
   * @param subscriptionId - Subscription ID to delete
   */
  async unsubscribe(userId: string, subscriptionId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhook_subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('user_id', userId);

    if (error) {
      serviceLogger.error('Failed to delete webhook subscription', error);
      throw new Error('Failed to delete webhook subscription');
    }

    serviceLogger.info('Deleted webhook subscription', { subscriptionId, userId });
  }

  /**
   * Toggle subscription active status
   *
   * @param userId - User ID
   * @param subscriptionId - Subscription ID
   * @param active - New active status
   * @returns Updated subscription
   */
  async toggleActive(
    userId: string,
    subscriptionId: string,
    active: boolean
  ): Promise<IWebhookSubscriptionSafe> {
    const { data, error } = await supabaseAdmin
      .from('webhook_subscriptions')
      .update({ active })
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select('id, user_id, event_type, target_url, active, created_at, updated_at')
      .single();

    if (error || !data) {
      throw new WebhookSubscriptionNotFoundError(subscriptionId);
    }

    serviceLogger.info('Toggled webhook subscription', {
      subscriptionId,
      active,
    });

    return data as IWebhookSubscriptionSafe;
  }

  /**
   * List all subscriptions for a user
   *
   * @param userId - User ID
   * @returns List of subscriptions (without secrets)
   */
  async list(userId: string): Promise<IWebhookSubscriptionSafe[]> {
    const { data, error } = await supabaseAdmin
      .from('webhook_subscriptions')
      .select('id, user_id, event_type, target_url, active, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      serviceLogger.error('Failed to list webhook subscriptions', error);
      throw new Error('Failed to list webhook subscriptions');
    }

    return (data || []) as IWebhookSubscriptionSafe[];
  }

  /**
   * Get all active subscriptions for a user and event type
   *
   * @param userId - User ID
   * @param eventType - Event type
   * @returns List of active subscriptions with secrets
   */
  private async getActiveSubscriptions(
    userId: string,
    eventType: WebhookEventType
  ): Promise<IWebhookSubscription[]> {
    const { data, error } = await supabaseAdmin
      .from('webhook_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .eq('active', true);

    if (error) {
      serviceLogger.error('Failed to get webhook subscriptions', error);
      return [];
    }

    return (data || []) as IWebhookSubscription[];
  }

  /**
   * Deliver a webhook to a single subscription with retries
   *
   * @param subscription - Subscription to deliver to
   * @param payload - Event payload
   * @returns True if delivery succeeded
   */
  private async deliverWithRetry(
    subscription: IWebhookSubscription,
    payload: IWebhookEventPayload
  ): Promise<boolean> {
    const payloadString = JSON.stringify(payload);
    const signature = await createSignature(payloadString, subscription.secret);

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(subscription.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AutopilotRank-Signature': `sha256=${signature}`,
            'X-AutopilotRank-Event': payload.event,
            'User-Agent': 'AutopilotRank-Webhook/1.0',
          },
          body: payloadString,
        });

        if (response.ok) {
          serviceLogger.info('Webhook delivered successfully', {
            subscriptionId: subscription.id,
            eventType: payload.event,
            attempt: attempt + 1,
            statusCode: response.status,
          });
          return true;
        }

        // Non-2xx response - log and retry if we have attempts left
        serviceLogger.warn('Webhook delivery failed with non-2xx status', {
          subscriptionId: subscription.id,
          statusCode: response.status,
          attempt: attempt + 1,
        });

        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          return false;
        }
      } catch (error) {
        serviceLogger.warn('Webhook delivery attempt failed', {
          subscriptionId: subscription.id,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Wait before retrying (exponential backoff)
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        await sleep(delay);
      }
    }

    serviceLogger.error('Webhook delivery failed after all retries', {
      subscriptionId: subscription.id,
      eventType: payload.event,
      targetUrl: subscription.target_url,
    });

    return false;
  }

  /**
   * Dispatch an event to all active subscribers
   * This is the main entry point for firing webhook events.
   * Uses fire-and-forget pattern - errors are logged but don't block the caller.
   *
   * @param userId - User ID
   * @param eventType - Event type
   * @param data - Event-specific data
   * @returns Promise that resolves when all deliveries are attempted
   */
  async dispatch<T extends WebhookEventType>(
    userId: string,
    eventType: T,
    data: Extract<IWebhookEventPayload, { event: T }>['data']
  ): Promise<void> {
    // Get all active subscriptions for this user and event
    const subscriptions = await this.getActiveSubscriptions(userId, eventType);

    if (subscriptions.length === 0) {
      serviceLogger.info('No active subscriptions for event', { userId, eventType });
      return;
    }

    // Build the payload
    const payload: IWebhookEventPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      userId,
      data,
    } as IWebhookEventPayload;

    serviceLogger.info('Dispatching webhook event', {
      userId,
      eventType,
      subscriberCount: subscriptions.length,
    });

    // Deliver to all subscribers in parallel (fire-and-forget)
    const deliveryPromises = subscriptions.map(subscription =>
      this.deliverWithRetry(subscription, payload).catch(error => {
        // Log but don't throw - fire and forget
        serviceLogger.error('Webhook delivery error', error, {
          subscriptionId: subscription.id,
        });
        return false;
      })
    );

    // Wait for all deliveries to complete (or fail)
    const results = await Promise.all(deliveryPromises);

    const successCount = results.filter(Boolean).length;
    serviceLogger.info('Webhook dispatch completed', {
      userId,
      eventType,
      total: subscriptions.length,
      successful: successCount,
      failed: subscriptions.length - successCount,
    });
  }

  /**
   * Build article event data from article record
   *
   * @param article - Article record from database
   * @param campaign - Optional campaign info
   * @param project - Optional project info
   * @returns Article event data for webhook payload
   */
  buildArticleEventData(
    article: {
      id: string;
      title: string | null;
      slug: string | null;
      primary_keyword: string;
      word_count: number | null;
      seo_score: number | null;
      published_url: string | null;
      campaign_id: string | null;
      project_id: string | null;
    },
    campaign?: { id: string; name: string } | null,
    project?: { id: string; name: string } | null
  ): IArticleEventData {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      primaryKeyword: article.primary_keyword,
      wordCount: article.word_count,
      seoScore: article.seo_score,
      publishedUrl: article.published_url,
      campaignId: article.campaign_id,
      campaignName: campaign?.name ?? null,
      projectId: article.project_id,
      projectName: project?.name ?? null,
    };
  }

  /**
   * Build campaign completed data from campaign record
   *
   * @param campaign - Campaign record with stats
   * @param project - Optional project info
   * @returns Campaign completed data for webhook payload
   */
  buildCampaignCompletedData(
    campaign: {
      id: string;
      name: string;
      project_id: string | null;
    },
    stats: {
      totalArticles: number;
      publishedArticles: number;
      approvedArticles: number;
    },
    project?: { id: string; name: string } | null
  ): ICampaignCompletedData {
    return {
      id: campaign.id,
      name: campaign.name,
      projectId: campaign.project_id,
      projectName: project?.name ?? null,
      ...stats,
    };
  }

  /**
   * Build opportunity found data from opportunity record
   *
   * @param opportunity - Opportunity record
   * @param project - Project info
   * @returns Opportunity found data for webhook payload
   */
  buildOpportunityFoundData(
    opportunity: {
      id: string;
      type: string;
      title: string;
      description: string;
      query: string | null;
      page_url: string | null;
      estimated_impact: string;
      priority_score: number;
      project_id: string;
    },
    project?: { id: string; name: string } | null
  ): IOpportunityFoundData {
    return {
      id: opportunity.id,
      type: opportunity.type,
      title: opportunity.title,
      description: opportunity.description,
      query: opportunity.query,
      pageUrl: opportunity.page_url,
      estimatedImpact: opportunity.estimated_impact,
      priorityScore: opportunity.priority_score,
      projectId: opportunity.project_id,
      projectName: project?.name ?? null,
    };
  }
}

/**
 * Singleton instance
 */
export const webhookEventService = new WebhookEventService();
