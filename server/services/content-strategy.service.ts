/**
 * Content Strategy Service
 * Server-side business logic for content strategy operations
 *
 * Handles:
 * - Getting the latest content strategy for a project
 * - Creating a new content strategy (pending status)
 * - Updating strategy status and data
 *
 * Note: Strategy generation logic is handled in PRD 5
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { projectService } from './project.service';
import type { IContentStrategy, ContentStrategyStatus } from '@shared/types/outrank.types';

// =============================================================================
// Content Strategy Service Class
// =============================================================================

export class ContentStrategyService {
  /**
   * Get the latest content strategy for a project (with ownership check)
   */
  async getByProject(projectId: string, userId: string): Promise<IContentStrategy | null> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    const { data, error } = await supabaseAdmin
      .from('content_strategies')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to get content strategy: ${error.message}`);
    return data as IContentStrategy | null;
  }

  /**
   * Get the latest content strategy for a project (alias for getByProject)
   */
  async getLatestByProject(projectId: string, userId: string): Promise<IContentStrategy | null> {
    return this.getByProject(projectId, userId);
  }

  /**
   * Create a new content strategy with pending status
   * Fails if there's already a pending or generating strategy
   */
  async create(projectId: string, userId: string): Promise<IContentStrategy> {
    const project = await projectService.getById(projectId, userId);
    if (!project) throw new Error('Project not found');

    // Check for existing pending or generating strategy
    const { data: existing } = await supabaseAdmin
      .from('content_strategies')
      .select('id, status')
      .eq('project_id', projectId)
      .in('status', ['pending', 'generating'])
      .maybeSingle();

    if (existing) {
      throw new Error(
        `Content strategy generation already in progress (status: ${existing.status})`
      );
    }

    const { data, error } = await supabaseAdmin
      .from('content_strategies')
      .insert({
        project_id: projectId,
        user_id: userId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create content strategy: ${error.message}`);
    return data as IContentStrategy;
  }

  /**
   * Update content strategy status and optional data
   * Used by PRD 5 generation logic to update strategy state
   */
  async updateStatus(
    strategyId: string,
    status: ContentStrategyStatus,
    data?: Partial<Pick<IContentStrategy, 'strategy_data' | 'generation_time_ms' | 'error_message'>>
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status, ...data };

    const { error } = await supabaseAdmin
      .from('content_strategies')
      .update(updateData)
      .eq('id', strategyId);

    if (error) throw new Error(`Failed to update content strategy: ${error.message}`);
  }
}

// Export singleton instance
export const contentStrategyService = new ContentStrategyService();
