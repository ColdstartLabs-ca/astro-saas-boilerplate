import { BaseController } from './BaseController';
import { serverEnv } from '@shared/config/env';
import { MAX_CAMPAIGNS_PER_CRON_RUN } from '@shared/config/scheduling.config';
import { campaignService } from '../services/campaign.service';
import { cronSubscriptionSyncService } from '../services/cron-subscription-sync.service';
import { cronWebhookRecoveryService } from '../services/cron-webhook-recovery.service';
import { cronArticleRecoveryService } from '../services/cron-article-recovery.service';

/**
 * Cron Controller
 *
 * Handles cron job endpoints for subscription maintenance and article recovery:
 * - POST /api/cron/check-expirations - Check expired subscriptions
 * - POST /api/cron/reconcile - Full subscription reconciliation
 * - POST /api/cron/recover-webhooks - Recover failed webhooks
 * - POST /api/cron/recover-stale-articles - Recover stale article generation jobs
 * - POST /api/cron/process-scheduled-campaigns - Process scheduled campaigns due to run
 *
 * Business logic is delegated to specialized services:
 * - CronSubscriptionSyncService: check-expirations, reconcile
 * - CronWebhookRecoveryService: recover-webhooks
 * - CronArticleRecoveryService: recover-stale-articles
 * - CampaignSchedulingService (via campaignService): process-scheduled-campaigns
 */
export class CronController extends BaseController {
  /**
   * Handle incoming request
   */
  protected async handle(req: Request): Promise<Response> {
    const path = this.getPath(req);

    // Verify cron secret for all requests
    const authResult = this.verifyCronSecret(req);
    if (authResult instanceof Response) return authResult;

    // Route to appropriate method based on path
    if (path.endsWith('/check-expirations') && this.isPost(req)) {
      return this.checkExpirations(req);
    }
    if (path.endsWith('/reconcile') && this.isPost(req)) {
      return this.reconcile(req);
    }
    if (path.endsWith('/recover-webhooks') && this.isPost(req)) {
      return this.recoverWebhooks(req);
    }
    if (path.endsWith('/recover-stale-articles') && this.isPost(req)) {
      return this.recoverStaleArticles(req);
    }
    if (path.endsWith('/process-scheduled-campaigns') && this.isPost(req)) {
      return this.processScheduledCampaigns(req);
    }

    return this.error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  /**
   * Verify cron secret for authentication
   */
  private verifyCronSecret(req: Request): Response | null {
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== serverEnv.CRON_SECRET) {
      console.error('Unauthorized cron request - invalid CRON_SECRET');
      return this.error('UNAUTHORIZED', 'Unauthorized', 401);
    }
    return null;
  }

  /**
   * POST /api/cron/check-expirations
   * Check subscriptions past their billing period and sync with Stripe
   */
  private async checkExpirations(_req: Request): Promise<Response> {
    try {
      const result = await cronSubscriptionSyncService.checkExpirations();
      return this.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.error('INTERNAL_ERROR', errorMessage, 500);
    }
  }

  /**
   * POST /api/cron/reconcile
   * Full subscription reconciliation with Stripe
   */
  private async reconcile(_req: Request): Promise<Response> {
    try {
      const result = await cronSubscriptionSyncService.reconcile();
      return this.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.error('INTERNAL_ERROR', errorMessage, 500);
    }
  }

  /**
   * POST /api/cron/recover-webhooks
   * Retry processing failed webhook events
   */
  private async recoverWebhooks(_req: Request): Promise<Response> {
    try {
      const result = await cronWebhookRecoveryService.recoverWebhooks();
      return this.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.error('INTERNAL_ERROR', errorMessage, 500);
    }
  }

  /**
   * POST /api/cron/recover-stale-articles
   * Recover articles stuck in queued or generating status for too long
   */
  private async recoverStaleArticles(_req: Request): Promise<Response> {
    try {
      const result = await cronArticleRecoveryService.recoverStaleArticles();
      return this.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.error('INTERNAL_ERROR', errorMessage, 500);
    }
  }

  /**
   * POST /api/cron/process-scheduled-campaigns
   * Process scheduled campaigns that are due to run
   */
  private async processScheduledCampaigns(_req: Request): Promise<Response> {
    console.log('[CRON] Starting scheduled campaign processing...');

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const completedCampaigns: string[] = [];
    const errorDetails: Array<{ campaignId: string; error: string }> = [];

    try {
      // Get campaigns due for processing
      const dueCampaigns = await campaignService.getScheduledCampaignsDue(
        MAX_CAMPAIGNS_PER_CRON_RUN
      );

      console.log(`[CRON] Found ${dueCampaigns.length} campaigns due for processing`);

      for (const campaign of dueCampaigns) {
        try {
          const result = await campaignService.processScheduledBatch(campaign.id);

          if (result.completed) {
            completedCampaigns.push(campaign.id);
            console.log(`[CRON] Campaign ${campaign.id} completed all keywords`);
          } else if (result.paused) {
            skipped++;
            console.log(
              `[CRON] Campaign ${campaign.id} paused: ${result.pauseReason || 'unknown reason'}`
            );
          } else {
            processed++;
            console.log(
              `[CRON] Campaign ${campaign.id} processed batch: ${result.articlesQueued} articles queued, next run at ${result.nextRunAt}`
            );
          }
        } catch (error: unknown) {
          errors++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errorDetails.push({ campaignId: campaign.id, error: errorMessage });
          console.error(`[CRON] Failed to process campaign ${campaign.id}:`, errorMessage);
        }
      }

      console.log(
        `[CRON] Scheduled campaign processing complete: ${processed} processed, ${skipped} skipped, ${errors} errors, ${completedCampaigns.length} completed`
      );

      return this.json({
        success: true,
        processed,
        skipped,
        errors,
        completedCampaigns,
        errorDetails: errors > 0 ? errorDetails : undefined,
        totalDue: dueCampaigns.length,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CRON] Scheduled campaign processing failed:', errorMessage);

      return this.error('INTERNAL_ERROR', errorMessage, 500, {
        processed,
        skipped,
        errors,
        completedCampaigns,
        errorDetails,
      });
    }
  }
}
