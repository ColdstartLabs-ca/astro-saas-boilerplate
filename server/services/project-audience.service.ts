/**
 * Project Audience Service
 * Server-side business logic for project target audience CRUD operations
 *
 * Handles:
 * - Listing audiences for a project with ownership enforcement
 * - Batch adding audiences (idempotent - skips duplicates)
 * - Deleting individual audiences
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { projectService } from './project.service';
import type { IProjectTargetAudience, IBatchAddResponse } from '@shared/types/outrank.types';
import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

const MAX_AUDIENCES_PER_PROJECT = 7;

// =============================================================================
// Validation Schemas
// =============================================================================

const addAudiencesSchema = z.object({
  audiences: z
    .array(z.string().min(1, 'Audience name is required').max(200, 'Audience name too long').trim())
    .min(1, 'At least one audience is required')
    .max(MAX_AUDIENCES_PER_PROJECT, `Maximum ${MAX_AUDIENCES_PER_PROJECT} audiences allowed`),
});

// =============================================================================
// Project Audience Service Class
// =============================================================================

export class ProjectAudienceService {
  /**
   * List all audiences for a project (with ownership check)
   */
  async listByProject(projectId: string, userId: string): Promise<IProjectTargetAudience[]> {
    // Verify ownership
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const { data, error } = await supabaseAdmin
      .from('project_target_audiences')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to list audiences: ${error.message}`);
    return (data as IProjectTargetAudience[]) ?? [];
  }

  /**
   * Add audiences to a project (idempotent — skips duplicates)
   */
  async createMany(
    projectId: string,
    userId: string,
    input: { audiences: string[] }
  ): Promise<IBatchAddResponse> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const validated = addAudiencesSchema.parse(input);

    // Check current count
    const { count } = await supabaseAdmin
      .from('project_target_audiences')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const currentCount = count ?? 0;
    if (currentCount + validated.audiences.length > MAX_AUDIENCES_PER_PROJECT) {
      throw new Error(
        `Cannot add ${validated.audiences.length} audiences. Project has ${currentCount}/${MAX_AUDIENCES_PER_PROJECT}. ` +
          `You can add up to ${MAX_AUDIENCES_PER_PROJECT - currentCount} more.`
      );
    }

    const rows = validated.audiences.map(name => ({ project_id: projectId, name }));

    const { data, error } = await supabaseAdmin
      .from('project_target_audiences')
      .upsert(rows, { onConflict: 'project_id,name', ignoreDuplicates: true })
      .select();

    if (error) throw new Error(`Failed to add audiences: ${error.message}`);

    const added = data?.length ?? 0;
    const duplicates = validated.audiences.length - added;

    return { added, duplicates };
  }

  /**
   * Delete a single audience by ID (with ownership check)
   */
  async delete(projectId: string, audienceId: string, userId: string): Promise<void> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const { error } = await supabaseAdmin
      .from('project_target_audiences')
      .delete()
      .eq('id', audienceId)
      .eq('project_id', projectId);

    if (error) throw new Error(`Failed to delete audience: ${error.message}`);
  }
}

// Export singleton instance
export const projectAudienceService = new ProjectAudienceService();
