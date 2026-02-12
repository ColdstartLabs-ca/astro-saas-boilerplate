/**
 * POST /api/cron/process-scheduled-campaigns
 * Cron endpoint to process scheduled campaigns that are due to run
 *
 * This endpoint is called by the Cloudflare Worker cron trigger every 5 minutes.
 * It finds campaigns where next_run_at <= NOW() and processes a batch of keywords
 * for each campaign according to their schedule configuration.
 *
 * Authentication: x-cron-secret header (validated by CronController)
 * Rate: Every 5 minutes via Cloudflare Worker cron
 */

import type { APIRoute } from 'astro';
import { CronController } from '@server/controllers';

const controller = new CronController();

export const POST: APIRoute = async ({ request }) => {
  return controller.execute(request);
};
