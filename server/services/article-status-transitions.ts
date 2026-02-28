/**
 * Article Status Transition State Machine
 *
 * Enforces valid status transitions for articles to prevent invalid workflow states.
 *
 * Valid transitions:
 * - planned -> queued (promote to generation queue)
 * - queued -> generating
 * - generating -> draft (success) | failed (error)
 * - draft -> approved | rejected
 * - approved -> reviewed
 * - reviewed -> approved (send back) | published
 * - rejected -> queued (retry)
 * - failed -> queued (retry)
 * - published is terminal (no transitions out)
 */

import type { ArticleStatus } from '@shared/types/article.types';

/**
 * Error thrown when an invalid status transition is attempted
 */
export class InvalidStatusTransitionError extends Error {
  constructor(
    public readonly fromStatus: ArticleStatus,
    public readonly toStatus: ArticleStatus,
    message?: string
  ) {
    super(
      message || `Invalid status transition: cannot change from "${fromStatus}" to "${toStatus}"`
    );
    this.name = 'InvalidStatusTransitionError';
  }
}

/**
 * State machine defining all valid article status transitions
 *
 * Key transitions:
 * - Planning flow: planned -> queued (promote stub to generation queue)
 * - Generation flow: queued -> generating -> draft/failed/failed_quality
 * - QA flow: draft -> qa_checking -> qa_passed/qa_failed
 * - Approval flow: qa_passed -> approved -> reviewed -> published
 * - Retry flows: failed -> queued, failed_quality -> queued, rejected -> queued, qa_failed -> queued
 * - Review backflow: reviewed -> approved (send back for changes)
 */
export const ARTICLE_STATUS_TRANSITIONS: Readonly<Record<ArticleStatus, readonly ArticleStatus[]>> =
  {
    // Planning stub — no content, no credits spent; can be promoted to the generation queue
    planned: ['queued'] as const,

    // Initial state for generation queue
    queued: ['generating'] as const,

    // Article is being generated
    generating: ['draft', 'failed', 'failed_quality'] as const,

    // Generation complete, ready for QA check
    draft: ['qa_checking', 'approved', 'rejected'] as const,

    // QA is being performed
    qa_checking: ['qa_passed', 'qa_failed'] as const,

    // QA passed, ready for approval
    qa_passed: ['approved', 'rejected'] as const,

    // QA failed, can retry or force approve
    qa_failed: ['queued', 'approved'] as const,

    // Approved by user, ready for review
    approved: ['reviewed'] as const,

    // Reviewed by editor, ready for final publication
    reviewed: ['approved', 'published'] as const,

    // Rejected during approval, can retry generation
    rejected: ['queued'] as const,

    // Generation failed (general error), can retry
    failed: ['queued'] as const,

    // Generation failed quality gate, can retry
    failed_quality: ['queued'] as const,

    // Generation failed due to timeout after max retries - terminal state
    failed_timeout: [] as const,

    // Published - terminal state, no transitions out
    published: [] as const,
  };

/**
 * Check if a status transition is valid
 *
 * @param fromStatus - Current article status
 * @param toStatus - Target status to transition to
 * @returns true if the transition is valid, false otherwise
 */
export function isValidTransition(fromStatus: ArticleStatus, toStatus: ArticleStatus): boolean {
  // Same status is always valid (no-op)
  if (fromStatus === toStatus) {
    return true;
  }

  const validTargets = ARTICLE_STATUS_TRANSITIONS[fromStatus];
  return validTargets.includes(toStatus);
}

/**
 * Validate a status transition and throw if invalid
 *
 * @param fromStatus - Current article status
 * @param toStatus - Target status to transition to
 * @throws InvalidStatusTransitionError if the transition is invalid
 */
export function validateTransition(fromStatus: ArticleStatus, toStatus: ArticleStatus): void {
  if (!isValidTransition(fromStatus, toStatus)) {
    throw new InvalidStatusTransitionError(fromStatus, toStatus);
  }
}

/**
 * Check if a status is terminal (no transitions out)
 *
 * @param status - Article status to check
 * @returns true if the status is terminal
 */
export function isTerminalStatus(status: ArticleStatus): boolean {
  return ARTICLE_STATUS_TRANSITIONS[status].length === 0;
}

/**
 * Get all valid next statuses for a given current status
 *
 * @param fromStatus - Current article status
 * @returns Array of valid target statuses
 */
export function getValidTransitions(fromStatus: ArticleStatus): readonly ArticleStatus[] {
  return ARTICLE_STATUS_TRANSITIONS[fromStatus];
}

/**
 * Check if additional data is required for a status transition
 *
 * @param toStatus - Target status to transition to
 * @returns Object indicating required fields
 */
export function getRequiredFieldsForTransition(toStatus: ArticleStatus): {
  published_url: boolean;
  published_at: boolean;
  rejection_reason: boolean;
} {
  switch (toStatus) {
    case 'published':
      return {
        published_url: true,
        published_at: false, // Auto-set by handler if not provided
        rejection_reason: false,
      };
    case 'rejected':
      return {
        published_url: false,
        published_at: false,
        rejection_reason: true,
      };
    default:
      return {
        published_url: false,
        published_at: false,
        rejection_reason: false,
      };
  }
}

/**
 * Validate that required fields are present for a status transition
 *
 * @param toStatus - Target status to transition to
 * @param data - Data object containing potential required fields
 * @throws Error if required fields are missing
 */
export function validateRequiredFieldsForTransition<T extends Record<string, unknown>>(
  toStatus: ArticleStatus,
  data: T
): void {
  const requiredFields = getRequiredFieldsForTransition(toStatus);

  if (requiredFields.published_url && !data.published_url) {
    throw new Error('published_url is required when transitioning to published status');
  }

  // rejection_reason is optional but recommended when rejecting
  if (requiredFields.rejection_reason && !data.rejection_reason) {
    // We don't throw an error here, but could log a warning
    console.warn('Transitioning to rejected status without providing a rejection_reason');
  }
}
