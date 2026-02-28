/**
 * Project Store
 * Zustand store for shared active project state across components
 *
 * Purpose: Fix desynchronization issue where each useProjects() call
 * maintains local state, causing cross-component inconsistencies.
 *
 * BUG M15 fix: localStorage key is scoped per user to prevent cross-account
 * data leakage when users switch accounts on the same browser.
 */

import { create } from 'zustand';

const BASE_KEY = 'autopilotrank_active_project_id';

/**
 * Return a localStorage key scoped to the given userId.
 * Falls back to the base key when userId is absent (pre-auth reads).
 */
function storageKey(userId?: string | null): string {
  return userId ? `${BASE_KEY}_${userId}` : BASE_KEY;
}

/**
 * Get active project ID from localStorage for the given user
 */
function getActiveProjectIdFromStorage(userId?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

/**
 * Set active project ID in localStorage for the given user
 */
function setActiveProjectIdInStorage(projectId: string | null, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (projectId) {
      localStorage.setItem(storageKey(userId), projectId);
    } else {
      localStorage.removeItem(storageKey(userId));
    }
  } catch {
    // Fail silently
  }
}

export interface IProjectState {
  /** The currently active project ID for the current user */
  activeProjectId: string | null;
  /** The current user ID (used to scope localStorage) */
  userId: string | null;
  /** Set the active project ID */
  setActiveProjectId: (projectId: string | null) => void;
  /** Clear the active project ID */
  clearActiveProjectId: () => void;
  /**
   * Set the current user ID and reload activeProjectId from the user-scoped
   * localStorage key. Call this after auth state is resolved.
   */
  setUserId: (userId: string | null) => void;
}

export const useProjectStore = create<IProjectState>((set, get) => ({
  // Initialize from the unscoped key (no userId yet at store creation time)
  activeProjectId: getActiveProjectIdFromStorage(null),
  userId: null,

  setActiveProjectId: (projectId: string | null) => {
    const { userId } = get();
    set({ activeProjectId: projectId });
    setActiveProjectIdInStorage(projectId, userId);
  },

  clearActiveProjectId: () => {
    const { userId } = get();
    set({ activeProjectId: null });
    setActiveProjectIdInStorage(null, userId);
  },

  setUserId: (userId: string | null) => {
    // Load the project that was last active for this specific user
    const activeProjectId = getActiveProjectIdFromStorage(userId);
    set({ userId, activeProjectId });
  },
}));
