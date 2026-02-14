/**
 * Feed Service
 * Server-side business logic for RSS feed generation
 *
 * Handles:
 * - Fetching published articles for a user
 * - Generating RSS 2.0 compliant XML
 * - Token validation for feed access
 *
 * AutopilotRank - RSS Feed Integration
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  type IFeedArticle,
  type IFeedOptions,
  type IFeedChannel,
  type IFeedItem,
} from '@shared/types/feed.types';
import { clientEnv } from '@shared/config/env';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { rfc822 } from './internal/rfc822';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(rfc822);

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_FEED_LIMIT = 50;
const RSS_VERSION = '2.0';
const CONTENT_NAMESPACE = 'http://purl.org/rss/1.0/modules/content/';

// =============================================================================
// Custom Errors
// =============================================================================

/**
 * Error thrown when feed token is invalid or missing
 */
export class InvalidFeedTokenError extends Error {
  constructor(message = 'Invalid or missing feed token') {
    super(message);
    this.name = 'InvalidFeedTokenError';
  }
}

/**
 * Error thrown when user is not found
 */
export class UserNotFoundError extends Error {
  constructor(message = 'User not found') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

// =============================================================================
// Feed Service Class
// =============================================================================

export class FeedService {
  /**
   * Validate feed token and get user ID.
   *
   * @param userId - The user ID to validate
   * @param feedToken - The feed token to validate
   * @throws InvalidFeedTokenError if token is invalid
   * @throws UserNotFoundError if user doesn't exist
   */
  async validateFeedToken(userId: string, feedToken: string): Promise<void> {
    if (!feedToken) {
      throw new InvalidFeedTokenError('Feed token is required');
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, feed_token')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to validate feed token: ${error.message}`);
    }

    if (!profile) {
      throw new UserNotFoundError('User not found');
    }

    if (!profile.feed_token || profile.feed_token !== feedToken) {
      throw new InvalidFeedTokenError('Invalid feed token');
    }
  }

  /**
   * Fetch published articles for a user.
   *
   * @param userId - The user ID to fetch articles for
   * @param projectId - Optional project ID to filter by
   * @param limit - Maximum number of articles to return
   * @returns Array of published articles
   */
  async getPublishedArticles(
    userId: string,
    projectId?: string,
    limit: number = DEFAULT_FEED_LIMIT
  ): Promise<IFeedArticle[]> {
    let query = supabaseAdmin
      .from('articles')
      .select(
        `
        id,
        title,
        content,
        primary_keyword,
        published_url,
        published_at,
        meta_description
      `
      )
      .eq('user_id', userId)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: articles, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch published articles: ${error.message}`);
    }

    return (articles ?? []).map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      primaryKeyword: article.primary_keyword,
      publishedUrl: article.published_url,
      publishedAt: article.published_at,
      metaDescription: article.meta_description,
    }));
  }

  /**
   * Generate RSS 2.0 XML from articles.
   *
   * @param articles - Array of articles to include in feed
   * @param channelInfo - Channel metadata
   * @returns RSS 2.0 XML string
   */
  generateRSSXML(articles: IFeedArticle[], channelInfo: IFeedChannel): string {
    const items = articles.map(article => this.formatFeedItem(article));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="${RSS_VERSION}" xmlns:content="${CONTENT_NAMESPACE}">
  <channel>
    <title>${this.escapeXML(channelInfo.title)}</title>
    <link>${this.escapeXML(channelInfo.link)}</link>
    <description>${this.escapeXML(channelInfo.description)}</description>
    <language>${channelInfo.language}</language>
    <lastBuildDate>${channelInfo.lastBuildDate}</lastBuildDate>
${items.map(item => this.formatItemXML(item)).join('\n')}
  </channel>
</rss>`;

    return xml;
  }

  /**
   * Generate RSS feed for a user.
   * Main entry point for feed generation.
   *
   * @param options - Feed generation options
   * @returns RSS 2.0 XML string
   * @throws InvalidFeedTokenError if token is invalid
   */
  async generateFeed(options: IFeedOptions): Promise<string> {
    const { userId, feedToken, projectId, limit = DEFAULT_FEED_LIMIT } = options;

    // Validate feed token
    await this.validateFeedToken(userId, feedToken);

    // Fetch published articles
    const articles = await this.getPublishedArticles(userId, projectId, limit);

    // Build channel info
    const channelInfo: IFeedChannel = {
      title: `${clientEnv.APP_NAME} - Published Articles`,
      description: 'Your AI-generated SEO articles',
      link: clientEnv.BASE_URL,
      language: 'en-us',
      lastBuildDate: dayjs().toRFC822(),
    };

    // Generate and return RSS XML
    return this.generateRSSXML(articles, channelInfo);
  }

  /**
   * Regenerate feed token for a user.
   * Invalidates all existing feed subscriptions.
   *
   * @param userId - The user ID to regenerate token for
   * @returns New feed token
   */
  async regenerateFeedToken(userId: string): Promise<string> {
    const newToken = crypto.randomUUID();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ feed_token: newToken })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to regenerate feed token: ${error.message}`);
    }

    return newToken;
  }

  /**
   * Get current feed token for a user.
   *
   * @param userId - The user ID to get token for
   * @returns Current feed token or null if not set
   */
  async getFeedToken(userId: string): Promise<string | null> {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('feed_token')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get feed token: ${error.message}`);
    }

    return profile?.feed_token ?? null;
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  /**
   * Format a single article as a feed item.
   */
  private formatFeedItem(article: IFeedArticle): IFeedItem {
    const link = article.publishedUrl || `${clientEnv.BASE_URL}/articles/${article.id}`;
    const pubDate = article.publishedAt
      ? dayjs(article.publishedAt).toRFC822()
      : dayjs().toRFC822();

    return {
      title: article.title || 'Untitled Article',
      link,
      pubDate,
      guid: article.id,
      description: article.metaDescription || article.primaryKeyword,
      'content:encoded': article.content || '',
      category: [article.primaryKeyword],
    };
  }

  /**
   * Format a feed item as XML.
   */
  private formatItemXML(item: IFeedItem): string {
    const categories = item.category.map(cat => `    <category>${this.escapeXML(cat)}</category>`).join('\n');

    return `    <item>
      <title>${this.escapeXML(item.title)}</title>
      <link>${this.escapeXML(item.link)}</link>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
      <description>${this.escapeXML(item.description)}</description>
      <content:encoded><![CDATA[${item['content:encoded']}]]></content:encoded>
${categories}
    </item>`;
  }

  /**
   * Escape special XML characters.
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Export singleton instance
export const feedService = new FeedService();
