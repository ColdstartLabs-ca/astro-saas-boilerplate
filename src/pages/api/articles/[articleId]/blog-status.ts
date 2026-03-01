/**
 * GET /api/articles/:articleId/blog-status
 *
 * Returns whether the article has been synced to blog_posts.
 */

import { withAuth, jsonResponse, errorResponse, handleApiError } from '@pages/api/_utils';
import { blogService } from '@server/services/blog.service';

export const GET = withAuth(async (userId, { params }) => {
  const articleId = params.articleId as string;

  const status = await blogService.getBlogStatusForArticle(articleId, userId);

  if (status.slug === null && !status.synced) {
    // Article not found or belongs to another user
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  return jsonResponse({
    synced: status.synced,
    slug: status.slug,
  });
});

export const onError = handleApiError;
