/**
 * Project Store
 * Zustand store for shared active project state across components
 *
 * Purpose: Fix desynchronization issue where each useProjects() call
 * maintains local state, causing cross-component inconsistencies.
 */

import { create } from 'zustand';

const ACTIVE_PROJECT_KEY = 'autopilotrank_active_project_id';

/**
 * Get active project ID from localStorage
 */
function getActiveProjectIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

/**
 * Set active project ID in localStorage
 */
function setActiveProjectIdInStorage(projectId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (projectId) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch {
    // Fail silently
  }
}

export interface IProjectState {
  /** The currently active project ID for the current user */
  activeProjectId: string | null;
  /** Set the active project ID */
  setActiveProjectId: (projectId: string | null) => void;
  /** Clear the active project ID */
  clearActiveProjectId: () => void;
}

export const useProjectStore = create<IProjectState>((set, _get) => ({
  // Initialize from localStorage
  activeProjectId: getActiveProjectIdFromStorage(),

  setActiveProjectId: (projectId: string | null) => {
    set({ activeProjectId: projectId });
    setActiveProjectIdInStorage(projectId);
  },

  clearActiveProjectId: () => {
    set({ activeProjectId: null });
    setActiveProjectIdInStorage(null);
  },
}));
