/**
 * Project Service
 * Server-side business logic for project CRUD operations
 *
 * Handles:
 * - Project creation with plan limit validation
 * - Project retrieval with ownership enforcement
 * - Project updates and deletion
 * - Project counting for onboarding detection
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  type IProject,
  type ICreateProjectInput,
  type IUpdateProjectInput,
  ProjectLimitError,
} from '@shared/types/project.types';
import { getSubscriptionConfig } from '@shared/config/subscription.config';
import { z } from 'zod';

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Zod schema for project creation input
 */
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be 100 characters or less').trim(),
  domain: z.string().url('Invalid URL format').optional().or(z.literal('')),
  industry: z.string().max(50, 'Industry must be 50 characters or less').optional(),
  cms_type: z.enum(['wordpress', 'webflow', 'shopify', 'other']).optional(),
  content_preferences: z
    .object({
      tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
      frequency: z.enum(['daily', '3x_week', 'weekly']).optional(),
      targetWordCount: z.number().int().positive().optional(),
    })
    .optional(),
});

/**
 * Zod schema for project update input
 */
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  domain: z.string().url().optional().or(z.literal('')),
  industry: z.string().max(50).optional(),
  cms_type: z.enum(['wordpress', 'webflow', 'shopify', 'other']).optional(),
  content_preferences: z
    .object({
      tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
      frequency: z.enum(['daily', '3x_week', 'weekly']).optional(),
      targetWordCount: z.number().int().positive().optional(),
    })
    .optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
});

// =============================================================================
// Project Limits Helper
// =============================================================================

/**
 * Get the maximum number of projects allowed for a subscription tier
 */
function getMaxProjectsForTier(subscriptionTier: string | null | undefined): number | null {
  const config = getSubscriptionConfig();
  const plan = config.plans.find(p => p.key === subscriptionTier);

  // Free users (no subscription) get 1 project
  if (!plan) {
    return 1;
  }

  return plan.maxProjects ?? null;
}

// =============================================================================
// Project Service Class
// =============================================================================

export class ProjectService {
  /**
   * List all projects for a user, ordered by creation date (newest first)
   */
  async listByUser(userId: string): Promise<IProject[]> {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list projects: ${error.message}`);
    }

    return (data as IProject[]) ?? [];
  }

  /**
   * Get a single project by ID, enforcing ownership
   */
  async getById(projectId: string, userId: string): Promise<IProject | null> {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to get project: ${error.message}`);
    }

    return data as IProject;
  }

  /**
   * Create a new project with validation and plan limit enforcement
   */
  async create(userId: string, input: ICreateProjectInput): Promise<IProject> {
    // Validate input
    const validated = createProjectSchema.parse(input);

    // Check project limit
    const currentCount = await this.countByUser(userId);

    // Fetch user profile to get subscription tier
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const subscriptionTier = profile?.subscription_tier ?? null;
    const maxProjects = getMaxProjectsForTier(subscriptionTier);

    // Check if limit exceeded (null = unlimited)
    if (maxProjects !== null && currentCount >= maxProjects) {
      throw new ProjectLimitError(currentCount, maxProjects, subscriptionTier);
    }

    // Create project
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id: userId,
        name: validated.name,
        domain: validated.domain || null,
        industry: validated.industry || null,
        cms_type: validated.cms_type || 'wordpress',
        content_preferences: validated.content_preferences || {},
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return data as IProject;
  }

  /**
   * Update an existing project, enforcing ownership
   */
  async update(projectId: string, userId: string, input: IUpdateProjectInput): Promise<IProject> {
    // Validate input
    const validated = updateProjectSchema.parse(input);

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.domain !== undefined) updates.domain = validated.domain || null;
    if (validated.industry !== undefined) updates.industry = validated.industry || null;
    if (validated.cms_type !== undefined) updates.cms_type = validated.cms_type;
    if (validated.content_preferences !== undefined) updates.content_preferences = validated.content_preferences;
    if (validated.status !== undefined) updates.status = validated.status;

    // Update project with ownership check
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Project not found');
      }
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return data as IProject;
  }

  /**
   * Delete a project, enforcing ownership
   * Uses hard delete for MVP (can be changed to soft delete later)
   */
  async delete(projectId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Count the number of projects for a user
   * Used for onboarding detection and limit enforcement
   */
  async countByUser(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to count projects: ${error.message}`);
    }

    return count ?? 0;
  }
}

// Export singleton instance
export const projectService = new ProjectService();
