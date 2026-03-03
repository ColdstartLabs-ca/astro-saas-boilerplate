/**
 * Unit tests for AI Detection Score conversion and display
 */

import { describe, it, expect } from 'vitest';
import {
  getAIScoreColor,
  getAIScoreBorderColor,
  getAIScoreBgColor,
} from '@client/components/articles/AIDetectionScore';

describe('AI Detection Score', () => {
  describe('Score conversion (QA aiScore → display score)', () => {
    it('should convert QA aiScore 0.3 to display score 70', () => {
      const qaAiScore = 0.3;
      const displayScore = Math.round((1 - qaAiScore) * 100);
      expect(displayScore).toBe(70);
    });

    it('should convert QA aiScore 0.0 to display score 100', () => {
      const qaAiScore = 0.0;
      const displayScore = Math.round((1 - qaAiScore) * 100);
      expect(displayScore).toBe(100);
    });

    it('should convert QA aiScore 1.0 to display score 0', () => {
      const qaAiScore = 1.0;
      const displayScore = Math.round((1 - qaAiScore) * 100);
      expect(displayScore).toBe(0);
    });

    it('should convert QA aiScore 0.8 to display score 20', () => {
      const qaAiScore = 0.8;
      const displayScore = Math.round((1 - qaAiScore) * 100);
      expect(displayScore).toBe(20);
    });
  });

  describe('getAIScoreColor', () => {
    it('should return success color for score >= 80', () => {
      expect(getAIScoreColor(80)).toBe('text-success');
      expect(getAIScoreColor(85)).toBe('text-success');
      expect(getAIScoreColor(100)).toBe('text-success');
    });

    it('should return warning color for score 60-79', () => {
      expect(getAIScoreColor(60)).toBe('text-warning');
      expect(getAIScoreColor(70)).toBe('text-warning');
      expect(getAIScoreColor(79)).toBe('text-warning');
    });

    it('should return error color for score < 60', () => {
      expect(getAIScoreColor(0)).toBe('text-error');
      expect(getAIScoreColor(30)).toBe('text-error');
      expect(getAIScoreColor(59)).toBe('text-error');
    });
  });

  describe('getAIScoreBorderColor', () => {
    it('should return success border for score >= 80', () => {
      expect(getAIScoreBorderColor(80)).toBe('border-success/30');
      expect(getAIScoreBorderColor(100)).toBe('border-success/30');
    });

    it('should return warning border for score 60-79', () => {
      expect(getAIScoreBorderColor(60)).toBe('border-warning/30');
      expect(getAIScoreBorderColor(70)).toBe('border-warning/30');
    });

    it('should return error border for score < 60', () => {
      expect(getAIScoreBorderColor(30)).toBe('border-error/30');
      expect(getAIScoreBorderColor(59)).toBe('border-error/30');
    });
  });

  describe('getAIScoreBgColor', () => {
    it('should return success background for score >= 80', () => {
      expect(getAIScoreBgColor(80)).toBe('bg-success/10');
      expect(getAIScoreBgColor(100)).toBe('bg-success/10');
    });

    it('should return warning background for score 60-79', () => {
      expect(getAIScoreBgColor(60)).toBe('bg-warning/10');
      expect(getAIScoreBgColor(70)).toBe('bg-warning/10');
    });

    it('should return error background for score < 60', () => {
      expect(getAIScoreBgColor(30)).toBe('bg-error/10');
      expect(getAIScoreBgColor(59)).toBe('bg-error/10');
    });
  });
});
