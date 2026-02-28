/**
 * Project Competitor Service
 * Server-side business logic for project competitor CRUD operations
 *
 * Handles:
 * - Listing competitors for a project with ownership enforcement
 * - Batch adding competitors (idempotent - skips duplicates)
 * - Deleting individual competitors
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { projectService } from './project.service';
import type {
  IProjectCompetitor,
  IBatchAddResponse,
  IAddCompetitorInput,
} from '@shared/types/outrank.types';
import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

const MAX_COMPETITORS_PER_PROJECT = 7;

// =============================================================================
// Validation Schemas
// =============================================================================

const addCompetitorsSchema = z.object({
  competitors: z
    .array(
      z.object({
        domain: z.string().min(1, 'Domain is required').max(255, 'Domain too long').trim(),
        name: z.string().max(200).optional(),
      })
    )
    .min(1, 'At least one competitor is required')
    .max(MAX_COMPETITORS_PER_PROJECT, `Maximum ${MAX_COMPETITORS_PER_PROJECT} competitors allowed`),
});

// =============================================================================
// Project Competitor Service Class
// =============================================================================

export class ProjectCompetitorService {
  /**
   * List all competitors for a project (with ownership check)
   */
  async listByProject(projectId: string, userId: string): Promise<IProjectCompetitor[]> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const { data, error } = await supabaseAdmin
      .from('project_competitors')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to list competitors: ${error.message}`);
    return (data as IProjectCompetitor[]) ?? [];
  }

  /**
   * Add competitors to a project (idempotent — skips duplicates)
   *
   * BUG M14 note: The COUNT check followed by INSERT is not atomic. Concurrent
   * requests can exceed MAX_COMPETITORS_PER_PROJECT between the two operations.
   * Acceptable trade-off for MVP; enforce the hard limit via a DB trigger or
   * unique-constraint count check if strict enforcement is needed later.
   */
  async createMany(
    projectId: string,
    userId: string,
    input: { competitors: IAddCompetitorInput[] }
  ): Promise<IBatchAddResponse> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const validated = addCompetitorsSchema.parse(input);

    const { count } = await supabaseAdmin
      .from('project_competitors')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const currentCount = count ?? 0;
    if (currentCount + validated.competitors.length > MAX_COMPETITORS_PER_PROJECT) {
      throw new Error(
        `Cannot add ${validated.competitors.length} competitors. Project has ${currentCount}/${MAX_COMPETITORS_PER_PROJECT}. ` +
          `You can add up to ${MAX_COMPETITORS_PER_PROJECT - currentCount} more.`
      );
    }

    const rows = validated.competitors.map(c => ({
      project_id: projectId,
      domain: c.domain,
      name: c.name ?? null,
    }));

    const { data, error } = await supabaseAdmin
      .from('project_competitors')
      .upsert(rows, { onConflict: 'project_id,domain', ignoreDuplicates: true })
      .select();

    if (error) throw new Error(`Failed to add competitors: ${error.message}`);

    const added = data?.length ?? 0;
    const duplicates = validated.competitors.length - added;

    return { added, duplicates };
  }

  /**
   * Delete a single competitor by ID (with ownership check)
   *
   * BUG L13 fix: use .select() so we can detect when the row did not exist
   * and surface a proper 404-style error to the caller.
   */
  async delete(projectId: string, competitorId: string, userId: string): Promise<void> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const { data, error } = await supabaseAdmin
      .from('project_competitors')
      .delete()
      .eq('id', competitorId)
      .eq('project_id', projectId)
      .select();

    if (error) throw new Error(`Failed to delete competitor: ${error.message}`);
    if (!data || data.length === 0) throw new Error('Competitor not found');
  }
}

// Export singleton instance
export const projectCompetitorService = new ProjectCompetitorService();
