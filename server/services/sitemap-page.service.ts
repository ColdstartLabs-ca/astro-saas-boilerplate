/**
 * Sitemap Page Service
 * Server-side business logic for sitemap page operations
 *
 * Handles:
 * - Listing sitemap pages for a project with pagination
 * - Bulk inserting sitemap pages (idempotent - skips duplicates)
 * - Deleting all sitemap pages for a project
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { projectService } from './project.service';
import type { ISitemapPage } from '@shared/types/outrank.types';

// =============================================================================
// Sitemap Page Service Class
// =============================================================================

export class SitemapPageService {
  /**
   * List sitemap pages for a project with pagination (with ownership check)
   */
  async listByProject(
    projectId: string,
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ pages: ISitemapPage[]; total: number }> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    // Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('sitemap_pages')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (countError) throw new Error(`Failed to count sitemap pages: ${countError.message}`);

    // Get paginated data
    const { data, error } = await supabaseAdmin
      .from('sitemap_pages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to list sitemap pages: ${error.message}`);

    return {
      pages: (data as ISitemapPage[]) ?? [],
      total: count ?? 0,
    };
  }

  /**
   * Bulk insert sitemap pages (idempotent — skips duplicates)
   * Note: No ownership check - used internally by sitemap parsing jobs
   */
  async bulkInsert(
    projectId: string,
    pages: Array<{ url: string; title?: string; last_modified?: string }>
  ): Promise<number> {
    const rows = pages.map(p => ({
      project_id: projectId,
      url: p.url,
      title: p.title ?? null,
      last_modified: p.last_modified ?? null,
    }));

    const { data, error } = await supabaseAdmin
      .from('sitemap_pages')
      .upsert(rows, { onConflict: 'project_id,url', ignoreDuplicates: true })
      .select();

    if (error) throw new Error(`Failed to insert sitemap pages: ${error.message}`);

    return data?.length ?? 0;
  }

  /**
   * Delete all sitemap pages for a project (with ownership check)
   */
  async deleteAllForProject(projectId: string, userId: string): Promise<void> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const { error } = await supabaseAdmin
      .from('sitemap_pages')
      .delete()
      .eq('project_id', projectId);

    if (error) throw new Error(`Failed to delete sitemap pages: ${error.message}`);
  }
}

// Export singleton instance
export const sitemapPageService = new SitemapPageService();
