/**
 * Onboarding Types
 * TypeScript interfaces for the multi-step user onboarding wizard
 * AutopilotRank - User Onboarding Flow
 */

/**
 * Onboarding step definitions
 * Each step represents a part of the onboarding wizard
 */
export enum OnboardingStep {
  PROJECT_CREATION = 1,
  GSC_CONNECTION = 2,
  KEYWORDS_UPLOAD = 3,
  PREFERENCES = 4,
  INTEGRATIONS = 5,
  COMPLETION = 6,
}

/**
 * Full user onboarding interface matching the database schema
 */
export interface IUserOnboarding {
  id: string;
  user_id: string;
  current_step: number;
  completed_steps: number[];
  skipped_steps: number[];
  is_complete: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lightweight onboarding status for client consumption
 * Used to track wizard progress without exposing internal IDs
 */
export interface IOnboardingStatus {
  isComplete: boolean;
  currentStep: number;
  completedSteps: number[];
  skippedSteps: number[];
}

/**
 * Input for updating onboarding progress
 */
export interface IUpdateOnboardingProgressInput {
  currentStep: number;
  completedSteps: number[];
  skippedSteps: number[];
  isComplete?: boolean;
}

/**
 * Data for a single onboarding step in the UI
 */
export interface IOnboardingStepData {
  stepNumber: number;
  title: string;
  description: string;
  isRequired: boolean;
  isComplete: boolean;
  isSkipped: boolean;
  isCurrent: boolean;
}

/**
 * Error thrown when onboarding record is not found
 */
export class OnboardingNotFoundError extends Error {
  public readonly userId: string;

  constructor(userId: string) {
    super(`Onboarding record not found for user: ${userId}`);
    this.name = 'OnboardingNotFoundError';
    this.userId = userId;
  }
}

/**
 * Error thrown when step validation fails
 */
export class OnboardingStepError extends Error {
  public readonly step: number;
  public readonly reason: string;

  constructor(step: number, reason: string) {
    super(`Invalid onboarding step ${step}: ${reason}`);
    this.name = 'OnboardingStepError';
    this.step = step;
    this.reason = reason;
  }
}

/**
 * API response for onboarding status
 */
export interface IOnboardingStatusResponse {
  onboarding: IOnboardingStatus;
}

/**
 * API response for updating onboarding progress
 */
export interface IUpdateOnboardingResponse {
  onboarding: IOnboardingStatus;
}

export type OnboardingKeywordSuggestionSource =
  | 'openrouter_gsc'
  | 'openrouter_metadata'
  | 'gsc_fallback'
  | 'metadata_fallback'
  | 'none';

export type OnboardingKeywordSuggestionReason =
  | 'ok'
  | 'no_gsc_connection'
  | 'no_selected_site'
  | 'no_query_data'
  | 'ai_not_configured'
  | 'ai_failed';

export interface IOnboardingKeywordSuggestionsResponse {
  keywords: string[];
  source: OnboardingKeywordSuggestionSource;
  reason: OnboardingKeywordSuggestionReason;
  model: string | null;
}
