/**
 * Article Delivery API Route
 * POST /api/articles/:articleId/deliver - Manually trigger article delivery or retry failed deliveries
 */

import { z } from 'zod';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { deliveryService } from '@server/services/delivery.service';
import { withAuthAndBody, jsonResponse, errorResponse, handleApiError } from '@pages/api/_utils';

/**
 * Validation schema for delivery request
 */
const deliverArticleSchema = z.object({
  retry: z.boolean().optional().default(false),
});

/**
 * POST /api/articles/:articleId/deliver
 *
 * Manually trigger article delivery to integrations or retry failed deliveries.
 *
 * - If retry=false (default): Delivers to all enabled integrations for the article's campaign.
 * - If retry=true: Only retries deliveries that previously failed.
 *
 * Creates delivery records, dispatches to adapters, and updates article published_url/updated_at
 * on successful WordPress delivery.
 */
export const POST = withAuthAndBody(deliverArticleSchema, async (userId, input, { params }) => {
  const articleId = params.articleId as string;

  // Verify article ownership
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select('id, user_id')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (articleError || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  // Trigger delivery
  const result = await deliveryService.deliverArticle(articleId, input.retry);

  return jsonResponse({
    total: result.total,
    successful: result.successful,
    failed: result.failed,
    deliveries: result.deliveries,
  });
});

/**
 * Handle errors
 */
export const onError = handleApiError;
