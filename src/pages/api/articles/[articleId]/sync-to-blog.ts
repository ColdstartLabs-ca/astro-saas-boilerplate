/**
 * POST /api/articles/:articleId/sync-to-blog
 *
 * Directly upserts a published article into blog_posts so it appears on /blog.
 * Useful for articles that were published before the webhook-to-blog feature was added.
 */

import { withAuth, jsonResponse, errorResponse, handleApiError } from '@pages/api/_utils';
import { blogService } from '@server/services/blog.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

const SYNCABLE_STATUSES = ['draft', 'reviewed', 'approved', 'qa_passed', 'published'] as const;

export const POST = withAuth(async (userId, { params }) => {
  const articleId = params.articleId as string;

  // Verify ownership + status
  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .select('id, status')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (error || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  if (!SYNCABLE_STATUSES.includes(article.status as (typeof SYNCABLE_STATUSES)[number])) {
    return errorResponse(
      'INVALID_REQUEST',
      `Article cannot be synced from status '${article.status}'`,
      400
    );
  }

  const result = await blogService.syncArticleToBlog(articleId, userId);

  return jsonResponse({
    success: true,
    slug: result.slug,
    isNew: result.isNew,
  });
});

export const onError = handleApiError;
