/**
 * Opportunity Config Unit Tests
 *
 * Tests for GSC article strategy mapping and strategy prompt instructions.
 */

import { describe, it, expect } from 'vitest';
import {
  ARTICLE_STRATEGY_MAP,
  STRATEGY_PROMPT_INSTRUCTIONS,
  getArticleStrategyForType,
  buildStrategyPrompt,
  OPPORTUNITY_THRESHOLDS,
  PRIORITY_WEIGHTS,
  TYPE_PRIORITY_BONUS,
  EXPECTED_CTR_BY_POSITION,
  getExpectedCtrForPosition,
} from '@shared/config/opportunity.config';
import type { OpportunityType, ArticleStrategy } from '@shared/types/opportunity.types';

describe('shared/config/opportunity.config', () => {
  describe('ARTICLE_STRATEGY_MAP', () => {
    it('should map content_gap to new_content strategy', () => {
      expect(ARTICLE_STRATEGY_MAP.content_gap).toBe('new_content');
    });

    it('should map low_hanging_fruit to optimize_existing strategy', () => {
      expect(ARTICLE_STRATEGY_MAP.low_hanging_fruit).toBe('optimize_existing');
    });

    it('should map topic_cluster to topic_hub strategy', () => {
      expect(ARTICLE_STRATEGY_MAP.topic_cluster).toBe('topic_hub');
    });

    it('should not map technical opportunity types', () => {
      // Technical types should not be in the map
      expect(ARTICLE_STRATEGY_MAP).not.toHaveProperty('low_ctr');
      expect(ARTICLE_STRATEGY_MAP).not.toHaveProperty('declining_position');
      expect(ARTICLE_STRATEGY_MAP).not.toHaveProperty('thin_content');
      expect(ARTICLE_STRATEGY_MAP).not.toHaveProperty('cannibalization');
    });

    it('should have exactly 3 content opportunity type mappings', () => {
      const keys = Object.keys(ARTICLE_STRATEGY_MAP);
      expect(keys).toHaveLength(3);
    });
  });

  describe('getArticleStrategyForType', () => {
    it('should return correct strategy for content_gap', () => {
      expect(getArticleStrategyForType('content_gap')).toBe('new_content');
    });

    it('should return correct strategy for low_hanging_fruit', () => {
      expect(getArticleStrategyForType('low_hanging_fruit')).toBe('optimize_existing');
    });

    it('should return correct strategy for topic_cluster', () => {
      expect(getArticleStrategyForType('topic_cluster')).toBe('topic_hub');
    });

    it('should return undefined for technical opportunity types', () => {
      expect(getArticleStrategyForType('low_ctr')).toBeUndefined();
      expect(getArticleStrategyForType('declining_position')).toBeUndefined();
      expect(getArticleStrategyForType('thin_content')).toBeUndefined();
      expect(getArticleStrategyForType('cannibalization')).toBeUndefined();
    });

    it('should map all content opportunity types to a strategy', () => {
      const contentTypes: OpportunityType[] = ['content_gap', 'low_hanging_fruit', 'topic_cluster'];

      contentTypes.forEach(type => {
        const strategy = getArticleStrategyForType(type);
        expect(strategy).toBeDefined();
        expect(['new_content', 'optimize_existing', 'topic_hub']).toContain(strategy);
      });
    });
  });

  describe('STRATEGY_PROMPT_INSTRUCTIONS', () => {
    it('should have prompt for new_content strategy', () => {
      expect(STRATEGY_PROMPT_INSTRUCTIONS.new_content).toBeDefined();
      expect(typeof STRATEGY_PROMPT_INSTRUCTIONS.new_content).toBe('string');
      expect(STRATEGY_PROMPT_INSTRUCTIONS.new_content.length).toBeGreaterThan(100);
    });

    it('should have prompt for optimize_existing strategy', () => {
      expect(STRATEGY_PROMPT_INSTRUCTIONS.optimize_existing).toBeDefined();
      expect(typeof STRATEGY_PROMPT_INSTRUCTIONS.optimize_existing).toBe('string');
      expect(STRATEGY_PROMPT_INSTRUCTIONS.optimize_existing.length).toBeGreaterThan(100);
    });

    it('should have prompt for topic_hub strategy', () => {
      expect(STRATEGY_PROMPT_INSTRUCTIONS.topic_hub).toBeDefined();
      expect(typeof STRATEGY_PROMPT_INSTRUCTIONS.topic_hub).toBe('string');
      expect(STRATEGY_PROMPT_INSTRUCTIONS.topic_hub.length).toBeGreaterThan(100);
    });

    it('should have strategy prompt for each strategy type', () => {
      const strategies: ArticleStrategy[] = ['new_content', 'optimize_existing', 'topic_hub'];

      strategies.forEach(strategy => {
        expect(STRATEGY_PROMPT_INSTRUCTIONS[strategy]).toBeDefined();
      });
    });

    it('should include placeholder tokens in new_content strategy', () => {
      expect(STRATEGY_PROMPT_INSTRUCTIONS.new_content).toContain('{impressions}');
    });

    it('should include placeholder tokens in optimize_existing strategy', () => {
      expect(STRATEGY_PROMPT_INSTRUCTIONS.optimize_existing).toContain('{position}');
      expect(STRATEGY_PROMPT_INSTRUCTIONS.optimize_existing).toContain('{ctr}');
      expect(STRATEGY_PROMPT_INSTRUCTIONS.optimize_existing).toContain('{impressions}');
    });

    it('should include placeholder tokens in topic_hub strategy', () => {
      expect(STRATEGY_PROMPT_INSTRUCTIONS.topic_hub).toContain('{impressions}');
      expect(STRATEGY_PROMPT_INSTRUCTIONS.topic_hub).toContain('{relatedQueries}');
    });

    it('should mention GSC CONTEXT in all strategies', () => {
      Object.values(STRATEGY_PROMPT_INSTRUCTIONS).forEach(prompt => {
        expect(prompt).toContain('GSC CONTEXT');
      });
    });
  });

  describe('buildStrategyPrompt', () => {
    it('should interpolate impressions in new_content strategy', () => {
      const prompt = buildStrategyPrompt('new_content', { impressions: 1234 });

      expect(prompt).toContain('1234');
      expect(prompt).not.toContain('{impressions}');
    });

    it('should interpolate position and CTR in optimize_existing strategy', () => {
      const prompt = buildStrategyPrompt('optimize_existing', {
        position: 15,
        ctr: 0.025,
        impressions: 500,
      });

      expect(prompt).toContain('15');
      expect(prompt).toContain('2.5%'); // 0.025 * 100
      expect(prompt).toContain('500');
      expect(prompt).not.toContain('{position}');
      expect(prompt).not.toContain('{ctr}');
    });

    it('should interpolate related queries in topic_hub strategy', () => {
      const prompt = buildStrategyPrompt(
        'topic_hub',
        { impressions: 3000 },
        ['query one', 'query two', 'query three']
      );

      expect(prompt).toContain('query one');
      expect(prompt).toContain('query two');
      expect(prompt).toContain('query three');
      expect(prompt).not.toContain('{relatedQueries}');
    });

    it('should handle missing metrics gracefully', () => {
      const prompt = buildStrategyPrompt('new_content', {});

      expect(prompt).toContain('N/A');
      expect(prompt).not.toContain('{impressions}');
    });

    it('should handle empty related queries array', () => {
      const prompt = buildStrategyPrompt('topic_hub', { impressions: 100 }, []);

      expect(prompt).toContain('N/A');
    });

    it('should handle undefined related queries', () => {
      const prompt = buildStrategyPrompt('topic_hub', { impressions: 100 }, undefined);

      expect(prompt).toContain('N/A');
    });

    it('should format CTR as percentage with 1 decimal', () => {
      const prompt = buildStrategyPrompt('optimize_existing', { ctr: 0.1567 });

      expect(prompt).toContain('15.7%');
    });

    it('should handle zero CTR', () => {
      const prompt = buildStrategyPrompt('optimize_existing', { ctr: 0 });

      // Zero CTR is falsy, so it becomes N/A
      expect(prompt).toContain('N/A%');
    });
  });

  describe('OPPORTUNITY_THRESHOLDS', () => {
    it('should have LOW_HANGING_FRUIT thresholds', () => {
      expect(OPPORTUNITY_THRESHOLDS.LOW_HANGING_FRUIT).toBeDefined();
      expect(OPPORTUNITY_THRESHOLDS.LOW_HANGING_FRUIT.minPosition).toBe(8);
      expect(OPPORTUNITY_THRESHOLDS.LOW_HANGING_FRUIT.maxPosition).toBe(20);
    });

    it('should have CONTENT_GAP thresholds', () => {
      expect(OPPORTUNITY_THRESHOLDS.CONTENT_GAP).toBeDefined();
      expect(OPPORTUNITY_THRESHOLDS.CONTENT_GAP.minImpressions).toBe(50);
    });
  });

  describe('PRIORITY_WEIGHTS', () => {
    it('should sum to 1.0', () => {
      const sum = Object.values(PRIORITY_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should have all required weight keys', () => {
      expect(PRIORITY_WEIGHTS).toHaveProperty('impressions');
      expect(PRIORITY_WEIGHTS).toHaveProperty('position');
      expect(PRIORITY_WEIGHTS).toHaveProperty('ctr_gap');
      expect(PRIORITY_WEIGHTS).toHaveProperty('type_bonus');
    });
  });

  describe('TYPE_PRIORITY_BONUS', () => {
    it('should have bonus for all opportunity types', () => {
      const types: OpportunityType[] = [
        'content_gap',
        'low_hanging_fruit',
        'topic_cluster',
        'low_ctr',
        'declining_position',
        'thin_content',
        'cannibalization',
      ];

      types.forEach(type => {
        expect(TYPE_PRIORITY_BONUS[type]).toBeDefined();
        expect(typeof TYPE_PRIORITY_BONUS[type]).toBe('number');
        expect(TYPE_PRIORITY_BONUS[type]).toBeGreaterThanOrEqual(0);
        expect(TYPE_PRIORITY_BONUS[type]).toBeLessThanOrEqual(100);
      });
    });

    it('should give highest bonus to low_hanging_fruit', () => {
      expect(TYPE_PRIORITY_BONUS.low_hanging_fruit).toBeGreaterThanOrEqual(
        TYPE_PRIORITY_BONUS.content_gap
      );
    });
  });

  describe('EXPECTED_CTR_BY_POSITION', () => {
    it('should have expected CTR for position ranges', () => {
      expect(EXPECTED_CTR_BY_POSITION['1-3']).toBeDefined();
      expect(EXPECTED_CTR_BY_POSITION['4-7']).toBeDefined();
      expect(EXPECTED_CTR_BY_POSITION['8-10']).toBeDefined();
      expect(EXPECTED_CTR_BY_POSITION['11-20']).toBeDefined();
      expect(EXPECTED_CTR_BY_POSITION['21+']).toBeDefined();
    });

    it('should have decreasing CTR for lower positions', () => {
      expect(EXPECTED_CTR_BY_POSITION['1-3']).toBeGreaterThan(EXPECTED_CTR_BY_POSITION['4-7']);
      expect(EXPECTED_CTR_BY_POSITION['4-7']).toBeGreaterThan(EXPECTED_CTR_BY_POSITION['8-10']);
      expect(EXPECTED_CTR_BY_POSITION['8-10']).toBeGreaterThan(EXPECTED_CTR_BY_POSITION['11-20']);
    });
  });

  describe('getExpectedCtrForPosition', () => {
    it('should return correct CTR for position 1-3', () => {
      expect(getExpectedCtrForPosition(1)).toBe(EXPECTED_CTR_BY_POSITION['1-3']);
      expect(getExpectedCtrForPosition(2)).toBe(EXPECTED_CTR_BY_POSITION['1-3']);
      expect(getExpectedCtrForPosition(3)).toBe(EXPECTED_CTR_BY_POSITION['1-3']);
    });

    it('should return correct CTR for position 4-7', () => {
      expect(getExpectedCtrForPosition(4)).toBe(EXPECTED_CTR_BY_POSITION['4-7']);
      expect(getExpectedCtrForPosition(5)).toBe(EXPECTED_CTR_BY_POSITION['4-7']);
      expect(getExpectedCtrForPosition(7)).toBe(EXPECTED_CTR_BY_POSITION['4-7']);
    });

    it('should return correct CTR for position 8-10', () => {
      expect(getExpectedCtrForPosition(8)).toBe(EXPECTED_CTR_BY_POSITION['8-10']);
      expect(getExpectedCtrForPosition(9)).toBe(EXPECTED_CTR_BY_POSITION['8-10']);
      expect(getExpectedCtrForPosition(10)).toBe(EXPECTED_CTR_BY_POSITION['8-10']);
    });

    it('should return correct CTR for position 11-20', () => {
      expect(getExpectedCtrForPosition(11)).toBe(EXPECTED_CTR_BY_POSITION['11-20']);
      expect(getExpectedCtrForPosition(15)).toBe(EXPECTED_CTR_BY_POSITION['11-20']);
      expect(getExpectedCtrForPosition(20)).toBe(EXPECTED_CTR_BY_POSITION['11-20']);
    });

    it('should return correct CTR for position 21+', () => {
      expect(getExpectedCtrForPosition(21)).toBe(EXPECTED_CTR_BY_POSITION['21+']);
      expect(getExpectedCtrForPosition(50)).toBe(EXPECTED_CTR_BY_POSITION['21+']);
      expect(getExpectedCtrForPosition(100)).toBe(EXPECTED_CTR_BY_POSITION['21+']);
    });
  });
});
