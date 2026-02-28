/**
 * Start Campaign Generation API Route
 * POST /api/campaigns/:campaignId/start - Start bulk article generation for a campaign
 */

import { campaignService } from '@server/services/campaign.service';
import type { IStartCampaignResponse } from '@shared/types/campaign.types';
import { articleGenerationService } from '@server/services/article-generation.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { batchLimitCheck } from '@server/services/batch-limit.service';
import { getAuthenticatedUser } from '@server/middleware/getAuthenticatedUser';
import { withAuth, jsonResponse, errorResponse, fireAndForget } from '../../_utils';
import { CampaignIdempotencyService } from '@server/services/campaign-idempotency.service';

/**
 * POST /api/campaigns/:campaignId/start
 * Start bulk article generation for a campaign
 *
 * Flow:
 * 1. BUG H8: Check batch generation limit for user's subscription tier
 * 2. Extract idempotency key from X-Idempotency-Key header (optional but recommended)
 * 3. Claim campaign generation with idempotency (uses DB locking)
 * 4. Return cached response if idempotency key was already used
 * 5. Get pending keywords for campaign
 * 6. Check user has enough credits (1 per keyword)
 * 7. Set campaign status to active
 * 8. For each pending keyword: create article record, update keyword status to queued
 * 9. Use fireAndForget() to run sequential generation in background
 * 10. Return 202 with queued count
 */
export const POST = withAuth(async (userId, { params, locals, request }) => {
  const campaignId = params.campaignId as string;

  // BUG H8: Check batch generation rate limit before proceeding.
  // This prevents free/low-tier users from starting unlimited concurrent generation runs.
  const userProfile = await getAuthenticatedUser(request);
  const tier = userProfile?.subscription_tier ?? null;
  const limitResult = await batchLimitCheck.checkAndIncrement(userId, tier);
  if (!limitResult.allowed) {
    return errorResponse(
      'BATCH_LIMIT_EXCEEDED',
      `Batch generation limit reached for your plan. Please wait before starting another campaign. Resets at: ${limitResult.resetAt ?? 'end of period'}.`,
      429
    );
  }

  // Extract idempotency key from header (optional but recommended)
  const idempotencyKey = request.headers.get('X-Idempotency-Key') || undefined;

  // Start generation with idempotency: queue articles, deduct credits
  // This uses DB locking internally to prevent concurrent starts
  const result = await campaignService.startGenerationWithIdempotency(
    campaignId,
    userId,
    idempotencyKey
  );

  // Get campaign details for generation
  const campaignDetail = await campaignService.getDetail(campaignId, userId);
  if (campaignDetail) {
    const { campaign, keywords } = campaignDetail;
    const queuedKeywords = keywords.filter(k => k.status === 'queued');

    // Sequential processing function - truly one keyword at a time
    const processSequentially = async () => {
      let successCount = 0;
      let failureCount = 0;
      let processedCount = 0;

      for (const keyword of queuedKeywords) {
        // Check campaign status before each keyword generation
        // This allows pause/resume to take effect immediately
        const { data: currentCampaign } = await supabaseAdmin
          .from('campaigns')
          .select('status')
          .eq('id', campaignId)
          .single();

        // Stop processing if campaign has been paused
        if (!currentCampaign || currentCampaign.status === 'paused') {
          console.log(
            `[Campaign] Campaign ${campaignId} paused, stopping generation. Processed ${processedCount}/${queuedKeywords.length} keywords.`
          );
          // Update campaign status to paused to reflect the stopped state
          await supabaseAdmin.from('campaigns').update({ status: 'paused' }).eq('id', campaignId);
          break;
        }

        try {
          // Claim this keyword atomically to prevent duplicate workers from processing
          // the same keyword when /start is retried.
          const { data: claimedKeyword } = await supabaseAdmin
            .from('keywords')
            .update({ status: 'generating' })
            .eq('id', keyword.id)
            .eq('status', 'queued')
            .select('id')
            .maybeSingle();

          if (!claimedKeyword) {
            // Another worker already claimed or finished this keyword.
            continue;
          }

          // Find the article for this keyword (sequential lookup)
          const { data: article } = await supabaseAdmin
            .from('articles')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('primary_keyword', keyword.keyword)
            .eq('status', 'queued')
            .single();

          if (!article) {
            console.warn(
              `[Campaign] Keyword claimed but no queued article found, returning keyword to queue: ${keyword.keyword}`
            );
            await supabaseAdmin
              .from('keywords')
              .update({ status: 'queued' })
              .eq('id', keyword.id)
              .eq('status', 'generating');
            continue;
          }

          // Generate article (sequential generation)
          await articleGenerationService.generateArticle(article.id, userId, {
            keyword: keyword.keyword,
            projectId: campaign.project_id ?? '',
            campaignId: campaignId,
            model: campaign.ai_model,
            tone: campaign.tone,
            targetWordCount: campaign.target_word_count,
            imagePreset: campaign.image_preset ?? undefined,
          });

          // Update keyword status to 'generated' on success
          await supabaseAdmin.from('keywords').update({ status: 'generated' }).eq('id', keyword.id);

          successCount++;
          processedCount++;
          console.log(`[Campaign] Generated article for keyword: ${keyword.keyword}`);
        } catch (err) {
          failureCount++;
          processedCount++;
          console.error(
            `[Campaign] Failed to generate article for keyword: ${keyword.keyword}`,
            err
          );

          // Update keyword status to 'failed' on error
          await supabaseAdmin.from('keywords').update({ status: 'failed' }).eq('id', keyword.id);

          // Note: Refund is handled by ArticleGenerationService.handleGenerationFailure()
          // The service layer already refunds credits (base article + image cost) when generation fails
          // We don't refund here to avoid double-refunding
        }
      }

      // BUG C7: Only mark campaign as 'completed' when at least one article succeeded.
      // If every article failed, pause the campaign so the user can investigate and retry.
      // This prevents a silent "completed" state where no content was actually generated.
      if (processedCount === queuedKeywords.length) {
        if (successCount === 0 && failureCount > 0) {
          await supabaseAdmin
            .from('campaigns')
            .update({ status: 'paused' })
            .eq('id', campaignId);
          console.warn(
            `[Campaign] Campaign ${campaignId} paused: all ${failureCount} article(s) failed to generate.`
          );
        } else {
          await supabaseAdmin
            .from('campaigns')
            .update({ status: 'completed' })
            .eq('id', campaignId);
          console.log(
            `[Campaign] Campaign ${campaignId} completed with ${successCount} successes and ${failureCount} failures`
          );
        }
      }

      // BUG C6: Clear generation_run_id at the END of background processing.
      // Clearing it synchronously (before background worker completes) allowed a concurrent
      // /start request to race with this worker and start a second generation batch.
      // The run ID must remain set until all articles are processed.
      try {
        await CampaignIdempotencyService.clearCampaignRunId(campaignId);
      } catch (err) {
        console.error(`[Campaign] Failed to clear generation run ID for campaign ${campaignId}:`, err);
      }
    };

    fireAndForget(locals, processSequentially());
  }

  const response: IStartCampaignResponse = {
    queued: result.queued,
    creditsRequired: result.creditsRequired,
  };
  return jsonResponse(response, 202);
});
