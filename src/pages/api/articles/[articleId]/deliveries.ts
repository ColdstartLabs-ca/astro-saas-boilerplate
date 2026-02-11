/**
 * GET /api/articles/:articleId/deliveries
 * Get delivery records for an article with integration details
 */

import { withAuth, jsonResponse, errorResponse, handleApiError } from '../../_utils';
import { deliveryService } from '@server/services/delivery.service';

/**
 * GET - Fetch delivery status for an article
 */
export const GET = withAuth(async (userId, { params }) => {
  const articleId = params.articleId as string;

  if (!articleId) {
    return errorResponse('INVALID_REQUEST', 'Article ID is required', 400);
  }

  const deliveries = await deliveryService.getArticleDeliveries(articleId, userId);

  return jsonResponse({ deliveries });
});

/**
 * Handle errors
 */
export const onError = handleApiError;
