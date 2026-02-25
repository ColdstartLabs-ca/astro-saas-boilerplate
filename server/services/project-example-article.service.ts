/**
 * Project Example Article Service
 * Server-side business logic for project example article CRUD operations
 *
 * Handles:
 * - Listing example articles for a project with ownership enforcement
 * - Batch adding example articles by URL (idempotent - skips duplicates)
 * - Deleting individual example articles
 *
 * Note: extracted_content and analyzed_style are populated later by PRD 4
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { projectService } from './project.service';
import type { IProjectExampleArticle, IBatchAddResponse } from '@shared/types/outrank.types';
import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

const MAX_EXAMPLES_PER_PROJECT = 5;

// =============================================================================
// Validation Schemas
// =============================================================================

const addExampleArticlesSchema = z.object({
  urls: z
    .array(z.string().url('Must be a valid URL').max(500, 'URL too long'))
    .min(1, 'At least one URL is required')
    .max(MAX_EXAMPLES_PER_PROJECT, `Maximum ${MAX_EXAMPLES_PER_PROJECT} example articles allowed`),
});

// =============================================================================
// Project Example Article Service Class
// =============================================================================

export class ProjectExampleArticleService {
  /**
   * List all example articles for a project (with ownership check)
   */
  async listByProject(projectId: string, userId: string): Promise<IProjectExampleArticle[]> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const { data, error } = await supabaseAdmin
      .from('project_example_articles')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to list example articles: ${error.message}`);
    return (data as IProjectExampleArticle[]) ?? [];
  }

  /**
   * Add example articles to a project by URL (idempotent — skips duplicates)
   */
  async createMany(
    projectId: string,
    userId: string,
    input: { urls: string[] }
  ): Promise<IBatchAddResponse> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const validated = addExampleArticlesSchema.parse(input);

    const { count } = await supabaseAdmin
      .from('project_example_articles')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const currentCount = count ?? 0;
    if (currentCount + validated.urls.length > MAX_EXAMPLES_PER_PROJECT) {
      throw new Error(
        `Cannot add ${validated.urls.length} example articles. Project has ${currentCount}/${MAX_EXAMPLES_PER_PROJECT}. ` +
          `You can add up to ${MAX_EXAMPLES_PER_PROJECT - currentCount} more.`
      );
    }

    const rows = validated.urls.map(url => ({ project_id: projectId, url }));

    const { data, error } = await supabaseAdmin
      .from('project_example_articles')
      .upsert(rows, { onConflict: 'project_id,url', ignoreDuplicates: true })
      .select();

    if (error) throw new Error(`Failed to add example articles: ${error.message}`);

    const added = data?.length ?? 0;
    const duplicates = validated.urls.length - added;

    return { added, duplicates };
  }

  /**
   * Delete a single example article by ID (with ownership check)
   */
  async delete(projectId: string, articleId: string, userId: string): Promise<void> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const { error } = await supabaseAdmin
      .from('project_example_articles')
      .delete()
      .eq('id', articleId)
      .eq('project_id', projectId);

    if (error) throw new Error(`Failed to delete example article: ${error.message}`);
  }
}

// Export singleton instance
export const projectExampleArticleService = new ProjectExampleArticleService();
