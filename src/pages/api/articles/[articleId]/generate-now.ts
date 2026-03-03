/**
 * Generate Now API Route
 * POST /api/articles/:articleId/generate-now
 *
 * Manually triggers generation for a planned article, deducting credits immediately.
 * Only works for articles in 'planned' status.
 */

import { withAuth, jsonResponse, errorResponse, handleApiError, fireAndForget } from '@pages/api/_utils';
import { plannedArticleGenerationService } from '@server/services/planned-article-generation.service';
import { articleGenerationService } from '@server/services/article-generation.service';

/**
 * POST /api/articles/:articleId/generate-now
 *
 * Transitions a planned article to queued and fires generation in the background,
 * deducting credits from the user's balance (subscription first, then purchased).
 *
 * Returns:
 * - 200: { queued: true }
 * - 400: Article not in planned status
 * - 402: Insufficient credits
 * - 404: Article not found or not owned by user
 */
export const POST = withAuth(async (userId, { params, locals }) => {
  const articleId = params.articleId as string;

  try {
    const { creditsDeducted, article, model, imagePreset, stylePreferences } =
      await plannedArticleGenerationService.promoteArticle(
        articleId,
        userId
      );

    fireAndForget(
      locals,
      articleGenerationService.generateArticle(articleId, userId, {
        keyword: article.primary_keyword,
        projectId: article.project_id ?? '',
        campaignId: article.campaign_id ?? '',
        model,
        imagePreset: imagePreset ?? undefined,
        stylePreferences,
      })
    );

    return jsonResponse({ queued: true, creditsDeducted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('not found') || message.includes('access denied')) {
      return errorResponse('NOT_FOUND', 'Article not found', 404);
    }
    if (message.includes('not in planned status')) {
      return errorResponse('INVALID_REQUEST', message, 400);
    }
    if (message.includes('Insufficient credits')) {
      return errorResponse('INSUFFICIENT_CREDITS', message, 402);
    }

    throw err;
  }
});

export const onError = handleApiError;
