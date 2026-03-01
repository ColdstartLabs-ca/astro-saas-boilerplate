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
import { useCRUD } from './useCRUD';
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
  const data = await apiFetch<{ data: { projects: IProject[] } }>('/api/projects', {
    method: 'GET',
  });
  return data.data.projects ?? [];
}

/**
 * Create a new project
 */
async function createProject(input: ICreateProjectInput): Promise<IProject> {
  const data = await apiFetch<{ data: { project: IProject } }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.data.project;
}

/**
 * Update an existing project
 */
async function updateProject({
  projectId,
  input,
}: {
  projectId: string;
  input: IUpdateProjectInput;
}): Promise<IProject> {
  const data = await apiFetch<{ data: { project: IProject } }>(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return data.data.project;
}

/**
 * Delete a project
 */
async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  await apiFetch<{ data: { success: boolean } }>(`/api/projects/${projectId}`, {
    method: 'DELETE',
  });
  return { success: true };
}

// =============================================================================
// Types for useCRUD
// =============================================================================

type ProjectUpdateInput = { projectId: string; input: IUpdateProjectInput };

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
  const { user } = useUserStore();
  const { activeProjectId, setActiveProjectId: setActiveProjectStore } = useProjectStore();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Use the generic CRUD hook
  const crud = useCRUD<IProject, ICreateProjectInput, ProjectUpdateInput, string>({
    queryKey: ['projects', user?.id],
    fetchFn: fetchProjects,
    createFn: createProject,
    updateFn: updateProject,
    deleteFn: deleteProject,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    toastMessages: {
      create: {
        success: t('projects.success.created'),
        error: t('projects.errors.createFailed'),
      },
      update: {
        success: t('projects.success.updated'),
        error: t('projects.errors.updateFailed'),
      },
      delete: {
        success: t('projects.success.deleted'),
        error: t('projects.errors.deleteFailed'),
      },
    },
    loggerContexts: {
      create: 'Failed to create project',
      update: (vars: ProjectUpdateInput) => ({
        message: 'Failed to update project',
        context: { projectId: vars.projectId },
      }),
      delete: (projectId: string) => ({
        message: 'Failed to delete project',
        context: { projectId },
      }),
    },
    onBeforeDeleteInvalidate: (qc, deletedProjectId) => {
      // Remove stale campaigns cache for deleted project (prevents 500 errors)
      qc.removeQueries({ queryKey: ['campaigns', deletedProjectId] });
    },
    onDeleteSuccess: deletedProjectId => {
      // If deleted project was active, clear active project
      if (activeProjectId === deletedProjectId) {
        setActiveProjectStore(null);
      }
    },
  });

  const projects = crud.items;
  const isLoading = crud.isLoading;
  const error = crud.error;

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

  // Set active project action
  const setActiveProject = useCallback(
    (projectId: string | null) => {
      setActiveProjectStore(projectId);
      logger.info('Active project changed', { projectId });
    },
    [setActiveProjectStore, logger]
  );

  // Wrap update to match the original API (separate projectId and input params)
  const handleUpdateProject = useCallback(
    async (projectId: string, input: IUpdateProjectInput): Promise<IProject> => {
      return crud.update({ projectId, input });
    },
    [crud]
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
    createProject: crud.create,
    updateProject: handleUpdateProject,
    deleteProject: crud.remove,
    refetch: crud.refetch,
  };
}
