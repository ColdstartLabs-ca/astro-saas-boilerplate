/**
 * Cron Controller
 *
 * Handles generic cron jobs:
 * - check-expirations: Check subscription expirations
 * - reconcile: Reconcile subscriptions with Stripe
 * - recover-webhooks: Recover stale webhooks (placeholder)
 */

import { BaseController } from './BaseController';
import { cronSubscriptionSyncService } from '@server/services/cron-subscription-sync.service';
import { serverEnv } from '@shared/config/env';

type CronJobType = 'check-expirations' | 'reconcile' | 'recover-webhooks';

export class CronController extends BaseController {
  protected async handle(req: Request): Promise<Response> {
    // Get the job type from the path
    const path = this.getPath(req);
    const jobType = this.getJobTypeFromPath(path);

    if (!jobType) {
      return this.error('INVALID_JOB', 'Invalid cron job type', 400);
    }

    // Verify cron secret for security
    const authHeader = req.headers.get('Authorization');
    const cronSecret = serverEnv.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return this.error('UNAUTHORIZED', 'Invalid cron secret', 401);
    }

    try {
      let result: unknown;

      switch (jobType) {
        case 'check-expirations':
          result = await cronSubscriptionSyncService.checkExpirations();
          break;

        case 'reconcile':
          result = await cronSubscriptionSyncService.reconcile();
          break;

        case 'recover-webhooks':
          // Placeholder - webhook recovery functionality removed during boilerplate stripping
          result = {
            processed: 0,
            recovered: 0,
            message: 'Webhook recovery not implemented in boilerplate',
          };
          break;

        default:
          return this.error('UNKNOWN_JOB', `Unknown cron job type: ${jobType}`, 400);
      }

      return this.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.error('CRON_ERROR', `Cron job failed: ${message}`, 500);
    }
  }

  private getJobTypeFromPath(path: string): CronJobType | null {
    if (path.includes('check-expirations')) return 'check-expirations';
    if (path.includes('reconcile')) return 'reconcile';
    if (path.includes('recover-webhooks')) return 'recover-webhooks';
    return null;
  }
}
