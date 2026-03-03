import { describe, expect, it } from 'vitest';
import {
  getCampaignStatusStyles,
  getArticleStatusStyles,
  getProjectStatusStyles,
  getCampaignProgressStyles,
} from '../statusStyles';

describe('statusStyles', () => {
  describe('getCampaignStatusStyles', () => {
    it('should return green styles for scheduled campaign', () => {
      const result = getCampaignStatusStyles('scheduled');
      expect(result).toBe('bg-green-500/10 text-green-400 border-green-500/20');
    });

    it('should return blue styles for completed campaign', () => {
      const result = getCampaignStatusStyles('completed');
      expect(result).toBe('bg-blue-500/10 text-blue-400 border-blue-500/20');
    });

    it('should return yellow styles for paused campaign', () => {
      const result = getCampaignStatusStyles('paused');
      expect(result).toBe('bg-yellow-500/10 text-yellow-400 border-yellow-500/20');
    });

    it('should return fallback for unknown status', () => {
      const result = getCampaignStatusStyles('unknown');
      expect(result).toBe('bg-surface text-muted border-border');
    });
  });

  describe('getArticleStatusStyles', () => {
    it('should return green styles for published article', () => {
      const result = getArticleStatusStyles('published');
      expect(result).toBe('bg-green-500/10 text-green-400 border-green-500/20');
    });

    it('should return surface styles for draft article', () => {
      const result = getArticleStatusStyles('draft');
      expect(result).toBe('bg-surface-light text-secondary border-border');
    });

    it('should return purple styles for reviewed article', () => {
      const result = getArticleStatusStyles('reviewed');
      expect(result).toBe('bg-purple-500/10 text-purple-400 border-purple-500/20');
    });

    it('should return accent styles for generating article', () => {
      const result = getArticleStatusStyles('generating');
      expect(result).toBe('bg-accent/10 text-accent-hover border-accent/20');
    });

    it('should return blue styles for queued article', () => {
      const result = getArticleStatusStyles('queued');
      expect(result).toBe('bg-blue-500/10 text-blue-400 border-blue-500/20');
    });

    it('should return red styles for failed article', () => {
      const result = getArticleStatusStyles('failed');
      expect(result).toBe('bg-red-500/10 text-red-400 border-red-500/20');
    });

    it('should return fallback for unknown status', () => {
      const result = getArticleStatusStyles('unknown');
      expect(result).toBe('bg-surface text-muted border-border');
    });
  });

  describe('getProjectStatusStyles', () => {
    it('should return green styles for active project', () => {
      const result = getProjectStatusStyles('active');
      expect(result).toBe('bg-green-500/10 text-green-400 border-green-500/20');
    });

    it('should return fallback for unknown status', () => {
      const result = getProjectStatusStyles('unknown');
      expect(result).toBe('bg-secondary/10 text-secondary border-secondary/20');
    });
  });

  describe('getCampaignProgressStyles', () => {
    it('should return accent styles for scheduled campaign', () => {
      const result = getCampaignProgressStyles('scheduled');
      expect(result).toBe('bg-accent');
    });

    it('should return green styles for completed campaign', () => {
      const result = getCampaignProgressStyles('completed');
      expect(result).toBe('bg-green-500');
    });

    it('should return muted styles for paused campaign', () => {
      const result = getCampaignProgressStyles('paused');
      expect(result).toBe('bg-muted');
    });

    it('should return fallback for unknown status', () => {
      const result = getCampaignProgressStyles('unknown');
      expect(result).toBe('bg-muted');
    });
  });
});
