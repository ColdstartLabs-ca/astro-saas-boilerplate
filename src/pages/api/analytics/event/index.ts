import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createLogger } from '@server/monitoring/logger';
import { trackServerEvent } from '@server/analytics';
import { serverEnv } from '@shared/config/env';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { serializeError } from '@shared/utils/errors';
import type { IAnalyticsEventName } from '@server/analytics/types';

// Allowed event names for security - matches IAnalyticsEventName type
const ALLOWED_EVENTS = [
  // Page and session events
  'page_view',

  // Authentication events
  'signup_started',
  'signup_completed',
  'login',
  'logout',

  // Subscription events
  'subscription_created',
  'subscription_canceled',
  'subscription_renewed',
  'subscription_upgraded',
  'subscription_downgraded',
  'upgrade_started',

  // Credit events
  'credit_pack_purchased',
  'credits_deducted',
  'credits_refunded',
  'credits_low_warning',

  // Content/Article events (SaaS Boilerplate)
  'project_created',
  'article_generation_started',
  'article_generated',
  'article_published',
  'campaign_created',

  // PMF events
  'sean_ellis_survey_shown',
  'sean_ellis_survey_completed',
  'onboarding_completed',

  // Generic API operation events
  'api_call_completed',
  'content_downloaded',

  // Checkout events
  'checkout_started',
  'checkout_completed',
  'checkout_abandoned',

  // Error/limit events (server-side only)
  'rate_limit_exceeded',
  'processing_failed',

  // Batch limit events
  'batch_limit_modal_shown',
  'batch_limit_upgrade_clicked',
  'batch_limit_partial_add_clicked',
  'batch_limit_modal_closed',
] as const;

// Enhanced security validation for event names
const validateEventNameSecurity = (eventName: string): { valid: boolean; reason?: string } => {
  // Check for null bytes first
  if (eventName.includes('\x00')) {
    return {
      valid: false,
      reason: 'Null byte detected',
    };
  }

  // Check for directory traversal
  if (eventName.includes('../') || eventName.includes('..\\')) {
    return {
      valid: false,
      reason: 'Directory traversal detected',
    };
  }

  // Check for script tags
  if (
    eventName.includes('<script>') ||
    eventName.includes('</script>') ||
    eventName.toLowerCase().includes('<script')
  ) {
    return {
      valid: false,
      reason: 'Script tag detected',
    };
  }

  // Check for SQL keywords
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 'CREATE', 'ALTER'];
  const upperEventName = eventName.toUpperCase();
  for (const keyword of sqlKeywords) {
    if (upperEventName.includes(keyword)) {
      return {
        valid: false,
        reason: `SQL keyword detected: ${keyword}`,
      };
    }
  }

  // Check for template injection
  if (eventName.includes('${') || eventName.includes('}}')) {
    return {
      valid: false,
      reason: 'Template injection detected',
    };
  }

  // Check for prototype pollution
  if (
    eventName.includes('__proto__') ||
    eventName.includes('constructor') ||
    eventName.includes('prototype')
  ) {
    return {
      valid: false,
      reason: 'Prototype pollution detected',
    };
  }

  // Check for quotes (malicious usage)
  if (
    (eventName.includes("'") || eventName.includes('"')) &&
    !ALLOWED_EVENTS.includes(eventName as IAnalyticsEventName)
  ) {
    return {
      valid: false,
      reason: 'Suspicious quote characters detected',
    };
  }

  return { valid: true };
};

const eventSchema = z.object({
  eventName: z.enum(ALLOWED_EVENTS),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
});

/**
 * POST /api/analytics/event
 *
 * Relay analytics events to Amplitude via server-side HTTP API.
 * Supports both authenticated and anonymous (marketing funnel) events.
 */
export const POST: APIRoute = async ({ request }) => {
  const logger = createLogger(request, 'analytics-event');

  try {
    // 1. Check for empty request body
    const contentLength = request.headers.get('content-length');
    if (!contentLength || parseInt(contentLength, 10) === 0) {
      logger.warn('Empty request body received');
      return new Response(
        JSON.stringify({ error: 'Invalid event payload', details: ['Request body is required'] }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('Invalid JSON in request body', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return new Response(
        JSON.stringify({ error: 'Invalid event payload', details: ['Invalid JSON format'] }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Security validation before schema validation
    if (body.eventName) {
      const securityCheck = validateEventNameSecurity(body.eventName);
      if (!securityCheck.valid) {
        logger.warn('Security violation detected', {
          eventName: body.eventName,
          reason: securityCheck.reason,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        });
        return new Response(
          JSON.stringify({ error: 'Invalid event payload', details: ['Invalid event name'] }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Schema validation
    const validated = eventSchema.safeParse(body);

    if (!validated.success) {
      logger.warn('Invalid event payload', { errors: validated.error.errors });
      return new Response(
        JSON.stringify({ error: 'Invalid event payload', details: validated.error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { eventName, properties = {}, sessionId } = validated.data;

    // 5. Check for authenticated user (optional)
    let userId: string | undefined;
    const authHeader = request.headers.get('authorization');

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');

      // Handle mock authentication in test environment
      // Token format: test_token_{userId} where userId is 'mock_user_{uniquePart}'
      if (serverEnv.ENV === 'test' && token.startsWith('test_token_')) {
        const mockUserId = token.replace('test_token_', '');
        userId = mockUserId;
        logger.info('Using mock authentication for analytics in test environment');
      } else {
        const {
          data: { user },
        } = await supabaseAdmin.auth.getUser(token);
        userId = user?.id;
      }
    }

    // 6. Track the event
    const success = await trackServerEvent(
      eventName,
      {
        ...properties,
        sessionId,
        source: 'api',
      },
      {
        apiKey: serverEnv.AMPLITUDE_API_KEY,
        userId,
        deviceId: sessionId,
      }
    );

    if (!success) {
      logger.warn('Failed to track event', { eventName });
      // Still return success - don't fail user actions due to analytics
    }

    logger.info('Event tracked', { eventName, userId: userId || 'anonymous' });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Analytics event error', {
      error: serializeError(error),
    });
    // Return success even on error - don't block user actions
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await logger.flush();
  }
};
