/**
 * Onboarding Store
 * Zustand store for managing onboarding wizard state
 *
 * Features:
 * - Tracks current step and progress
 * - Manages step completion/skip status
 * - Stores contextual data (project, keywords, connections)
 * - Provides computed properties for navigation logic
 */

import { create } from 'zustand';
import { OnboardingStep } from '@shared/types/onboarding.types';

// =============================================================================
// Types
// =============================================================================

export interface IOnboardingState {
  // Step tracking
  /** Current step number (1-5) */
  currentStep: number;
  /** Set of completed step numbers */
  completedSteps: Set<number>;
  /** Set of skipped step numbers */
  skippedSteps: Set<number>;

  // Contextual data
  /** ID of the project created during onboarding */
  projectId: string | null;
  /** ID of the campaign created during onboarding keyword step */
  campaignId: string | null;
  /** Number of keywords uploaded */
  keywordCount: number;
  /** Whether GSC is connected */
  hasGscConnection: boolean;
  /** Whether at least one integration is configured */
  hasIntegration: boolean;

  // Step tracking actions
  /** Set the current step */
  setCurrentStep: (step: number) => void;
  /** Mark a step as completed */
  markStepComplete: (step: number) => void;
  /** Mark a step as skipped */
  markStepSkipped: (step: number) => void;
  /** Remove skip status from a step (when returning to it) */
  unmarkStepSkipped: (step: number) => void;

  // Contextual data actions
  /** Set the project ID */
  setProjectId: (id: string | null) => void;
  /** Set the campaign ID */
  setCampaignId: (id: string | null) => void;
  /** Set the keyword count */
  setKeywordCount: (count: number) => void;
  /** Set whether GSC is connected */
  setHasGscConnection: (value: boolean) => void;
  /** Set whether an integration is configured */
  setHasIntegration: (value: boolean) => void;

  // Session-only dismiss flag (persisted in user-scoped localStorage)
  /** Whether user has dismissed the onboarding wizard this session */
  isDismissed: boolean;
  /**
   * Sync the dismissed flag from localStorage for the given user.
   * Must be called once the user ID is known (e.g. in useOnboardingStatus).
   * Also cleans up the legacy non-scoped key.
   */
  syncDismissed: (userId: string) => void;
  /** Dismiss the onboarding wizard (persisted per user) */
  dismiss: () => void;

  // Bulk actions
  /** Initialize store from server data */
  initializeFromServer: (data: {
    currentStep: number;
    completedSteps: number[];
    skippedSteps: number[];
  }) => void;
  /** Reset store to initial state */
  reset: () => void;

  // Computed getters
  /** Check if user can proceed to the next step */
  canProceedToNext: () => boolean;
  /** Check if a specific step can be skipped */
  canSkipStep: (step: number) => boolean;
  /** Check if a step is optional */
  isStepOptional: (step: number) => boolean;
  /** Get total progress percentage (0-100) */
  getProgressPercentage: () => number;
}

// =============================================================================
// Constants
// =============================================================================

/** Legacy key from before user-scoped storage — cleaned up on first syncDismissed() call */
const LEGACY_DISMISSED_KEY = 'onboarding_dismissed';
const getDismissedKey = (userId: string) => `onboarding_dismissed_${userId}`;

/** Total number of onboarding steps */
const TOTAL_STEPS = 5;
const COMPLETION_STEP = OnboardingStep.COMPLETION;

/** Steps that are optional (can be skipped) */
const OPTIONAL_STEPS = new Set([OnboardingStep.GSC_CONNECTION, OnboardingStep.INTEGRATIONS]);

/** Required steps that must be completed */
const REQUIRED_STEPS = new Set([OnboardingStep.PROJECT_CREATION, OnboardingStep.KEYWORDS_UPLOAD]);

function sanitizeSteps(steps: number[]): number[] {
  return Array.from(
    new Set(
      steps.filter(
        step => Number.isInteger(step) && step >= OnboardingStep.PROJECT_CREATION && step < COMPLETION_STEP
      )
    )
  ).sort((a, b) => a - b);
}

// =============================================================================
// Store
// =============================================================================

/**
 * Module-level variable to track the current user's ID for localStorage keying.
 * Set by syncDismissed() when the user is known. Avoids exposing internal state
 * in the Zustand interface.
 */
let _currentUserId: string | null = null;

const initialState = {
  currentStep: OnboardingStep.PROJECT_CREATION,
  completedSteps: new Set<number>(),
  skippedSteps: new Set<number>(),
  projectId: null,
  campaignId: null,
  keywordCount: 0,
  hasGscConnection: false,
  hasIntegration: false,
  isDismissed: false, // always starts false; synced via syncDismissed(userId)
};

export const useOnboardingStore = create<IOnboardingState>((set, get) => ({
  // Initial state
  ...initialState,

  // Step tracking actions
  setCurrentStep: step => {
    if (step < 1 || step > TOTAL_STEPS) {
      console.warn(`Invalid step number: ${step}. Must be between 1 and ${TOTAL_STEPS}`);
      return;
    }
    set({ currentStep: step });
  },

  markStepComplete: step => {
    set(state => {
      const newCompletedSteps = new Set(state.completedSteps);
      newCompletedSteps.add(step);
      // Remove from skipped if it was previously skipped
      const newSkippedSteps = new Set(state.skippedSteps);
      newSkippedSteps.delete(step);
      return {
        completedSteps: newCompletedSteps,
        skippedSteps: newSkippedSteps,
      };
    });
  },

  markStepSkipped: step => {
    const state = get();
    // Cannot skip required steps
    if (REQUIRED_STEPS.has(step)) {
      console.warn(`Cannot skip required step: ${step}`);
      return;
    }
    set(() => {
      const newSkippedSteps = new Set(state.skippedSteps);
      newSkippedSteps.add(step);
      // Remove from completed if it was previously completed
      const newCompletedSteps = new Set(state.completedSteps);
      newCompletedSteps.delete(step);
      return {
        skippedSteps: newSkippedSteps,
        completedSteps: newCompletedSteps,
      };
    });
  },

  unmarkStepSkipped: step => {
    set(state => {
      const newSkippedSteps = new Set(state.skippedSteps);
      newSkippedSteps.delete(step);
      return { skippedSteps: newSkippedSteps };
    });
  },

  // Contextual data actions
  setProjectId: id => set({ projectId: id }),

  setCampaignId: id => set({ campaignId: id }),

  setKeywordCount: count => set({ keywordCount: Math.max(0, count) }),

  setHasGscConnection: value => set({ hasGscConnection: value }),

  setHasIntegration: value => set({ hasIntegration: value }),

  // Sync dismissed state from user-scoped localStorage key.
  // Also removes the legacy generic key to avoid cross-user contamination.
  syncDismissed: (userId: string) => {
    _currentUserId = userId;
    if (typeof window !== 'undefined') {
      // Clean up legacy non-scoped key (left over from before user-scoped storage)
      localStorage.removeItem(LEGACY_DISMISSED_KEY);
      const isDismissed = localStorage.getItem(getDismissedKey(userId)) === 'true';
      set({ isDismissed });
    }
  },

  // Persist dismiss flag to user-scoped key so it survives page refreshes
  dismiss: () => {
    if (_currentUserId && typeof window !== 'undefined') {
      localStorage.setItem(getDismissedKey(_currentUserId), 'true');
    }
    set({ isDismissed: true });
  },

  // Bulk actions
  initializeFromServer: data => {
    const completedSteps = sanitizeSteps(data.completedSteps);
    const skippedSteps = sanitizeSteps(data.skippedSteps).filter(step => !REQUIRED_STEPS.has(step));
    const completedSet = new Set(completedSteps);
    const normalizedSkipped = skippedSteps.filter(step => !completedSet.has(step));

    set({
      currentStep: Math.min(Math.max(data.currentStep, OnboardingStep.PROJECT_CREATION), TOTAL_STEPS),
      completedSteps: new Set(completedSteps),
      skippedSteps: new Set(normalizedSkipped),
    });
  },

  reset: () => {
    if (typeof window !== 'undefined') {
      if (_currentUserId) {
        localStorage.removeItem(getDismissedKey(_currentUserId));
      }
      localStorage.removeItem(LEGACY_DISMISSED_KEY);
    }
    _currentUserId = null;
    set({ ...initialState, isDismissed: false });
  },

  // Computed getters
  canProceedToNext: () => {
    const state = get();
    const { currentStep, projectId, keywordCount } = state;

    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        // Requires a project to be created
        return projectId !== null;

      case OnboardingStep.GSC_CONNECTION:
        // GSC is optional - always can proceed
        return true;

      case OnboardingStep.KEYWORDS_UPLOAD:
        // Requires at least one keyword
        return keywordCount > 0;

      case OnboardingStep.INTEGRATIONS:
        // Integrations are optional - always can proceed
        return true;

      case OnboardingStep.COMPLETION:
        // Already on completion step
        return false;

      default:
        return false;
    }
  },

  canSkipStep: step => {
    return OPTIONAL_STEPS.has(step);
  },

  isStepOptional: step => {
    return OPTIONAL_STEPS.has(step);
  },

  getProgressPercentage: () => {
    const state = get();
    const { completedSteps, skippedSteps } = state;

    // Count steps that are either completed or skipped (for optional steps)
    let finishedCount = 0;

    for (let step = 1; step <= TOTAL_STEPS; step++) {
      if (step === OnboardingStep.COMPLETION) {
        // Completion step doesn't count toward progress
        continue;
      }
      if (completedSteps.has(step) || skippedSteps.has(step)) {
        finishedCount++;
      }
    }

    // 4 actionable steps (exclude completion)
    const actionableSteps = TOTAL_STEPS - 1;
    return Math.round((finishedCount / actionableSteps) * 100);
  },
}));
