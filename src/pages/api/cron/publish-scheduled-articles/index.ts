/**
 * POST /api/cron/publish-scheduled-articles
 * Cron endpoint to publish articles whose scheduled_publish_at has arrived.
 *
 * Authentication: x-cron-secret header
 * Rate: Every 5 minutes via Cloudflare Worker cron
 */
import type { APIRoute } from 'astro';
import { serverEnv } from '@shared/config/env';
import { scheduledPublishingService } from '@server/services/scheduled-publishing.service';

export const POST: APIRoute = async ({ request }) => {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== serverEnv.CRON_SECRET) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await scheduledPublishingService.processScheduledPublications();
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[CronPublishScheduled] Error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
