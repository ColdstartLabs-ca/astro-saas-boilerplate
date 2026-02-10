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
import { useUserStore } from '@client/store/userStore';
import { useProjectStore } from '@client/store/projectStore';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';
import { useLogger } from '@client/utils/logger';

// =============================================================================
// Constants
// =============================================================================

const _ACTIVE_PROJECT_KEY = 'autopilotrank_active_project_id';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch user's projects from API
 */
async function fetchProjects(): Promise<IProject[]> {
  const data = await apiFetch<{ projects: IProject[] }>('/api/projects', {
    method: 'GET',
  });
  return data.projects ?? [];
}

/**
 * Create a new project
 */
async function createProject(input: ICreateProjectInput): Promise<IProject> {
  const data = await apiFetch<{ project: IProject }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.project;
}

/**
 * Update an existing project
 */
async function updateProject(projectId: string, input: IUpdateProjectInput): Promise<IProject> {
  const data = await apiFetch<{ project: IProject }>(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return data.project;
}

/**
 * Delete a project
 */
async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  await apiFetch<{ success: boolean }>(`/api/projects/${projectId}`, {
    method: 'DELETE',
  });
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
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: IUpdateProjectInput }) =>
      updateProject(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
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
  const handleCreateProject = useMutationWithToast(createMutation, {
    successMessage: t('projects.success.created'),
    errorMessage: t('projects.errors.createFailed'),
    loggerContext: 'Failed to create project',
  });

  const updateProjectWithToast = useMutationWithToast(updateMutation, {
    successMessage: t('projects.success.updated'),
    errorMessage: t('projects.errors.updateFailed'),
    loggerContext: (variables: { projectId: string; input: IUpdateProjectInput }) => ({
      message: 'Failed to update project',
      context: { projectId: variables.projectId },
    }),
  });

  const handleUpdateProject = useCallback(
    async (projectId: string, input: IUpdateProjectInput): Promise<IProject> => {
      return updateProjectWithToast({ projectId, input });
    },
    [updateProjectWithToast]
  );

  const deleteProjectWithToast = useMutationWithToast(deleteMutation, {
    successMessage: t('projects.success.deleted'),
    errorMessage: t('projects.errors.deleteFailed'),
    loggerContext: (projectId: string) => ({
      message: 'Failed to delete project',
      context: { projectId },
    }),
  });

  const handleDeleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      await deleteProjectWithToast(projectId);
    },
    [deleteProjectWithToast]
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
