/**
 * Project Service
 * Server-side business logic for project CRUD operations
 *
 * Handles:
 * - Project creation with input validation
 * - Project retrieval with ownership enforcement
 * - Project updates and deletion
 * - Project counting for onboarding detection
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  type IProject,
  type ICreateProjectInput,
  type IUpdateProjectInput,
} from '@shared/types/project.types';
import { z } from 'zod';

// =============================================================================
// Validation Schemas
// =============================================================================
//
// BUG L1: Canonical schema note
// These schemas are the single source of truth for project field validation.
// If you add new fields to the `projects` table, update BOTH createProjectSchema
// and updateProjectSchema (and the corresponding IProject / ICreateProjectInput /
// IUpdateProjectInput types in shared/types/project.types.ts).
//

/**
 * Normalize domain by auto-prepending https:// if missing
 */
function normalizeDomain(domain: string | undefined | null): string | null {
  if (!domain || domain === '') return null;
  if (/^https?:\/\//i.test(domain)) return domain;
  return `https://${domain}`;
}

/**
 * Zod schema for project creation input
 */
const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less')
    .trim(),
  domain: z.string().max(255, 'Domain URL is too long').optional().or(z.literal('')),
  industry: z.string().max(50, 'Industry must be 50 characters or less').optional(),
  cms_type: z.enum(['wordpress', 'webflow', 'shopify', 'other']).optional(),
  content_preferences: z
    .object({
      // Legacy fields
      tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
      frequency: z.enum(['daily', '3x_week', 'weekly']).optional(),
      targetWordCount: z.number().int().positive().optional(),
      // Article preferences (Phase 3)
      articleStyle: z
        .enum(['informative', 'how-to', 'listicle', 'opinion', 'tutorial', 'review', 'comparison'])
        .optional(),
      internalLinksCount: z.number().int().min(0).max(5).optional(),
      brandColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      imageStyle: z
        .enum(['brand-text', 'watercolor', 'cinematic', 'illustration', 'sketch'])
        .optional(),
      globalInstructions: z.string().max(1000).optional(),
      autoApprove: z.boolean().optional(),
    })
    .optional(),
  // Outrank feature parity fields
  language: z.string().min(2).max(5).optional(),
  country: z.string().min(2).max(2).toUpperCase().optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  sitemap_url: z.string().url().max(500).optional().or(z.literal('')),
  blog_url: z.string().url().max(500).optional().or(z.literal('')),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)')
    .optional()
    .or(z.literal('')),
});

/**
 * Zod schema for project update input
 */
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  domain: z.string().max(255).optional().or(z.literal('')),
  industry: z.string().max(50).optional(),
  cms_type: z.enum(['wordpress', 'webflow', 'shopify', 'other']).optional(),
  content_preferences: z
    .object({
      // Legacy fields
      tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
      frequency: z.enum(['daily', '3x_week', 'weekly']).optional(),
      targetWordCount: z.number().int().positive().optional(),
      // Article preferences (Phase 3)
      articleStyle: z
        .enum(['informative', 'how-to', 'listicle', 'opinion', 'tutorial', 'review', 'comparison'])
        .optional(),
      internalLinksCount: z.number().int().min(0).max(5).optional(),
      brandColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      imageStyle: z
        .enum(['brand-text', 'watercolor', 'cinematic', 'illustration', 'sketch'])
        .optional(),
      globalInstructions: z.string().max(1000).optional(),
      autoApprove: z.boolean().optional(),
    })
    .optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
  // Outrank feature parity fields
  language: z.string().min(2).max(5).optional(),
  country: z.string().min(2).max(2).toUpperCase().optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  sitemap_url: z.string().url().max(500).optional().or(z.literal('')),
  blog_url: z.string().url().max(500).optional().or(z.literal('')),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)')
    .optional()
    .or(z.literal('')),
});

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
   * Create a new project with input validation
   */
  async create(userId: string, input: ICreateProjectInput): Promise<IProject> {
    // Validate input
    const validated = createProjectSchema.parse(input);

    // Create project
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id: userId,
        name: validated.name,
        domain: normalizeDomain(validated.domain),
        industry: validated.industry || null,
        cms_type: validated.cms_type || 'wordpress',
        content_preferences: { frequency: 'daily', ...validated.content_preferences },
        status: 'active',
        // Outrank feature parity fields
        language: validated.language ?? 'en',
        country: validated.country ?? 'US',
        description: validated.description || null,
        sitemap_url: validated.sitemap_url || null,
        blog_url: validated.blog_url || null,
        brand_color: validated.brand_color || null,
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
   *
   * BUG H2 fix: content_preferences is deep-merged with existing values so that
   * a partial update (e.g. only `frequency`) does not wipe out fields set by
   * other screens (e.g. `articleStyle`, `imageStyle` set by OnboardingStepPreferences).
   */
  async update(projectId: string, userId: string, input: IUpdateProjectInput): Promise<IProject> {
    // Validate input
    const validated = updateProjectSchema.parse(input);

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.domain !== undefined) updates.domain = normalizeDomain(validated.domain);
    if (validated.industry !== undefined) updates.industry = validated.industry || null;
    if (validated.cms_type !== undefined) updates.cms_type = validated.cms_type;
    if (validated.content_preferences !== undefined) {
      // BUG H2: merge incoming preferences with existing ones instead of replacing
      const existing = await this.getById(projectId, userId);
      const existingPreferences = (existing?.content_preferences ?? {}) as Record<string, unknown>;
      updates.content_preferences = { ...existingPreferences, ...validated.content_preferences };
    }
    if (validated.status !== undefined) updates.status = validated.status;
    // Outrank feature parity fields
    if (validated.language !== undefined) updates.language = validated.language;
    if (validated.country !== undefined) updates.country = validated.country;
    if (validated.description !== undefined) updates.description = validated.description || null;
    if (validated.sitemap_url !== undefined) updates.sitemap_url = validated.sitemap_url || null;
    if (validated.blog_url !== undefined) updates.blog_url = validated.blog_url || null;
    if (validated.brand_color !== undefined) updates.brand_color = validated.brand_color || null;

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
    // Verify ownership before deleting so we can return 404 when the project
    // doesn't belong to this user, rather than silently succeeding.
    const project = await this.getById(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

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
   * Used for onboarding detection
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
