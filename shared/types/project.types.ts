/**
 * Project Management Types
 * AutopilotRank - Project CRUD operations
 */

// Subscription tier values (from profiles.subscription_tier)
export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'agency';

/**
 * Content generation preferences for a project
 */
export interface IContentPreferences {
  /** Tone of voice for generated content */
  tone?: 'professional' | 'casual' | 'witty' | 'academic';
  /** Publishing frequency */
  frequency?: 'daily' | '3x_week' | 'weekly';
  /** Target word count per article */
  targetWordCount?: number;
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
