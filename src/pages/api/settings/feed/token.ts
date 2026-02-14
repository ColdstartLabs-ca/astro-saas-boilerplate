/**
 * Feed Token Settings Routes
 * GET /api/settings/feed/token - Get current feed token
 * POST /api/settings/feed/token/regenerate - Regenerate feed token
 *
 * These endpoints allow users to manage their RSS feed token from the settings UI.
 */

import { feedService } from '@server/services/feed.service';
import { withAuth, jsonResponse, errorResponse, handleApiError } from '@pages/api/_utils';

interface IFeedTokenResponse {
  feedToken: string | null;
  feedUrl: string | null;
}

/**
 * GET /api/settings/feed/token
 * Get the current feed token and constructed feed URL for the user
 */
export const GET = withAuth(async userId => {
  const feedToken = await feedService.getFeedToken(userId);

  // Build the feed URL if token exists
  // Format: /api/feeds/:userId/articles.xml?token=xxx
  let feedUrl: string | null = null;
  if (feedToken) {
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://autopilotrank.com';
    feedUrl = `${baseUrl}/api/feeds/${userId}/articles.xml?token=${feedToken}`;
  }

  const response: IFeedTokenResponse = {
    feedToken,
    feedUrl,
  };

  return jsonResponse(response);
});

/**
 * POST /api/settings/feed/token/regenerate
 * Regenerate the feed token (invalidates existing RSS subscriptions)
 */
export const POST = withAuth(async userId => {
  const newToken = await feedService.regenerateFeedToken(userId);

  // Build the new feed URL
  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://autopilotrank.com';
  const feedUrl = `${baseUrl}/api/feeds/${userId}/articles.xml?token=${newToken}`;

  const response: IFeedTokenResponse = {
    feedToken: newToken,
    feedUrl,
  };

  return jsonResponse(response);
});

/**
 * Handle errors
 */
export const onError = handleApiError;
