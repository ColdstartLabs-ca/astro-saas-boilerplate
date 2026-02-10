/**
 * Start Campaign Generation API Route
 * POST /api/campaigns/:campaignId/start - Start bulk article generation for a campaign
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals, jsonResponse, errorResponse } from '../../_utils';
import { campaignService } from '@server/services/campaign.service';
import {
  CampaignNotFoundError,
  InsufficientCreditsError,
  NoPendingKeywordsError,
} from '@shared/types/campaign.types';
import type { IStartCampaignResponse } from '@shared/types/campaign.types';
import { articleGenerationService } from '@server/services/article-generation.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

/**
 * POST /api/campaigns/:campaignId/start
 * Start bulk article generation for a campaign
 *
 * Flow:
 * 1. Get pending keywords for campaign
 * 2. Check user has enough credits (1 per keyword)
 * 3. Set campaign status to active
 * 4. For each pending keyword: create article record, update keyword status to queued
 * 5. Use ctx.waitUntil() to run sequential generation in background
 * 6. Return 202 with queued count
 */
export const POST: APIRoute = async ({ params, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const campaignId = params.campaignId as string;

    // Start generation: queue articles, deduct credits
    const result = await campaignService.startGeneration(campaignId, userId);

    // Fire & forget: process queued articles in background
    const ctx = (
      locals as { runtime?: { ctx?: { waitUntil?: (promise: Promise<unknown>) => void } } }
    ).runtime?.ctx;

    // Get campaign details for generation
    const campaignDetail = await campaignService.getDetail(campaignId, userId);
    if (campaignDetail) {
      const { campaign, keywords } = campaignDetail;
      const queuedKeywords = keywords.filter(k => k.status === 'queued');

      // Sequential processing function - truly one keyword at a time
      const processSequentially = async () => {
        let successCount = 0;
        let failureCount = 0;

        for (const keyword of queuedKeywords) {
          try {
            // Update keyword status to 'generating'
            await supabaseAdmin
              .from('keywords')
              .update({ status: 'generating' })
              .eq('id', keyword.id);

            // Find the article for this keyword (sequential lookup)
            const { data: article } = await supabaseAdmin
              .from('articles')
              .select('id')
              .eq('campaign_id', campaignId)
              .eq('primary_keyword', keyword.keyword)
              .eq('status', 'queued')
              .single();

            if (!article) {
              throw new Error(`Article not found for keyword: ${keyword.keyword}`);
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
            await supabaseAdmin
              .from('keywords')
              .update({ status: 'generated' })
              .eq('id', keyword.id);

            successCount++;
            console.log(`[Campaign] Generated article for keyword: ${keyword.keyword}`);
          } catch (err) {
            failureCount++;
            console.error(
              `[Campaign] Failed to generate article for keyword: ${keyword.keyword}`,
              err
            );

            // Update keyword status to 'failed' on error
            await supabaseAdmin.from('keywords').update({ status: 'failed' }).eq('id', keyword.id);

            // Refund credit for this failed generation
            try {
              await supabaseAdmin.rpc('add_credits_v2', {
                target_user_id: userId,
                amount: 1,
                description: `Refund for failed keyword generation: ${keyword.keyword}`,
              });
              console.log(`[Campaign] Refunded 1 credit for failed keyword: ${keyword.keyword}`);
            } catch (refundErr) {
              console.error('[Campaign] Failed to refund credit:', refundErr);
            }
          }
        }

        // Update campaign status to 'completed' if all keywords processed
        if (successCount + failureCount === queuedKeywords.length) {
          await supabaseAdmin
            .from('campaigns')
            .update({ status: 'completed' })
            .eq('id', campaignId);
          console.log(
            `[Campaign] Campaign ${campaignId} completed with ${successCount} successes and ${failureCount} failures`
          );
        }
      };

      if (ctx?.waitUntil) {
        ctx.waitUntil(processSequentially());
      } else {
        // Fallback for dev - fire and forget
        processSequentially().catch((err: unknown) => {
          console.error('[Campaign] Background generation error:', err);
        });
      }
    }

    const response: IStartCampaignResponse = result;
    return jsonResponse(response, 202);
  } catch (error) {
    console.error('Error starting campaign generation:', error);

    if (error instanceof CampaignNotFoundError) {
      return errorResponse('NOT_FOUND', error.message, 404);
    }

    if (error instanceof InsufficientCreditsError) {
      return errorResponse('INSUFFICIENT_CREDITS', error.message, 402);
    }

    if (error instanceof NoPendingKeywordsError) {
      return errorResponse('NO_PENDING_KEYWORDS', error.message, 400);
    }

    return errorResponse('INTERNAL_ERROR', 'Failed to start campaign generation', 500);
  }
};
