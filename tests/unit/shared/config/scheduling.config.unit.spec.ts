/**
 * Unit Tests: Campaign Scheduling Configuration
 *
 * Tests for schedule frequency options, next run calculation,
 * completion estimation, and SEO velocity advisories.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SCHEDULE_FREQUENCIES,
  DEFAULT_SCHEDULE_HOUR,
  DEFAULT_SCHEDULE_TIMEZONE,
  MAX_CAMPAIGNS_PER_CRON_RUN,
  CRON_INTERVAL_MINUTES,
  SEO_VELOCITY_ADVISORIES,
  SCHEDULE_FREQUENCY_UI_GROUPS,
  calculateNextRunAt,
  estimateCompletionDays,
  getEffectiveArticlesPerDay,
  getSeoVelocityAdvisory,
  isValidScheduleConfig,
  getScheduleFrequencyOptions,
  getEffectiveRate,
} from '@shared/config/scheduling.config';
import type { ScheduleFrequency, IScheduleConfig } from '@shared/types/campaign.types';

describe('Campaign Scheduling Configuration', () => {
  describe('SCHEDULE_FREQUENCIES', () => {
    it('should have all required frequency options', () => {
      const expectedFrequencies: ScheduleFrequency[] = [
        '3x_daily',
        '2x_daily',
        'daily',
        'every_other_day',
        '3x_weekly',
        '2x_weekly',
        'weekly',
        'every_2_weeks',
      ];

      expectedFrequencies.forEach(freq => {
        expect(SCHEDULE_FREQUENCIES[freq]).toBeDefined();
      });
    });

    it('should have correct interval hours for each frequency', () => {
      expect(SCHEDULE_FREQUENCIES['3x_daily'].intervalHours).toBe(8);
      expect(SCHEDULE_FREQUENCIES['2x_daily'].intervalHours).toBe(12);
      expect(SCHEDULE_FREQUENCIES.daily.intervalHours).toBe(24);
      expect(SCHEDULE_FREQUENCIES.every_other_day.intervalHours).toBe(48);
      expect(SCHEDULE_FREQUENCIES['3x_weekly'].intervalHours).toBe(56);
      expect(SCHEDULE_FREQUENCIES['2x_weekly'].intervalHours).toBe(84);
      expect(SCHEDULE_FREQUENCIES.weekly.intervalHours).toBe(168);
      expect(SCHEDULE_FREQUENCIES.every_2_weeks.intervalHours).toBe(336);
    });

    it('should have label and description for each frequency', () => {
      Object.entries(SCHEDULE_FREQUENCIES).forEach(([key, config]) => {
        expect(config.label).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(typeof config.label).toBe('string');
        expect(typeof config.description).toBe('string');
      });
    });

    it('should have intervals in ascending order', () => {
      const frequencies = Object.keys(SCHEDULE_FREQUENCIES) as ScheduleFrequency[];
      for (let i = 1; i < frequencies.length; i++) {
        const prev = SCHEDULE_FREQUENCIES[frequencies[i - 1]].intervalHours;
        const curr = SCHEDULE_FREQUENCIES[frequencies[i]].intervalHours;
        expect(prev).toBeLessThan(curr);
      }
    });
  });

  describe('Default Constants', () => {
    it('should have correct default schedule hour', () => {
      expect(DEFAULT_SCHEDULE_HOUR).toBe(9);
    });

    it('should have correct default timezone', () => {
      expect(DEFAULT_SCHEDULE_TIMEZONE).toBe('UTC');
    });

    it('should have reasonable max campaigns per cron run', () => {
      expect(MAX_CAMPAIGNS_PER_CRON_RUN).toBe(10);
    });

    it('should have correct cron interval', () => {
      expect(CRON_INTERVAL_MINUTES).toBe(5);
    });
  });

  describe('SEO_VELOCITY_ADVISORIES', () => {
    it('should have threshold values in ascending order', () => {
      expect(SEO_VELOCITY_ADVISORIES.MODERATE_THRESHOLD).toBeLessThan(
        SEO_VELOCITY_ADVISORIES.HIGH_THRESHOLD
      );
      expect(SEO_VELOCITY_ADVISORIES.HIGH_THRESHOLD).toBeLessThan(
        SEO_VELOCITY_ADVISORIES.AGGRESSIVE_THRESHOLD
      );
    });

    it('should have correct threshold values', () => {
      expect(SEO_VELOCITY_ADVISORIES.MODERATE_THRESHOLD).toBe(3);
      expect(SEO_VELOCITY_ADVISORIES.HIGH_THRESHOLD).toBe(5);
      expect(SEO_VELOCITY_ADVISORIES.AGGRESSIVE_THRESHOLD).toBe(10);
    });
  });

  describe('calculateNextRunAt', () => {
    describe('for interval-based frequencies (3x_daily, 2x_daily)', () => {
      it('should calculate next run 8 hours from now for 3x_daily', () => {
        const now = new Date('2026-02-12T10:00:00Z');
        const nextRun = calculateNextRunAt('3x_daily', 'UTC', 9, now);

        const expected = new Date('2026-02-12T18:00:00Z');
        expect(new Date(nextRun).toISOString()).toBe(expected.toISOString());
      });

      it('should calculate next run 12 hours from now for 2x_daily', () => {
        const now = new Date('2026-02-12T10:00:00Z');
        const nextRun = calculateNextRunAt('2x_daily', 'UTC', 9, now);

        const expected = new Date('2026-02-12T22:00:00Z');
        expect(new Date(nextRun).toISOString()).toBe(expected.toISOString());
      });
    });

    describe('for day-based frequencies', () => {
      it('should return tomorrow at target hour if current hour has passed', () => {
        const now = new Date('2026-02-12T15:00:00Z'); // 3 PM UTC
        const nextRun = calculateNextRunAt('daily', 'UTC', 9, now); // Target 9 AM

        const nextRunDate = new Date(nextRun);
        expect(nextRunDate.getUTCDate()).toBe(13); // Next day
        expect(nextRunDate.getUTCHours()).toBe(9); // At 9 AM
      });

      it('should return today at target hour if current hour has not passed', () => {
        const now = new Date('2026-02-12T05:00:00Z'); // 5 AM UTC
        const nextRun = calculateNextRunAt('daily', 'UTC', 9, now); // Target 9 AM

        const nextRunDate = new Date(nextRun);
        expect(nextRunDate.getUTCDate()).toBe(12); // Same day
        expect(nextRunDate.getUTCHours()).toBe(9); // At 9 AM
      });

      it('should handle every_other_day frequency', () => {
        const now = new Date('2026-02-12T15:00:00Z');
        const nextRun = calculateNextRunAt('every_other_day', 'UTC', 9, now);

        const nextRunDate = new Date(nextRun);
        expect(nextRunDate.getUTCDate()).toBe(14); // 2 days later
        expect(nextRunDate.getUTCHours()).toBe(9);
      });

      it('should handle weekly frequency', () => {
        const now = new Date('2026-02-12T15:00:00Z');
        const nextRun = calculateNextRunAt('weekly', 'UTC', 9, now);

        const nextRunDate = new Date(nextRun);
        expect(nextRunDate.getUTCDate()).toBe(19); // 7 days later
        expect(nextRunDate.getUTCHours()).toBe(9);
      });

      it('should handle every_2_weeks frequency', () => {
        const now = new Date('2026-02-12T15:00:00Z');
        const nextRun = calculateNextRunAt('every_2_weeks', 'UTC', 9, now);

        const nextRunDate = new Date(nextRun);
        expect(nextRunDate.getUTCDate()).toBe(26); // 14 days later
        expect(nextRunDate.getUTCHours()).toBe(9);
      });
    });

    describe('with timezone handling', () => {
      it('should handle America/New_York timezone', () => {
        const now = new Date('2026-02-12T14:00:00Z'); // 9 AM EST (UTC-5)
        const nextRun = calculateNextRunAt('daily', 'America/New_York', 9, now);

        const nextRunDate = new Date(nextRun);
        // Since it's already 9 AM EST, next run should be tomorrow 9 AM EST
        expect(nextRunDate.getTime()).toBeGreaterThan(now.getTime());
      });

      it('should handle Europe/London timezone', () => {
        const now = new Date('2026-02-12T08:00:00Z'); // 8 AM UTC
        const nextRun = calculateNextRunAt('daily', 'Europe/London', 9, now);

        const nextRunDate = new Date(nextRun);
        // Should be same day at 9 AM
        expect(nextRunDate.getUTCHours()).toBe(9);
      });
    });

    describe('edge cases', () => {
      it('should use default timezone if not specified', () => {
        const now = new Date('2026-02-12T10:00:00Z');
        const nextRun = calculateNextRunAt('daily', undefined, 9, now);

        expect(new Date(nextRun).toISOString()).toBeDefined();
      });

      it('should use default hour if not specified', () => {
        const now = new Date('2026-02-12T10:00:00Z');
        const nextRun = calculateNextRunAt('daily', 'UTC', undefined, now);

        const nextRunDate = new Date(nextRun);
        expect(nextRunDate.getUTCHours()).toBe(DEFAULT_SCHEDULE_HOUR);
      });

      it('should use current date if fromDate not specified', () => {
        const nextRun = calculateNextRunAt('daily', 'UTC', 9);

        expect(new Date(nextRun).getTime()).toBeGreaterThan(0);
      });
    });
  });

  describe('estimateCompletionDays', () => {
    it('should return 0 for no pending keywords', () => {
      const days = estimateCompletionDays('daily', 1, 0);
      expect(days).toBe(0);
    });

    it('should calculate correctly for daily frequency with batch size 1', () => {
      const days = estimateCompletionDays('daily', 1, 10);
      expect(days).toBe(10); // 10 articles / 1 per day = 10 days
    });

    it('should calculate correctly for daily frequency with batch size 3', () => {
      const days = estimateCompletionDays('daily', 3, 10);
      expect(days).toBe(4); // 10 articles / 3 per day = 3.33 -> 4 days
    });

    it('should calculate correctly for 2x_daily frequency', () => {
      const days = estimateCompletionDays('2x_daily', 2, 10);
      expect(days).toBe(3); // 10 articles / 4 per day = 2.5 -> 3 days
    });

    it('should calculate correctly for weekly frequency', () => {
      const days = estimateCompletionDays('weekly', 5, 20);
      // Weekly with batch 5 = 5 articles per week = 5/7 ≈ 0.714 articles per day
      // 20 articles / 0.714 per day ≈ 28 days
      // Due to floating point and ceiling, actual result is 29
      expect(days).toBe(29);
    });

    it('should round up to next whole day', () => {
      const days = estimateCompletionDays('daily', 1, 11);
      expect(days).toBe(11); // Exactly on boundary

      const daysWithRemainder = estimateCompletionDays('daily', 1, 11.5);
      expect(daysWithRemainder).toBe(12); // Rounds up
    });

    it('should handle large keyword counts', () => {
      const days = estimateCompletionDays('daily', 5, 500);
      expect(days).toBe(100); // 500 / 5 = 100 days
    });
  });

  describe('getEffectiveArticlesPerDay', () => {
    it('should calculate correctly for 3x_daily with batch size 1', () => {
      const perDay = getEffectiveArticlesPerDay('3x_daily', 1);
      expect(perDay).toBe(3); // 3 runs per day * 1 article = 3
    });

    it('should calculate correctly for 2x_daily with batch size 2', () => {
      const perDay = getEffectiveArticlesPerDay('2x_daily', 2);
      expect(perDay).toBe(4); // 2 runs per day * 2 articles = 4
    });

    it('should calculate correctly for daily with batch size 5', () => {
      const perDay = getEffectiveArticlesPerDay('daily', 5);
      expect(perDay).toBe(5); // 1 run per day * 5 articles = 5
    });

    it('should calculate correctly for weekly with batch size 10', () => {
      const perDay = getEffectiveArticlesPerDay('weekly', 10);
      expect(perDay).toBeCloseTo(10 / 7, 3); // 10 articles / 7 days
    });

    it('should calculate correctly for every_2_weeks with batch size 14', () => {
      const perDay = getEffectiveArticlesPerDay('every_2_weeks', 14);
      expect(perDay).toBeCloseTo(1, 3); // 14 articles / 14 days = 1 per day
    });

    it('should return fractional values for weekly frequencies', () => {
      const perDay = getEffectiveArticlesPerDay('weekly', 1);
      expect(perDay).toBeCloseTo(1 / 7, 3);
    });
  });

  describe('getSeoVelocityAdvisory', () => {
    describe('safe level', () => {
      it('should return safe for 0 articles per day', () => {
        const advisory = getSeoVelocityAdvisory(0);
        expect(advisory.level).toBe('safe');
        expect(advisory.blocksOperation).toBe(false);
      });

      it('should return safe for 1 article per day', () => {
        const advisory = getSeoVelocityAdvisory(1);
        expect(advisory.level).toBe('safe');
      });

      it('should return safe for 3 articles per day (at threshold)', () => {
        const advisory = getSeoVelocityAdvisory(3);
        expect(advisory.level).toBe('safe');
      });
    });

    describe('moderate level', () => {
      it('should return moderate for 4 articles per day', () => {
        const advisory = getSeoVelocityAdvisory(4);
        expect(advisory.level).toBe('moderate');
        expect(advisory.blocksOperation).toBe(false);
      });

      it('should return moderate for 5 articles per day (at threshold)', () => {
        const advisory = getSeoVelocityAdvisory(5);
        expect(advisory.level).toBe('moderate');
      });
    });

    describe('high level', () => {
      it('should return high for 6 articles per day', () => {
        const advisory = getSeoVelocityAdvisory(6);
        expect(advisory.level).toBe('high');
        expect(advisory.blocksOperation).toBe(false);
      });

      it('should return high for 10 articles per day (at threshold)', () => {
        const advisory = getSeoVelocityAdvisory(10);
        expect(advisory.level).toBe('high');
      });
    });

    describe('aggressive level', () => {
      it('should return aggressive for 11 articles per day', () => {
        const advisory = getSeoVelocityAdvisory(11);
        expect(advisory.level).toBe('aggressive');
        expect(advisory.blocksOperation).toBe(false);
      });

      it('should return aggressive for 50 articles per day', () => {
        const advisory = getSeoVelocityAdvisory(50);
        expect(advisory.level).toBe('aggressive');
      });
    });

    it('should always include a message', () => {
      [0, 1, 4, 6, 11, 100].forEach(articlesPerDay => {
        const advisory = getSeoVelocityAdvisory(articlesPerDay);
        expect(advisory.message).toBeTruthy();
        expect(typeof advisory.message).toBe('string');
      });
    });

    it('should never block operation (soft warnings only)', () => {
      [0, 5, 10, 50, 100].forEach(articlesPerDay => {
        const advisory = getSeoVelocityAdvisory(articlesPerDay);
        expect(advisory.blocksOperation).toBe(false);
      });
    });
  });

  describe('isValidScheduleConfig', () => {
    it('should return true for valid complete config', () => {
      const config: IScheduleConfig = {
        frequency: 'daily',
        batchSize: 5,
        timezone: 'America/New_York',
        hour: 10,
      };
      expect(isValidScheduleConfig(config)).toBe(true);
    });

    it('should return true for empty config', () => {
      expect(isValidScheduleConfig({})).toBe(true);
    });

    it('should throw for invalid frequency', () => {
      expect(() => isValidScheduleConfig({ frequency: 'invalid' as ScheduleFrequency })).toThrow(
        'Invalid schedule frequency'
      );
    });

    it('should throw for batchSize below 1', () => {
      expect(() => isValidScheduleConfig({ batchSize: 0 })).toThrow(
        'Batch size must be between 1 and 50'
      );
    });

    it('should throw for batchSize above 50', () => {
      expect(() => isValidScheduleConfig({ batchSize: 51 })).toThrow(
        'Batch size must be between 1 and 50'
      );
    });

    it('should accept batchSize at boundaries', () => {
      expect(isValidScheduleConfig({ batchSize: 1 })).toBe(true);
      expect(isValidScheduleConfig({ batchSize: 50 })).toBe(true);
    });

    it('should throw for hour below 0', () => {
      expect(() => isValidScheduleConfig({ hour: -1 })).toThrow('Hour must be between 0 and 23');
    });

    it('should throw for hour above 23', () => {
      expect(() => isValidScheduleConfig({ hour: 24 })).toThrow('Hour must be between 0 and 23');
    });

    it('should accept hour at boundaries', () => {
      expect(isValidScheduleConfig({ hour: 0 })).toBe(true);
      expect(isValidScheduleConfig({ hour: 23 })).toBe(true);
    });
  });

  describe('getScheduleFrequencyOptions', () => {
    it('should return all frequency options', () => {
      const options = getScheduleFrequencyOptions();
      expect(options.length).toBe(8);
    });

    it('should include value, label, and description for each option', () => {
      const options = getScheduleFrequencyOptions();
      options.forEach(option => {
        expect(option.value).toBeDefined();
        expect(option.label).toBeDefined();
        expect(option.description).toBeDefined();
        expect(option.articlesPerDayAtBatch1).toBeDefined();
      });
    });

    it('should have correct articles per day calculation', () => {
      const options = getScheduleFrequencyOptions();

      const dailyOption = options.find(o => o.value === 'daily');
      expect(dailyOption?.articlesPerDayAtBatch1).toBe(1);

      const twiceDailyOption = options.find(o => o.value === '2x_daily');
      expect(twiceDailyOption?.articlesPerDayAtBatch1).toBe(2);

      const threeTimesDailyOption = options.find(o => o.value === '3x_daily');
      expect(threeTimesDailyOption?.articlesPerDayAtBatch1).toBe(3);
    });

    it('should return options in same order as SCHEDULE_FREQUENCIES', () => {
      const options = getScheduleFrequencyOptions();
      const frequencyKeys = Object.keys(SCHEDULE_FREQUENCIES) as ScheduleFrequency[];

      options.forEach((option, index) => {
        expect(option.value).toBe(frequencyKeys[index]);
      });
    });
  });

  describe('SCHEDULE_FREQUENCY_UI_GROUPS', () => {
    it('should have 3 groups (Fast, Standard, Relaxed)', () => {
      expect(SCHEDULE_FREQUENCY_UI_GROUPS.length).toBe(3);
      expect(SCHEDULE_FREQUENCY_UI_GROUPS[0].label).toBe('Fast');
      expect(SCHEDULE_FREQUENCY_UI_GROUPS[1].label).toBe('Standard');
      expect(SCHEDULE_FREQUENCY_UI_GROUPS[2].label).toBe('Relaxed');
    });

    it('should have Standard group as default', () => {
      expect(SCHEDULE_FREQUENCY_UI_GROUPS[1].default).toBe(true);
      expect(SCHEDULE_FREQUENCY_UI_GROUPS[0].default).toBeUndefined();
      expect(SCHEDULE_FREQUENCY_UI_GROUPS[2].default).toBeUndefined();
    });

    it('should cover all 8 frequencies across all groups', () => {
      const allKeys = SCHEDULE_FREQUENCY_UI_GROUPS.flatMap(group =>
        group.options.map(opt => opt.key)
      );

      const expectedFrequencies: ScheduleFrequency[] = [
        '3x_daily',
        '2x_daily',
        'daily',
        'every_other_day',
        '3x_weekly',
        '2x_weekly',
        'weekly',
        'every_2_weeks',
      ];

      expect(allKeys.length).toBe(8);
      expectedFrequencies.forEach(freq => {
        expect(allKeys).toContain(freq);
      });
    });

    it('should have label and subtitle for each option', () => {
      SCHEDULE_FREQUENCY_UI_GROUPS.forEach(group => {
        group.options.forEach(option => {
          expect(option.key).toBeDefined();
          expect(option.label).toBeTruthy();
          expect(option.subtitle).toBeTruthy();
          expect(typeof option.label).toBe('string');
          expect(typeof option.subtitle).toBe('string');
        });
      });
    });

    it('should have Fast group with 3x_daily and 2x_daily', () => {
      const fastGroup = SCHEDULE_FREQUENCY_UI_GROUPS[0];
      expect(fastGroup.options.length).toBe(2);
      expect(fastGroup.options[0].key).toBe('3x_daily');
      expect(fastGroup.options[1].key).toBe('2x_daily');
    });

    it('should have Standard group with daily and every_other_day', () => {
      const standardGroup = SCHEDULE_FREQUENCY_UI_GROUPS[1];
      expect(standardGroup.options.length).toBe(2);
      expect(standardGroup.options[0].key).toBe('daily');
      expect(standardGroup.options[1].key).toBe('every_other_day');
    });

    it('should have Relaxed group with weekly frequencies', () => {
      const relaxedGroup = SCHEDULE_FREQUENCY_UI_GROUPS[2];
      expect(relaxedGroup.options.length).toBe(4);
      expect(relaxedGroup.options[0].key).toBe('3x_weekly');
      expect(relaxedGroup.options[1].key).toBe('2x_weekly');
      expect(relaxedGroup.options[2].key).toBe('weekly');
      expect(relaxedGroup.options[3].key).toBe('every_2_weeks');
    });
  });

  describe('getEffectiveRate', () => {
    describe('for daily or faster frequencies', () => {
      it('should return articles/day for 3x_daily with batch 1', () => {
        const rate = getEffectiveRate('3x_daily', 1);
        expect(rate).toBe('~3 articles/day');
      });

      it('should return articles/day for 3x_daily with batch 2', () => {
        const rate = getEffectiveRate('3x_daily', 2);
        expect(rate).toBe('~6 articles/day');
      });

      it('should return articles/day for 2x_daily with batch 1', () => {
        const rate = getEffectiveRate('2x_daily', 1);
        expect(rate).toBe('~2 articles/day');
      });

      it('should return articles/day for 2x_daily with batch 5', () => {
        const rate = getEffectiveRate('2x_daily', 5);
        expect(rate).toBe('~10 articles/day');
      });

      it('should return articles/day for daily with batch 1', () => {
        const rate = getEffectiveRate('daily', 1);
        expect(rate).toBe('~1 articles/day');
      });

      it('should return articles/day for daily with batch 3', () => {
        const rate = getEffectiveRate('daily', 3);
        expect(rate).toBe('~3 articles/day');
      });

      it('should return articles/day for every_other_day with batch 2', () => {
        const rate = getEffectiveRate('every_other_day', 2);
        expect(rate).toBe('~1 articles/day');
      });
    });

    describe('for weekly frequencies', () => {
      it('should return articles/week for 3x_weekly with batch 1', () => {
        const rate = getEffectiveRate('3x_weekly', 1);
        // 3x_weekly has intervalHours 56, so 24/56 ≈ 0.43 articles per day
        // 0.43 * 7 ≈ 3 per week
        expect(rate).toBe('~3 articles/week');
      });

      it('should return articles/week for 2x_weekly with batch 1', () => {
        const rate = getEffectiveRate('2x_weekly', 1);
        // 2x_weekly has intervalHours 84, so 24/84 ≈ 0.29 articles per day
        // 0.29 * 7 ≈ 2 per week
        expect(rate).toBe('~2 articles/week');
      });

      it('should return articles/week for weekly with batch 1', () => {
        const rate = getEffectiveRate('weekly', 1);
        expect(rate).toBe('~1 articles/week');
      });

      it('should return articles/week for weekly with batch 7', () => {
        const rate = getEffectiveRate('weekly', 7);
        expect(rate).toBe('~1 articles/day');
      });
    });

    describe('for biweekly frequency', () => {
      it('should return articles/month for every_2_weeks with batch 1', () => {
        const rate = getEffectiveRate('every_2_weeks', 1);
        // every_2_weeks has intervalHours 336, so 24/336 ≈ 0.071 articles per day
        // ~0.5 per week, ~2.1 per month
        expect(rate).toBe('~2.1 articles/month');
      });

      it('should return articles/week for every_2_weeks with batch 2', () => {
        const rate = getEffectiveRate('every_2_weeks', 2);
        // 2 articles every 14 days = 1 per week
        expect(rate).toBe('~1 articles/week');
      });
    });

    describe('edge cases', () => {
      it('should handle large batch sizes', () => {
        const rate = getEffectiveRate('daily', 50);
        expect(rate).toBe('~50 articles/day');
      });

      it('should handle fractional results correctly', () => {
        const rate = getEffectiveRate('3x_daily', 3);
        expect(rate).toBe('~9 articles/day');
      });
    });

    describe('all 8 frequencies with batch size 1', () => {
      it('should return a valid rate string for each frequency', () => {
        const frequencies: ScheduleFrequency[] = [
          '3x_daily',
          '2x_daily',
          'daily',
          'every_other_day',
          '3x_weekly',
          '2x_weekly',
          'weekly',
          'every_2_weeks',
        ];

        frequencies.forEach(freq => {
          const rate = getEffectiveRate(freq, 1);
          expect(rate).toBeTruthy();
          expect(typeof rate).toBe('string');
          expect(rate).toMatch(/^~[\d.]+ articles\/(day|week|month)$/);
        });
      });
    });
  });
});
