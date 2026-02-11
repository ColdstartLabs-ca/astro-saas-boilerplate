/**
 * Article Status Transitions Unit Tests
 *
 * Tests for the state machine logic itself, independent of the API layer.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  validateTransition,
  InvalidStatusTransitionError,
  isTerminalStatus,
  getValidTransitions,
  getRequiredFieldsForTransition,
  validateRequiredFieldsForTransition,
} from '@server/services/article-status-transitions';
import type { ArticleStatus } from '@shared/types/article.types';

describe('Article Status Transitions', () => {
  describe('isValidTransition', () => {
    it('should allow same status (no-op)', () => {
      const statuses: ArticleStatus[] = [
        'queued',
        'generating',
        'draft',
        'approved',
        'reviewed',
        'published',
        'rejected',
        'failed',
      ];

      statuses.forEach(status => {
        expect(isValidTransition(status, status)).toBe(true);
      });
    });

    describe('Generation flow', () => {
      it('queued -> generating: valid', () => {
        expect(isValidTransition('queued', 'generating')).toBe(true);
      });

      it('generating -> draft: valid', () => {
        expect(isValidTransition('generating', 'draft')).toBe(true);
      });

      it('generating -> failed: valid', () => {
        expect(isValidTransition('generating', 'failed')).toBe(true);
      });

      it('queued -> draft: invalid (skip generating)', () => {
        expect(isValidTransition('queued', 'draft')).toBe(false);
      });

      it('queued -> failed: invalid', () => {
        expect(isValidTransition('queued', 'failed')).toBe(false);
      });

      it('generating -> approved: invalid (skip draft)', () => {
        expect(isValidTransition('generating', 'approved')).toBe(false);
      });
    });

    describe('Approval flow', () => {
      it('draft -> approved: valid', () => {
        expect(isValidTransition('draft', 'approved')).toBe(true);
      });

      it('draft -> rejected: valid', () => {
        expect(isValidTransition('draft', 'rejected')).toBe(true);
      });

      it('approved -> reviewed: valid', () => {
        expect(isValidTransition('approved', 'reviewed')).toBe(true);
      });

      it('reviewed -> approved: valid (send back)', () => {
        expect(isValidTransition('reviewed', 'approved')).toBe(true);
      });

      it('reviewed -> published: valid', () => {
        expect(isValidTransition('reviewed', 'published')).toBe(true);
      });

      it('draft -> reviewed: invalid (skip approved)', () => {
        expect(isValidTransition('draft', 'reviewed')).toBe(false);
      });

      it('draft -> published: invalid (skip approval flow)', () => {
        expect(isValidTransition('draft', 'published')).toBe(false);
      });

      it('approved -> draft: invalid (backwards)', () => {
        expect(isValidTransition('approved', 'draft')).toBe(false);
      });

      it('approved -> published: invalid (skip reviewed)', () => {
        expect(isValidTransition('approved', 'published')).toBe(false);
      });

      it('reviewed -> draft: invalid (too far back)', () => {
        expect(isValidTransition('reviewed', 'draft')).toBe(false);
      });

      it('reviewed -> rejected: invalid', () => {
        expect(isValidTransition('reviewed', 'rejected')).toBe(false);
      });
    });

    describe('Retry flows', () => {
      it('rejected -> queued: valid', () => {
        expect(isValidTransition('rejected', 'queued')).toBe(true);
      });

      it('failed -> queued: valid', () => {
        expect(isValidTransition('failed', 'queued')).toBe(true);
      });

      it('failed_quality -> queued: valid', () => {
        expect(isValidTransition('failed_quality', 'queued')).toBe(true);
      });

      it('rejected -> draft: invalid (skip retry)', () => {
        expect(isValidTransition('rejected', 'draft')).toBe(false);
      });

      it('failed -> draft: invalid (skip retry)', () => {
        expect(isValidTransition('failed', 'draft')).toBe(false);
      });

      it('failed_quality -> draft: invalid (skip retry)', () => {
        expect(isValidTransition('failed_quality', 'draft')).toBe(false);
      });

      it('rejected -> generating: invalid', () => {
        expect(isValidTransition('rejected', 'generating')).toBe(false);
      });

      it('failed -> generating: invalid', () => {
        expect(isValidTransition('failed', 'generating')).toBe(false);
      });

      it('failed_quality -> generating: invalid', () => {
        expect(isValidTransition('failed_quality', 'generating')).toBe(false);
      });
    });

    describe('Terminal state (published)', () => {
      it('published -> draft: invalid', () => {
        expect(isValidTransition('published', 'draft')).toBe(false);
      });

      it('published -> reviewed: invalid', () => {
        expect(isValidTransition('published', 'reviewed')).toBe(false);
      });

      it('published -> approved: invalid', () => {
        expect(isValidTransition('published', 'approved')).toBe(false);
      });

      it('published -> queued: invalid', () => {
        expect(isValidTransition('published', 'queued')).toBe(false);
      });

      it('published -> any other status: invalid', () => {
        const otherStatuses: ArticleStatus[] = [
          'queued',
          'generating',
          'draft',
          'approved',
          'reviewed',
          'rejected',
          'failed',
        ];

        otherStatuses.forEach(status => {
          expect(isValidTransition('published', status)).toBe(false);
        });
      });
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transitions', () => {
      expect(() => validateTransition('queued', 'generating')).not.toThrow();
      expect(() => validateTransition('draft', 'approved')).not.toThrow();
      expect(() => validateTransition('reviewed', 'published')).not.toThrow();
    });

    it('should throw InvalidStatusTransitionError for invalid transitions', () => {
      expect(() => validateTransition('published', 'draft')).toThrow(InvalidStatusTransitionError);
      expect(() => validateTransition('draft', 'published')).toThrow(InvalidStatusTransitionError);
    });

    it('should include from and to status in error', () => {
      try {
        validateTransition('published', 'draft');
        expect.fail('Should have thrown InvalidStatusTransitionError');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStatusTransitionError);
        if (error instanceof InvalidStatusTransitionError) {
          expect(error.fromStatus).toBe('published');
          expect(error.toStatus).toBe('draft');
        }
      }
    });

    it('should not throw for same status', () => {
      expect(() => validateTransition('draft', 'draft')).not.toThrow();
      expect(() => validateTransition('published', 'published')).not.toThrow();
    });
  });

  describe('isTerminalStatus', () => {
    it('published should be terminal', () => {
      expect(isTerminalStatus('published')).toBe(true);
    });

    it('all other statuses should not be terminal', () => {
      const nonTerminal: ArticleStatus[] = [
        'queued',
        'generating',
        'draft',
        'approved',
        'reviewed',
        'rejected',
        'failed',
        'failed_quality',
      ];

      nonTerminal.forEach(status => {
        expect(isTerminalStatus(status)).toBe(false);
      });
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for queued', () => {
      expect(getValidTransitions('queued')).toEqual(['generating']);
    });

    it('should return valid transitions for generating', () => {
      const transitions = getValidTransitions('generating');
      expect(transitions).toContain('draft');
      expect(transitions).toContain('failed');
    });

    it('should return valid transitions for draft', () => {
      const transitions = getValidTransitions('draft');
      expect(transitions).toContain('approved');
      expect(transitions).toContain('rejected');
    });

    it('should return valid transitions for approved', () => {
      expect(getValidTransitions('approved')).toEqual(['reviewed']);
    });

    it('should return valid transitions for reviewed', () => {
      const transitions = getValidTransitions('reviewed');
      expect(transitions).toContain('approved');
      expect(transitions).toContain('published');
    });

    it('should return valid transitions for rejected', () => {
      expect(getValidTransitions('rejected')).toEqual(['queued']);
    });

    it('should return valid transitions for failed', () => {
      expect(getValidTransitions('failed')).toEqual(['queued']);
    });

    it('should return valid transitions for failed_quality', () => {
      expect(getValidTransitions('failed_quality')).toEqual(['queued']);
    });

    it('should return empty array for published (terminal)', () => {
      expect(getValidTransitions('published')).toEqual([]);
    });
  });

  describe('getRequiredFieldsForTransition', () => {
    it('published should require published_url (published_at auto-set by handler)', () => {
      const required = getRequiredFieldsForTransition('published');
      expect(required.published_url).toBe(true);
      expect(required.published_at).toBe(false);
      expect(required.rejection_reason).toBe(false);
    });

    it('rejected should recommend rejection_reason', () => {
      const required = getRequiredFieldsForTransition('rejected');
      expect(required.published_url).toBe(false);
      expect(required.published_at).toBe(false);
      expect(required.rejection_reason).toBe(true);
    });

    it('other statuses should not require any special fields', () => {
      const otherStatuses: ArticleStatus[] = [
        'queued',
        'generating',
        'draft',
        'approved',
        'reviewed',
        'failed',
        'failed_quality',
      ];

      otherStatuses.forEach(status => {
        const required = getRequiredFieldsForTransition(status);
        expect(required.published_url).toBe(false);
        expect(required.published_at).toBe(false);
        expect(required.rejection_reason).toBe(false);
      });
    });
  });

  describe('validateRequiredFieldsForTransition', () => {
    it('should not throw when all required fields are present for published', () => {
      expect(() =>
        validateRequiredFieldsForTransition('published', {
          published_url: 'https://example.com',
          published_at: new Date().toISOString(),
        })
      ).not.toThrow();
    });

    it('should throw when published_url is missing for published', () => {
      expect(() =>
        validateRequiredFieldsForTransition('published', {
          published_at: new Date().toISOString(),
        })
      ).toThrow('published_url is required');
    });

    it('should not throw when published_at is missing for published (auto-set by handler)', () => {
      expect(() =>
        validateRequiredFieldsForTransition('published', {
          published_url: 'https://example.com',
        })
      ).not.toThrow();
    });

    it('should not throw for rejected without rejection_reason (optional)', () => {
      expect(() => validateRequiredFieldsForTransition('rejected', {})).not.toThrow();
    });

    it('should not throw for other statuses without extra fields', () => {
      const otherStatuses: ArticleStatus[] = [
        'queued',
        'generating',
        'draft',
        'approved',
        'reviewed',
        'failed',
        'failed_quality',
      ];

      otherStatuses.forEach(status => {
        expect(() => validateRequiredFieldsForTransition(status, {})).not.toThrow();
      });
    });
  });
});
