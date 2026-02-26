/**
 * Project Management Types
 * AutopilotRank - Project CRUD operations
 */

// Subscription tier values (from profiles.subscription_tier)
export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'agency';

/**
 * Article style options for content generation
 */
export type ArticleStyle =
  | 'informative'
  | 'how-to'
  | 'listicle'
  | 'opinion'
  | 'tutorial'
  | 'review'
  | 'comparison';

/**
 * Image style options for content generation
 */
export type ImageStyle = 'brand-text' | 'watercolor' | 'cinematic' | 'illustration' | 'sketch';

/**
 * Content generation preferences for a project
 * Note: Tone and word count are now set per Campaign, not per Project
 */
export interface IContentPreferences {
  /** Publishing frequency for content scheduling */
  frequency?: 'daily' | '3x_week' | 'weekly';
  /** Article writing style */
  articleStyle?: ArticleStyle;
  /** Number of internal links to include in articles (0, 1, 2, 3, or 5) */
  internalLinksCount?: number;
  /** Brand color in hex format (e.g., '#4F46E5') */
  brandColor?: string;
  /** Image generation style */
  imageStyle?: ImageStyle;
  /** Global instructions for content generation (max 1000 chars) */
  globalInstructions?: string;
}

/**
 * CMS type options for project connection
 */
export type CmsType = 'wordpress' | 'webflow' | 'shopify' | 'other';

/**
 * Project status options
 */
export type ProjectStatus = 'active' | 'inactive' | 'error';

/**
 * Complete project entity from database
 */
export interface IProject {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  cms_type: CmsType;
  cms_credentials: Record<string, unknown>;
  content_preferences: IContentPreferences;
  status: ProjectStatus;
  // Outrank feature parity fields
  language: string;
  country: string;
  description: string | null;
  sitemap_url: string | null;
  blog_url: string | null;
  brand_color: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new project
 */
export interface ICreateProjectInput {
  /** Project name (required, 1-100 chars) */
  name: string;
  /** Domain URL (optional, validated if provided) */
  domain?: string;
  /** Business industry/niche */
  industry?: string;
  /** CMS platform type */
  cms_type?: CmsType;
  /** Content generation preferences */
  content_preferences?: IContentPreferences;
  // Outrank feature parity fields
  /** ISO 639-1 language code (e.g., 'en', 'es') */
  language?: string;
  /** ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB') */
  country?: string;
  /** Project description */
  description?: string;
  /** Sitemap URL for content discovery */
  sitemap_url?: string;
  /** Blog URL for content discovery */
  blog_url?: string;
  /** Brand color in hex format (e.g., '#FF5733') */
  brand_color?: string;
}

/**
 * Input for updating an existing project
 */
export interface IUpdateProjectInput {
  /** Project name */
  name?: string;
  /** Domain URL */
  domain?: string;
  /** Business industry/niche */
  industry?: string;
  /** CMS platform type */
  cms_type?: CmsType;
  /** Content generation preferences */
  content_preferences?: IContentPreferences;
  /** Project status */
  status?: ProjectStatus;
  // Outrank feature parity fields
  /** ISO 639-1 language code (e.g., 'en', 'es') */
  language?: string;
  /** ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB') */
  country?: string;
  /** Project description */
  description?: string;
  /** Sitemap URL for content discovery */
  sitemap_url?: string;
  /** Blog URL for content discovery */
  blog_url?: string;
  /** Brand color in hex format (e.g., '#FF5733') */
  brand_color?: string;
}

/**
 * Project limit configuration by subscription tier
 */
export interface IProjectLimits {
  /** Maximum number of projects (null = unlimited) */
  maxProjects: number | null;
  /** Subscription tier name */
  tier: string;
}

/**
 * Error thrown when user exceeds their project limit
 */
export class ProjectLimitError extends Error {
  public readonly currentCount: number;
  public readonly maxProjects: number | null;
  public readonly subscriptionTier: SubscriptionTier | null;

  constructor(
    currentCount: number,
    maxProjects: number | null,
    subscriptionTier: SubscriptionTier | null
  ) {
    const maxDisplay = maxProjects === null ? 'unlimited' : maxProjects;
    super(
      `Project limit exceeded. You have ${currentCount} project(s) and your plan allows ${maxDisplay}. Please upgrade your subscription or delete existing projects.`
    );
    this.name = 'ProjectLimitError';
    this.currentCount = currentCount;
    this.maxProjects = maxProjects;
    this.subscriptionTier = subscriptionTier;
  }
}

/**
 * API response for single project
 */
export interface IProjectResponse {
  project: IProject;
}

/**
 * API response for multiple projects
 */
export interface IProjectsResponse {
  projects: IProject[];
}

/**
 * API response for delete operation
 */
export interface IDeleteProjectResponse {
  success: boolean;
}
