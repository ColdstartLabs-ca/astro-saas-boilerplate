/**
 * Onboarding Store
 * Zustand store for managing inter-step data during the onboarding wizard.
 *
 * The wizard is fully ephemeral — step navigation is managed locally in
 * OnboardingWizard. This store only holds data that needs to flow between
 * steps (e.g. the projectId created in step 1 is needed in step 3).
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export interface IOnboardingState {
  // Inter-step contextual data
  /** ID of the project created during onboarding step 1 */
  projectId: string | null;
  /** ID of the campaign created during onboarding step 3 */
  campaignId: string | null;
  /** Number of keywords uploaded in step 3 */
  keywordCount: number;
  /** Whether GSC was connected in step 2 */
  hasGscConnection: boolean;
  /** Whether at least one integration was configured in step 4 */
  hasIntegration: boolean;
  /** Set of completed step numbers */
  completedSteps: Set<number>;
  /** Set of skipped step numbers */
  skippedSteps: Set<number>;

  // Actions
  setProjectId: (id: string | null) => void;
  setCampaignId: (id: string | null) => void;
  setKeywordCount: (count: number) => void;
  setHasGscConnection: (value: boolean) => void;
  setHasIntegration: (value: boolean) => void;
  markStepComplete: (step: number) => void;
  markStepSkipped: (step: number) => void;

  /** Reset all inter-step data (call when wizard closes or resets) */
  reset: () => void;
}

// =============================================================================
// Store
// =============================================================================

const initialState = {
  projectId: null,
  campaignId: null,
  keywordCount: 0,
  hasGscConnection: false,
  hasIntegration: false,
  completedSteps: new Set<number>(),
  skippedSteps: new Set<number>(),
};

export const useOnboardingStore = create<IOnboardingState>(set => ({
  ...initialState,

  setProjectId: id => set({ projectId: id }),
  setCampaignId: id => set({ campaignId: id }),
  setKeywordCount: count => set({ keywordCount: Math.max(0, count) }),
  setHasGscConnection: value => set({ hasGscConnection: value }),
  setHasIntegration: value => set({ hasIntegration: value }),
  markStepComplete: step =>
    set(state => ({ completedSteps: new Set([...state.completedSteps, step]) })),
  markStepSkipped: step =>
    set(state => ({ skippedSteps: new Set([...state.skippedSteps, step]) })),

  reset: () => set({ ...initialState }),
}));
