/**
 * GET /api/feeds/[userId]/articles.xml
 * RSS 2.0 feed of published articles for a user
 *
 * Authentication: Feed token (query param ?token=xxx)
 * Cache: 5 minutes (Cloudflare cache headers)
 *
 * Query params:
 * - token: Feed token (required)
 * - project: Project ID to filter articles (optional)
 */

import type { APIRoute } from 'astro';
import { feedService } from '@server/services/feed.service';
import { z } from 'zod';

// Query params schema
const feedQuerySchema = z.object({
  token: z.string().uuid({ message: 'Invalid feed token format' }),
  project: z.string().uuid().optional(),
});

// Cache duration in seconds (5 minutes)
const CACHE_MAX_AGE = 300;

export const GET: APIRoute = async ({ params, url }) => {
  const { userId } = params;

  // Validate userId
  if (!userId || !z.string().uuid().safeParse(userId).success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid user ID format',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Parse and validate query params
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parseResult = feedQuerySchema.safeParse(queryParams);

  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request parameters',
        details: parseResult.error.errors[0]?.message,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { token, project } = parseResult.data;

  try {
    // Generate RSS feed
    const rssXML = await feedService.generateFeed({
      userId,
      feedToken: token,
      projectId: project,
    });

    // Return RSS XML with caching headers
    return new Response(rssXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
        'CDN-Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        // ETag for conditional requests
        'ETag': `"${Buffer.from(rssXML).length.toString(16)}"`,
      },
    });
  } catch (error) {
    // Handle known error types
    if (error instanceof Error) {
      if (error.name === 'InvalidFeedTokenError') {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid or expired feed token',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (error.name === 'UserNotFoundError') {
        return new Response(
          JSON.stringify({
            error: 'Not found',
            message: 'User not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Log unexpected errors
    console.error('[RSS Feed] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to generate RSS feed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
