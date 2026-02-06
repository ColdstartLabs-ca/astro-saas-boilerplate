/**
 * useProjects Hook
 * React hook for project management with active project state
 *
 * Features:
 * - Fetch projects via React Query
 * - Active project management via localStorage
 * - CRUD mutations for projects
 * - Auto-select first project if none selected
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback, useEffect } from 'react';
import type {
  IProject,
  ICreateProjectInput,
  IUpdateProjectInput,
} from '@shared/types/project.types';
import { useLogger } from '@client/utils/logger';
import { useUserStore } from '@client/store/userStore';
import { useProjectStore } from '@client/store/projectStore';
import { useToastStore } from '@client/store/toastStore';
import { createClient } from '@shared/utils/supabase/client';
import { getTranslations } from '@src/i18n/utils';

// =============================================================================
// Constants
// =============================================================================

const _ACTIVE_PROJECT_KEY = 'autopilotrank_active_project_id';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get the current user's access token for API requests
 */
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Build auth headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * Fetch user's projects from API
 */
async function fetchProjects(): Promise<IProject[]> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/projects', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to fetch projects');
  }

  const data = await response.json();
  return data.projects ?? [];
}

/**
 * Create a new project
 */
async function createProject(input: ICreateProjectInput): Promise<IProject> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to create project');
  }

  const data = await response.json();
  return data.project;
}

/**
 * Update an existing project
 */
async function updateProject(projectId: string, input: IUpdateProjectInput): Promise<IProject> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to update project');
  }

  const data = await response.json();
  return data.project;
}

/**
 * Delete a project
 */
async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to delete project');
  }

  return { success: true };
}

// =============================================================================
// Hook
// =============================================================================

interface IUseProjectsReturn {
  // Data
  projects: IProject[];
  activeProject: IProject | null;
  activeProjectId: string | null;
  isLoading: boolean;
  error: Error | null;
  projectCount: number;

  // Actions
  setActiveProject: (projectId: string | null) => void;
  createProject: (input: ICreateProjectInput) => Promise<IProject>;
  updateProject: (projectId: string, input: IUpdateProjectInput) => Promise<IProject>;
  deleteProject: (projectId: string) => Promise<void>;
  refetch: () => void;
}

export function useProjects(): IUseProjectsReturn {
  const logger = useLogger('useProjects');
  const queryClient = useQueryClient();
  const { user } = useUserStore();
  const { activeProjectId, setActiveProjectId: setActiveProjectStore } = useProjectStore();
  const { showToast } = useToastStore();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Fetch projects query - scoped by user ID to prevent cross-account stale data
  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: fetchProjects,
    enabled: !!user, // Only fetch if authenticated
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Derive active project from projects list and activeProjectId
  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find(p => p.id === activeProjectId) ?? null;
  }, [projects, activeProjectId]);

  // Auto-select first project if none selected and projects exist
  useEffect(() => {
    if (!activeProjectId && projects.length > 0 && !isLoading) {
      const firstProject = projects[0];
      setActiveProjectStore(firstProject.id);
    }
    // If active project ID is set but project no longer exists, clear it
    if (activeProjectId && !activeProject && projects.length > 0) {
      setActiveProjectStore(null);
    }
  }, [activeProjectId, activeProject, projects, isLoading, setActiveProjectStore]);

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      // Auto-select newly created project
      // (Note: we can't access the new project here directly, but the query will update)
      showToast({
        message: t('projects.success.created'),
        type: 'success',
      });
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: IUpdateProjectInput }) =>
      updateProject(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      showToast({
        message: t('projects.success.updated'),
        type: 'success',
      });
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, deletedProjectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      // If deleted project was active, clear active project
      if (activeProjectId === deletedProjectId) {
        setActiveProjectStore(null);
      }
      showToast({
        message: t('projects.success.deleted'),
        type: 'success',
      });
    },
  });

  // Set active project action
  const setActiveProject = useCallback(
    (projectId: string | null) => {
      setActiveProjectStore(projectId);
      logger.info('Active project changed', { projectId });
    },
    [setActiveProjectStore, logger]
  );

  // Wrapped mutation functions with error handling
  const handleCreateProject = useCallback(
    async (input: ICreateProjectInput): Promise<IProject> => {
      try {
        return await createMutation.mutateAsync(input);
      } catch (error) {
        logger.error('Failed to create project', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast({
          message: t('projects.errors.createFailed'),
          type: 'error',
        });
        throw error;
      }
    },
    [createMutation, logger, showToast, t]
  );

  const handleUpdateProject = useCallback(
    async (projectId: string, input: IUpdateProjectInput): Promise<IProject> => {
      try {
        return await updateMutation.mutateAsync({ projectId, input });
      } catch (error) {
        logger.error('Failed to update project', {
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId,
        });
        showToast({
          message: t('projects.errors.updateFailed'),
          type: 'error',
        });
        throw error;
      }
    },
    [updateMutation, logger, showToast, t]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        await deleteMutation.mutateAsync(projectId);
      } catch (error) {
        logger.error('Failed to delete project', {
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId,
        });
        showToast({
          message: t('projects.errors.deleteFailed'),
          type: 'error',
        });
        throw error;
      }
    },
    [deleteMutation, logger, showToast, t]
  );

  return {
    // Data
    projects,
    activeProject,
    activeProjectId,
    isLoading,
    error,
    projectCount: projects.length,

    // Actions
    setActiveProject,
    createProject: handleCreateProject,
    updateProject: handleUpdateProject,
    deleteProject: handleDeleteProject,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['projects', user?.id] }),
  };
}
