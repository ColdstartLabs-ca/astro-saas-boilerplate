/**
 * Article Publish-Now API Route
 * POST /api/articles/:articleId/publish-now - Immediately publish an article to integrations
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { deliveryService } from '@server/services/delivery.service';
import { withAuth, jsonResponse, errorResponse, handleApiError } from '@pages/api/_utils';

/**
 * Statuses that indicate an article has content ready to be published
 */
const PUBLISHABLE_STATUSES = ['draft', 'reviewed', 'approved', 'qa_passed'] as const;

/**
 * POST /api/articles/:articleId/publish-now
 *
 * Immediately deliver an article to all enabled integrations for its campaign.
 * The article must have content (status must be draft, reviewed, approved, or qa_passed).
 * Sets published_at on the article if not already set.
 */
export const POST = withAuth(async (userId, { params }) => {
  const articleId = params.articleId as string;

  // Verify article ownership and retrieve status
  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .select('id, user_id, status, published_at')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (error || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  // Validate article is in a publishable state
  if (!PUBLISHABLE_STATUSES.includes(article.status as (typeof PUBLISHABLE_STATUSES)[number])) {
    return errorResponse(
      'INVALID_REQUEST',
      `Article cannot be published from status '${article.status}'`,
      400
    );
  }

  // Deliver to integrations
  const result = await deliveryService.deliverArticle(articleId);

  // Publishing requires at least one enabled integration.
  if (result.total === 0) {
    return errorResponse(
      'NO_INTEGRATIONS',
      'No enabled integrations configured for this campaign',
      400,
      {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
      }
    );
  }

  // If all delivery attempts failed, keep article state unchanged.
  if (result.successful === 0) {
    return errorResponse('DELIVERY_FAILED', 'Failed to publish article to any integration', 502, {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
    });
  }

  // At least one integration succeeded: mark article as published.
  const publishedAt = article.published_at ?? new Date().toISOString();
  await supabaseAdmin
    .from('articles')
    .update({
      status: 'published',
      published_at: publishedAt,
    })
    .eq('id', articleId);

  return jsonResponse({
    success: true,
    status: 'published',
    published_at: publishedAt,
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
