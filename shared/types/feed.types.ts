/**
 * Feed Types for RSS Feed functionality
 *
 * AutopilotRank - RSS Feed Integration
 */

/**
 * Article data formatted for RSS feed inclusion
 */
export interface IFeedArticle {
  /** Article ID */
  id: string;
  /** Article title */
  title: string | null;
  /** Full HTML content */
  content: string | null;
  /** Primary keyword/topic */
  primaryKeyword: string;
  /** Published URL (canonical link) */
  publishedUrl: string | null;
  /** Publication date */
  publishedAt: string | null;
  /** Meta description (used as description) */
  metaDescription: string | null;
}

/**
 * RSS feed generation options
 */
export interface IFeedOptions {
  /** User ID whose articles to include */
  userId: string;
  /** Feed token for authentication */
  feedToken: string;
  /** Optional project ID to filter articles */
  projectId?: string;
  /** Maximum number of articles to include (default: 50) */
  limit?: number;
}

/**
 * RSS channel metadata
 */
export interface IFeedChannel {
  /** Feed title */
  title: string;
  /** Feed description */
  description: string;
  /** Site URL */
  link: string;
  /** Language code */
  language: string;
  /** Last build date */
  lastBuildDate: string;
}

/**
 * RSS feed item (article entry)
 */
export interface IFeedItem {
  /** Article title */
  title: string;
  /** Article URL */
  link: string;
  /** Publication date in RFC 822 format */
  pubDate: string;
  /** GUID (unique identifier) */
  guid: string;
  /** Short description */
  description: string;
  /** Full HTML content (CDATA wrapped) */
  'content:encoded': string;
  /** Category tags */
  category: string[];
}

/**
 * Complete RSS 2.0 feed structure
 */
export interface IRSSFeed {
  /** RSS version */
  version: string;
  /** Channel metadata */
  channel: IFeedChannel;
  /** Feed items */
  items: IFeedItem[];
}

/**
 * User profile with feed token
 */
export interface IUserProfileWithFeedToken {
  /** User ID */
  id: string;
  /** Feed token for RSS authentication */
  feed_token: string | null;
}
