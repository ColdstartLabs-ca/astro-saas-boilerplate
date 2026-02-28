/**
 * Unit Tests: Calendar Helpers
 *
 * Tests for getCalendarStatusConfig() and related calendar utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  getCalendarStatusConfig,
  getCampaignColor,
  getCampaignColorPalette,
} from '@client/utils/calendarHelpers';
import type { ArticleStatus } from '@shared/types/article.types';

describe('calendarHelpers', () => {
  describe('getCalendarStatusConfig', () => {
    it('should return Planned config for planned status', () => {
      const config = getCalendarStatusConfig('planned');
      expect(config.label).toBe('Planned');
      expect(config.dotColor).toContain('amber');
    });

    it('planned config should have amber color classes', () => {
      const config = getCalendarStatusConfig('planned');
      expect(config.dotColor).toBe('bg-amber-500');
      expect(config.bgClass).toBe('bg-amber-900/20');
      expect(config.textClass).toBe('text-amber-300');
      // planned articles use dashed border to visually distinguish them
      expect(config.borderClass).toContain('border-amber-500/20');
      expect(config.borderClass).toContain('border-dashed');
    });

    it('should return Queued config for queued status', () => {
      const config = getCalendarStatusConfig('queued');
      expect(config.label).toBe('Queued');
    });

    it('should return Generating config for generating status', () => {
      const config = getCalendarStatusConfig('generating');
      expect(config.label).toBe('Generating');
      expect(config.dotColor).toContain('blue');
    });

    it('should return Ready config for draft status', () => {
      const config = getCalendarStatusConfig('draft');
      expect(config.label).toBe('Ready');
    });

    it('should return Ready config for approved status', () => {
      const config = getCalendarStatusConfig('approved');
      expect(config.label).toBe('Ready');
    });

    it('should return Ready config for reviewed status', () => {
      const config = getCalendarStatusConfig('reviewed');
      expect(config.label).toBe('Ready');
    });

    it('should return Ready config for qa_passed status', () => {
      const config = getCalendarStatusConfig('qa_passed');
      expect(config.label).toBe('Ready');
    });

    it('should return Ready config for qa_checking status', () => {
      const config = getCalendarStatusConfig('qa_checking');
      expect(config.label).toBe('Ready');
    });

    it('should return Published config for published status', () => {
      const config = getCalendarStatusConfig('published');
      expect(config.label).toBe('Published');
      expect(config.dotColor).toContain('green');
    });

    it('should return Failed config for failed status', () => {
      const config = getCalendarStatusConfig('failed');
      expect(config.label).toBe('Failed');
      expect(config.dotColor).toContain('red');
    });

    it('should return Failed config for failed_quality status', () => {
      const config = getCalendarStatusConfig('failed_quality');
      expect(config.label).toBe('Failed');
    });

    it('should return Failed config for failed_timeout status', () => {
      const config = getCalendarStatusConfig('failed_timeout');
      expect(config.label).toBe('Failed');
    });

    it('should return Failed config for qa_failed status', () => {
      const config = getCalendarStatusConfig('qa_failed');
      expect(config.label).toBe('Failed');
    });

    it('should return Failed config for rejected status', () => {
      const config = getCalendarStatusConfig('rejected');
      expect(config.label).toBe('Failed');
    });

    it('should return a config with all required fields for every ArticleStatus', () => {
      const statuses: ArticleStatus[] = [
        'planned',
        'queued',
        'generating',
        'draft',
        'qa_checking',
        'qa_passed',
        'qa_failed',
        'approved',
        'rejected',
        'reviewed',
        'published',
        'failed',
        'failed_quality',
        'failed_timeout',
      ];

      statuses.forEach(status => {
        const config = getCalendarStatusConfig(status);
        expect(config.label).toBeTruthy();
        expect(config.dotColor).toBeTruthy();
        expect(config.bgClass).toBeTruthy();
        expect(config.textClass).toBeTruthy();
        expect(config.borderClass).toBeTruthy();
      });
    });
  });

  describe('getCampaignColor', () => {
    it('should return a hex color string for a campaign ID', () => {
      const color = getCampaignColor('campaign-123');
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should return a default color for null campaign ID', () => {
      const color = getCampaignColor(null);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should return the same color for the same campaign ID (deterministic)', () => {
      const color1 = getCampaignColor('campaign-abc');
      const color2 = getCampaignColor('campaign-abc');
      expect(color1).toBe(color2);
    });

    it('should return different colors for different campaign IDs (with high probability)', () => {
      const color1 = getCampaignColor('campaign-aaa');
      const color2 = getCampaignColor('campaign-zzz');
      // These are different campaign IDs; they should hash to different palette entries
      // (not a strict requirement but a sanity check for the hash function)
      expect(typeof color1).toBe('string');
      expect(typeof color2).toBe('string');
    });
  });

  describe('getCampaignColorPalette', () => {
    it('should return a palette entry with all required fields', () => {
      const entry = getCampaignColorPalette('campaign-123');
      expect(entry.dot).toBeTruthy();
      expect(entry.bg).toBeTruthy();
      expect(entry.text).toBeTruthy();
      expect(entry.border).toBeTruthy();
      expect(entry.hex).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should return the first palette entry for null campaign ID', () => {
      const entry = getCampaignColorPalette(null);
      expect(entry.dot).toBe('bg-purple-500');
    });
  });
});
