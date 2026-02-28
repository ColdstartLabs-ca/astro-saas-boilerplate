/**
 * POST /api/cron/generate-planned-articles
 * Cron endpoint to transition planned articles to queued and trigger generation
 * when their scheduled_publish_at is within the GENERATION_LEAD_TIME_DAYS window.
 *
 * Authentication: x-cron-secret header
 * Rate: Every 5 minutes (offset by 2 minutes) via Cloudflare Worker cron
 */
import type { APIRoute } from 'astro';
import { serverEnv } from '@shared/config/env';
import { plannedArticleGenerationService } from '@server/services/planned-article-generation.service';

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
    const result = await plannedArticleGenerationService.processPlannedArticles();
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          processed: result.processed,
          queued: result.queued,
          skippedInsufficientCredits: result.skippedInsufficientCredits,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[CronGeneratePlanned] Error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
