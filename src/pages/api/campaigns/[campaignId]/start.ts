/**
 * Start Campaign Generation API Route
 * POST /api/campaigns/:campaignId/start - Start bulk article generation for a campaign
 */

import { campaignService } from '@server/services/campaign.service';
import type { IStartCampaignResponse } from '@shared/types/campaign.types';
import { articleGenerationService } from '@server/services/article-generation.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { withAuth, jsonResponse, fireAndForget } from '../../_utils';

/**
 * POST /api/campaigns/:campaignId/start
 * Start bulk article generation for a campaign
 *
 * Flow:
 * 1. Extract idempotency key from X-Idempotency-Key header (optional but recommended)
 * 2. Claim campaign generation with idempotency (uses DB locking)
 * 3. Return cached response if idempotency key was already used
 * 4. Get pending keywords for campaign
 * 5. Check user has enough credits (1 per keyword)
 * 6. Set campaign status to active
 * 7. For each pending keyword: create article record, update keyword status to queued
 * 8. Use fireAndForget() to run sequential generation in background
 * 9. Return 202 with queued count
 */
export const POST = withAuth(async (userId, { params, locals, request }) => {
  const campaignId = params.campaignId as string;

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

      // Update campaign status to 'completed' if all keywords processed
      // Only if we weren't paused (processedCount should equal queuedKeywords.length)
      if (processedCount === queuedKeywords.length) {
        await supabaseAdmin.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);
        console.log(
          `[Campaign] Campaign ${campaignId} completed with ${successCount} successes and ${failureCount} failures`
        );
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
